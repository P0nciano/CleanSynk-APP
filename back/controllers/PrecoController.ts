import { Request, Response } from "express";
import { prisma, adminDonoDaMaquina } from "../lib/prisma";
import { AuthRequest } from "../middlewares/autentica";

async function donoDoPreco(req: AuthRequest, precoId: number) {
  const preco = await prisma.preco.findUnique({ where: { preco_id: precoId } });
  return Boolean(preco) && adminDonoDaMaquina(req, preco!.maquina_id);
}

export class PrecoController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { maquina_id, valor, duracao_minutos } = req.body;

      if (!maquina_id || valor === undefined || !duracao_minutos) {
        return res.status(400).json({
          error: "maquina_id, valor e duracao_minutos são obrigatórios",
        });
      }

      const maquina = await prisma.maquina.findUnique({
        where: { maquina_id: Number(maquina_id) },
      });

      if (!maquina) {
        return res.status(404).json({ error: "Máquina não encontrada" });
      }
      if (!(await adminDonoDaMaquina(req, maquina.maquina_id))) {
        return res.status(403).json({ error: "Esta máquina não é sua" });
      }

      const preco = await prisma.preco.create({
        data: {
          maquina_id: Number(maquina_id),
          valor,
          duracao_minutos: Number(duracao_minutos),
        },
      });

      return res.status(201).json(preco);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao criar preço" });
    }
  }

  async findByMaquina(req: Request, res: Response) {
    try {
      const maquinaId = Number(req.params.maquinaId);

      const precos = await prisma.preco.findMany({
        where: { maquina_id: maquinaId },
        orderBy: { duracao_minutos: "asc" },
      });

      return res.status(200).json(precos);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar preços da máquina" });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const precoId = Number(req.params.id);
      const { valor, duracao_minutos } = req.body;
      if (!(await donoDoPreco(req, precoId))) return res.status(403).json({ error: "Este preço não é seu" });

      const preco = await prisma.preco.update({
        where: { preco_id: precoId },
        data: {
          valor,
          duracao_minutos,
        },
      });

      return res.status(200).json(preco);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar preço" });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const precoId = Number(req.params.id);
      if (!(await donoDoPreco(req, precoId))) return res.status(403).json({ error: "Este preço não é seu" });

      await prisma.preco.delete({
        where: { preco_id: precoId },
      });

      return res.status(200).json({ message: "Preço removido" });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao remover preço" });
    }
  }
}
