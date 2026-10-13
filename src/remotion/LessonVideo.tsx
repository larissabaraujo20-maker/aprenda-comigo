import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CenaPronta } from "@/lib/schemas";
import { COR_TIPO, tema } from "./theme";
import { FPS, PAUSA_INICIO, framesDaCena, linhaDoTempo } from "./timing";
import { descricaoVisual, iconeDaCena } from "./Icone";

export type LessonVideoProps = {
  titulo: string;
  etapa: number;
  totalEtapas: number;
  cenas: CenaPronta[];
  /** Mostrar legendas embutidas (ligado por padrão). */
  legendas?: boolean;
  /** Prefixo para URLs de áudio relativas (usado no render do MP4). */
  baseUrl?: string;
};

export const LessonVideo: React.FC<LessonVideoProps> = ({
  titulo,
  etapa,
  totalEtapas,
  cenas,
  legendas = true,
  baseUrl = "",
}) => {
  const { inicios, total } = linhaDoTempo(cenas);
  const { width, height } = useVideoConfig();
  const vertical = height > width;

  return (
    <AbsoluteFill style={{ backgroundColor: tema.fundo, fontFamily: tema.fonte, color: tema.texto }}>
      <FundoDecorativo />
      {cenas.map((cena, i) => (
        <Sequence key={i} from={inicios[i]} durationInFrames={framesDaCena(cena)} name={`Cena ${cena.numero}`}>
          {cena.audio ? (
            <Sequence from={Math.round(PAUSA_INICIO * FPS)} layout="none">
              <Html5Audio src={cena.audio.startsWith("http") ? cena.audio : baseUrl + cena.audio} />
            </Sequence>
          ) : null}
          <Cena cena={cena} vertical={vertical} />
          {legendas ? <Legenda texto={cena.narracao} duracao={cena.duracao} vertical={vertical} /> : null}
        </Sequence>
      ))}
      <Cabecalho
        titulo={titulo}
        etapa={etapa}
        totalEtapas={totalEtapas}
        inicios={inicios}
        totalCenas={cenas.length}
        vertical={vertical}
      />
      <BarraProgresso total={total} />
    </AbsoluteFill>
  );
};

const FundoDecorativo: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 90) * 20;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: tema.primariaClara,
          top: -320 + d,
          right: -260,
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "#FFF1D6",
          bottom: -220 - d,
          left: -160,
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};

const Cabecalho: React.FC<{
  titulo: string;
  etapa: number;
  totalEtapas: number;
  inicios: number[];
  totalCenas: number;
  vertical: boolean;
}> = ({ titulo, etapa, totalEtapas, inicios, totalCenas, vertical }) => {
  const frame = useCurrentFrame();
  let atual = 0;
  while (atual + 1 < inicios.length && inicios[atual + 1] <= frame) atual++;
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? 48 : 28,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        fontSize: 22,
        fontWeight: 600,
      }}
    >
      <div style={{ color: tema.textoSuave, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        Etapa {etapa}
        {totalEtapas ? ` de ${totalEtapas}` : ""} · {titulo}
      </div>
      <div
        style={{
          background: tema.primaria,
          color: "white",
          padding: "8px 18px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        Passo {atual + 1} de {totalCenas}
      </div>
    </div>
  );
};

const BarraProgresso: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "#E9E5DD" }}>
      <div style={{ width: `${(frame / total) * 100}%`, height: "100%", background: tema.primaria }} />
    </div>
  );
};

