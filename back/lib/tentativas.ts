import { Request } from "express";
import { prisma } from "./prisma";

// Tentativas erradas (login e código de admin) ficam no banco: na Vercel cada requisição pode cair numa instância diferente
export type Motivo = "login" | "codigo_admin";

export function ipDe(req: Request) {
  return String(req.headers["x-forwarded-for"] ?? req.ip ?? "").split(",")[0].trim();
}

// porIp: erros permitidos por IP em 15 min; totalPorHora: teto geral (contra quem troca de IP)
export async function bloqueado(motivo: Motivo, ip: string, porIp: number, totalPorHora?: number) {
  const [doIp, total] = await Promise.all([
    prisma.tentativa.count({ where: { motivo, ip, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } }),
    totalPorHora ? prisma.tentativa.count({ where: { motivo, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } } }) : 0,
  ]);
  return doIp >= porIp || (totalPorHora !== undefined && total >= totalPorHora);
}

export function registrarFalha(motivo: Motivo, ip: string) {
  return prisma.tentativa.create({ data: { motivo, ip } });
}
