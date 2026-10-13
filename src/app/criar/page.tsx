"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clapperboard,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  NIVEL_LABEL,
  OBJETIVO_LABEL,
  TEMPO_LABEL,
  type Calibragem,
  type EtapaPlano,
  type TrilhaPlano,
} from "@/lib/schemas";
import { novoId, salvarTrilha } from "@/lib/store";
import { AvisoModo } from "@/components/AvisoModo";

const PERGUNTAS = [
  { chave: "nivel", titulo: "Qual é o seu nível atual?", opcoes: NIVEL_LABEL },
  { chave: "tempo", titulo: "Quanto tempo você tem?", opcoes: TEMPO_LABEL },
  { chave: "objetivo", titulo: "Qual é o seu objetivo?", opcoes: OBJETIVO_LABEL },
] as const satisfies readonly { chave: keyof Calibragem; titulo: string; opcoes: Record<string, string> }[];

export default function CriarPagina() {
  return (
    <Suspense fallback={null}>
      <Criar />
    </Suspense>
  );
}

function Criar() {
  const params = useSearchParams();
  const router = useRouter();
  const tema = (params.get("tema") ?? "").trim();
  const [calib, setCalib] = useState<Partial<Calibragem>>({});
  const [fase, setFase] = useState<"calibrar" | "gerando" | "editar">("calibrar");
  const [plano, setPlano] = useState<TrilhaPlano | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!tema) router.replace("/");
  }, [tema, router]);

  const completa = PERGUNTAS.every((p) => calib[p.chave]);

  const gerarTrilha = async (c: Calibragem) => {
    setFase("gerando");
    setErro(null);
    try {
      const r = await fetch("/api/trilha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, calibragem: c }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro ?? `Erro ${r.status}`);
      setPlano(dados.plano);
      setFase("editar");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setFase("calibrar");
    }
  };

  const escolher = <K extends keyof Calibragem>(k: K, v: Calibragem[K]) => {
    const novo = { ...calib, [k]: v };
    setCalib(novo);
  };

  const confirmar = () => {
    if (!plano || !completa) return;
    const id = novoId();
    salvarTrilha({
      id,
      tema,
      titulo: plano.titulo,
      resumo: plano.resumo,
      aviso_risco: plano.aviso_risco,
      calibragem: calib as Calibragem,
      etapas: plano.etapas.map((e) => ({ ...e, id: novoId(), status: "pendente", variacao: 0 })),
      etapaAtual: 0,
      concluidas: [],
      criadaEm: new Date().toISOString(),
      formato: typeof window !== "undefined" && window.innerWidth < 640 ? "9:16" : "16:9",
    });
    router.push(`/trilha/${id}`);
  };

  if (!tema) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.push("/")} className="mb-4 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft size={16} /> Voltar
      </button>
      <p className="text-sm font-semibold uppercase tracking-wide text-primaria">Você vai aprender</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{tema}</h1>
      <AvisoModo className="mt-4" />

      {fase !== "editar" && (
        <div className="mt-6 flex flex-col gap-6">
          {PERGUNTAS.map((p) => (
            <fieldset key={p.chave}>
              <legend className="mb-2 font-semibold">{p.titulo}</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(p.opcoes) as [string, string][]).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    disabled={fase === "gerando"}
                    className={`chip ${calib[p.chave] === valor ? "chip-ativo" : ""}`}
                    onClick={() => escolher(p.chave, valor as never)}
                    aria-pressed={calib[p.chave] === valor}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          {erro && <p className="rounded-xl bg-perigo/10 p-3 text-sm text-perigo">{erro}</p>}
          <button
            className="btn-primaria self-start px-6 py-3 text-base"
            disabled={!completa || fase === "gerando"}
            onClick={() => gerarTrilha(calib as Calibragem)}
          >
            {fase === "gerando" ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Montando sua trilha…
              </>
            ) : (
              "Montar minha trilha"
            )}
          </button>
        </div>
      )}

      {fase === "editar" && plano && (
        <EditorTrilha
          plano={plano}
          onChange={setPlano}
          onConfirmar={confirmar}
          onRefazer={() => setFase("calibrar")}
        />
      )}
    </div>
  );
}

