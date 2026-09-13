import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const ADMIN_USUARIO_ID = 2; // ID fixo do admin

export class ReservaController {

  async findAll(req: Request, res: Response) {
    try {
      const reservas = await prisma.reserva.findMany({
        include: { usuario: true, maquina: true, pagamentos: true }
      });
      return res.status(200).json(reservas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reservas" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reserva = await prisma.reserva.findUnique({
        where: { reserva_id: Number(id) },
        include: { usuario: true, maquina: true, pagamentos: true }
      });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      return res.status(200).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reserva" });
    }
  }

  async findByUsuario(req: Request, res: Response) {
    try {
      const usuarioId = Number(req.params.usuarioId);
      const reservas = await prisma.reserva.findMany({
        where: { usuario_id: usuarioId },
        include: { usuario: true, maquina: true, pagamentos: true },
        orderBy: { data_inicio: "desc" }
      });
      return res.status(200).json(reservas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reservas do usuário" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { maquina_id, usuario_id, data_inicio, data_fim, status } = req.body;

      const maquina = await prisma.maquina.findUnique({ where: { maquina_id } });
      if (!maquina) return res.status(404).json({ error: "Máquina não encontrada" });

      const conflito = await prisma.reserva.findFirst({
        where: {
          maquina_id,
          status: { notIn: ["CANCELADA", "CONCLUIDA"] },
          data_inicio: { lte: new Date(data_fim) },
          data_fim: { gte: new Date(data_inicio) }
        }
      });
      if (conflito) return res.status(400).json({ error: "Horário indisponível" });

      const reserva = await prisma.reserva.create({
        data: {
          maquina_id,
          usuario_id,
          data_inicio: new Date(data_inicio),
          data_fim: new Date(data_fim),
          status
        }
      });

      await prisma.maquina.update({
        where: { maquina_id },
        data: { status: "OCUPADA" }
      });

      // Notificação para o usuário
      await prisma.notificacao.create({
        data: { usuario_id, mensagem: "Reserva criada com sucesso" }
      });

      // Notificação para o admin
      await prisma.notificacao.create({
        data: {
          usuario_id: ADMIN_USUARIO_ID,
          mensagem: `Nova reserva criada — Máquina ${maquina.numero} (usuário #${usuario_id})`
        }
      });

      return res.status(201).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar reserva" });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const reserva = await prisma.reserva.update({
        where: { reserva_id: Number(id) },
        data: { status }
      });
      return res.status(200).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar status" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reserva = await prisma.reserva.findUnique({ where: { reserva_id: Number(id) } });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });

      // Só libera máquina se não houver outra reserva ativa
      const outraAtiva = await prisma.reserva.findFirst({
        where: {
          maquina_id: reserva.maquina_id,
          reserva_id: { not: reserva.reserva_id },
          status: { notIn: ["CANCELADA", "CONCLUIDA"] }
        }
      });

      if (!outraAtiva) {
        await prisma.maquina.update({
          where: { maquina_id: reserva.maquina_id },
          data: { status: "LIVRE" }
        });

        // Notificação admin — máquina liberada
        await prisma.notificacao.create({
          data: {
            usuario_id: ADMIN_USUARIO_ID,
            mensagem: `Máquina liberada — Reserva #${reserva.reserva_id} encerrada`
          }
        });
      }

      await prisma.reserva.delete({ where: { reserva_id: Number(id) } });
      return res.status(200).json({ message: "Reserva deletada" });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao deletar reserva" });
    }
  }

  // Libera reservas expiradas automaticamente
  async liberarExpiradas() {
    try {
      const agora = new Date();
      const expiradas = await prisma.reserva.findMany({
        where: {
          status: { notIn: ["CANCELADA", "CONCLUIDA"] },
          data_fim: { lt: agora }
        },
        include: { maquina: true }
      });

      for (const reserva of expiradas) {
        await prisma.reserva.update({
          where: { reserva_id: reserva.reserva_id },
          data: { status: "CONCLUIDA" }
        });

        // Verifica se há outra reserva ativa na mesma máquina
        const outraAtiva = await prisma.reserva.findFirst({
          where: {
            maquina_id: reserva.maquina_id,
            reserva_id: { not: reserva.reserva_id },
            status: { notIn: ["CANCELADA", "CONCLUIDA"] }
          }
        });

        if (!outraAtiva) {
          await prisma.maquina.update({
            where: { maquina_id: reserva.maquina_id },
            data: { status: "LIVRE" }
          });
        }

        // Notificação para o usuário — lavagem concluída
        await prisma.notificacao.create({
          data: {
            usuario_id: reserva.usuario_id,
            mensagem: `Sua lavagem foi concluída — Máquina ${reserva.maquina.numero}`
          }
        });

        // Notificação para o admin
        await prisma.notificacao.create({
          data: {
            usuario_id: ADMIN_USUARIO_ID,
            mensagem: `Máquina ${reserva.maquina.numero} liberada — Reserva #${reserva.reserva_id} concluída`
          }
        });
      }

      if (expiradas.length > 0) {
        console.log(`[JOB] ${expiradas.length} reserva(s) expirada(s) processada(s)`);
      }
    } catch (error) {
      console.error("[JOB] Erro ao liberar reservas expiradas:", error);
    }
  }
}
