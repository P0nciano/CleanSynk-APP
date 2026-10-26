// Horário de funcionamento (o mesmo mostrado no detalhe da lavanderia)
export const ABRE = 7;
export const FECHA = 22;

// Inícios possíveis hoje, de 30 em 30 min, a partir de daqui a pelo menos 15 min e terminando até o fechamento
export function horariosDeHoje(minutos: number, agora = new Date()) {
  const fechamento = new Date(agora); fechamento.setHours(FECHA, 0, 0, 0);
  const t = new Date(agora); t.setSeconds(0, 0);
  t.setMinutes(Math.ceil((t.getMinutes() + 15) / 30) * 30);
  const lista: Date[] = [];
  while (t.getTime() + minutos * 60_000 <= fechamento.getTime()) {
    if (t.getHours() >= ABRE) lista.push(new Date(t));
    t.setMinutes(t.getMinutes() + 30);
  }
  return lista;
}

export const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
