import "server-only";
import { readJson, writeJson } from "./storage";

/**
 * Preços aproximados em US$ (out/2026). Ajuste se sua conta tiver outro preço.
 * Claude: por milhão de tokens. TTS: por milhão de caracteres. Render: estimativa
 * de custo de CPU por minuto de vídeo (0 quando roda na sua máquina).
 */
const PRECO_CLAUDE: Record<string, { in: number; out: number }> = {
  "claude-opus-5-5": { in: 4, out: 20 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-fable-5-1": { in: 10, out: 50 },
};
const PRECO_TTS_POR_MILHAO: Record<string, number> = {
  openai: 15,
  elevenlabs: 180,
};
const PRECO_RENDER_POR_MIN = Number(process.env.RENDER_COST_PER_MIN || 0);

export type CustoMes = {
  claude: { usd: number; inputTokens: number; outputTokens: number; chamadas: number };
  tts: { usd: number; caracteres: number };
  render: { usd: number; minutos: number };
};

type Arquivo = Record<string, CustoMes>;

const vazio = (): CustoMes => ({
  claude: { usd: 0, inputTokens: 0, outputTokens: 0, chamadas: 0 },
  tts: { usd: 0, caracteres: 0 },
  render: { usd: 0, minutos: 0 },
});

const mesAtual = () => new Date().toISOString().slice(0, 7);

// Serializa as gravações para não perder incrementos concorrentes.
let fila: Promise<unknown> = Promise.resolve();
function atualizar(fn: (m: CustoMes) => void) {
  fila = fila.then(async () => {
    const dados = (await readJson<Arquivo>("custos.json")) ?? {};
    const mes = mesAtual();
    dados[mes] ??= vazio();
    fn(dados[mes]);
    await writeJson("custos.json", dados);
  }).catch((e) => console.error("[custos]", e));
  return fila;
}

export function registrarClaude(model: string, inputTokens: number, outputTokens: number) {
  const p = PRECO_CLAUDE[model] ?? PRECO_CLAUDE["claude-opus-5-5"];
  return atualizar((m) => {
    m.claude.inputTokens += inputTokens;
    m.claude.outputTokens += outputTokens;
    m.claude.chamadas += 1;
    m.claude.usd += (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
  });
}

export function registrarTts(provedor: string, caracteres: number) {
  const p = PRECO_TTS_POR_MILHAO[provedor] ?? 0;
  return atualizar((m) => {
    m.tts.caracteres += caracteres;
    m.tts.usd += (caracteres * p) / 1_000_000;
  });
}

export function registrarRender(segundos: number) {
  return atualizar((m) => {
    m.render.minutos += segundos / 60;
    m.render.usd += (segundos / 60) * PRECO_RENDER_POR_MIN;
  });
}

export async function lerCustos(): Promise<Arquivo> {
  return (await readJson<Arquivo>("custos.json")) ?? {};
}
