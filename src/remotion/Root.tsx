import React from "react";
import { Composition } from "remotion";
import { LessonVideo, type LessonVideoProps } from "./LessonVideo";
import { DIMENSOES, FPS, linhaDoTempo } from "./timing";

type Props = LessonVideoProps & { formato: "16:9" | "9:16" };

const exemplo: Props = {
  titulo: "Exemplo",
  etapa: 1,
  totalEtapas: 1,
  formato: "16:9",
  cenas: [
    { numero: 1, tipo: "titulo", texto_tela: "Exemplo de aula", narracao: "Olá!", visual: "[sparkles]", destaque: "aula", audio: null, duracao: 2 },
  ],
};

/** Usado pelo Remotion Studio e pelo render do MP4 (scripts/render-worker.mjs). */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Aula"
    component={LessonVideo as unknown as React.FC<Props>}
    fps={FPS}
    width={1280}
    height={720}
    durationInFrames={60}
    defaultProps={exemplo}
    calculateMetadata={({ props }) => ({
      durationInFrames: linhaDoTempo(props.cenas).total,
      ...DIMENSOES[props.formato ?? "16:9"],
    })}
  />
);
