import { NextRequest, NextResponse } from "next/server";
import { submeterInput, obterExec } from "@/lib/exec-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ex = obterExec(id);
  if (!ex) {
    return NextResponse.json({ erro: "execucao nao encontrada" }, { status: 404 });
  }
  if (ex.status !== "awaiting") {
    return NextResponse.json(
      { erro: `execucao nao esta aguardando input (status=${ex.status})` },
      { status: 409 },
    );
  }
  let body: { mensagem?: string } = {};
  try {
    body = (await req.json()) as { mensagem?: string };
  } catch {
    /* corpo opcional */
  }
  const mensagem = (body.mensagem ?? "aprovado").trim() || "aprovado";
  const ok = submeterInput(id, mensagem);
  if (!ok) {
    return NextResponse.json({ erro: "nao foi possivel submeter" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, mensagem });
}
