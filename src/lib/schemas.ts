import { z } from "zod";

/** Calibragem escolhida pelo aluno antes de gerar a trilha. */
export const NivelSchema = z.enum(["nunca_fiz", "basico", "intermediario"]);
export const TempoSchema = z.enum(["rapido", "medio", "completo"]);
export const ObjetivoSchema = z.enum(["conceito", "pratica"]);

export const CalibragemSchema = z.object({
  nivel: NivelSchema,
  tempo: TempoSchema,
  objetivo: ObjetivoSchema,
});
export type Calibragem = z.infer<typeof CalibragemSchema>;

export const NIVEL_LABEL: Record<Calibragem["nivel"], string> = {
  nunca_fiz: "Nunca fiz",
  basico: "Sei o básico",
  intermediario: "Intermediário",
};
export const TEMPO_LABEL: Record<Calibragem["tempo"], string> = {
  rapido: "Rápido (~5 min)",
  medio: "Médio (~15 min)",
  completo: "Completo",
};
export const OBJETIVO_LABEL: Record<Calibragem["objetivo"], string> = {
  conceito: "Entender o conceito",
  pratica: "Conseguir fazer na prática",
};

/** Trilha gerada pela IA (antes de virar vídeos). */
export const EtapaPlanoSchema = z.object({
  titulo: z.string().min(2).max(90),
  objetivo: z.string().min(2).max(240),
  duracao_min: z.number().min(0.5).max(3),
});
export type EtapaPlano = z.infer<typeof EtapaPlanoSchema>;

export const TrilhaPlanoSchema = z.object({
  titulo: z.string().min(2).max(100),
  resumo: z.string().max(400),
  /** Preenchido em assuntos de risco (saúde, segurança, eletricidade, finanças). */
  aviso_risco: z.string().max(400).nullable(),
  etapas: z.array(EtapaPlanoSchema).min(3).max(10),
});
export type TrilhaPlano = z.infer<typeof TrilhaPlanoSchema>;

/** Contrato entre a IA e o renderizador (formato pedido na especificação). */
export const TIPOS_CENA = [
  "titulo",
  "instrucao",
  "diagrama",
  "dica",
  "erro_comum",
  "resumo",
] as const;
export const TipoCenaSchema = z.enum(TIPOS_CENA);
export type TipoCena = z.infer<typeof TipoCenaSchema>;

const maxPalavras = (n: number) => (s: string) =>
  s.trim().split(/\s+/).filter(Boolean).length <= n;

export const CenaSchema = z.object({
  numero: z.number().int().min(1),
  tipo: TipoCenaSchema,
  texto_tela: z
    .string()
    .min(1)
    .refine(maxPalavras(12), "texto_tela deve ter no máximo 12 palavras"),
  narracao: z.string().min(1).max(700),
  visual: z.string().min(1).max(300),
  destaque: z.string().max(80),
});
export type Cena = z.infer<typeof CenaSchema>;

export const RoteiroSchema = z
  .object({
    etapa: z.number().int().min(1),
    titulo: z.string().min(1).max(120),
    cenas: z.array(CenaSchema).min(3).max(14),
  })
  .superRefine((r, ctx) => {
    const ultima = r.cenas[r.cenas.length - 1];
    if (ultima && ultima.tipo !== "resumo") {
      ctx.addIssue({
        code: "custom",
        message: "A última cena deve ser do tipo 'resumo' (3 tópicos).",
        path: ["cenas", r.cenas.length - 1, "tipo"],
      });
    }
    r.cenas.forEach((c, i) => {
      if (c.numero !== i + 1) {
        ctx.addIssue({
          code: "custom",
          message: `As cenas devem ser numeradas em sequência (esperado ${i + 1}).`,
          path: ["cenas", i, "numero"],
        });
      }
    });
  });
export type Roteiro = z.infer<typeof RoteiroSchema>;

/** Roteiro já com narração gerada: o que o player/renderizador consome. */
export type CenaPronta = Cena & {
  /** URL do áudio da narração (null no modo demonstração sem TTS). */
  audio: string | null;
  /** Duração da narração em segundos (real se veio do TTS, estimada se não). */
  duracao: number;
};

export type RoteiroPronto = {
  etapa: number;
  titulo: string;
  cenas: CenaPronta[];
  /** "openai" | "elevenlabs" | "navegador" (voz do próprio navegador, modo demo) */
  vozFonte: "openai" | "elevenlabs" | "navegador";
  cacheKey: string;
  geradoEm: string;
};
