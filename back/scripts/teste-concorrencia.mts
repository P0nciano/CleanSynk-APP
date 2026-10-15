// Prova de concorrência: N reservas simultâneas na mesma máquina e horário → só 1 pode passar.
// Uso (com a API rodando): npx tsx scripts/teste-concorrencia.mts <email> <senha> <maquina_id> [quantidade]
const API = process.env.API_URL || "http://localhost:3000";
const [email, senha, maquinaArg, qtdArg] = process.argv.slice(2);

if (!email || !senha || !maquinaArg) {
  console.error("Uso: npx tsx scripts/teste-concorrencia.mts <email> <senha> <maquina_id> [quantidade]");
  process.exit(1);
}

const maquina_id = Number(maquinaArg);
const quantidade = Number(qtdArg) || 20;

const login = await fetch(`${API}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, senha }),
});
if (!login.ok) throw new Error(`Login falhou: ${login.status} ${await login.text()}`);
const { token } = (await login.json()) as { token: string };
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

// Horário no futuro distante para não colidir com reservas reais
const inicio = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
const fim = new Date(inicio.getTime() + 45 * 60 * 1000);
const corpo = JSON.stringify({ maquina_id, data_inicio: inicio.toISOString(), data_fim: fim.toISOString() });

console.log(`Disparando ${quantidade} reservas simultâneas na máquina ${maquina_id}...`);
const t0 = performance.now();
const respostas = await Promise.all(
  Array.from({ length: quantidade }, () => fetch(`${API}/reservas`, { method: "POST", headers, body: corpo })),
);
const ms = Math.round(performance.now() - t0);

const criadas = respostas.filter((r) => r.status === 201);
const recusadas = respostas.filter((r) => r.status === 409).length;
const erros = respostas.length - criadas.length - recusadas;

console.log(`Tempo total: ${ms} ms`);
console.log(`Criadas:   ${criadas.length}  (esperado: 1)`);
console.log(`Recusadas: ${recusadas}  (esperado: ${quantidade - 1}, "Horário indisponível")`);
console.log(`Erros:     ${erros}  (esperado: 0)`);

// Limpeza: apaga as reservas criadas pelo teste
for (const r of criadas) {
  const { reserva_id } = (await r.json()) as { reserva_id: number };
  await fetch(`${API}/reservas/${reserva_id}`, { method: "DELETE", headers });
}

const passou = criadas.length === 1 && erros === 0;
console.log(passou ? "\n✅ PASSOU: só uma reserva foi aceita." : "\n❌ FALHOU: houve reserva dupla ou erro.");
process.exit(passou ? 0 : 1);
