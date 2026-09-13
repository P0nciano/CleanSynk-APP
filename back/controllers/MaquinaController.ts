import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class MaquinaController {
  async create(req: Request, res: Response) {
    try {
      const { lavanderia_id, numero, tipo, status } = req.body;

      if (!lavanderia_id || numero === undefined || !tipo) {
        return res.status(400).json({
          error: "lavanderia_id, numero e tipo são obrigatórios",
        });
      }

      const lavanderia = await prisma.lavanderia.findUnique({
        where: { lavanderia_id: Number(lavanderia_id) },
      });

      if (!lavanderia) {
        return res.status(404).json({ error: "Lavanderia não encontrada" });
      }

      const maquina = await prisma.maquina.create({
        data: {
          lavanderia_id: Number(lavanderia_id),
          numero: Number(numero),
          tipo,
          status: status ?? "LIVRE",
        },
      });

      return res.status(201).json(maquina);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao cadastrar máquina" });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const maquinas = await prisma.maquina.findMany({
        include: {
          lavanderia: true,
          precos: true,
        },
        orderBy: { maquina_id: "asc" },
      });

      return res.status(200).json(maquinas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar máquinas" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const maquinaId = Number(req.params.id);

      const maquina = await prisma.maquina.findUnique({
        where: { maquina_id: maquinaId },
        include: {
          lavanderia: true,
          precos: true,
          reservas: true,
        },
      });

      if (!maquina) {
        return res.status(404).json({ error: "Máquina não encontrada" });
      }

      return res.status(200).json(maquina);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar máquina" });
    }
  }

  async findByLavanderia(req: Request, res: Response) {
    try {
      const lavanderiaId = Number(req.params.lavanderiaId);

      const maquinas = await prisma.maquina.findMany({
        where: { lavanderia_id: lavanderiaId },
        include: {
          precos: true,
        },
        orderBy: { numero: "asc" },
      });

      return res.status(200).json(maquinas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar máquinas da lavanderia" });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const maquinaId = Number(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "status é obrigatório" });
      }

      const maquina = await prisma.maquina.update({
        where: { maquina_id: maquinaId },
        data: { status },
      });

      return res.status(200).json(maquina);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar status da máquina" });
    }
  }
}
