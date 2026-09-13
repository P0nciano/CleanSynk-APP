import { getStoredToken } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export type Lavanderia = {
  lavanderia_id: number;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  distanciaKm?: number;
  maquinas?: Maquina[];
};

export type Maquina = {
  maquina_id: number;
  numero: number;
  tipo: string;
  status: string;
  lavanderia_id: number;
  precos?: Preco[];
};

export type Preco = {
  preco_id: number;
  valor: number;
  duracao_minutos: number;
};

export type Reserva = {
  reserva_id: number;
  maquina_id: number;
  usuario_id: number;
  data_inicio: string;
  data_fim: string;
  status: string;
  maquina?: Maquina;
  pagamentos?: Pagamento[];
};

export type Pagamento = {
  pagamento_id: number;
  valor: number;
  status: string;
  metodo: string;
};

export type Notificacao = {
  notificacao_id: number;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

export type AuthUser = {
  usuario_id: number;
  nome: string;
  email: string;
  tipo: string;
  token: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string; // token passado diretamente — evita depender do AsyncStorage
};

function getApiUrl(path: string) {
  if (!API_URL) throw new Error("EXPO_PUBLIC_API_URL não configurada");
  return `${API_URL}${path}`;
}

// Busca token: primeiro usa o passado diretamente, depois tenta AsyncStorage
async function resolveToken(token?: string): Promise<string> {
  if (token) return token;
  const stored = await getStoredToken();
  if (stored) return stored;
  throw new Error("Faça login para acessar esta área");
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tok = await resolveToken(options.token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tok}`,
  };

  const response = await fetch(getApiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; erro?: string } | null;
    throw new Error(payload?.error || payload?.erro || `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Sem auth (login)
async function publicFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const response = await fetch(getApiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; erro?: string } | null;
    throw new Error(payload?.error || payload?.erro || `Erro ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, senha: string) {
  return publicFetch<AuthUser>("/login", { method: "POST", body: { email, senha } });
}

export async function getLavanderias(token?: string) {
  return apiFetch<Lavanderia[]>("/lavanderias", { token });
}

export async function getLavanderia(id: number, token?: string) {
  return apiFetch<Lavanderia>(`/lavanderias/${id}`, { token });
}

export async function getReservasUsuario(usuarioId: number, token?: string) {
  return apiFetch<Reserva[]>(`/reservas/usuario/${usuarioId}`, { token });
}

export async function criarReserva(data: {
  maquina_id: number;
  usuario_id: number;
  data_inicio: string;
  data_fim: string;
  status: string;
}, token?: string) {
  return apiFetch<Reserva>("/reservas", { method: "POST", body: data, token });
}

export async function getNotificacoes(token?: string) {
  return apiFetch<Notificacao[]>("/notificacoes", { token });
}

export async function updateUsuario(id: number, data: { nome?: string; email?: string; senha?: string }, token?: string) {
  return apiFetch<AuthUser>(`/usuarios/${id}`, { method: "PATCH", body: data, token });
}

export async function getHealth() {
  return publicFetch<{ status: string }>("/health");
}