const Cena: React.FC<{ cena: CenaPronta; vertical: boolean }> = ({ cena, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 18 } });
  const estilo = COR_TIPO[cena.tipo] ?? COR_TIPO.instrucao;
  const Icone = iconeDaCena(cena.visual, cena.tipo);

  const conteudo =
    cena.tipo === "diagrama" ? (
      <Diagrama cena={cena} vertical={vertical} />
    ) : cena.tipo === "resumo" ? (
      <Resumo cena={cena} />
    ) : (
      <TextoComDestaque
        texto={cena.texto_tela}
        destaque={cena.destaque}
        cor={estilo.cor}
        tamanho={cena.tipo === "titulo" ? (vertical ? 64 : 68) : vertical ? 54 : 56}
      />
    );

  return (
    <AbsoluteFill
      style={{
        padding: vertical ? "150px 56px 300px" : "110px 90px 170px",
        display: "flex",
        flexDirection: vertical || cena.tipo === "diagrama" || cena.tipo === "resumo" ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: vertical ? 40 : 64,
        opacity: entrada,
        transform: `translateY(${(1 - entrada) * 30}px)`,
      }}
    >
      {cena.tipo !== "diagrama" && cena.tipo !== "resumo" ? (
        <div
          style={{
            flexShrink: 0,
            width: vertical ? 220 : 240,
            height: vertical ? 220 : 240,
            borderRadius: 48,
            background: estilo.fundo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.6 + entrada * 0.4}) rotate(${(1 - entrada) * -8}deg)`,
            boxShadow: "0 20px 50px rgba(27,26,46,0.10)",
          }}
          title={descricaoVisual(cena.visual)}
        >
          <Icone size={vertical ? 120 : 132} color={estilo.cor} strokeWidth={1.8} />
        </div>
      ) : null}
      <div style={{ maxWidth: vertical ? "100%" : 760, textAlign: vertical ? "center" : "left" }}>
        <div
          style={{
            display: "inline-block",
            background: estilo.fundo,
            color: estilo.cor,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "6px 14px",
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          {estilo.rotulo}
        </div>
        {conteudo}
      </div>
    </AbsoluteFill>
  );
};

/** Texto da tela com a palavra-chave marcada por um "marca-texto" animado. */
const TextoComDestaque: React.FC<{ texto: string; destaque: string; cor: string; tamanho: number }> = ({
  texto,
  destaque,
  cor,
  tamanho,
}) => {
  const frame = useCurrentFrame();
  const marca = interpolate(frame, [12, 30], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const idx = destaque ? texto.toLowerCase().indexOf(destaque.toLowerCase()) : -1;
  const base: React.CSSProperties = { fontSize: tamanho, fontWeight: 800, lineHeight: 1.15, margin: 0 };
  if (idx < 0) return <p style={base}>{texto}</p>;
  return (
    <p style={base}>
      {texto.slice(0, idx)}
      <span
        style={{
          color: cor,
          backgroundImage: `linear-gradient(${tema.destaque}, ${tema.destaque})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${marca}% 38%`,
          backgroundPosition: "0 88%",
        }}
      >
        {texto.slice(idx, idx + destaque.length)}
      </span>
      {texto.slice(idx + destaque.length)}
    </p>
  );
};

/** Diagrama em SVG/HTML: "A -> B -> C" vira caixas ligadas por setas. */
const Diagrama: React.FC<{ cena: CenaPronta; vertical: boolean }> = ({ cena, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonte = /->|→/.test(cena.visual) ? descricaoVisual(cena.visual) : cena.texto_tela;
  const partes = fonte
    .split(/\s*(?:->|→|=>)\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 5);
  const blocos = partes.length >= 2 ? partes : [cena.texto_tela];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, width: "100%" }}>
      {blocos.length >= 2 ? (
        <TextoComDestaque texto={cena.texto_tela} destaque={cena.destaque} cor={tema.primaria} tamanho={vertical ? 44 : 46} />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        {blocos.map((b, i) => {
          const s = spring({ frame: frame - 10 - i * 12, fps, config: { damping: 14 } });
          const ativo = cena.destaque && b.toLowerCase().includes(cena.destaque.toLowerCase());
          return (
            <React.Fragment key={i}>
              {i > 0 ? (
                <svg width={vertical ? 40 : 64} height={vertical ? 40 : 40} viewBox="0 0 64 40" style={{ opacity: s, transform: vertical ? "rotate(90deg)" : undefined }}>
                  <path d="M4 20 H52 M40 8 L56 20 L40 32" stroke={tema.textoSuave} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
              <div
                style={{
                  transform: `scale(${s})`,
                  background: ativo ? tema.primaria : tema.superficie,
                  color: ativo ? "white" : tema.texto,
                  border: `3px solid ${tema.primaria}`,
                  borderRadius: 24,
                  padding: vertical ? "20px 32px" : "26px 30px",
                  fontSize: vertical ? 36 : 32,
                  fontWeight: 700,
                  maxWidth: vertical ? 520 : 260,
                  textAlign: "center",
                  boxShadow: "0 14px 34px rgba(27,26,46,0.10)",
                }}
              >
                {b}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Cena final: 3 tópicos que entram um a um. */
const Resumo: React.FC<{ cena: CenaPronta }> = ({ cena }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const topicos = cena.texto_tela
    .split(/\s*[•;|]\s*|\s+-\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {topicos.map((t, i) => {
        const s = spring({ frame: frame - 8 - i * 18, fps, config: { damping: 16 } });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              opacity: s,
              transform: `translateX(${(1 - s) * 40}px)`,
              fontSize: 46,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: tema.sucesso,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            {t}
          </div>
        );
      })}
    </div>
  );
};

/** Legendas embutidas: a narração em blocos de ~8 palavras, sincronizados. */
const Legenda: React.FC<{ texto: string; duracao: number; vertical: boolean }> = ({ texto, duracao, vertical }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS - PAUSA_INICIO;
  if (t < 0) return null;
  const blocos = dividirLegenda(texto);
  const pesos = blocos.map((b) => b.length);
  const soma = pesos.reduce((a, b) => a + b, 0) || 1;
  let acumulado = 0;
  let atual = blocos.length - 1;
  for (let i = 0; i < blocos.length; i++) {
    acumulado += (pesos[i] / soma) * duracao;
    if (t < acumulado) {
      atual = i;
      break;
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: vertical ? 120 : 44,
        display: "flex",
        justifyContent: "center",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          background: "rgba(27,26,46,0.86)",
          color: "white",
          fontSize: vertical ? 34 : 30,
          fontWeight: 600,
          lineHeight: 1.3,
          padding: "10px 22px",
          borderRadius: 14,
          maxWidth: vertical ? 620 : 1000,
          textAlign: "center",
        }}
      >
        {blocos[atual]}
      </div>
    </div>
  );
};

export function dividirLegenda(texto: string, max = 9) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const blocos: string[] = [];
  let atual: string[] = [];
  for (const p of palavras) {
    atual.push(p);
    if (atual.length >= max || (/[.!?;:]$/.test(p) && atual.length >= 4)) {
      blocos.push(atual.join(" "));
      atual = [];
    }
  }
  if (atual.length) blocos.push(atual.join(" "));
  return blocos.length ? blocos : [""];
}
