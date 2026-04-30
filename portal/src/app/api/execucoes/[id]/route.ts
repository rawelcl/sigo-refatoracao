import { NextResponse } from "next/server";
import { obterExec, marcarCancelado, listar } from "@/lib/exec-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ex = obterExec(id);
  if (ex) return NextResponse.json(ex);
  // Tenta carregar do disco
  const todas = await listar();
  const persistida = todas.find((e) => e.id === id);
  if (persistida) return NextResponse.json(persistida);
  return NextResponse.json({ erro: "execucao nao encontrada" }, { status: 404 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = marcarCancelado(id);
  if (!ok) {
    return NextResponse.json(
      { erro: "execucao nao encontrada ou ja finalizada" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
