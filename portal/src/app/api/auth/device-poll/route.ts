import { NextRequest, NextResponse } from "next/server";
import "@/lib/copilot/proxy";
import { salvarAuth } from "@/lib/auth-store";
import { invalidarToken } from "@/lib/copilot/token";

export const runtime = "nodejs";

const CLIENT_ID = process.env.COPILOT_CLIENT_ID ?? "Iv1.b507a08c87ecfe98";

export async function POST(req: NextRequest) {
  const { device_code } = await req.json();
  if (!device_code || typeof device_code !== "string") {
    return NextResponse.json({ erro: "device_code obrigatorio" }, { status: 400 });
  }
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "GitHubCopilotChat/0.20.0",
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  const j = await r.json();

  // Estados intermediarios do device flow
  if (j.error) {
    return NextResponse.json(
      { pending: true, error: j.error, error_description: j.error_description },
      { status: 200 },
    );
  }

  if (!j.access_token) {
    return NextResponse.json({ erro: "resposta sem access_token", body: j }, { status: 502 });
  }

  // Resolve login do usuario para mostrar na UI
  let user_login: string | undefined;
  try {
    const u = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${j.access_token}` },
    });
    if (u.ok) {
      const uj = await u.json();
      user_login = uj.login;
    }
  } catch {
    /* ignora */
  }

  await salvarAuth({
    access_token: j.access_token,
    token_type: j.token_type ?? "bearer",
    scope: j.scope ?? "",
    obtained_at: Date.now(),
    user_login,
  });
  invalidarToken();

  return NextResponse.json({ ok: true, user_login, scope: j.scope });
}
