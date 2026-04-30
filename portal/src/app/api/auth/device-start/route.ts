import { NextResponse } from "next/server";
import "@/lib/copilot/proxy";

export const runtime = "nodejs";

const CLIENT_ID = process.env.COPILOT_CLIENT_ID ?? "Iv1.b507a08c87ecfe98";

export async function POST() {
  const r = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "GitHubCopilotChat/0.20.0",
    },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: "read:user" }),
  });
  const j = await r.json();
  if (!r.ok) {
    return NextResponse.json({ erro: j }, { status: r.status });
  }
  return NextResponse.json({
    device_code: j.device_code,
    user_code: j.user_code,
    verification_uri: j.verification_uri,
    expires_in: j.expires_in,
    interval: j.interval ?? 5,
  });
}
