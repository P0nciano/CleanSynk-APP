import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export class PagamentoController {
  async createIntent(req: Request, res: Response) {
    try {
      const { reserva_id, valor, currency } = req.body;

      if (!reserva_id || valor === undefined) {
        return res.status(400).json({ error: "reserva_id e valor são obrigatórios" });
      }

      const reserva = await prisma.reserva.findUnique({ where: { reserva_id: Number(reserva_id) } });

      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });

      const amount = Math.round(Number(valor) * 100); // valor em centavos

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: (currency || "brl").toLowerCase(),
        metadata: { reserva_id: String(reserva_id) },
      });

      return res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar payment intent" });
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      const sig = (req.headers["stripe-signature"] as string) || "";
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: any;
      try {
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
      } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object as Stripe.PaymentIntent;
        const reservaId = intent.metadata?.reserva_id ? Number(intent.metadata.reserva_id) : undefined;
        const amount = (intent.amount_received ?? intent.amount) / 100;

        if (reservaId) {
          await prisma.pagamento.create({
            data: {
              reserva_id: reservaId,
              valor: amount,
              status: "PAGO",
              metodo: "stripe",
              data_pagamento: new Date(),
            },
          });

          await prisma.reserva.update({ where: { reserva_id: reservaId }, data: { status: "PAGA" } });

          const reserva = await prisma.reserva.findUnique({ where: { reserva_id: reservaId } });
          if (reserva) {
            await prisma.notificacao.create({
              data: { usuario_id: reserva.usuario_id, mensagem: "Pagamento recebido via Stripe" },
            });
          }
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro no webhook" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { reserva_id, valor, status, metodo } = req.body;

      if (!reserva_id || valor === undefined || !metodo) {
        return res.status(400).json({
          error: "reserva_id, valor e metodo são obrigatórios",
        });
      }

      const reserva = await prisma.reserva.findUnique({
        where: { reserva_id: Number(reserva_id) },
      });

      if (!reserva) {
        return res.status(404).json({ error: "Reserva não encontrada" });
      }

      const pagamento = await prisma.pagamento.create({
        data: {
          reserva_id: Number(reserva_id),
          valor,
          metodo,
          status: status ?? "PAGO",
          data_pagamento: new Date(),
        },
      });

      await prisma.reserva.update({
        where: { reserva_id: Number(reserva_id) },
        data: { status: "PAGA" },
      });

      await prisma.notificacao.create({
        data: {
          usuario_id: reserva.usuario_id,
          mensagem: "Pagamento recebido com sucesso",
        },
      });

      return res.status(201).json(pagamento);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao processar pagamento" });
    }
  }

  async findByReserva(req: Request, res: Response) {
    try {
      const reservaId = Number(req.params.reservaId);

      const pagamentos = await prisma.pagamento.findMany({
        where: { reserva_id: reservaId },
        orderBy: { data_pagamento: "desc" },
      });

      return res.status(200).json(pagamentos);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar pagamentos da reserva" });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pagamentos = await prisma.pagamento.findMany({
        include: {
          reserva: {
            include: {
              usuario: true,
              maquina: true,
            },
          },
        },
        orderBy: { data_pagamento: "desc" },
      });

      return res.status(200).json(pagamentos);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar pagamentos" });
    }
  }
}
