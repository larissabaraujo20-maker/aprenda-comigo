import type { Calibragem, EtapaPlano, RoteiroPronto } from "./schemas";

export type StatusEtapa = "pendente" | "gerando" | "pronta" | "erro";

export type EtapaTrilha = EtapaPlano & {
  id: string;
  status: StatusEtapa;
  erro?: string;
  roteiro?: RoteiroPronto;
  /** Quantas vezes o aluno pediu "Explicar de outro jeito". */
  variacao: number;
  /** Render MP4 (opcional, só quando o servidor consegue renderizar). */
  mp4?: { status: "fila" | "renderizando" | "pronto" | "erro"; url?: string; erro?: string; jobId?: string };
};

export type Trilha = {
  id: string;
  tema: string;
  titulo: string;
  resumo: string;
  aviso_risco: string | null;
  calibragem: Calibragem;
  etapas: EtapaTrilha[];
  etapaAtual: number;
  concluidas: string[];
  criadaEm: string;
  formato: "16:9" | "9:16";
};

export type StatusServidor = {
  claude: boolean;
  tts: "openai" | "elevenlabs" | null;
  youtube: boolean;
  renderMp4: boolean;
  modelo: string;
};
