/**
 * Store em memoria + persistencia em arquivo JSONL para as execucoes do agente.
 *
 * Cada execucao grava eventos em output/.execucoes/<id>.jsonl, permitindo replay
 * via SSE mesmo apos restart do server.
 */
import { promises as fs, createWriteStream, type WriteStream } from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { REPO_ROOT } from "./repo";
import type { ParamsPrompt } from "./prompt";

export const EXEC_DIR = path.join(REPO_ROOT, "output", ".execucoes");

export type Status = "running" | "awaiting" | "done" | "error" | "cancelled";

export type EventoTipo =
  | "info"
  | "text"
  | "tool_call"
  | "tool_result"
  | "tool_error"
  | "stage"
  | "awaiting_input"
  | "user_input"
  | "error"
  | "done";

export type Evento = {
  ts: number;
  type: EventoTipo;
  data: unknown;
};

export type Execucao = {
  id: string;
  params: ParamsPrompt;
  status: Status;
  startedAt: number;
  endedAt?: number;
  error?: string;
  cancelled?: boolean;
};

type State = {
  execucoes: Map<string, Execucao>;
  emitters: Map<string, EventEmitter>;
  streams: Map<string, WriteStream>;
  inputs: Map<string, ((msg: string) => void)[]>;
};

const KEY = Symbol.for("sigo.portal.execStore");
const g = globalThis as unknown as Record<symbol, State | undefined>;

function obter(): State {
  let s = g[KEY];
  if (!s) {
    s = {
      execucoes: new Map(),
      emitters: new Map(),
      streams: new Map(),
      inputs: new Map(),
    };
    g[KEY] = s;
  }
  return s;
}

function gerarId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${ts}-${r}`;
}

async function garantirDir() {
  await fs.mkdir(EXEC_DIR, { recursive: true });
}

export async function criar(params: ParamsPrompt): Promise<Execucao> {
  await garantirDir();
  const s = obter();
  const exec: Execucao = {
    id: gerarId(),
    params,
    status: "running",
    startedAt: Date.now(),
  };
  s.execucoes.set(exec.id, exec);
  s.emitters.set(exec.id, new EventEmitter());
  const ws = createWriteStream(path.join(EXEC_DIR, `${exec.id}.jsonl`), {
    flags: "a",
  });
  s.streams.set(exec.id, ws);
  await persistirMeta(exec);
  return exec;
}

async function persistirMeta(exec: Execucao) {
  const meta = path.join(EXEC_DIR, `${exec.id}.json`);
  await fs.writeFile(meta, JSON.stringify(exec, null, 2), "utf8");
}

export function obterExec(id: string): Execucao | undefined {
  return obter().execucoes.get(id);
}

export function emitter(id: string): EventEmitter | undefined {
  return obter().emitters.get(id);
}

export function emitirEvento(id: string, ev: Omit<Evento, "ts">) {
  const completo: Evento = { ...ev, ts: Date.now() };
  const s = obter();
  const ws = s.streams.get(id);
  if (ws) ws.write(JSON.stringify(completo) + "\n");
  const em = s.emitters.get(id);
  if (em) em.emit("evento", completo);
}

export async function finalizar(
  id: string,
  status: Status,
  erro?: string,
): Promise<void> {
  const s = obter();
  const ex = s.execucoes.get(id);
  if (!ex) return;
  ex.status = status;
  ex.endedAt = Date.now();
  if (erro) ex.error = erro;
  const ws = s.streams.get(id);
  if (ws) ws.end();
  s.streams.delete(id);
  await persistirMeta(ex);
  const em = s.emitters.get(id);
  if (em) {
    em.emit("evento", { ts: Date.now(), type: "done", data: { status, error: erro } });
    em.emit("close");
  }
}

export function marcarCancelado(id: string): boolean {
  const ex = obter().execucoes.get(id);
  if (!ex) return false;
  if (ex.status !== "running" && ex.status !== "awaiting") return false;
  ex.cancelled = true;
  // se estiver aguardando input, libera com sentinela vazia para o loop encerrar
  const filas = obter().inputs.get(id);
  if (filas && filas.length > 0) {
    const [resolver] = filas.splice(0, 1);
    resolver("");
  }
  return true;
}

/**
 * Marca a execucao como aguardando input do usuario e devolve uma Promise
 * que resolve quando alguem chama submeterInput(id, msg).
 */
export async function aguardarInput(id: string): Promise<string> {
  const s = obter();
  const ex = s.execucoes.get(id);
  if (ex) {
    ex.status = "awaiting";
    await persistirMeta(ex);
  }
  return new Promise<string>((resolve) => {
    const lista = s.inputs.get(id) ?? [];
    lista.push(resolve);
    s.inputs.set(id, lista);
  });
}

export function submeterInput(id: string, mensagem: string): boolean {
  const s = obter();
  const ex = s.execucoes.get(id);
  if (!ex || ex.status !== "awaiting") return false;
  const lista = s.inputs.get(id);
  if (!lista || lista.length === 0) return false;
  const resolver = lista.shift()!;
  ex.status = "running";
  resolver(mensagem);
  return true;
}

export async function listar(): Promise<Execucao[]> {
  // Combina memoria + arquivos persistidos
  const s = obter();
  const out = new Map<string, Execucao>();
  for (const [id, ex] of s.execucoes) out.set(id, ex);
  await garantirDir();
  const arquivos = await fs.readdir(EXEC_DIR).catch(() => []);
  for (const a of arquivos) {
    if (!a.endsWith(".json")) continue;
    const id = a.replace(/\.json$/, "");
    if (out.has(id)) continue;
    try {
      const txt = await fs.readFile(path.join(EXEC_DIR, a), "utf8");
      out.set(id, JSON.parse(txt) as Execucao);
    } catch {
      /* ignora */
    }
  }
  return [...out.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export async function lerEventos(id: string): Promise<Evento[]> {
  const f = path.join(EXEC_DIR, `${id}.jsonl`);
  const txt = await fs.readFile(f, "utf8").catch(() => "");
  const out: Evento[] = [];
  for (const linha of txt.split(/\r?\n/)) {
    if (!linha.trim()) continue;
    try {
      out.push(JSON.parse(linha) as Evento);
    } catch {
      /* ignora linha corrompida */
    }
  }
  return out;
}

export function totalEmExecucao(): number {
  let n = 0;
  for (const ex of obter().execucoes.values()) {
    if (ex.status === "running" || ex.status === "awaiting") n++;
  }
  return n;
}
