import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class RelatorioController {
  async usoELucro(req: Request, res: Response) {
    try {
      const lavanderiaId = req.query.lavanderia_id ? Number(req.query.lavanderia_id) : undefined;

      const whereReserva = lavanderiaId
        ? { maquina: { lavanderia_id: lavanderiaId } }
        : undefined;

      // Só entra no lucro o que o Stripe confirmou
      const wherePagamento = lavanderiaId
        ? { status: "PAGO", reserva: { maquina: { lavanderia_id: lavanderiaId } } }
        : { status: "PAGO" };

      const [totalReservas, reservasConcluidas, reservasPagas, pagamentos] = await Promise.all([
        prisma.reserva.count({ where: whereReserva }),
        prisma.reserva.count({ where: { ...whereReserva, status: "CONCLUIDA" } }),
        // Pela existência do pagamento: reserva paga vira CONCLUIDA quando o horário acaba
        prisma.reserva.count({ where: { ...whereReserva, pagamentos: { some: { status: "PAGO" } } } }),
        prisma.pagamento.aggregate({ where: wherePagamento, _sum: { valor: true } }),
      ]);

      const lucroTotal = Number(pagamentos._sum.valor ?? 0);

      return res.status(200).json({
        totalReservas,
        reservasConcluidas,
        reservasPagas,
        lucroTotal: Number(lucroTotal.toFixed(2)),
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  }
}
