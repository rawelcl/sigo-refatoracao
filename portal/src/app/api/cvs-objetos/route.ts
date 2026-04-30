import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const CVS_ROOT = process.env.CVS_ROOT ?? "C:\\CVS\\health_install";

const PASTAS: Record<string, string> = {
  PROCEDURE: "procedure",
  FUNCTION: "function",
  PACKAGE: "package",
};

export async function GET(req: NextRequest) {
  const tipo = (req.nextUrl.searchParams.get("tipo") ?? "PROCEDURE").toUpperCase();
  const pasta = PASTAS[tipo];
  if (!pasta) {
    return NextResponse.json({ erro: `tipo invalido: ${tipo}` }, { status: 400 });
  }
  const dir = path.join(CVS_ROOT, pasta);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const objetos = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql") && !e.name.startsWith(".#"))
      .map((e) => ({
        nome: e.name.replace(/\.sql$/i, ""),
        path: path.join(dir, e.name),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return NextResponse.json({ tipo, total: objetos.length, objetos });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : String(e), dir },
      { status: 500 },
    );
  }
}
