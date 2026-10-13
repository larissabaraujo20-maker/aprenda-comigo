"use client";

import type { RoteiroPronto } from "./schemas";
import { atualizarTrilha, obterTrilha } from "./store";

/**
 * Fila de geração em segundo plano (no navegador): gera as etapas em ordem,
 * uma por vez, e libera cada uma assim que fica pronta. Se a página for
 * fechada, ao reabrir a trilha a fila continua de onde parou.
 */
const emAndamento = new Set<string>();

export async function processarFila(trilhaId: string) {
  if (emAndamento.has(trilhaId)) return;
  emAndamento.add(trilhaId);
  try {
    // Etapas que ficaram "gerando" (página fechada no meio) voltam para a fila.
    atualizarTrilha(trilhaId, (t) => ({
      ...t,
      etapas: t.etapas.map((e) => (e.status === "gerando" ? { ...e, status: "pendente" } : e)),
    }));
    for (;;) {
      const t = obterTrilha(trilhaId);
      if (!t) return;
      // Prioriza a etapa que o aluno está vendo, depois a ordem natural.
      const ordem = [t.etapaAtual, ...t.etapas.map((_, i) => i)];
      const indice = ordem.find((i) => t.etapas[i]?.status === "pendente");
      if (indice === undefined) return;
      const etapa = t.etapas[indice];
      marcar(trilhaId, etapa.id, { status: "gerando", erro: undefined });
      try {
        const r = await fetch("/api/roteiro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tema: t.tema,
            calibragem: t.calibragem,
            etapas: t.etapas.map(({ titulo, objetivo, duracao_min }) => ({ titulo, objetivo, duracao_min })),
            indice,
            variacao: etapa.variacao,
            avisoRisco: t.aviso_risco,
          }),
        });
        const dados = await r.json();
        if (!r.ok) throw new Error(dados.erro ?? `Erro ${r.status}`);
        marcar(trilhaId, etapa.id, { status: "pronta", roteiro: dados as RoteiroPronto, mp4: undefined });
      } catch (e) {
        marcar(trilhaId, etapa.id, { status: "erro", erro: e instanceof Error ? e.message : String(e) });
      }
    }
  } finally {
    emAndamento.delete(trilhaId);
  }
}

function marcar(trilhaId: string, etapaId: string, patch: Record<string, unknown>) {
  atualizarTrilha(trilhaId, (t) => ({
    ...t,
    etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, ...patch } : e)),
  }));
}
