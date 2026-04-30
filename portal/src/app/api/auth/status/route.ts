import { NextResponse } from "next/server";
import { lerAuth, limparAuth } from "@/lib/auth-store";
import { invalidarToken } from "@/lib/copilot/token";

export const runtime = "nodejs";

export async function GET() {
  const a = await lerAuth();
  if (!a) {
    const envHas = Boolean(process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN);
    return NextResponse.json({ logged: envHas, source: envHas ? "env" : null });
  }
  return NextResponse.json({
    logged: true,
    source: "device-flow",
    user_login: a.user_login,
    obtained_at: a.obtained_at,
    scope: a.scope,
  });
}

export async function DELETE() {
  await limparAuth();
  invalidarToken();
  return NextResponse.json({ ok: true });
}
