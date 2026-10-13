import type { CenaPronta } from "@/lib/schemas";

export const FPS = 30;
/** Respiro antes e depois da fala de cada cena (segundos). */
export const PAUSA_INICIO = 0.35;
export const PAUSA_FIM = 0.55;

export function framesDaCena(c: Pick<CenaPronta, "duracao">) {
  return Math.ceil((c.duracao + PAUSA_INICIO + PAUSA_FIM) * FPS);
}

/** Início (em frames) de cada cena + duração total. */
export function linhaDoTempo(cenas: Pick<CenaPronta, "duracao">[]) {
  const inicios: number[] = [];
  let t = 0;
  for (const c of cenas) {
    inicios.push(t);
    t += framesDaCena(c);
  }
  return { inicios, total: Math.max(1, t) };
}

export function cenaNoFrame(inicios: number[], frame: number) {
  let i = 0;
  while (i + 1 < inicios.length && inicios[i + 1] <= frame) i++;
  return i;
}

export const DIMENSOES = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
} as const;
