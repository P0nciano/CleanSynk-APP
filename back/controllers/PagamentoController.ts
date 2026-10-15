import { Request, Response } from "express";
import { prisma, usuarioPublico } from "../lib/prisma";
import Stripe from "stripe";
import { AuthRequest } from "../middlewares/autentica";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

// shortcut: preço fixo por programa (igual ao da tela EscolherMaquina); trocar pela tabela Preco quando cada máquina tiver preços cadastrados
const PRECO_PROGRAMA: Record<string, number> = { lava_seca: 30, secagem: 18 };

export class PagamentoController {
  async createIntent(req: AuthRequest, res: Response) {
    try {
      const { reserva_id, programa } = req.body;

      // O valor vem do servidor, nunca do app
      const valorNumerico = PRECO_PROGRAMA[programa];
      if (!reserva_id || !valorNumerico) {
        return res.status(400).json({ error: "reserva_id e programa válidos são obrigatórios" });
      }

      const reserva = await prisma.reserva.findUnique({
        where: { reserva_id: Number(reserva_id) },
        include: { pagamentos: true },
      });

      if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
      if (!req.user || (req.user.role !== "ADMIN" && reserva.usuario_id !== req.user.id)) {
        return res.status(403).json({ error: "Você não pode pagar esta reserva" });
      }
      if (reserva.pagamentos.some((pagamento) => pagamento.status === "PAGO")) {
        return res.status(409).json({ error: "Esta reserva já possui um pagamento confirmado" });
      }

      const amount = Math.round(valorNumerico * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "brl",
        metadata: {
          reserva_id: String(reserva.reserva_id),
          usuario_id: String(reserva.usuario_id),
        },
      });

      return res.status(200).json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      });
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
          const pagamentoExistente = await prisma.pagamento.findFirst({
            where: { reserva_id: reservaId, status: "PAGO", metodo: "stripe" },
          });

          if (!pagamentoExistente) {
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
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro no webhook" });
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
              usuario: usuarioPublico,
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
