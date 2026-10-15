import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Campos do usuário que podem ir para a resposta (nunca a senha)
export const usuarioPublico = { select: { usuario_id: true, nome: true, email: true } } as const;

export async function notificarAdmins(mensagem: string, db: Pick<typeof prisma, "usuario" | "notificacao"> = prisma) {
  const admins = await db.usuario.findMany({ where: { tipo: "ADMIN" }, select: { usuario_id: true } });
  await db.notificacao.createMany({ data: admins.map((a) => ({ usuario_id: a.usuario_id, mensagem })) });
}
