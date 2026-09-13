import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { TipoUsuario } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export class AdminController {
  async create(req: Request, res: Response) {
    try {
      const { nome, email, senha } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      const adminExistente = await prisma.usuario.findUnique({
        where: { email },
      });

      if (adminExistente) {
        return res.status(400).json({ error: "Este e-mail já está em uso." });
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const novoAdmin = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          tipo: TipoUsuario.ADMIN,
        },
      });

      return res.status(201).json({
        usuario_id: novoAdmin.usuario_id,
        nome: novoAdmin.nome,
        email: novoAdmin.email,
        tipo: novoAdmin.tipo,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao criar admin" });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const admins = await prisma.usuario.findMany({
        where: {
          tipo: TipoUsuario.ADMIN,
        },
        select: {
          usuario_id: true,
          nome: true,
          email: true,
          tipo: true,
        },
      });

      return res.status(200).json(admins);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar administradores" });
    }
  }
}
