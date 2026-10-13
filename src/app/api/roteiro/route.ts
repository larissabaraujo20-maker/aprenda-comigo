import { NextResponse } from "next/server";
import { PedidoRoteiroSchema, gerarRoteiro } from "@/lib/server/gerar";
import { erroHttp } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const pedido = PedidoRoteiroSchema.parse(await req.json());
    return NextResponse.json(await gerarRoteiro(pedido));
  } catch (e) {
    return erroHttp(e);
  }
}