function EditorTrilha({
  plano,
  onChange,
  onConfirmar,
  onRefazer,
}: {
  plano: TrilhaPlano;
  onChange: (p: TrilhaPlano) => void;
  onConfirmar: () => void;
  onRefazer: () => void;
}) {
  const setEtapas = (etapas: EtapaPlano[]) => onChange({ ...plano, etapas });
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= plano.etapas.length) return;
    const e = [...plano.etapas];
    [e[i], e[j]] = [e[j], e[i]];
    setEtapas(e);
  };
  const editar = (i: number, patch: Partial<EtapaPlano>) =>
    setEtapas(plano.etapas.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  const total = plano.etapas.reduce((s, e) => s + e.duracao_min, 0);
  const validas = plano.etapas.length >= 1 && plano.etapas.every((e) => e.titulo.trim().length >= 2);

  return (
    <div className="mt-6">
      <div className="cartao p-5">
        <h2 className="text-xl font-bold">{plano.titulo}</h2>
        <p className="mt-1 text-sm text-suave">{plano.resumo}</p>
        <p className="mt-2 text-xs text-suave">
          {plano.etapas.length} etapas · ~{Math.round(total)} min de vídeo
        </p>
        {plano.aviso_risco && (
          <p className="mt-3 flex gap-2 rounded-xl bg-destaque/15 p-3 text-sm">
            <ShieldAlert className="shrink-0 text-destaque" size={18} /> {plano.aviso_risco}
          </p>
        )}
      </div>

      <p className="mb-2 mt-6 text-sm text-suave">Edite, remova ou reordene as etapas antes de gerar os vídeos.</p>
      <ol className="flex flex-col gap-2">
        {plano.etapas.map((e, i) => (
          <li key={i} className="cartao flex gap-3 p-3">
            <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primaria-clara text-sm font-bold text-primaria">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <input
                value={e.titulo}
                maxLength={90}
                onChange={(ev) => editar(i, { titulo: ev.target.value })}
                className="w-full rounded-lg bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-superficie-2"
                aria-label={`Título da etapa ${i + 1}`}
              />
              <textarea
                value={e.objetivo}
                maxLength={240}
                rows={2}
                onChange={(ev) => editar(i, { objetivo: ev.target.value })}
                className="mt-0.5 w-full resize-none rounded-lg bg-transparent px-1 py-0.5 text-sm text-suave outline-none focus:bg-superficie-2"
                aria-label={`Objetivo da etapa ${i + 1}`}
              />
              <span className="px-1 text-xs text-suave">~{e.duracao_min} min</span>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button className="rounded-md p-1 text-suave hover:bg-superficie-2 disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                <ArrowUp size={16} />
              </button>
              <button
                className="rounded-md p-1 text-suave hover:bg-superficie-2 disabled:opacity-30"
                disabled={i === plano.etapas.length - 1}
                onClick={() => mover(i, 1)}
                aria-label="Descer"
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="rounded-md p-1 text-perigo hover:bg-perigo/10 disabled:opacity-30"
                disabled={plano.etapas.length <= 1}
                onClick={() => setEtapas(plano.etapas.filter((_, k) => k !== i))}
                aria-label="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {plano.etapas.length < 10 && (
        <button
          className="btn-secundaria mt-2"
          onClick={() => setEtapas([...plano.etapas, { titulo: "Nova etapa", objetivo: "Descreva o que aprender aqui.", duracao_min: 1 }])}
        >
          <Plus size={16} /> Adicionar etapa
        </button>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-primaria px-6 py-3 text-base" disabled={!validas} onClick={onConfirmar}>
          <Clapperboard size={18} /> Gerar os vídeos
        </button>
        <button className="btn-secundaria py-3" onClick={onRefazer}>
          Refazer perguntas
        </button>
      </div>
    </div>
  );
}
