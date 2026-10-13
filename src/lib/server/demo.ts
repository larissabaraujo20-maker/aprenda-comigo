import "server-only";
import type { Calibragem, Cena, Roteiro, TrilhaPlano } from "../schemas";

/**
 * MODO DEMONSTRAÇÃO — usado quando ANTHROPIC_API_KEY não está definida.
 * Gera uma trilha e roteiros genéricos (por modelo de texto) para que todo o
 * fluxo (trilha → roteiro → narração → vídeo → player) funcione sem chaves.
 * O conteúdo NÃO é específico do assunto; com a chave da Anthropic, o Claude
 * escreve o conteúdo real.
 */

const RISCO = /(juros|sa[uú]de|rem[eé]dio|medic|dieta|eletric|tomada|disjuntor|g[aá]s|solda|investi|a[cç][oõ]es|cripto|empr[eé]stimo|d[ií]vida|financ|imposto|seguran[cç]a|altura|qu[ií]mic|muscula|exerc[ií]cio|gravidez)/i;

export function avisoRiscoDemo(tema: string) {
  return RISCO.test(tema)
    ? "Este assunto envolve riscos. Use este conteúdo como introdução e consulte um profissional qualificado antes de agir."
    : null;
}

export function trilhaDemo(tema: string, c: Calibragem): TrilhaPlano {
  const t = tema.trim();
  const base = [
    { titulo: `O que é e para que serve`, objetivo: `Entender a ideia central de "${t}" e quando usar.`, duracao_min: 1 },
    { titulo: `Preparar o que você precisa`, objetivo: `Separar materiais, ferramentas ou conhecimentos prévios.`, duracao_min: 1 },
    { titulo: `Fazer o primeiro passo`, objetivo: `Executar a parte inicial com segurança, na ordem certa.`, duracao_min: 1.5 },
    { titulo: `Completar o processo`, objetivo: `Seguir os passos principais até ter um resultado.`, duracao_min: 2 },
    { titulo: `Conferir o resultado`, objetivo: `Saber reconhecer se deu certo e corrigir o que faltou.`, duracao_min: 1 },
    { titulo: `Evitar erros comuns`, objetivo: `Reconhecer os erros mais frequentes de quem está começando.`, duracao_min: 1 },
    { titulo: `Praticar com um exemplo real`, objetivo: `Aplicar tudo em um exemplo do começo ao fim.`, duracao_min: 2 },
    { titulo: `Ir além do básico`, objetivo: `Conhecer variações e próximos passos para evoluir.`, duracao_min: 1.5 },
  ];
  const qtd = c.tempo === "rapido" ? 3 : c.tempo === "medio" ? 5 : 8;
  let etapas = base.slice(0, qtd);
  if (c.objetivo === "conceito") {
    etapas = etapas.map((e) => (e.titulo === "Preparar o que você precisa" ? { ...e, titulo: "Os conceitos-chave", objetivo: "Conhecer os termos e as peças que formam o assunto." } : e));
  }
  if (c.nivel !== "nunca_fiz" && qtd > 3) etapas = etapas.slice(1).concat(base[qtd] ?? []);
  return {
    titulo: capitalizar(t),
    resumo: `Uma trilha ${c.tempo === "rapido" ? "rápida" : "passo a passo"} sobre "${t}", com foco em ${c.objetivo === "pratica" ? "colocar em prática" : "entender o conceito"}.`,
    aviso_risco: avisoRiscoDemo(t),
    etapas,
  };
}

export function roteiroDemo(
  tema: string,
  etapa: { titulo: string; objetivo: string },
  indice: number,
  c: Calibragem,
  avisoRisco: string | null,
  variacao: number,
): Roteiro {
  const simples = c.nivel === "nunca_fiz";
  const analogia = ["como seguir uma receita", "como montar um quebra-cabeça", "como aprender um caminho novo"][variacao % 3];
  const cenas: Omit<Cena, "numero">[] = [
    {
      tipo: "titulo",
      texto_tela: etapa.titulo,
      narracao: `Etapa ${indice + 1}: ${etapa.titulo}. Ao final deste vídeo, você vai ${minusculo(etapa.objetivo)}`,
      visual: "[graduation-cap] chapéu de formatura grande e centralizado",
      destaque: primeiraPalavra(etapa.titulo),
    },
  ];
  if (avisoRisco) {
    cenas.push({
      tipo: "dica",
      texto_tela: "Atenção: procure um profissional",
      narracao: avisoRisco,
      visual: "[shield-alert] escudo de alerta",
      destaque: "profissional",
    });
  }
  cenas.push(
    {
      tipo: "instrucao",
      texto_tela: "Comece entendendo o objetivo",
      narracao: `Pense nisso ${analogia}. Antes de agir, entenda onde quer chegar: isso evita retrabalho, porque cada passo depende do anterior.`,
      visual: "[target] alvo com uma seta no centro",
      destaque: "objetivo",
    },
    {
      tipo: "diagrama",
      texto_tela: "Preparar → Fazer → Conferir",
      narracao: `Em ${tema}, quase tudo segue três momentos: preparar, fazer e conferir. ${simples ? "Vamos devagar, um de cada vez." : "Vamos focar no que muda em cada um."}`,
      visual: "[workflow] Preparar -> Fazer -> Conferir",
      destaque: "Fazer",
    },
    {
      tipo: "instrucao",
      texto_tela: "Passo 1: separe o que vai usar",
      narracao: "Deixe tudo à mão antes de começar. O porquê: interromper no meio é a causa número um de erros.",
      visual: "[package] caixa aberta com itens organizados",
      destaque: "separe",
    },
    {
      tipo: "instrucao",
      texto_tela: "Passo 2: faça uma parte de cada vez",
      narracao: "Execute uma única ação, observe o resultado e só então siga. Assim você sabe exatamente o que funcionou.",
      visual: "[list-checks] lista com itens marcados",
      destaque: "uma parte",
    },
    {
      tipo: "erro_comum",
      texto_tela: "Erro comum: pular a conferência",
      narracao: "Um erro muito comum é seguir em frente sem conferir. Pare um instante e verifique; corrigir agora é bem mais fácil do que depois.",
      visual: "[triangle-alert] triângulo de alerta",
      destaque: "conferência",
    },
    {
      tipo: "dica",
      texto_tela: "Dica: anote o que funcionou",
      narracao: "Anote o que deu certo. Na próxima vez, você repete com confiança e mais rápido.",
      visual: "[notebook-pen] caderno com caneta",
      destaque: "anote",
    },
    {
      tipo: "resumo",
      texto_tela: "Entenda o objetivo • Uma parte por vez • Confira sempre",
      narracao: "Resumindo: entenda o objetivo, faça uma parte de cada vez e confira sempre. Quando estiver pronto, siga para a próxima etapa.",
      visual: "[sparkles] brilho de conclusão",
      destaque: "Confira sempre",
    },
  );
  return {
    etapa: indice + 1,
    titulo: etapa.titulo,
    cenas: cenas.map((c, i) => ({ ...c, numero: i + 1 })),
  };
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const minusculo = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const primeiraPalavra = (s: string) => s.split(/\s+/)[0] ?? "";
