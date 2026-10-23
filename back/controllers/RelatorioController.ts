import { Response } from "express";
import { prisma, lavanderiasDo } from "../lib/prisma";
import { AuthRequest } from "../middlewares/autentica";

export class RelatorioController {
  async usoELucro(req: AuthRequest, res: Response) {
    try {
      const lavanderiaId = req.query.lavanderia_id ? Number(req.query.lavanderia_id) : undefined;

      const whereReserva = { maquina: { lavanderia: { ...lavanderiasDo(req), ...(lavanderiaId && { lavanderia_id: lavanderiaId }) } } };

      // Só entra no lucro o que o Stripe confirmou
      const wherePagamento = { status: "PAGO", reserva: whereReserva };

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
