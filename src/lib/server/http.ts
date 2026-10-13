import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { ErroIA } from "./claude";

export function erroHttp(e: unknown) {
  console.error("[api]", e);
  if (e instanceof ZodError) return NextResponse.json({ erro: "Pedido inválido", detalhes: e.issues }, { status: 400 });
  if (e instanceof ErroIA) return NextResponse.json({ erro: e.message }, { status: 422 });
  if (e instanceof Anthropic.AuthenticationError)
    return NextResponse.json({ erro: "ANTHROPIC_API_KEY inválida." }, { status: 500 });
  if (e instanceof Anthropic.RateLimitError)
    return NextResponse.json({ erro: "Limite de uso da IA atingido. Tente de novo em instantes." }, { status: 429 });
  if (e instanceof Anthropic.APIError)
    return NextResponse.json({ erro: `Erro da API da Anthropic (${e.status ?? "?"}).` }, { status: 502 });
  return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro inesperado" }, { status: 500 });
}
