import { NextResponse } from "next/server";
import { listarRotinas } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const rotinas = await listarRotinas();
  return NextResponse.json({ rotinas });
}
