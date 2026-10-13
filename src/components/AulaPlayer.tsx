"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Play } from "lucide-react";
import type { RoteiroPronto } from "@/lib/schemas";
import { LessonVideo, type LessonVideoProps } from "@/remotion/LessonVideo";
import { DIMENSOES, FPS, cenaNoFrame, linhaDoTempo } from "@/remotion/timing";

export type AulaPlayerHandle = {
  repetirPasso: () => void;
  irParaCena: (i: number) => void;
};

type Props = {
  roteiro: RoteiroPronto;
  totalEtapas: number;
  formato: "16:9" | "9:16";
  velocidade: number;
  onCena?: (i: number) => void;
  onFim?: () => void;
};

/**
 * Player da aula: o vídeo é a composição Remotion tocando ao vivo no navegador
 * (mesma composição usada para renderizar o MP4).
 * Sem TTS configurado, narra com a voz pt-BR do navegador (speechSynthesis),
 * sincronizada cena a cena.
 */
export const AulaPlayer = forwardRef<AulaPlayerHandle, Props>(function AulaPlayer(
  { roteiro, totalEtapas, formato, velocidade, onCena, onFim },
  ref,
) {
  const player = useRef<PlayerRef>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const { inicios, total } = useMemo(() => linhaDoTempo(roteiro.cenas), [roteiro]);
  const cenaAtual = useRef(0);
  const vozNavegador = roteiro.vozFonte === "navegador";
  const cbs = useRef({ onCena, onFim });
  cbs.current = { onCena, onFim };

  const inputProps: LessonVideoProps = useMemo(
    () => ({ titulo: roteiro.titulo, etapa: roteiro.etapa, totalEtapas, cenas: roteiro.cenas }),
    [roteiro, totalEtapas],
  );

  useImperativeHandle(ref, () => ({
    repetirPasso: () => {
      player.current?.seekTo(inicios[cenaAtual.current] ?? 0);
      player.current?.play();
      if (vozNavegador) falar(roteiro.cenas[cenaAtual.current]?.narracao, velocidade);
    },
    irParaCena: (i: number) => {
      caixa.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      cenaAtual.current = i;
      player.current?.seekTo(inicios[i] ?? 0);
      cbs.current.onCena?.(i);
      if (vozNavegador && player.current?.isPlaying()) falar(roteiro.cenas[i]?.narracao, velocidade);
    },
  }));

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const aoFrame = (e: { detail: { frame: number } }) => {
      const i = cenaNoFrame(inicios, e.detail.frame);
      if (i !== cenaAtual.current) {
        cenaAtual.current = i;
        cbs.current.onCena?.(i);
        if (vozNavegador && p.isPlaying()) falar(roteiro.cenas[i]?.narracao, velocidade);
      }
    };
    const aoPlay = () => {
      if (!vozNavegador) return;
      // Retoma a narração do começo da cena atual.
      p.seekTo(inicios[cenaAtual.current] ?? 0);
      falar(roteiro.cenas[cenaAtual.current]?.narracao, velocidade);
    };
    const aoPause = () => vozNavegador && pararVoz();
    const aoFim = () => {
      pararVoz();
      cbs.current.onFim?.();
    };
    p.addEventListener("frameupdate", aoFrame);
    p.addEventListener("play", aoPlay);
    p.addEventListener("pause", aoPause);
    p.addEventListener("ended", aoFim);
    return () => {
      p.removeEventListener("frameupdate", aoFrame);
      p.removeEventListener("play", aoPlay);
      p.removeEventListener("pause", aoPause);
      p.removeEventListener("ended", aoFim);
    };
  }, [inicios, roteiro, vozNavegador, velocidade]);

  // Troca de etapa/roteiro: volta ao início e cala a voz.
  useEffect(() => {
    cenaAtual.current = 0;
    cbs.current.onCena?.(0);
    return () => pararVoz();
  }, [roteiro]);

  // Capa mostrada antes do primeiro play (o 1º frame da animação é vazio).
  const renderPoster = useCallback(
    ({ width }: { width: number }) => {
      const u = (Number.isFinite(width) && width > 0 ? width : DIMENSOES[formato].width) / 100;
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center bg-[#FBF8F3] text-center text-[#1B1A2E]"
          style={{ gap: u * 2.5, padding: u * 5 }}
        >
          <div
            className="flex items-center justify-center rounded-full bg-[#5B4BDB] text-white shadow-xl"
            style={{ width: u * 13, height: u * 13 }}
          >
            <Play size={u * 6} fill="currentColor" />
          </div>
          <div className="font-extrabold leading-tight" style={{ fontSize: u * (formato === "9:16" ? 7 : 4.2) }}>
            {roteiro.titulo}
          </div>
          <div className="text-[#5D5B73]" style={{ fontSize: u * (formato === "9:16" ? 4 : 2.2) }}>
            Etapa {roteiro.etapa} de {totalEtapas} · {roteiro.cenas.length} passos
          </div>
        </div>
      );
    },
    [roteiro, totalEtapas, formato],
  );

  const dim = DIMENSOES[formato];
  return (
    <div ref={caixa} className={`scroll-mt-20 ${formato === "9:16" ? "mx-auto w-full max-w-[360px]" : "w-full"}`}>
      <Player
        ref={player}
        component={LessonVideo}
        inputProps={inputProps}
        durationInFrames={total}
        fps={FPS}
        compositionWidth={dim.width}
        compositionHeight={dim.height}
        playbackRate={velocidade}
        controls
        renderPoster={renderPoster}
        showPosterWhenUnplayed
        posterFillMode="composition-size"
        clickToPlay
        doubleClickToFullscreen
        allowFullscreen
        acknowledgeRemotionLicense
        style={{ width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,.12)" }}
      />
    </div>
  );
});

function vozPtBr() {
  const vozes = window.speechSynthesis?.getVoices() ?? [];
  return (
    vozes.find((v) => v.lang === "pt-BR" && /google|natural|luciana|francisca/i.test(v.name)) ??
    vozes.find((v) => v.lang === "pt-BR") ??
    vozes.find((v) => v.lang?.startsWith("pt"))
  );
}

function falar(texto: string | undefined, velocidade: number) {
  if (!texto || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "pt-BR";
  const v = vozPtBr();
  if (v) u.voice = v;
  u.rate = Math.max(0.5, Math.min(1.5, 1.05 * velocidade));
  window.speechSynthesis.speak(u);
}

function pararVoz() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}
