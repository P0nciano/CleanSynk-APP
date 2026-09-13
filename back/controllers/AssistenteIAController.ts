import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

type OcorrenciaInput = {
  lavanderia_id?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  categoria?: unknown;
  setor?: unknown;
  tempoParadoHoras?: unknown;
  envolveCliente?: unknown;
  qtdAfetados?: unknown;
};

type OcorrenciaNormalizada = {
  lavanderia_id?: number;
  titulo: string;
  descricao: string;
  categoria: string;
  setor: string;
  tempoParadoHoras: number;
  envolveCliente: boolean;
  qtdAfetados: number;
};

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "yes"].includes(value.toLowerCase().trim());
  return false;
}

function normalizarOcorrencia(item: OcorrenciaInput): OcorrenciaNormalizada | null {
  const titulo = toText(item.titulo);
  const descricao = toText(item.descricao);
  if (!titulo && !descricao) return null;

  const lavanderia_id_raw = toNumber(item.lavanderia_id, 0);

  return {
    lavanderia_id: lavanderia_id_raw > 0 ? lavanderia_id_raw : undefined,
    titulo: titulo || descricao.slice(0, 60) || "Ocorrência sem título",
    descricao: descricao || titulo,
    categoria: toText(item.categoria, "operacional"),
    setor: toText(item.setor, "geral"),
    tempoParadoHoras: Math.max(0, toNumber(item.tempoParadoHoras, 0)),
    envolveCliente: toBoolean(item.envolveCliente),
    qtdAfetados: Math.max(0, toNumber(item.qtdAfetados, 0)),
  };
}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) return JSON.parse(objectMatch[0]);
  throw new Error("Nenhum JSON válido encontrado na resposta da IA");
}

async function analisarComOpenRouter(ocorrencias: OcorrenciaNormalizada[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";

  const prompt = `Você é um especialista em gestão de lavanderias.
Analise cada ocorrência abaixo e retorne um array JSON com exatamente ${ocorrencias.length} objetos.
Cada objeto deve ter EXATAMENTE estas chaves:
- "indice": número do índice (começa em 0)
- "nivelCriticidade": uma das opções: "baixa", "media", "alta" ou "critica" — VOCÊ decide com base nos dados
- "prioridade": texto curto indicando urgência (ex: "Resolver em 2h", "Ação imediata")
- "recomendacao": ação recomendada em uma frase clara
- "justificativa": por que esse nível de criticidade foi atribuído

Critérios para decidir o nível:
- "critica": equipamento parado > 4h, envolve cliente, muitos afetados
- "alta": parado 2-4h, ou envolve cliente, ou > 10 afetados
- "media": parado 1-2h, poucos afetados
- "baixa": sem impacto ao cliente, parado < 1h

Responda APENAS com o array JSON. Sem texto, sem markdown, sem explicações.

Ocorrências: ${JSON.stringify(ocorrencias)}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": "CleanSynk",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Responda somente com JSON válido. Nenhum texto fora do JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao consultar OpenRouter: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenRouter não retornou conteúdo");

  console.log("RESPOSTA IA:", content);
  return extractJSON(content);
}

export class AssistenteIAController {
  async analisarOcorrencias(req: Request, res: Response) {
    try {
      const ocorrencias: OcorrenciaInput[] = Array.isArray(req.body?.ocorrencias)
        ? (req.body.ocorrencias as OcorrenciaInput[])
        : [];

      if (ocorrencias.length === 0) {
        return res.status(400).json({ error: "ocorrencias deve ser um array com pelo menos um item" });
      }

      const normalizadas = ocorrencias
        .map((item) => normalizarOcorrencia(item))
        .filter((item): item is OcorrenciaNormalizada => Boolean(item));

      if (normalizadas.length === 0) {
        return res.status(400).json({ error: "Nenhuma ocorrência válida foi informada" });
      }

      // Salva no banco (sem campo impacto — IA vai decidir)
      await prisma.ocorrencia.createMany({
        data: normalizadas.map((o) => ({
          lavanderia_id: o.lavanderia_id ?? 1,
          titulo: o.titulo,
          descricao: o.descricao,
          categoria: o.categoria,
          impacto: "pendente",
          setor: o.setor,
          tempoParadoHoras: o.tempoParadoHoras,
          envolveCliente: o.envolveCliente,
          qtdAfetados: o.qtdAfetados,
        })),
      });

      let analiseIA: unknown;
      try {
        analiseIA = await analisarComOpenRouter(normalizadas);
      } catch (error) {
        console.error("Erro OpenRouter:", error);
        return res.status(500).json({
          error: error instanceof Error ? error.message : "Erro ao consultar a IA.",
        });
      }

      return res.status(200).json({
        modelo: process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free",
        origemAnalise: "openrouter",
        resumo: {
          totalOcorrencias: normalizadas.length,
          analiseIA,
        },
      });
    } catch (error) {
      console.error("ERRO ASSISTENTE IA:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao analisar ocorrências" });
    }
  }

  async analisarOcorrenciasBanco(req: Request, res: Response) {
    try {
      const ocorrenciasBanco = await prisma.ocorrencia.findMany({
        include: { lavanderia: true },
        orderBy: { createdAt: "desc" },
      });

      if (ocorrenciasBanco.length === 0) {
        return res.status(404).json({ error: "Nenhuma ocorrência cadastrada" });
      }

      const normalizadas: OcorrenciaNormalizada[] = ocorrenciasBanco.map((item) => ({
        titulo: item.titulo,
        descricao: item.descricao,
        categoria: item.categoria,
        setor: item.setor,
        tempoParadoHoras: item.tempoParadoHoras,
        envolveCliente: item.envolveCliente,
        qtdAfetados: item.qtdAfetados,
      }));

      let analiseIA: unknown;
      try {
        analiseIA = await analisarComOpenRouter(normalizadas);
      } catch (error) {
        console.error("Erro OpenRouter:", error);
        return res.status(500).json({
          error: error instanceof Error ? error.message : "Erro ao consultar a IA.",
        });
      }

      return res.status(200).json({
        modelo: process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free",
        origemAnalise: "openrouter",
        totalOcorrencias: ocorrenciasBanco.length,
        ocorrencias: ocorrenciasBanco,
        analiseIA,
      });
    } catch (error) {
      console.error("ERRO ASSISTENTE IA BANCO:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao analisar ocorrências" });
    }
  }
}
