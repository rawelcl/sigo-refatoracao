import { NextRequest, NextResponse } from "next/server";
import { lerArtefato } from "@/lib/repo";

export const dynamic = "force-dynamic";

function contentType(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase();
  if (ext === "svg") return "image/svg+xml; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  if (!p) {
    return NextResponse.json({ error: "parametro 'path' obrigatorio" }, { status: 400 });
  }
  try {
    const conteudo = await lerArtefato(p);
    return new NextResponse(conteudo, {
      headers: { "Content-Type": contentType(p) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
