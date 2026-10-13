"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { progresso, useTrilhas } from "@/lib/store";

const EXEMPLOS = [
  "Fazer pão de fermentação natural",
  "Usar a fórmula PROCV no Excel",
  "Editar vídeo no CapCut",
  "Entender juros compostos",
  "Trocar o pneu do carro",
  "Começar a programar em Python",
];

export default function Inicio() {
  const router = useRouter();
  const [tema, setTema] = useState("");
  const trilhas = useTrilhas();
  const recentes = trilhas.slice(0, 3);

  const ir = (t: string) => {
    const v = t.trim();
    if (v.length < 2) return;
    router.push(`/criar?tema=${encodeURIComponent(v)}`);
  };

  return (
    <div className="mx-auto max-w-2xl pt-6 sm:pt-14">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primaria-clara px-3 py-1 text-xs font-semibold text-primaria">
        <Sparkles size={14} /> Vídeos curtos, passo a passo, feitos para você
      </div>
      <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">O que você quer aprender hoje?</h1>
      <p className="mt-3 text-suave">
        Digite qualquer assunto. Eu monto uma trilha em etapas e gero um vídeo narrado para cada uma.
      </p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          ir(tema);
        }}
      >
        <input
          autoFocus
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ex.: fazer pão de fermentação natural"
          maxLength={200}
          className="w-full rounded-2xl border border-borda bg-superficie px-5 py-4 text-base outline-none ring-primaria/30 placeholder:text-suave focus:border-primaria focus:ring-4"
          aria-label="O que você quer aprender?"
        />
        <button type="submit" className="btn-primaria px-6 py-4 text-base" disabled={tema.trim().length < 2}>
          Começar <ArrowRight size={18} />
        </button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        {EXEMPLOS.map((ex) => (
          <button key={ex} className="chip" onClick={() => ir(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {recentes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-suave">Continuar de onde parei</h2>
          <div className="flex flex-col gap-2">
            {recentes.map((t) => (
              <Link key={t.id} href={`/trilha/${t.id}`} className="cartao flex items-center gap-3 p-4 hover:border-primaria">
                <PlayCircle className="shrink-0 text-primaria" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.titulo}</div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-superficie-2">
                    <div className="h-full bg-sucesso" style={{ width: `${progresso(t)}%` }} />
                  </div>
                </div>
                <span className="text-sm text-suave">{progresso(t)}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
