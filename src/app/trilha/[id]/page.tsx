"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Download,
  Film,
  Gauge,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  Repeat,
  ShieldAlert,
  Wand2,
} from "lucide-react";
import { AulaPlayer, type AulaPlayerHandle } from "@/components/AulaPlayer";
import { AvisoModo } from "@/components/AvisoModo";
import { processarFila } from "@/lib/fila";
import { atualizarTrilha, progresso, useTrilha } from "@/lib/store";
import type { EtapaTrilha, Trilha } from "@/lib/types";
import { useStatus } from "@/lib/useStatus";
import { COR_TIPO } from "@/remotion/theme";

const VELOCIDADES = [1, 0.85, 0.7];

export default function TrilhaPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const trilha = useTrilha(id);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (trilha) void processarFila(id);
    // Só ao abrir a página; novas pendências chamam processarFila diretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, Boolean(trilha)]);

  if (!montado) return null;
  if (!trilha)
    return (
      <div className="py-20 text-center">
        <p className="text-suave">Trilha não encontrada neste navegador.</p>
        <Link href="/" className="btn-primaria mt-4">
          Começar uma nova
        </Link>
      </div>
    );
  return <Aula trilha={trilha} />;
}

function Aula({ trilha }: { trilha: Trilha }) {
  const status = useStatus();
  const player = useRef<AulaPlayerHandle>(null);
  const [cena, setCena] = useState(0);
  const [velIdx, setVelIdx] = useState(0);
  const atual = Math.min(trilha.etapaAtual, trilha.etapas.length - 1);
  const etapa = trilha.etapas[atual];
  const prontas = trilha.etapas.filter((e) => e.status === "pronta").length;
  const gerando = trilha.etapas.findIndex((e) => e.status === "gerando");
  const pendentes = trilha.etapas.filter((e) => e.status === "pendente" || e.status === "gerando").length;

  const atualizar = (fn: (t: Trilha) => Trilha) => atualizarTrilha(trilha.id, fn);
  const irPara = (i: number) => {
    setCena(0);
    atualizar((t) => ({ ...t, etapaAtual: i }));
  };

  const concluirEIrProxima = () => {
    atualizar((t) => ({
      ...t,
      concluidas: t.concluidas.includes(etapa.id) ? t.concluidas : [...t.concluidas, etapa.id],
      etapaAtual: Math.min(atual + 1, t.etapas.length - 1),
    }));
    setCena(0);
  };

  const regerar = (variar: boolean) => {
    atualizar((t) => ({
      ...t,
      etapas: t.etapas.map((e) =>
        e.id === etapa.id
          ? { ...e, status: "pendente", erro: undefined, variacao: variar ? e.variacao + 1 : e.variacao }
          : e,
      ),
    }));
    void processarFila(trilha.id);
  };

  const onFim = useCallback(() => {
    atualizarTrilha(trilha.id, (t) => {
      const id = t.etapas[t.etapaAtual]?.id;
      return id && !t.concluidas.includes(id) ? { ...t, concluidas: [...t.concluidas, id] } : t;
    });
  }, [trilha.id]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-primaria">{trilha.tema}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{trilha.titulo}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-suave">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-superficie-2">
            <div className="h-full bg-sucesso transition-all" style={{ width: `${progresso(trilha)}%` }} />
          </div>
          {progresso(trilha)}% concluído
        </div>
      </div>

      <AvisoModo className="mb-4" />

      {pendentes > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-primaria-clara px-4 py-3 text-sm font-medium text-primaria">
          <Loader2 size={16} className="animate-spin" />
          {gerando >= 0 ? `Gerando etapa ${gerando + 1} de ${trilha.etapas.length}…` : "Na fila…"}{" "}
          <span className="font-normal opacity-80">
            ({prontas} pronta{prontas === 1 ? "" : "s"}; você já pode assistir as prontas)
          </span>
        </div>
      )}

      {trilha.aviso_risco && (
        <p className="mb-4 flex gap-2 rounded-xl bg-destaque/15 p-3 text-sm">
          <ShieldAlert className="shrink-0 text-destaque" size={18} /> {trilha.aviso_risco}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-bold">
            <span className="text-suave">Etapa {atual + 1}:</span> {etapa.titulo}
          </h2>

          {etapa.status === "pronta" && etapa.roteiro ? (
            <>
              <AulaPlayer
                ref={player}
                roteiro={etapa.roteiro}
                totalEtapas={trilha.etapas.length}
                formato={trilha.formato}
                velocidade={VELOCIDADES[velIdx]}
                onCena={setCena}
                onFim={onFim}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-secundaria" onClick={() => player.current?.repetirPasso()}>
                  <Repeat size={16} /> Repetir este passo
                </button>
                <button className="btn-secundaria" onClick={() => regerar(true)}>
                  <Wand2 size={16} /> Explicar de outro jeito
                </button>
                <button className="btn-secundaria" onClick={() => setVelIdx((v) => (v + 1) % VELOCIDADES.length)}>
                  <Gauge size={16} /> {velIdx === 0 ? "Mais devagar" : `Velocidade ${VELOCIDADES[velIdx]}x`}
                </button>
                <button className="btn-primaria" onClick={concluirEIrProxima} disabled={atual >= trilha.etapas.length - 1 && trilha.concluidas.includes(etapa.id)}>
                  {atual >= trilha.etapas.length - 1 ? "Concluir trilha" : "Próxima etapa"} <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button
                  className="btn px-3 py-1.5 text-suave hover:text-texto"
                  onClick={() => atualizar((t) => ({ ...t, formato: t.formato === "16:9" ? "9:16" : "16:9" }))}
                >
                  {trilha.formato === "16:9" ? <RectangleVertical size={16} /> : <RectangleHorizontal size={16} />}
                  {trilha.formato === "16:9" ? "Ver na vertical (9:16)" : "Ver na horizontal (16:9)"}
                </button>
                {status?.renderMp4 && <BotaoMp4 trilha={trilha} etapa={etapa} />}
              </div>

              <PassoAPasso etapa={etapa} cenaAtual={cena} onIr={(i) => player.current?.irParaCena(i)} />
            </>
          ) : (
            <EstadoEtapa etapa={etapa} onTentar={() => regerar(false)} />
          )}
        </section>

        <aside>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-suave">Trilha</h2>
          <ol className="flex flex-col gap-1.5">
            {trilha.etapas.map((e, i) => (
              <li key={e.id}>
                <button
                  onClick={() => irPara(i)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                    i === atual ? "border-primaria bg-primaria-clara" : "border-borda bg-superficie hover:border-primaria/60"
                  }`}
                >
                  <IconeStatus etapa={e} concluida={trilha.concluidas.includes(e.id)} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {i + 1}. {e.titulo}
                    </span>
                    <span className="block text-xs text-suave">
                      {e.status === "pronta"
                        ? `${duracaoTexto(e)} · pronta`
                        : e.status === "gerando"
                          ? "gerando vídeo…"
                          : e.status === "erro"
                            ? "erro — toque para tentar de novo"
                            : `~${e.duracao_min} min · na fila`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function duracaoTexto(e: EtapaTrilha) {
  const s = Math.round((e.roteiro?.cenas ?? []).reduce((a, c) => a + c.duracao + 0.9, 0));
  return s >= 60 ? `${Math.floor(s / 60)}min${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

function IconeStatus({ etapa, concluida }: { etapa: EtapaTrilha; concluida: boolean }) {
  if (concluida) return <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sucesso" />;
  if (etapa.status === "gerando") return <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-primaria" />;
  if (etapa.status === "erro") return <AlertCircle size={18} className="mt-0.5 shrink-0 text-perigo" />;
  if (etapa.status === "pronta") return <Film size={18} className="mt-0.5 shrink-0 text-primaria" />;
  return <Circle size={18} className="mt-0.5 shrink-0 text-suave" />;
}

function EstadoEtapa({ etapa, onTentar }: { etapa: EtapaTrilha; onTentar: () => void }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-borda bg-superficie p-6 text-center">
      {etapa.status === "erro" ? (
        <>
          <AlertCircle className="text-perigo" />
          <p className="max-w-md whitespace-pre-line text-sm text-suave">{etapa.erro}</p>
          <button className="btn-primaria" onClick={onTentar}>
            <RefreshCw size={16} /> Tentar de novo
          </button>
        </>
      ) : (
        <>
          <Loader2 className="animate-spin text-primaria" size={28} />
          <p className="font-semibold">{etapa.status === "gerando" ? "Gerando este vídeo…" : "Na fila para gerar"}</p>
          <p className="max-w-sm text-sm text-suave">
            Escrevendo o roteiro, gravando a narração e montando as cenas. Você pode assistir outras etapas prontas
            enquanto isso.
          </p>
        </>
      )}
    </div>
  );
}

function PassoAPasso({ etapa, cenaAtual, onIr }: { etapa: EtapaTrilha; cenaAtual: number; onIr: (i: number) => void }) {
  const cenas = etapa.roteiro?.cenas ?? [];
  return (
    <section className="mt-6">
      <h3 className="mb-2 font-bold">Passo a passo</h3>
      <p className="mb-3 text-sm text-suave">{etapa.objetivo}</p>
      <ol className="flex flex-col gap-2">
        {cenas.map((c, i) => {
          const tipo = COR_TIPO[c.tipo] ?? COR_TIPO.instrucao;
          return (
            <li key={i}>
              <button
                onClick={() => onIr(i)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  i === cenaAtual ? "border-primaria bg-primaria-clara/60" : "border-borda bg-superficie hover:border-primaria/50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-suave">
                    Passo {i + 1} de {cenas.length}
                  </span>
                  <span className="rounded-md px-1.5 py-0.5" style={{ color: tipo.cor, background: `${tipo.cor}1f` }}>
                    {tipo.rotulo}
                  </span>
                </div>
                <div className="mt-1 font-semibold">{c.texto_tela}</div>
                <p className="mt-0.5 text-sm text-suave">{c.narracao}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BotaoMp4({ trilha, etapa }: { trilha: Trilha; etapa: EtapaTrilha }) {
  const mp4 = etapa.mp4;
  const set = useCallback(
    (m: EtapaTrilha["mp4"]) =>
      atualizarTrilha(trilha.id, (t) => ({
        ...t,
        etapas: t.etapas.map((e) => (e.id === etapa.id ? { ...e, mp4: m } : e)),
      })),
    [trilha.id, etapa.id],
  );
  const [progressoMp4, setProgressoMp4] = useState(0);

  useEffect(() => {
    if (!mp4?.jobId || mp4.status === "pronto" || mp4.status === "erro") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/render?id=${mp4.jobId}`);
      const d = await r.json();
      if (!r.ok) return set({ status: "erro", erro: d.erro });
      setProgressoMp4(d.progresso ?? 0);
      if (d.status !== mp4.status || d.url) set({ status: d.status, url: d.url, erro: d.erro, jobId: d.id });
    }, 2000);
    return () => clearInterval(t);
  }, [mp4?.jobId, mp4?.status, set]);

  const iniciar = async () => {
    set({ status: "fila" });
    const r = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roteiro: etapa.roteiro, totalEtapas: trilha.etapas.length, formato: trilha.formato }),
    });
    const d = await r.json();
    if (!r.ok) return set({ status: "erro", erro: d.erro });
    set({ status: d.status, url: d.url, jobId: d.id });
  };

  if (mp4?.status === "pronto" && mp4.url)
    return (
      <a className="btn px-3 py-1.5 text-primaria" href={`${mp4.url}?download`} download>
        <Download size={16} /> Baixar MP4
      </a>
    );
  if (mp4?.status === "fila" || mp4?.status === "renderizando")
    return (
      <span className="btn px-3 py-1.5 text-suave">
        <Loader2 size={16} className="animate-spin" />
        {mp4.status === "fila" ? "MP4 na fila…" : `Renderizando MP4… ${Math.round(progressoMp4 * 100)}%`}
      </span>
    );
  return (
    <button className="btn px-3 py-1.5 text-suave hover:text-texto" onClick={iniciar} title={mp4?.erro}>
      <Film size={16} /> {mp4?.status === "erro" ? "Falhou — gerar MP4 de novo" : "Gerar MP4"}
    </button>
  );
}
