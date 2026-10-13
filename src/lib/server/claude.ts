import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "./env";
import { registrarClaude } from "./costs";
import { SYSTEM_PROFESSOR } from "./prompts";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: env.anthropicKey });
  return client;
}

export class ErroIA extends Error {}

/**
 * Pede um JSON ao Claude, valida com Zod e, se vier inválido, devolve os
 * erros para o próprio modelo corrigir (até `tentativas` vezes).
 *
 * - Saída estruturada (output_config.format) para o JSON já vir no formato.
 * - fallbacks: "default" — se o classificador de segurança recusar, a API
 *   reexecuta no modelo de fallback recomendado em vez de falhar.
 */
export async function gerarJson<S extends z.ZodType>(
  schema: S,
  prompt: string,
  opts: { tentativas?: number; effort?: "low" | "medium" | "high" } = {},
): Promise<z.infer<S>> {
  const tentativas = opts.tentativas ?? 3;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  let ultimoErro = "";

  for (let i = 0; i < tentativas; i++) {
    const resposta = await getClient().beta.messages.create({
      model: env.anthropicModel,
      max_tokens: 16000,
      system: SYSTEM_PROFESSOR,
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: opts.effort ?? "medium",
        format: betaZodOutputFormat(schema),
      },
    });

    void registrarClaude(env.anthropicModel, resposta.usage.input_tokens, resposta.usage.output_tokens);

    if (resposta.stop_reason === "refusal") {
      throw new ErroIA("A IA recusou este pedido. Tente reformular o assunto.");
    }

    const texto = resposta.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let bruto: unknown;
    try {
      bruto = JSON.parse(extrairJson(texto));
    } catch {
      ultimoErro = "A resposta não era um JSON válido.";
      messages.push({ role: "assistant", content: resposta.content as Anthropic.Beta.BetaContentBlockParam[] });
      messages.push({ role: "user", content: `${ultimoErro} Responda novamente apenas com o JSON completo e válido.` });
      continue;
    }

    const parsed = schema.safeParse(bruto);
    if (parsed.success) return parsed.data;

    ultimoErro = parsed.error.issues
      .slice(0, 12)
      .map((iss) => `- ${iss.path.join(".") || "(raiz)"}: ${iss.message}`)
      .join("\n");
    console.warn(`[claude] JSON inválido (tentativa ${i + 1}):\n${ultimoErro}`);
    messages.push({ role: "assistant", content: resposta.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({
      role: "user",
      content: `O JSON não passou na validação:\n${ultimoErro}\nCorrija esses pontos e responda novamente apenas com o JSON completo.`,
    });
  }
  throw new ErroIA(`Não consegui um roteiro válido da IA após ${tentativas} tentativas.\n${ultimoErro}`);
}

function extrairJson(texto: string) {
  const cerca = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cerca) return cerca[1];
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  return ini >= 0 && fim > ini ? texto.slice(ini, fim + 1) : texto;
}
