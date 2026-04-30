"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ETAPAS, TRACKS, trackDe, type EtapaId } from "@/lib/etapas";

type Evento = {
  ts: number;
  type:
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
  data: Record<string, unknown>;
};

function formatarHora(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour12: false });
}

function ToolCallBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { name?: string; args?: unknown };
  return (
    <details className="my-1 rounded-md border border-blue-500/20 bg-blue-500/[0.06] px-2 py-1 text-xs">
      <summary className="cursor-pointer select-none font-mono text-blue-300">
        {formatarHora(ev.ts)} -&gt; {data.name}(...)
      </summary>
      <pre className="mt-1 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-300">
        {JSON.stringify(data.args, null, 2)}
      </pre>
    </details>
  );
}

function ToolResultBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { name?: string; result?: unknown };
  const txt =
    typeof data.result === "string"
      ? data.result
      : JSON.stringify(data.result, null, 2);
  return (
    <details className="my-1 rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] px-2 py-1 text-xs">
      <summary className="cursor-pointer select-none font-mono text-cyan-300">
        {formatarHora(ev.ts)} &lt;- {data.name} ok
      </summary>
      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-300">
        {txt}
      </pre>
    </details>
  );
}

function ToolErrorBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { name?: string; message?: string };
  return (
    <div className="my-1 rounded-md border border-red-500/30 bg-red-500/[0.08] px-2 py-1 text-xs">
      <span className="font-mono text-red-300">
        {formatarHora(ev.ts)} ! {data.name}: {data.message}
      </span>
    </div>
  );
}

function TextBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { text?: string };
  const texto = data.text ?? "";
  // Heuristica: textos curtos ficam abertos; longos colapsam por padrao.
  const linhas = texto.split("\n").length;
  const longo = texto.length > 240 || linhas > 4;
  const [aberto, setAberto] = useState(!longo);
  // Primeira linha nao vazia como resumo.
  const resumo =
    texto
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "(sem texto)";
  return (
    <div className="my-2 rounded-md border border-white/[0.07] bg-[var(--surface)] text-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-zinc-500">{aberto ? "v" : ">"}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          agente {formatarHora(ev.ts)}
        </span>
        {!aberto && (
          <span className="ml-1 flex-1 truncate text-xs text-zinc-400">{resumo}</span>
        )}
      </button>
      {aberto && (
        <pre className="whitespace-pre-wrap border-t border-white/[0.05] px-3 py-2 font-sans text-sm text-zinc-200">
          {texto}
        </pre>
      )}
    </div>
  );
}

function InfoBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { message?: string };
  return (
    <div className="my-1 text-xs italic text-zinc-500">
      {formatarHora(ev.ts)} - {data.message}
    </div>
  );
}

function ErrorBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { message?: string };
  return (
    <div className="my-2 rounded-md border border-red-500/30 bg-red-500/[0.10] p-3 text-sm text-red-200">
      {formatarHora(ev.ts)} - ERRO: {data.message}
    </div>
  );
}

function UserInputBlock({ ev }: { ev: Evento }) {
  const data = ev.data as { text?: string };
  return (
    <div className="my-2 rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2 text-sm">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-emerald-300">
        usuario {formatarHora(ev.ts)}
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm text-emerald-100">{data.text}</pre>
    </div>
  );
}

