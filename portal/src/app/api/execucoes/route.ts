import { NextResponse } from "next/server";
import { listar } from "@/lib/exec-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const execucoes = await listar();
  return NextResponse.json({ execucoes });
}
