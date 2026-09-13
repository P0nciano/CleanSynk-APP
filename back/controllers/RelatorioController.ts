import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class RelatorioController {
  async usoELucro(req: Request, res: Response) {
    try {
      const lavanderiaId = req.query.lavanderia_id ? Number(req.query.lavanderia_id) : undefined;

      const whereReserva = lavanderiaId
        ? { maquina: { lavanderia_id: lavanderiaId } }
        : undefined;

      const wherePagamento = lavanderiaId
        ? { reserva: { maquina: { lavanderia_id: lavanderiaId } } }
        : undefined;

      const [totalReservas, reservasConcluidas, reservasPagas, pagamentos] = await Promise.all([
        prisma.reserva.count({ where: whereReserva }),
        prisma.reserva.count({ where: { ...whereReserva, status: "CONCLUIDA" } }),
        prisma.reserva.count({ where: { ...whereReserva, status: "PAGA" } }),
        prisma.pagamento.findMany({
          where: wherePagamento,
          select: { valor: true },
        }),
      ]);

      const lucroTotal = pagamentos.reduce((acc, pagamento) => acc + Number(pagamento.valor), 0);

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
