/**
 * Gerencia o token usado para chamar a Copilot Chat API.
 *
 * Ordem de resolucao:
 * 1. COPILOT_TOKEN (uso direto, sem troca).
 * 2. GITHUB_TOKEN do ambiente.
 * 3. Token salvo em output/.auth/github.json (Device Flow via UI).
 *
 * Cache em memoria (globalThis) sobrevive a HMR no dev.
 */
import "./proxy";
import { lerAuth } from "../auth-store";

type Cached = { token: string; expiresAt: number };

const KEY = Symbol.for("sigo.portal.copilotTokenCache");
const g = globalThis as unknown as Record<symbol, Cached | undefined>;

const SAFETY_MARGIN_MS = 60_000; // renova 1min antes de expirar

function ler(): Cached | undefined {
  return g[KEY];
}

function gravar(c: Cached) {
  g[KEY] = c;
}

export class CopilotAuthError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CopilotAuthError";
  }
}

async function trocarTokenGithub(ghToken: string): Promise<Cached> {
  const url = "https://api.github.com/copilot_internal/v2/token";
  const resp = await fetch(url, {
    headers: {
      Authorization: `token ${ghToken}`,
      "User-Agent": "GitHubCopilotChat/0.20.0",
      Accept: "application/json",
    },
  }).catch((e: unknown) => {
    const causa =
      e instanceof Error
        ? `${e.message}${e.cause ? ` (cause: ${String((e.cause as { code?: string; message?: string }).code ?? (e.cause as { message?: string }).message ?? e.cause)})` : ""}`
        : String(e);
    throw new CopilotAuthError(
      `Falha de rede ao trocar GITHUB_TOKEN por token Copilot (${url}): ${causa}`,
    );
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new CopilotAuthError(
      `Falha ao trocar GITHUB_TOKEN por token Copilot (HTTP ${resp.status}): ${corpo.slice(0, 200)}`,
    );
  }
  const data = (await resp.json()) as { token?: string; expires_at?: number };
  if (!data.token) {
    throw new CopilotAuthError("Resposta sem campo 'token' ao trocar GITHUB_TOKEN");
  }
  const expiresAt = (data.expires_at ?? Math.floor(Date.now() / 1000) + 1500) * 1000;
  return { token: data.token, expiresAt };
}

export async function obterToken(opts: { force?: boolean } = {}): Promise<string> {
  const agora = Date.now();
  const cache = ler();
  if (
    !opts.force &&
    cache &&
    cache.expiresAt - SAFETY_MARGIN_MS > agora &&
    cache.token.length > 0
  ) {
    return cache.token;
  }

  const direto = process.env.COPILOT_TOKEN?.trim();
  if (direto) {
    // Token direto: assume validade longa (1h). Sem refresh automatico.
    const novo: Cached = { token: direto, expiresAt: agora + 60 * 60 * 1000 };
    gravar(novo);
    return novo.token;
  }

  const gh = process.env.GITHUB_TOKEN?.trim();
  if (gh) {
    const novo = await trocarTokenGithub(gh);
    gravar(novo);
    return novo.token;
  }

  const auth = await lerAuth();
  if (auth?.access_token) {
    const novo = await trocarTokenGithub(auth.access_token);
    gravar(novo);
    return novo.token;
  }

  throw new CopilotAuthError(
    "Nenhuma credencial encontrada. Faca login em /auth ou defina GITHUB_TOKEN/COPILOT_TOKEN.",
  );
}

export function invalidarToken() {
  g[KEY] = undefined;
}