function EtapaAtualHero({
  atual,
  visitadas,
  status,
  duracoes,
}: {
  atual: EtapaId | null;
  visitadas: Set<EtapaId>;
  status: string;
  duracoes: Map<EtapaId, { inicio: number; fim?: number }>;
}) {
  const meta = atual ? ETAPAS.find((e) => e.id === atual) : null;
  const idx = meta ? meta.ordem + 1 : 0;
  const total = ETAPAS.length;
  const pct = Math.round((visitadas.size / total) * 100);
  const inicio = atual ? duracoes.get(atual)?.inicio : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);
  const decorrido = inicio ? Math.max(0, now - inicio) : 0;
  const dur =
    decorrido < 60_000
      ? `${Math.round(decorrido / 1000)}s`
      : `${Math.floor(decorrido / 60_000)}m${Math.round((decorrido % 60_000) / 1000)}s`;

  const rotulo =
    status === "done"
      ? "Concluido"
      : status === "error"
        ? "Falhou"
        : status === "cancelled"
          ? "Cancelado"
          : status === "awaiting"
            ? "Aguardando liberacao da camada"
            : meta
              ? `Etapa ${idx} de ${total}`
              : "Aguardando primeira etapa...";

  const corFaixa =
    status === "done"
      ? "from-emerald-400 to-violet-400"
      : status === "error"
        ? "from-red-400 to-amber-400"
        : status === "cancelled"
          ? "from-amber-400 to-zinc-400"
          : status === "awaiting"
            ? "from-amber-400 to-violet-400"
            : "from-violet-500 to-cyan-400";

  return (
    <div className="card-tech overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {rotulo}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
              {meta ? meta.acao : "Iniciando..."}
            </h2>
            {status === "running" && meta && (
              <span className="flex items-center gap-1 text-xs text-violet-300">
                <span className="size-1.5 animate-pulse rounded-full bg-violet-400" />
                {dur}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold tabular-nums text-violet-300">
            {pct}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            {visitadas.size} de {total}
          </div>
        </div>
      </div>

      {/* barra de progresso */}
      <div className="mt-4 h-1.5 w-full bg-zinc-800/60">
        <div
          className={`h-full bg-gradient-to-r ${corFaixa} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* cabecalho de tracks */}
      <div
        className="grid gap-1 px-3 pt-3"
        style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
      >
        {TRACKS.map((t) => {
          const itens = ETAPAS.filter((e) => e.track === t.id);
          if (itens.length === 0) return null;
          return (
            <div
              key={t.id}
              className="flex flex-col items-center gap-1"
              style={{ gridColumn: `span ${itens.length} / span ${itens.length}` }}
            >
              <div className={`h-1 w-full rounded-full ${t.classes.bg} opacity-60`} />
              <div
                className={`text-[9px] font-semibold uppercase tracking-[0.2em] ${t.classes.text}`}
              >
                {t.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* stepper horizontal */}
      <ol className="grid grid-cols-8 gap-1 px-3 pb-3 pt-2">
        {ETAPAS.map((e) => {
          const ativo = atual === e.id && status === "running";
          const visitado = visitadas.has(e.id);
          const concluido = visitado && atual !== e.id;
          const concluidoFinal = visitado && status === "done";
          const track = trackDe(e.id);
          return (
            <li
              key={e.id}
              aria-label={`${e.label} - track ${track.label}`}
              className={[
                "flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center transition",
                ativo
                  ? `${track.classes.bgSoft} ring-1 ${track.classes.ring}`
                  : concluido || concluidoFinal
                    ? "bg-white/[0.04]"
                    : "opacity-50",
              ].join(" ")}
              title={e.acao}
            >
              <span
                className={[
                  "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                  ativo
                    ? `${track.classes.bg} text-white ring-2 ${track.classes.ring}`
                    : visitado
                      ? `${track.classes.bg} text-white opacity-90`
                      : "border border-zinc-700 text-zinc-500",
                ].join(" ")}
              >
                {ativo ? (
                  <span className="size-2 animate-pulse rounded-full bg-white" />
                ) : visitado ? (
                  "OK"
                ) : (
                  e.ordem + 1
                )}
              </span>
              <span
                className={[
                  "text-[10px] font-medium leading-tight",
                  ativo ? track.classes.text : visitado ? "text-zinc-300" : "text-zinc-500",
                ].join(" ")}
              >
                {e.label.replace(/^\d+\s*-\s*/, "").replace(/^F\s*-\s*/, "")}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EventoRender({ ev }: { ev: Evento }) {
  switch (ev.type) {
    case "text":
      return <TextBlock ev={ev} />;
    case "tool_call":
      return <ToolCallBlock ev={ev} />;
    case "tool_result":
      return <ToolResultBlock ev={ev} />;
    case "tool_error":
      return <ToolErrorBlock ev={ev} />;
    case "info":
      return <InfoBlock ev={ev} />;
    case "error":
      return <ErrorBlock ev={ev} />;
    case "user_input":
      return <UserInputBlock ev={ev} />;
    default:
      return null;
  }
}

type Grupo = {
  etapa: EtapaId | null;
  inicio: number;
  fim?: number;
  eventos: Evento[];
};

function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function GruposPorEtapa({
  eventos,
  atual,
  status,
  duracoes,
}: {
  eventos: Evento[];
  atual: EtapaId | null;
  status: string;
  duracoes: Map<EtapaId, { inicio: number; fim?: number }>;
}) {
  const grupos: Grupo[] = [];
  let cur: Grupo | null = null;
  for (const ev of eventos) {
    if (ev.type === "done" || ev.type === "awaiting_input") continue;
    if (ev.type === "stage") {
      const et = (ev.data as { etapa?: EtapaId }).etapa ?? null;
      if (cur) cur.fim = ev.ts;
      cur = { etapa: et, inicio: ev.ts, eventos: [] };
      grupos.push(cur);
      continue;
    }
    if (!cur) {
      cur = { etapa: null, inicio: ev.ts, eventos: [] };
      grupos.push(cur);
    }
    cur.eventos.push(ev);
  }

  if (grupos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {grupos.map((g, i) => {
        const meta = g.etapa ? ETAPAS.find((e) => e.id === g.etapa) : null;
        const ehUltimo = i === grupos.length - 1;
        const ehAtual = !!g.etapa && g.etapa === atual && status === "running";
        const abertoPadrao =
          ehAtual ||
          (ehUltimo &&
            (status === "awaiting" || status === "error"));
        const dur = g.etapa ? duracoes.get(g.etapa) : undefined;
        const fim = dur?.fim ?? g.fim ?? (ehUltimo ? Date.now() : g.inicio);
        const decorrido = Math.max(0, fim - g.inicio);
        const titulo = meta ? meta.label : "Inicializacao";
        const acao = meta?.acao ?? null;
        const concluido = !!g.etapa && !ehAtual && !!dur?.fim;
        const corBorda = ehAtual
          ? "border-violet-500/40"
          : concluido
            ? "border-emerald-500/25"
            : "border-white/[0.08]";
        const corBg = ehAtual
          ? "bg-violet-500/[0.06]"
          : concluido
            ? "bg-emerald-500/[0.04]"
            : "bg-[var(--surface)]";
        const badge = ehAtual
          ? { txt: "em curso", cls: "bg-violet-500/20 text-violet-200 border-violet-500/40" }
          : concluido
            ? { txt: "OK", cls: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" }
            : g.etapa
              ? { txt: "aguardando", cls: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40" }
              : { txt: "inicio", cls: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40" };

        return (
          <details
            key={i}
            open={abertoPadrao}
            className={`group rounded-md border ${corBorda} ${corBg} transition`}
          >
            <summary className="flex cursor-pointer select-none items-center gap-3 px-3 py-2 text-xs">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.cls}`}
              >
                {badge.txt}
              </span>
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="font-semibold text-zinc-100">{titulo}</span>
                {acao && (
                  <span className="truncate text-[11px] text-zinc-400">{acao}</span>
                )}
              </div>
              <span className="font-mono text-[10px] text-zinc-500">
                {g.eventos.length} ev
              </span>
              <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                {formatarDuracao(decorrido)}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {formatarHora(g.inicio)}
              </span>
              <span className="text-zinc-500 transition group-open:rotate-90">&gt;</span>
            </summary>
            <div className="border-t border-white/[0.05] px-3 py-2">
              {g.eventos.length === 0 ? (
                <p className="text-[11px] italic text-zinc-500">
                  sem eventos registrados
                </p>
              ) : (
                g.eventos.map((ev, j) => <EventoRender key={j} ev={ev} />)
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function LogViewer({ id }: { id: string }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<"running" | "awaiting" | "done" | "error" | "cancelled">(
    "running",
  );
  const [erroFinal, setErroFinal] = useState<string | undefined>();
  const [aguardando, setAguardando] = useState<{ sugestoes: string[] } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [textoLivre, setTextoLivre] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/execucoes/${encodeURIComponent(id)}/stream`);
    const handler = (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data) as Evento;
        setEventos((prev) => [...prev, ev]);
        if (ev.type === "awaiting_input") {
          const d = ev.data as { sugestoes?: string[] };
          setStatus("awaiting");
          setAguardando({ sugestoes: d.sugestoes ?? ["avancar"] });
        }
        if (ev.type === "user_input") {
          setAguardando(null);
          setStatus("running");
        }
        if (ev.type === "done") {
          const d = ev.data as { status?: typeof status; error?: string };
          setStatus(d.status ?? "done");
          setErroFinal(d.error);
          setAguardando(null);
          es.close();
        }
      } catch {
        /* ignora */
      }
    };
    for (const t of [
      "info",
      "text",
      "tool_call",
      "tool_result",
      "tool_error",
      "stage",
      "awaiting_input",
      "user_input",
      "error",
      "done",
    ]) {
      es.addEventListener(t, handler as EventListener);
    }
    es.onerror = () => {
      // EventSource tenta reconectar sozinho; nao fechamos aqui
    };
    return () => es.close();
  }, [id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventos.length]);

  const cancelar = async () => {
    try {
      const r = await fetch(`/api/execucoes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast.error(j.erro ?? "Falha ao cancelar");
      } else {
        toast.success("Cancelamento solicitado");
      }
    } catch (e) {
      toast.error(String(e));
    }
  };

  const responder = async (mensagem: string) => {
    if (enviando) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/execucoes/${encodeURIComponent(id)}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(j.erro ?? `Falha (${r.status})`);
        return;
      }
      setTextoLivre("");
      setAguardando(null);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setEnviando(false);
    }
  };

  const cor =
    status === "done"
      ? "text-emerald-300"
      : status === "error"
        ? "text-red-300"
        : status === "cancelled"
          ? "text-amber-300"
          : status === "awaiting"
            ? "text-amber-300"
            : "text-blue-300";

  const { atual, visitadas, duracoes } = useMemo(() => {
    const visit = new Set<EtapaId>();
    const dur = new Map<EtapaId, { inicio: number; fim?: number }>();
    let curr: EtapaId | null = null;
    for (const ev of eventos) {
      if (ev.type === "stage") {
        const et = (ev.data as { etapa?: EtapaId }).etapa;
        if (!et) continue;
        if (curr && curr !== et) {
          const d = dur.get(curr);
          if (d && !d.fim) d.fim = ev.ts;
        }
        if (!dur.has(et)) dur.set(et, { inicio: ev.ts });
        visit.add(et);
        curr = et;
      }
    }
    if (curr && status !== "running") {
      const d = dur.get(curr);
      if (d && !d.fim) d.fim = Date.now();
    }
    return { atual: curr, visitadas: visit, duracoes: dur };
  }, [eventos, status]);

  return (
    <div className="flex flex-col gap-3">
      <EtapaAtualHero
        atual={atual}
        visitadas={visitadas}
        status={status}
        duracoes={duracoes}
      />

      <div className="flex items-center gap-3 rounded-md border border-white/[0.07] bg-[var(--surface)] px-4 py-2 text-xs">
        <span className="font-mono text-zinc-500">{id}</span>
        <span className={`font-medium ${cor}`}>{status}</span>
        {(status === "running" || status === "awaiting") && (
          <button
            onClick={cancelar}
            className="ml-auto rounded-md border border-red-500/40 px-3 py-1 text-red-300 hover:bg-red-500/10"
          >
            Cancelar
          </button>
        )}
        {status !== "running" && status !== "awaiting" && (
          <Link
            href="/execucoes"
            className="ml-auto text-zinc-500 hover:text-zinc-300 hover:underline"
          >
            voltar para historico
          </Link>
        )}
      </div>

      {aguardando && status === "awaiting" && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.08] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-200">
              Camada concluida. Liberar avanco para a proxima?
            </span>
          </div>
          <div className="flex justify-end">
            <button
              disabled={enviando}
              onClick={() => void responder(aguardando.sugestoes[0] ?? "avancar")}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {aguardando.sugestoes[0] ?? "avancar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-white/[0.07] bg-[var(--surface-2)] p-3">
        {eventos.length === 0 && (
          <p className="text-xs italic text-zinc-500">aguardando eventos...</p>
        )}
        <GruposPorEtapa
          eventos={eventos}
          atual={atual}
          status={status}
          duracoes={duracoes}
        />
        {erroFinal && (
          <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/[0.10] p-2 text-xs text-red-200">
            {erroFinal}
          </div>
        )}
        <div ref={fimRef} />
      </div>
    </div>
  );
}
