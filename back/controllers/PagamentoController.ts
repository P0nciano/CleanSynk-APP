import { Request, Response } from "express";
import { prisma, usuarioPublico, lavanderiasDo } from "../lib/prisma";
import Stripe from "stripe";
import { AuthRequest } from "../middlewares/autentica";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

// Preço padrão de cada programa (igual ao PROGRAMAS de front/src/lib/api.ts); a lavanderia pode ter o seu (preco_<programa>)
const PRECO_PROGRAMA: Record<string, number> = { lavagem: 20, secagem: 18, lava_seca: 30 };

// Valida a cobrança (dono da reserva, ainda não paga) e calcula o valor no servidor.
// Devolve os dados ou já responde o erro e devolve null.
async function prepararCobranca(req: AuthRequest, res: Response) {
  const { reserva_id, programa } = req.body;

  if (!reserva_id || !Object.hasOwn(PRECO_PROGRAMA, programa)) {
    res.status(400).json({ error: "reserva_id e programa válidos são obrigatórios" });
    return null;
  }

  const reserva = await prisma.reserva.findUnique({
    where: { reserva_id: Number(reserva_id) },
    include: { pagamentos: true, maquina: { include: { lavanderia: true } } },
  });

  if (!reserva) {
    res.status(404).json({ error: "Reserva não encontrada" });
    return null;
  }
  if (!req.user || (req.user.role !== "ADMIN" && reserva.usuario_id !== req.user.id)) {
    res.status(403).json({ error: "Você não pode pagar esta reserva" });
    return null;
  }
  if (reserva.pagamentos.some((pagamento) => pagamento.status === "PAGO")) {
    res.status(409).json({ error: "Esta reserva já possui um pagamento confirmado" });
    return null;
  }

  // O valor vem do servidor, nunca do app: preço da lavanderia ou o padrão
  const lavanderia = reserva.maquina.lavanderia as unknown as Record<string, unknown>;
  const valorNumerico = Number(lavanderia[`preco_${programa}`] ?? PRECO_PROGRAMA[programa]);

  return {
    amount: Math.round(valorNumerico * 100),
    // O webhook payment_intent.succeeded usa esses metadados para marcar a reserva como PAGA
    metadata: { reserva_id: String(reserva.reserva_id), usuario_id: String(reserva.usuario_id) },
  };
}

export class PagamentoController {
  // App (Android/iOS): PaymentSheet nativo
  async createIntent(req: AuthRequest, res: Response) {
    try {
      const cobranca = await prepararCobranca(req, res);
      if (!cobranca) return;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: cobranca.amount,
        currency: "brl",
        metadata: cobranca.metadata,
      });

      return res.status(200).json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar payment intent" });
    }
  }

  // Web: página de pagamento do próprio Stripe (o SDK nativo não roda no navegador)
  async createCheckout(req: AuthRequest, res: Response) {
    try {
      const cobranca = await prepararCobranca(req, res);
      if (!cobranca) return;

      const site = process.env.FRONTEND_URL || req.headers.origin;
      if (!site) return res.status(500).json({ error: "FRONTEND_URL não configurada" });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: cobranca.amount,
            product_data: { name: `CleanSynk — Reserva #${cobranca.metadata.reserva_id}` },
          },
        }],
        payment_intent_data: { metadata: cobranca.metadata },
        success_url: `${site}/?pagamento=sucesso`,
        cancel_url: `${site}/?cancelar_reserva=${cobranca.metadata.reserva_id}`,
      });

      return res.status(200).json({ url: session.url });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar checkout" });
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

  async findAll(req: AuthRequest, res: Response) {
    try {
      const pagamentos = await prisma.pagamento.findMany({
        where: { reserva: { maquina: { lavanderia: lavanderiasDo(req) } } },
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
