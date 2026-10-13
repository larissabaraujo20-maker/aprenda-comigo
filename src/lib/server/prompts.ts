import "server-only";
import { NIVEL_LABEL, OBJETIVO_LABEL, TEMPO_LABEL, type Calibragem, type EtapaPlano } from "../schemas";

export const SYSTEM_PROFESSOR = `Você é o "Aprenda Comigo", um professor paciente que ensina qualquer assunto em português do Brasil por meio de vídeos curtos, passo a passo.

Regras pedagógicas (obrigatórias):
- Linguagem simples, frases curtas, tom amigável e direto. Fale com o aluno usando "você".
- Um conceito ou uma ação por cena. Nunca junte dois passos na mesma cena.
- Sempre explique o "porquê" em uma frase, além do "como".
- Siga a ordem real de execução: o aluno vai repetir exatamente o que você mostrar.
- Inclua pelo menos uma cena "erro_comum" por etapa quando fizer sentido.
- Termine cada vídeo com uma cena "resumo" contendo exatamente 3 tópicos, separados por " • " no texto_tela.
- Adapte vocabulário, profundidade e ritmo ao nível do aluno.
- Assuntos de risco (saúde, segurança, eletricidade, gás, altura, química, finanças/investimentos, direito): inclua um aviso claro e recomende procurar um profissional qualificado. Nunca dê instruções perigosas.
- Seja factual. Se algo depender de versão de software ou região, diga isso.`;

const calibragemTexto = (c: Calibragem) =>
  `Nível do aluno: ${NIVEL_LABEL[c.nivel]}. Tempo disponível: ${TEMPO_LABEL[c.tempo]}. Objetivo: ${OBJETIVO_LABEL[c.objetivo]}.`;

const ETAPAS_POR_TEMPO: Record<Calibragem["tempo"], string> = {
  rapido: "3 a 4 etapas curtas (total ~5 minutos de vídeo)",
  medio: "5 a 7 etapas (total ~15 minutos de vídeo)",
  completo: "7 a 10 etapas (cobertura completa, do zero ao resultado)",
};

export function promptTrilha(tema: string, c: Calibragem) {
  return `O aluno quer aprender: "${tema}".
${calibragemTexto(c)}

Monte uma TRILHA de aprendizado com ${ETAPAS_POR_TEMPO[c.tempo]}. Cada etapa vira um vídeo de 30 segundos a 3 minutos.
Para cada etapa: "titulo" (curto, começa com verbo quando for prática), "objetivo" (uma frase: o que o aluno consegue fazer ao final) e "duracao_min" (entre 0.5 e 3).
"titulo" da trilha: nome amigável do curso. "resumo": 1 ou 2 frases sobre o que será aprendido.
"aviso_risco": se o assunto envolver saúde, segurança, eletricidade, finanças ou outro risco, escreva um aviso curto recomendando um profissional; caso contrário, null.
Responda somente com o JSON.`;
}

export function promptRoteiro(params: {
  tema: string;
  calibragem: Calibragem;
  etapas: EtapaPlano[];
  indice: number;
  variacao: number;
  avisoRisco: string | null;
}) {
  const { tema, calibragem, etapas, indice, variacao, avisoRisco } = params;
  const etapa = etapas[indice];
  const lista = etapas.map((e, i) => `${i + 1}. ${e.titulo} — ${e.objetivo}`).join("\n");
  const cenas = Math.max(4, Math.min(12, Math.round(etapa.duracao_min * 4)));
  const outroJeito =
    variacao > 0
      ? `\nIMPORTANTE: o aluno pediu "explicar de outro jeito" (tentativa ${variacao + 1}). Use outra analogia, outros exemplos e outra ordem de apresentação dos conceitos, mantendo os passos práticos corretos.`
      : "";
  return `Curso: "${tema}". ${calibragemTexto(calibragem)}
Trilha completa:
${lista}

Escreva o roteiro do vídeo da ETAPA ${indice + 1}: "${etapa.titulo}" (objetivo: ${etapa.objetivo}).
Duração alvo: ~${etapa.duracao_min} minuto(s), cerca de ${cenas} cenas.
${avisoRisco ? `Este assunto tem risco. A primeira ou segunda cena deve ser do tipo "dica" com o aviso: ${avisoRisco}` : ""}${outroJeito}

Formato de cada cena:
- "numero": sequencial a partir de 1
- "tipo": um de titulo | instrucao | diagrama | dica | erro_comum | resumo (comece com "titulo" e termine com "resumo")
- "texto_tela": frase curta mostrada na tela (máximo 12 palavras)
- "narracao": o que a voz fala nessa cena (1 a 3 frases naturais; inclua o porquê)
- "visual": descrição do ícone/diagrama/ilustração. Comece com um nome de ícone Lucide em inglês entre colchetes, ex.: "[calculator] calculadora com...". Para "diagrama", descreva as etapas como "A -> B -> C".
- "destaque": a palavra ou elemento mais importante (presente no texto_tela), ou "" se não houver
Use "etapa": ${indice + 1} e "titulo": "${etapa.titulo}". Responda somente com o JSON.`;
}
