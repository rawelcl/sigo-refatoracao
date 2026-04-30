import { NextResponse } from "next/server";
import { listarAgentes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const agentes = await listarAgentes();
  return NextResponse.json({ agentes });
}
