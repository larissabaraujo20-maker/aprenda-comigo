import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env, renderMp4Ativo } from "@/lib/server/env";
import { erroHttp } from "@/lib/server/http";
import { cacheKey, fileUrl, readJson, writeJson } from "@/lib/server/storage";
import { registrarRender } from "@/lib/server/costs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: "fila" | "renderizando" | "pronto" | "erro";
  progresso?: number;
  arquivo?: string;
  erro?: string;
  criadoEm: string;
  segundosVideo?: number;
  custoRegistrado?: boolean;
  props: unknown;
};

const PedidoSchema = z.object({
  roteiro: z.object({
    cacheKey: z.string(),
    titulo: z.string(),
    etapa: z.number(),
    cenas: z.array(z.any()).min(1),
  }),
  totalEtapas: z.number().int().min(1),
  formato: z.enum(["16:9", "9:16"]).default("16:9"),
});

function resposta(job: Job) {
  return {
    id: job.id,
    status: job.status,
    progresso: job.progresso ?? 0,
    erro: job.erro,
    url: job.arquivo ? fileUrl(job.arquivo) : undefined,
  };
}

/** Enfileira a renderização do MP4 de uma etapa (reaproveita se já existir). */
export async function POST(req: Request) {
  try {
    if (!renderMp4Ativo()) {
      return NextResponse.json(
        { erro: "Renderização de MP4 desativada neste servidor (ambiente serverless). Rode localmente ou use Remotion Lambda." },
        { status: 501 },
      );
    }
    const p = PedidoSchema.parse(await req.json());
    const id = cacheKey("mp4-v1", p.roteiro.cacheKey, p.formato);
    const existente = await readJson<Job>(`jobs/${id}.json`);
    if (existente && existente.status !== "erro") return NextResponse.json(resposta(existente));

    const origem = new URL(req.url).origin;
    const job: Job = {
      id,
      status: "fila",
      criadoEm: new Date().toISOString(),
      props: {
        titulo: p.roteiro.titulo,
        etapa: p.roteiro.etapa,
        totalEtapas: p.totalEtapas,
        cenas: p.roteiro.cenas,
        formato: p.formato,
        baseUrl: origem,
      },
    };
    await writeJson(`jobs/${id}.json`, job);
    iniciarWorker();
    return NextResponse.json(resposta(job));
  } catch (e) {
    return erroHttp(e);
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-f0-9]{32}$/.test(id)) return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  const job = await readJson<Job>(`jobs/${id}.json`);
  if (!job) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  if (job.status === "pronto" && !job.custoRegistrado) {
    job.custoRegistrado = true;
    await writeJson(`jobs/${id}.json`, job);
    void registrarRender(job.segundosVideo ?? 0);
  }
  if (job.status === "fila") iniciarWorker(); // caso o worker tenha caído
  return NextResponse.json(resposta(job));
}

function iniciarWorker() {
  const script = path.join(process.cwd(), "scripts", "render-worker.mjs");
  const filho = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env, DATA_DIR: env.dataDir },
  });
  filho.unref();
}
