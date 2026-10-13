import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * Armazenamento local (Fase 1): tudo vai para DATA_DIR (padrão ./.data).
 *  - cache/   roteiros e trilhas já gerados (reaproveitados no mesmo pedido)
 *  - audio/   narrações em WAV
 *  - videos/  MP4 renderizados
 *  - custos.json  gastos por mês
 * Na Fase 2 isso migra para o Supabase Storage/Postgres.
 */
export function dataPath(...parts: string[]) {
  const p = path.resolve(env.dataDir, ...parts);
  if (!p.startsWith(env.dataDir)) throw new Error("Caminho inválido");
  return p;
}

export async function writeData(rel: string, data: string | Buffer) {
  const p = dataPath(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
  return p;
}

export async function readData(rel: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(dataPath(rel));
  } catch {
    return null;
  }
}

export async function readJson<T>(rel: string): Promise<T | null> {
  const buf = await readData(rel);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function writeJson(rel: string, value: unknown) {
  return writeData(rel, JSON.stringify(value, null, 2));
}

/** Chave de cache estável: normaliza acentos/caixa/espaços do pedido. */
export function cacheKey(...parts: unknown[]) {
  const norm = parts
    .map((p) =>
      typeof p === "string"
        ? p.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()
        : JSON.stringify(p),
    )
    .join("|");
  return createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

/** URL pública (servida por /api/arquivos) de um arquivo dentro de DATA_DIR. */
export function fileUrl(rel: string) {
  return `/api/arquivos/${rel.split(path.sep).join("/")}`;
}
