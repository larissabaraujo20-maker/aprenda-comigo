import { NextResponse } from "next/server";
import { lerCustos } from "@/lib/server/costs";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await lerCustos());
}
