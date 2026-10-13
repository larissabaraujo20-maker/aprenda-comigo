"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayCircle, Trash2 } from "lucide-react";
import { progresso, removerTrilha, useTrilhas } from "@/lib/store";

export default function MinhasTrilhas() {
  const trilhas = useTrilhas();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Minhas trilhas</h1>
      <p className="mt-1 text-sm text-suave">Salvas neste navegador.</p>
      {trilhas.length === 0 ? (
        <div className="cartao mt-6 p-8 text-center">
          <p className="text-suave">Você ainda não começou nenhuma trilha.</p>
          <Link href="/" className="btn-primaria mt-4">
            Aprender algo novo
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {trilhas.map((t) => {
            const prontas = t.etapas.filter((e) => e.status === "pronta").length;
            return (
              <li key={t.id} className="cartao flex items-center gap-3 p-4">
                <Link href={`/trilha/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <PlayCircle className="shrink-0 text-primaria" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{t.titulo}</div>
                    <div className="text-xs text-suave">
                      {t.etapas.length} etapas · {prontas} com vídeo · parou na etapa {t.etapaAtual + 1}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-superficie-2">
                      <div className="h-full bg-sucesso" style={{ width: `${progresso(t)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm text-suave">{progresso(t)}%</span>
                </Link>
                <button
                  className="rounded-lg p-2 text-suave hover:bg-perigo/10 hover:text-perigo"
                  onClick={() => confirm(`Apagar a trilha "${t.titulo}"?`) && removerTrilha(t.id)}
                  aria-label="Apagar trilha"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
