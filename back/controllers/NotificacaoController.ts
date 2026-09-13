import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class NotificacaoController {

  async findAll(req: Request, res: Response) {
    try {

      const notificacoes = await prisma.notificacao.findMany({
        include: {
          usuario: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.status(200).json(notificacoes);

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao buscar notificações"
      });

    }
  }

  async findById(req: Request, res: Response) {

    try {

      const { id } = req.params;

      const notificacao = await prisma.notificacao.findUnique({
        where: {
          notificacao_id: Number(id)
        },
        include: {
          usuario: true
        }
      });

      if (!notificacao) {
        return res.status(404).json({
          error: "Notificação não encontrada"
        });
      }

      return res.status(200).json(notificacao);

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao buscar notificação"
      });

    }
  }

  async findByUsuario(req: Request, res: Response) {

    try {

      const { usuarioId } = req.params;

      const notificacoes = await prisma.notificacao.findMany({
        where: {
          usuario_id: Number(usuarioId)
        },
        include: {
          usuario: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.status(200).json(notificacoes);

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao buscar notificações do usuário"
      });

    }
  }

  async create(req: Request, res: Response) {

    try {

      const { usuario_id, mensagem } = req.body;

      if (!usuario_id || !mensagem) {
        return res.status(400).json({
          error: "usuario_id e mensagem são obrigatórios"
        });
      }

      const notificacao = await prisma.notificacao.create({
        data: {
          usuario_id: Number(usuario_id),
          mensagem
        }
      });

      return res.status(201).json(notificacao);

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao criar notificação"
      });

    }
  }

  async markAsRead(req: Request, res: Response) {

    try {

      const { id } = req.params;

      const notificacao = await prisma.notificacao.update({
        where: {
          notificacao_id: Number(id)
        },
        data: {
          lida: true
        }
      });

      return res.status(200).json(notificacao);

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao atualizar notificação"
      });

    }
  }

  async delete(req: Request, res: Response) {

    try {

      const { id } = req.params;

      await prisma.notificacao.delete({
        where: {
          notificacao_id: Number(id)
        }
      });

      return res.status(200).json({
        message: "Notificação deletada"
      });

    } catch (error) {

      return res.status(500).json({
        error: "Erro ao deletar notificação"
      });

    }
  }
}