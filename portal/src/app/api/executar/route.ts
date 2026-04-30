import { NextRequest, NextResponse } from "next/server";
import { validarParams } from "@/lib/prompt";
import { iniciarExecucao } from "@/lib/orquestrador";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON invalido" }, { status: 400 });
  }
  const v = validarParams(body as Record<string, unknown>);
  if (!v.ok) {
    return NextResponse.json({ erro: v.erro }, { status: 400 });
  }
  const r = await iniciarExecucao(v.value);
  if (!r.ok) {
    return NextResponse.json({ erro: r.erro }, { status: r.status });
  }
  return NextResponse.json({ id: r.id }, { status: 202 });
}
