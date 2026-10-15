import { Response } from "express";
import { prisma, usuarioPublico, notificarAdmins } from "../lib/prisma";
import { AuthRequest, podeAcessar } from "../middlewares/autentica";

const incluirReserva = { usuario: usuarioPublico, maquina: true, pagamentos: true };

export class ReservaController {

  async findAll(req: AuthRequest, res: Response) {
    try {
      const reservas = await prisma.reserva.findMany({ include: incluirReserva });
      return res.status(200).json(reservas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reservas" });
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const reserva = await prisma.reserva.findUnique({
        where: { reserva_id: Number(id) },
        include: incluirReserva
      });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!podeAcessar(req, reserva.usuario_id)) return res.status(403).json({ error: "Acesso negado" });
      return res.status(200).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reserva" });
    }
  }

  async findByUsuario(req: AuthRequest, res: Response) {
    try {
      const usuarioId = Number(req.params.usuarioId);
      if (!podeAcessar(req, usuarioId)) return res.status(403).json({ error: "Acesso negado" });
      const reservas = await prisma.reserva.findMany({
        where: { usuario_id: usuarioId },
        include: incluirReserva,
        orderBy: { data_inicio: "desc" }
      });
      return res.status(200).json(reservas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar reservas do usuário" });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const maquina_id = Number(req.body.maquina_id);
      const usuario_id = req.user!.id;
      const inicio = new Date(req.body.data_inicio);
      const fim = new Date(req.body.data_fim);

      if (!Number.isInteger(maquina_id) || isNaN(inicio.getTime()) || isNaN(fim.getTime()) || fim <= inicio) {
        return res.status(400).json({ error: "maquina_id, data_inicio e data_fim válidos são obrigatórios" });
      }

      const maquina = await prisma.maquina.findUnique({ where: { maquina_id } });
      if (!maquina) return res.status(404).json({ error: "Máquina não encontrada" });

      // Tudo ou nada: se uma notificação falhar, a reserva não fica órfã segurando a máquina
      const reserva = await prisma.$transaction(async (tx) => {
        const conflito = await tx.reserva.findFirst({
          where: {
            maquina_id,
            status: { notIn: ["CANCELADA", "CONCLUIDA"] },
            data_inicio: { lte: fim },
            data_fim: { gte: inicio }
          }
        });
        if (conflito) return null;

        const nova = await tx.reserva.create({
          data: { maquina_id, usuario_id, data_inicio: inicio, data_fim: fim, status: "AGUARDANDO_PAGAMENTO" }
        });
        await tx.maquina.update({ where: { maquina_id }, data: { status: "OCUPADA" } });
        await tx.notificacao.create({ data: { usuario_id, mensagem: "Reserva criada com sucesso" } });
        await notificarAdmins(`Nova reserva criada — Máquina ${maquina.numero} (usuário #${usuario_id})`, tx);
        return nova;
      });

      if (!reserva) return res.status(400).json({ error: "Horário indisponível" });
      return res.status(201).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar reserva" });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
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

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const reserva = await prisma.reserva.findUnique({ where: { reserva_id: Number(id) } });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!podeAcessar(req, reserva.usuario_id)) return res.status(403).json({ error: "Acesso negado" });

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

        await notificarAdmins(`Máquina liberada — Reserva #${reserva.reserva_id} encerrada`);
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

        await notificarAdmins(`Máquina ${reserva.maquina.numero} liberada — Reserva #${reserva.reserva_id} concluída`);
      }

      if (expiradas.length > 0) {
        console.log(`[JOB] ${expiradas.length} reserva(s) expirada(s) processada(s)`);
      }
    } catch (error) {
      console.error("[JOB] Erro ao liberar reservas expiradas:", error);
    }
  }
}
