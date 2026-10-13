import { icons, type LucideIcon } from "lucide-react";

const PADRAO_POR_TIPO: Record<string, string> = {
  titulo: "GraduationCap",
  instrucao: "Hand",
  diagrama: "Workflow",
  dica: "Lightbulb",
  erro_comum: "TriangleAlert",
  resumo: "ListChecks",
};

const ALIAS: Record<string, string> = {
  "alert-triangle": "TriangleAlert",
  "alert-circle": "CircleAlert",
  "check-circle": "CircleCheck",
  "help-circle": "CircleHelp",
};

const pascal = (s: string) =>
  s.replace(/(^|[-_\s]+)([a-z0-9])/gi, (_, __, c: string) => c.toUpperCase());

/** Extrai "[nome-do-icone]" do campo visual e devolve o componente Lucide. */
export function iconeDaCena(visual: string, tipo: string): LucideIcon {
  const m = visual.match(/\[([a-z0-9\-_ ]+)\]/i);
  const nome = m?.[1]?.trim().toLowerCase();
  const map = icons as Record<string, LucideIcon>;
  if (nome) {
    const cand = ALIAS[nome] ?? pascal(nome);
    if (map[cand]) return map[cand];
  }
  return map[PADRAO_POR_TIPO[tipo] ?? "Sparkles"] ?? map.Sparkles;
}

export function descricaoVisual(visual: string) {
  return visual.replace(/\[[^\]]*\]\s*/, "").trim();
}
