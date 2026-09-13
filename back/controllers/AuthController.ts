import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { TipoUsuario } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    try {
      if (!jwtSecret) {
        return res.status(500).json({ error: "JWT_SECRET não configurado" });
      }

      const usuario = await prisma.usuario.findFirst({ where: { email } });

      if (!usuario) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "E-mail ou senha incorretos" });
      }

      const token = jwt.sign(
        { id: usuario.usuario_id, role: usuario.tipo },
        jwtSecret,
        { expiresIn: "1h" },
      );

      return res.status(200).json({
        usuario_id: usuario.usuario_id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        token,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao realizar login" });
    }
  }

  async loginAdmin(req: Request, res: Response) {
    try {
      if (!jwtSecret) {
        return res.status(500).json({ error: "JWT_SECRET não configurado" });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email e senha são obrigatórios",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return res.status(401).json({
          error: "Email ou senha inválidos",
        });
      }

      if (usuario.tipo !== TipoUsuario.ADMIN) {
        return res.status(403).json({
          error: "Acesso negado. Apenas administradores podem entrar.",
        });
      }

      const senhaValida = await bcrypt.compare(password, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({
          error: "Email ou senha inválidos",
        });
      }

      const token = jwt.sign(
        { id: usuario.usuario_id, role: usuario.tipo },
        jwtSecret,
        { expiresIn: "24h" },
      );

      return res.status(200).json({
        message: "Login realizado com sucesso",
        token,
        usuario: {
          usuario_id: usuario.usuario_id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
        },
      });
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      return res.status(500).json({
        error: "Erro ao processar o login",
      });
    }
  }
}
