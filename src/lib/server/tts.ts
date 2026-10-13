import "server-only";
import { env, ttsAtivo } from "./env";
import { registrarTts } from "./costs";

export type AudioGerado = { wav: Buffer; duracao: number };

const SAMPLE_RATE = 24000;

/**
 * Gera a narração de um trecho em pt-BR e devolve WAV + duração exata.
 * Pedimos PCM 16-bit mono 24 kHz aos dois provedores, então a duração é
 * simplesmente bytes / (24000 * 2) — sem precisar de ffprobe.
 */
export async function narrar(texto: string): Promise<AudioGerado> {
  const provedor = ttsAtivo();
  if (!provedor) throw new Error("Nenhum provedor de TTS configurado");
  const pcm = provedor === "elevenlabs" ? await elevenLabs(texto) : await openAi(texto);
  void registrarTts(provedor, texto.length);
  return { wav: pcmParaWav(pcm), duracao: pcm.length / (SAMPLE_RATE * 2) };
}

async function openAi(texto: string): Promise<Buffer> {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.openaiTtsModel,
      voice: env.openaiVoice,
      input: texto,
      response_format: "pcm",
      instructions:
        "Fale em português do Brasil, com sotaque brasileiro natural, tom de professor amigável, ritmo calmo e claro.",
    }),
  });
  if (!r.ok) throw new Error(`OpenAI TTS falhou (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}

async function elevenLabs(texto: string): Promise<Buffer> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.elevenVoice)}?output_format=pcm_24000`,
    {
      method: "POST",
      headers: { "xi-api-key": env.elevenKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: texto,
        model_id: env.elevenModel,
        language_code: "pt",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!r.ok) throw new Error(`ElevenLabs falhou (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}

function pcmParaWav(pcm: Buffer) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Estimativa usada quando não há TTS (voz do navegador): ~2,6 palavras/s. */
export function estimarDuracao(texto: string) {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.5, palavras / 2.6 + 0.4);
}
