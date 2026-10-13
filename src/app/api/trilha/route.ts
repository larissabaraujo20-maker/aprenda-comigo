import { NextResponse } from "next/server";
import { PedidoTrilhaSchema, gerarTrilha } from "@/lib/server/gerar";
import { erroHttp } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const pedido = PedidoTrilhaSchema.parse(await req.json());
    return NextResponse.json(await gerarTrilha(pedido));
  } catch (e) {
    return erroHttp(e);
  }
}
