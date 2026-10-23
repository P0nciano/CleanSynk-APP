import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Campos do usuário que podem ir para a resposta (nunca a senha)
export const usuarioPublico = { select: { usuario_id: true, nome: true, email: true } } as const;

// Cada admin só enxerga as lavanderias de que é proprietário; cliente (sem admin) vê todas
export function lavanderiasDo(req: { admin?: { id: number } }) {
  return req.admin ? { proprietario_id: req.admin.id } : {};
}

async function proprietarioDaMaquina(maquinaId: number, db: Pick<typeof prisma, "maquina"> = prisma) {
  const maquina = await db.maquina.findUnique({
    where: { maquina_id: maquinaId },
    select: { lavanderia: { select: { proprietario_id: true } } },
  });
  return maquina?.lavanderia.proprietario_id;
}

export async function adminDonoDaMaquina(req: { admin?: { id: number } }, maquinaId: number) {
  return Boolean(req.admin) && (await proprietarioDaMaquina(maquinaId)) === req.admin!.id;
}

// Avisa só o dono da lavanderia da máquina, não todos os admins
export async function notificarProprietario(maquinaId: number, mensagem: string, db: Pick<typeof prisma, "maquina" | "notificacao"> = prisma) {
  const proprietarioId = await proprietarioDaMaquina(maquinaId, db);
  if (proprietarioId) await db.notificacao.create({ data: { usuario_id: proprietarioId, mensagem } });
}
