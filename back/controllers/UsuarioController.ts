import { Request, Response } from "express";
import { AuthRequest, podeAcessar } from "../middlewares/autentica";
import bcrypt from "bcrypt";
import { TipoUsuario } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export class UsuarioController {
  async create(req: Request, res: Response) {
    try {
      const { nome, email, senha } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "nome, email e senha são obrigatórios" });
      }
      if (!/^\S+@\S+\.\S+$/.test(email) || String(senha).length < 6) {
        return res.status(400).json({ error: "E-mail inválido ou senha com menos de 6 caracteres" });
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
          tipo: TipoUsuario.USER, // cadastro público nunca cria admin
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

  async findAll(req: Request, res: Response) {
    try {
      const usuarios = await prisma.usuario.findMany({
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
