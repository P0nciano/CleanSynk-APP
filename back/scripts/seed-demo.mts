// Dados de demonstração: reservas pagas dos últimos 30 dias em todas as lavanderias.
// Uso: npx tsx scripts/seed-demo.mts            (apaga a demo anterior e gera de novo)
//      npx tsx scripts/seed-demo.mts --limpar   (só apaga a demo)
// Os pagamentos da demo usam metodo = "demo", e é por ele que a limpeza acha o que apagar.
import { prisma } from "../lib/prisma";

const CLIENTES = [1, 3, 4, 5];

// Mesmos programas do app (front/src/lib/api.ts)
function programaDa(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("seca") && t.includes("lava")) return { minutos: 65, valor: 30 };
  if (t.includes("seca")) return { minutos: 35, valor: 18 };
  return { minutos: 30, valor: 20 };
}

// Aleatório com semente: a demo sai igual toda vez
let semente = 42;
function sorteio(max: number) {
  semente = (semente * 1103515245 + 12345) % 2 ** 31;
  return Math.floor(semente / 65536) % max;
}

async function limpar() {
  const demo = await prisma.pagamento.findMany({ where: { metodo: "demo" }, select: { reserva_id: true } });
  const ids = [...new Set(demo.map((p) => p.reserva_id))];
  await prisma.$transaction([
    prisma.pagamento.deleteMany({ where: { reserva_id: { in: ids } } }),
    prisma.reserva.deleteMany({ where: { reserva_id: { in: ids } } }),
  ]);
  console.log(`demo anterior apagada: ${ids.length} reservas`);
}

await limpar();

if (!process.argv.includes("--limpar")) {
  const maquinas = await prisma.maquina.findMany({ include: { lavanderia: true } });
  const hoje = new Date();
  let total = 0;
  let receita = 0;

  for (const m of maquinas) {
    const { minutos, valor } = programaDa(m.tipo);
    // Um uso por dia sorteado, no máximo: assim as reservas da mesma máquina nunca se sobrepõem
    const dias = new Set(Array.from({ length: 6 + sorteio(7) }, () => 1 + sorteio(30)));
    for (const dia of dias) {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - dia);
      inicio.setHours(8 + sorteio(12), sorteio(4) * 15, 0, 0);
      const fim = new Date(inicio.getTime() + minutos * 60_000);
      const cancelada = sorteio(10) === 0;
      await prisma.reserva.create({
        data: {
          maquina_id: m.maquina_id,
          usuario_id: CLIENTES[sorteio(CLIENTES.length)],
          data_inicio: inicio,
          data_fim: fim,
          status: cancelada ? "CANCELADA" : "CONCLUIDA",
          pagamentos: { create: { valor, status: cancelada ? "ESTORNADO" : "PAGO", metodo: "demo", data_pagamento: inicio } },
        },
      });
      total++;
      if (!cancelada) receita += valor;
    }
  }
  console.log(`demo criada: ${total} reservas, R$ ${receita} pagos em ${maquinas.length} máquinas`);
}

await prisma.$disconnect();
