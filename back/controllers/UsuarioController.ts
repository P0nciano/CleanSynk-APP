import { Request, Response } from "express";
import { AuthRequest, podeAcessar } from "../middlewares/autentica";
import bcrypt from "bcrypt";
import { timingSafeEqual } from "crypto";
import { TipoUsuario } from "../generated/prisma/client";
import { prisma, lavanderiasDo } from "../lib/prisma";

function codigoAdminValido(codigo: unknown) {
  const esperado = process.env.ADMIN_SIGNUP_CODE;
  if (!esperado || typeof codigo !== "string" || codigo.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(codigo), Buffer.from(esperado));
}

export class UsuarioController {
  async create(req: Request, res: Response) {
    try {
      const { nome, email, senha, tipo, codigo_admin } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "nome, email e senha são obrigatórios" });
      }
      if (!/^\S+@\S+\.\S+$/.test(email) || String(senha).length < 6) {
        return res.status(400).json({ error: "E-mail inválido ou senha com menos de 6 caracteres" });
      }

      // Admin só com o código secreto do grupo (ADMIN_SIGNUP_CODE na Vercel); sem ele, sempre cliente
      const querAdmin = tipo === TipoUsuario.ADMIN;
      if (querAdmin) {
        // Limite no banco (na Vercel cada requisição pode cair numa instância diferente)
        const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "").split(",")[0].trim();
        const [doIp, total] = await Promise.all([
          prisma.tentativaAdmin.count({ where: { ip, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } }),
          prisma.tentativaAdmin.count({ where: { createdAt: { gt: new Date(Date.now() - 60 * 60_000) } } }),
        ]);
        if (doIp >= 5 || total >= 30) {
          return res.status(429).json({ error: "Muitas tentativas com código de administrador. Tente de novo mais tarde." });
        }
        if (!codigoAdminValido(codigo_admin)) {
          await prisma.tentativaAdmin.create({ data: { ip } });
          return res.status(403).json({ error: "Código de administrador inválido" });
        }
      }

      const emailExistente = await prisma.usuario.findUnique({ where: { email } });
      if (emailExistente) {
        return res.status(409).json({ error: "Email já cadastrado" });
      }

      const senhaHash = await bcrypt.hash(senha, 10);
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          tipo: querAdmin ? TipoUsuario.ADMIN : TipoUsuario.USER,
        },
        select: {
          usuario_id: true,
          nome: true,
          email: true,
          tipo: true,
          createdAt: true,
        },
      });

      return res.status(201).json(novoUsuario);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
  }

  async findAll(req: AuthRequest, res: Response) {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { reservas: { some: { maquina: { lavanderia: lavanderiasDo(req) } } } },
        select: {
          usuario_id: true,
          nome: true,
          email: true,
          tipo: true,
          createdAt: true,
        },
        orderBy: { usuario_id: "asc" },
      });

      return res.status(200).json(usuarios);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const usuarioId = Number(req.params.id);
      if (!podeAcessar(req, usuarioId)) return res.status(403).json({ error: "Acesso negado" });

      const usuario = await prisma.usuario.findUnique({
        where: { usuario_id: usuarioId },
        select: {
          usuario_id: true,
          nome: true,
          email: true,
          tipo: true,
          createdAt: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.status(200).json(usuario);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const usuarioId = Number(req.params.id);
      if (!podeAcessar(req, usuarioId)) return res.status(403).json({ error: "Acesso negado" });
      const { nome, email, senha } = req.body;

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { usuario_id: usuarioId },
      });

      if (!usuarioExistente) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (email && email !== usuarioExistente.email) {
        const emailEmUso = await prisma.usuario.findUnique({ where: { email } });
        if (emailEmUso) {
          return res.status(409).json({ error: "Email já está em uso" });
        }
      }

      const senhaHash = senha ? await bcrypt.hash(senha, 10) : undefined;

      const usuario = await prisma.usuario.update({
        where: { usuario_id: usuarioId },
        data: {
          nome: nome ?? usuarioExistente.nome,
          email: email ?? usuarioExistente.email,
          senha: senhaHash ?? usuarioExistente.senha,
        },
        select: {
          usuario_id: true,
          nome: true,
          email: true,
          tipo: true,
          createdAt: true,
        },
      });

      return res.status(200).json(usuario);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  }
}
