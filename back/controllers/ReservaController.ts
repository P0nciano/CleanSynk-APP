import { Response } from "express";
import { prisma, usuarioPublico, notificarProprietario, lavanderiasDo, adminDonoDaMaquina } from "../lib/prisma";
import { AuthRequest, podeAcessar } from "../middlewares/autentica";
import { stripe } from "./PagamentoController";

const incluirReserva = { usuario: usuarioPublico, maquina: { include: { lavanderia: true } }, pagamentos: true };

// Cliente vê as próprias reservas; admin, as das lavanderias dele
function podeVerReserva(req: AuthRequest, reserva: { usuario_id: number; maquina: { lavanderia: { proprietario_id: number } } }) {
  return req.user?.id === reserva.usuario_id || (Boolean(req.admin) && reserva.maquina.lavanderia.proprietario_id === req.admin!.id);
}

export class ReservaController {

  async findAll(req: AuthRequest, res: Response) {
    try {
      const reservas = await prisma.reserva.findMany({ where: { maquina: { lavanderia: lavanderiasDo(req) } }, include: incluirReserva });
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
      if (!podeVerReserva(req, reserva)) return res.status(403).json({ error: "Acesso negado" });
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
        // Admin consultando outro usuário só vê reservas nas lavanderias dele
        where: { usuario_id: usuarioId, ...(req.user!.id !== usuarioId && { maquina: { lavanderia: lavanderiasDo(req) } }) },
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
        // Trava a máquina até o fim da transação: reservas simultâneas da mesma máquina viram uma fila,
        // e a segunda só checa conflito depois que a primeira gravou (sem isso, as duas passariam)
        await tx.$queryRaw`SELECT 1 FROM maquina WHERE maquina_id = ${maquina_id} FOR UPDATE`;

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
        await notificarProprietario(maquina_id, `Nova reserva criada — Máquina ${maquina.numero} (usuário #${usuario_id})`, tx);
        return nova;
      });

      if (!reserva) return res.status(409).json({ error: "Horário indisponível" });
      return res.status(201).json(reserva);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar reserva" });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const atual = await prisma.reserva.findUnique({ where: { reserva_id: Number(id) } });
      if (!atual) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!(await adminDonoDaMaquina(req, atual.maquina_id))) return res.status(403).json({ error: "Acesso negado" });
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
      const reserva = await prisma.reserva.findUnique({ where: { reserva_id: Number(id) }, include: { maquina: { include: { lavanderia: true } } } });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!podeVerReserva(req, reserva)) return res.status(403).json({ error: "Acesso negado" });

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

        await notificarProprietario(reserva.maquina_id, `Máquina liberada — Reserva #${reserva.reserva_id} encerrada`);
      }

      await prisma.reserva.delete({ where: { reserva_id: Number(id) } });
      return res.status(200).json({ message: "Reserva deletada" });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao deletar reserva" });
    }
  }

  // Cancela a reserva e, se já foi paga, devolve o dinheiro pelo Stripe
  async cancelar(req: AuthRequest, res: Response) {
    try {
      const reserva = await prisma.reserva.findUnique({
        where: { reserva_id: Number(req.params.id) },
        include: { pagamentos: true, maquina: { include: { lavanderia: true } } }
      });
      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!podeVerReserva(req, reserva)) return res.status(403).json({ error: "Acesso negado" });
      if (["CANCELADA", "CONCLUIDA"].includes(reserva.status)) {
        return res.status(409).json({ error: "Esta reserva já foi encerrada" });
      }

      const pago = reserva.pagamentos.find((p) => p.status === "PAGO" && p.metodo === "stripe");
      if (pago) {
        // shortcut: o id do PaymentIntent não fica no banco, então busca pelo metadata (a busca do Stripe pode levar ~1 min para indexar); gravar o id no pagamento se isso incomodar
        const { data } = await stripe.paymentIntents.search({
          query: `metadata['reserva_id']:'${reserva.reserva_id}' AND status:'succeeded'`
        });
        if (!data[0]) return res.status(502).json({ error: "Pagamento ainda não localizado no Stripe. Tente de novo em 1 minuto." });
        try {
          await stripe.refunds.create({ payment_intent: data[0].id });
        } catch (error: any) {
          // Já estornado numa tentativa anterior que não chegou a gravar no banco: só conclui o cancelamento
          if (error?.code !== "charge_already_refunded") throw error;
        }
      }

      await prisma.$transaction(async (tx) => {
        if (pago) await tx.pagamento.update({ where: { pagamento_id: pago.pagamento_id }, data: { status: "ESTORNADO" } });
        await tx.reserva.update({ where: { reserva_id: reserva.reserva_id }, data: { status: "CANCELADA" } });

        const outraAtiva = await tx.reserva.findFirst({
          where: {
            maquina_id: reserva.maquina_id,
            reserva_id: { not: reserva.reserva_id },
            status: { notIn: ["CANCELADA", "CONCLUIDA"] }
          }
        });
        if (!outraAtiva) await tx.maquina.update({ where: { maquina_id: reserva.maquina_id }, data: { status: "LIVRE" } });

        const valor = pago ? ` — R$ ${Number(pago.valor).toFixed(2)} estornado` : "";
        await tx.notificacao.create({ data: { usuario_id: reserva.usuario_id, mensagem: `Reserva cancelada${valor}` } });
        await notificarProprietario(reserva.maquina_id, `Reserva #${reserva.reserva_id} cancelada${valor} — Máquina ${reserva.maquina.numero}`, tx);
      });

      return res.status(200).json({ message: pago ? "Reserva cancelada e pagamento estornado" : "Reserva cancelada" });
    } catch (error) {
      console.error("Erro ao cancelar reserva:", error);
      return res.status(500).json({ error: "Erro ao cancelar reserva" });
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
        // Só segue quem de fato mudou o status: outra instância pode estar liberando a mesma reserva
        const { count } = await prisma.reserva.updateMany({
          where: { reserva_id: reserva.reserva_id, status: { notIn: ["CANCELADA", "CONCLUIDA"] } },
          data: { status: "CONCLUIDA" }
        });
        if (count === 0) continue;

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

        await notificarProprietario(reserva.maquina_id, `Máquina ${reserva.maquina.numero} liberada — Reserva #${reserva.reserva_id} concluída`);
      }

      if (expiradas.length > 0) {
        console.log(`[JOB] ${expiradas.length} reserva(s) expirada(s) processada(s)`);
      }
    } catch (error) {
      console.error("[JOB] Erro ao liberar reservas expiradas:", error);
    }
  }
}
