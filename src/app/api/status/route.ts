import { NextResponse } from "next/server";
import { env, renderMp4Ativo, ttsAtivo } from "@/lib/server/env";
import type { StatusServidor } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  const s: StatusServidor = {
    claude: Boolean(env.anthropicKey),
    tts: ttsAtivo(),
    youtube: Boolean(env.youtubeKey),
    renderMp4: renderMp4Ativo(),
    modelo: env.anthropicKey ? env.anthropicModel : "demonstração",
  };
  return NextResponse.json(s);
}
