/**
 * Cliente para a Copilot Chat API (api.githubcopilot.com), endpoint
 * OpenAI-compativel /chat/completions.
 *
 * Headers obrigatorios reproduzidos da extensao oficial do VS Code.
 */
import "./proxy";
import { obterToken, invalidarToken, CopilotAuthError } from "./token";

const ENDPOINT = "https://api.githubcopilot.com/chat/completions";

export type Role = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  role: Role;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatChoice = {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
};

export type ChatResponse = {
  id: string;
  model: string;
  choices: ChatChoice[];
};

export type ChatRequest = {
  messages: ChatMessage[];
  tools?: ToolDef[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

function modeloDefault(): string {
  return process.env.COPILOT_MODEL?.trim() || "gpt-4o";
}

function montarHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Editor-Version": "vscode/1.95.0",
    "Editor-Plugin-Version": "copilot-chat/0.20.0",
    "Copilot-Integration-Id": "vscode-chat",
    "User-Agent": "GitHubCopilotChat/0.20.0",
    "Openai-Intent": "conversation-panel",
  };
}

async function tentar(
  req: ChatRequest,
  token: string,
): Promise<{ ok: true; data: ChatResponse } | { ok: false; status: number; body: string }> {
  const body = JSON.stringify({
    model: req.model ?? modeloDefault(),
    messages: req.messages,
    tools: req.tools,
    temperature: req.temperature ?? 0.2,
    max_tokens: req.max_tokens ?? 4096,
    stream: false,
  });
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: montarHeaders(token),
    body,
  }).catch((e: unknown) => {
    const causa =
      e instanceof Error
        ? `${e.message}${e.cause ? ` (cause: ${String((e.cause as { code?: string; message?: string }).code ?? (e.cause as { message?: string }).message ?? e.cause)})` : ""}`
        : String(e);
    throw new Error(`Falha de rede ao chamar Copilot API (${ENDPOINT}): ${causa}`);
  });
  if (resp.ok) {
    const data = (await resp.json()) as ChatResponse;
    return { ok: true, data };
  }
  const corpo = await resp.text().catch(() => "");
  return { ok: false, status: resp.status, body: corpo };
}

export async function chatCompletions(req: ChatRequest): Promise<ChatResponse> {
  const token = await obterToken();
  let r = await tentar(req, token);
  if (!r.ok && r.status === 401) {
    invalidarToken();
    const novo = await obterToken({ force: true });
    r = await tentar(req, novo);
  }
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      throw new CopilotAuthError(`Copilot API rejeitou o token (HTTP ${r.status})`);
    }
    throw new Error(`Copilot API HTTP ${r.status}: ${r.body.slice(0, 500)}`);
  }
  return r.data;
}
