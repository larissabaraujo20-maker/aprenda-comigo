import "server-only";
import path from "node:path";

/**
 * Todas as chaves ficam apenas no servidor. Nenhuma delas usa o prefixo
 * NEXT_PUBLIC_, então o Next.js nunca as envia ao navegador.
 */
export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  openaiKey: process.env.OPENAI_API_KEY || "",
  openaiVoice: process.env.OPENAI_TTS_VOICE || "nova",
  openaiTtsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  elevenKey: process.env.ELEVENLABS_API_KEY || "",
  elevenVoice: process.env.ELEVENLABS_VOICE_ID || "",
  elevenModel: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  ttsProvider: (process.env.TTS_PROVIDER || "").toLowerCase(),
  youtubeKey: process.env.YOUTUBE_API_KEY || "",
  // Em serverless (Vercel/Netlify) só /tmp é gravável — e é temporário.
  dataDir: path.resolve(process.env.DATA_DIR || (process.env.VERCEL || process.env.NETLIFY ? "/tmp/aprenda-comigo" : ".data")),
  /** "auto" (padrão): renderiza MP4 se não estiver em ambiente serverless. */
  renderMp4: process.env.RENDER_MP4 || "auto",
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || "",
};

export function ttsAtivo(): "openai" | "elevenlabs" | null {
  if (env.ttsProvider === "elevenlabs" && env.elevenKey && env.elevenVoice) return "elevenlabs";
  if (env.ttsProvider === "openai" && env.openaiKey) return "openai";
  if (env.elevenKey && env.elevenVoice) return "elevenlabs";
  if (env.openaiKey) return "openai";
  return null;
}

export function renderMp4Ativo(): boolean {
  if (env.renderMp4 === "false" || env.renderMp4 === "0") return false;
  if (env.renderMp4 === "true" || env.renderMp4 === "1") return true;
  // Vercel/Netlify não têm Chrome + ffmpeg nem processos longos.
  return !process.env.VERCEL && !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME;
}
