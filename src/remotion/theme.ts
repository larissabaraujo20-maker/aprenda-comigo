/**
 * Paleta e tipografia compartilhadas entre o app (globals.css) e os vídeos.
 * Se mudar aqui, mude também as variáveis --ac-* em src/app/globals.css.
 */
export const tema = {
  fundo: "#FBF8F3",
  superficie: "#FFFFFF",
  texto: "#1B1A2E",
  textoSuave: "#5D5B73",
  primaria: "#5B4BDB",
  primariaClara: "#ECE9FF",
  destaque: "#FFB938",
  sucesso: "#1FA971",
  perigo: "#E5484D",
  dica: "#0E9FB8",
  fonte: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
} as const;

export const COR_TIPO: Record<string, { cor: string; fundo: string; rotulo: string }> = {
  titulo: { cor: tema.primaria, fundo: tema.primariaClara, rotulo: "Etapa" },
  instrucao: { cor: tema.primaria, fundo: tema.primariaClara, rotulo: "Faça assim" },
  diagrama: { cor: tema.primaria, fundo: tema.primariaClara, rotulo: "Como funciona" },
  dica: { cor: tema.dica, fundo: "#E3F7FA", rotulo: "Dica" },
  erro_comum: { cor: tema.perigo, fundo: "#FDECEC", rotulo: "Erro comum" },
  resumo: { cor: tema.sucesso, fundo: "#E4F7EE", rotulo: "Resumo" },
};
