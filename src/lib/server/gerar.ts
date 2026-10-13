import "server-only";
import { z } from "zod";
import {
  CalibragemSchema,
  EtapaPlanoSchema,
  RoteiroSchema,
  TrilhaPlanoSchema,
  type CenaPronta,
  type RoteiroPronto,
  type TrilhaPlano,
} from "../schemas";
import { gerarJson } from "./claude";
import { roteiroDemo, trilhaDemo } from "./demo";
import { env, ttsAtivo } from "./env";
import { promptRoteiro, promptTrilha } from "./prompts";
import { cacheKey, fileUrl, readJson, writeData, writeJson } from "./storage";
import { estimarDuracao, narrar } from "./tts";

export const PedidoTrilhaSchema = z.object({
  tema: z.string().trim().min(2).max(200),
  calibragem: CalibragemSchema,
});

export const PedidoRoteiroSchema = z.object({
  tema: z.string().trim().min(2).max(200),
  calibragem: CalibragemSchema,
  etapas: z.array(EtapaPlanoSchema).min(1).max(10),
  indice: z.number().int().min(0),
  variacao: z.number().int().min(0).max(20).default(0),
  avisoRisco: z.string().nullable().default(null),
});

const modoIa = () => (env.anthropicKey ? env.anthropicModel : "demo");

export async function gerarTrilha(p: z.infer<typeof PedidoTrilhaSchema>) {
  const key = cacheKey("trilha", modoIa(), p.tema, p.calibragem);
  const emCache = await readJson<TrilhaPlano>(`cache/trilhas/${key}.json`);
  if (emCache) return { plano: emCache, cache: true, demo: !env.anthropicKey };

  const plano = env.anthropicKey
    ? await gerarJson(TrilhaPlanoSchema, promptTrilha(p.tema, p.calibragem), { effort: "low" })
    : TrilhaPlanoSchema.parse(trilhaDemo(p.tema, p.calibragem));
  await writeJson(`cache/trilhas/${key}.json`, plano);
  return { plano, cache: false, demo: !env.anthropicKey };
}

export async function gerarRoteiro(p: z.infer<typeof PedidoRoteiroSchema>): Promise<RoteiroPronto & { cache: boolean }> {
  if (p.indice >= p.etapas.length) throw new Error("Etapa inexistente");
  const etapa = p.etapas[p.indice];
  const voz = ttsAtivo();
  const key = cacheKey(
    "roteiro-v1",
    modoIa(),
    voz ?? "navegador",
    p.tema,
    p.calibragem,
    etapa.titulo,
    etapa.objetivo,
    p.indice,
    p.variacao,
  );
  const emCache = await readJson<RoteiroPronto>(`cache/roteiros/${key}.json`);
  if (emCache) return { ...emCache, cache: true };

  // 1) Roteiro (JSON validado; o Claude corrige sozinho se vier inválido)
  const roteiro = env.anthropicKey
    ? await gerarJson(RoteiroSchema, promptRoteiro(p))
    : RoteiroSchema.parse(roteiroDemo(p.tema, etapa, p.indice, p.calibragem, p.avisoRisco, p.variacao));

  // 2) Narração por cena (duração real de cada trecho define a duração da cena)
  const cenas: CenaPronta[] = await mapLimit(roteiro.cenas, 3, async (cena) => {
    if (!voz) return { ...cena, audio: null, duracao: estimarDuracao(cena.narracao) };
    const { wav, duracao } = await narrar(cena.narracao);
    const rel = `audio/${key}/${cena.numero}.wav`;
    await writeData(rel, wav);
    return { ...cena, audio: fileUrl(rel), duracao };
  });

  const pronto: RoteiroPronto = {
    etapa: roteiro.etapa,
    titulo: roteiro.titulo,
    cenas,
    vozFonte: voz ?? "navegador",
    cacheKey: key,
    geradoEm: new Date().toISOString(),
  };
  await writeJson(`cache/roteiros/${key}.json`, pronto);
  return { ...pronto, cache: false };
}

async function mapLimit<T, R>(itens: T[], limite: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(itens.length);
  let prox = 0;
  await Promise.all(
    Array.from({ length: Math.min(limite, itens.length) }, async () => {
      while (prox < itens.length) {
        const i = prox++;
        out[i] = await fn(itens[i]);
      }
    }),
  );
  return out;
}
