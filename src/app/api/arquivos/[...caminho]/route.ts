import { promises as fs } from "node:fs";
import { dataPath } from "@/lib/server/storage";

export const runtime = "nodejs";

const TIPOS: Record<string, string> = { wav: "audio/wav", mp4: "video/mp4", json: "application/json" };
const PERMITIDOS = ["audio", "videos"];

/** Serve áudios e MP4 gerados (com suporte a Range para o player de vídeo). */
export async function GET(req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await ctx.params;
  if (!PERMITIDOS.includes(caminho[0]) || caminho.some((p) => p.includes(".."))) {
    return new Response("Não encontrado", { status: 404 });
  }
  let arquivo: string;
  let tamanho: number;
  try {
    arquivo = dataPath(...caminho);
    tamanho = (await fs.stat(arquivo)).size;
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  const ext = arquivo.split(".").pop() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": TIPOS[ext] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (new URL(req.url).searchParams.has("download")) {
    headers["Content-Disposition"] = `attachment; filename="${caminho[caminho.length - 1]}"`;
  }
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const fh = await fs.open(arquivo, "r");
  try {
    if (range) {
      const ini = range[1] ? Number(range[1]) : 0;
      const fim = range[2] ? Math.min(Number(range[2]), tamanho - 1) : tamanho - 1;
      const buf = Buffer.alloc(fim - ini + 1);
      await fh.read(buf, 0, buf.length, ini);
      return new Response(buf, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${ini}-${fim}/${tamanho}`, "Content-Length": String(buf.length) },
      });
    }
    const buf = await fh.readFile();
    return new Response(buf, { headers: { ...headers, "Content-Length": String(tamanho) } });
  } finally {
    await fh.close();
  }
}
