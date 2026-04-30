"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Play,
  Search,
} from "lucide-react";
import { MODOS, TIPOS, type Modo } from "@/lib/prompt";
import { TRACKS, type TrackId } from "@/lib/etapas";

type Versao = { tag: string; path: string; etapas: string[] };
type Rotina = { nome: string; path: string; versoes: Versao[] };

const ETAPAS: { id: string; short: string; track: TrackId }[] = [
  { id: "01", short: "ER",  track: "discovery" },
  { id: "02", short: "DDD", track: "design" },
  { id: "03", short: "C4",  track: "design" },
  { id: "04", short: "FLX", track: "design" },
  // Backlog antes da Refatoracao: o backlog define o que sera refatorado.
  // Pasta historica: 07-backlog/.
  { id: "07", short: "BLG", track: "design" },
  // Refatoracao implementa o backlog. Pasta historica: 05-refact/.
  { id: "05", short: "RFT", track: "delivery" },
];

function progresso(v: Versao | undefined): Set<string> {
  if (!v) return new Set();
  const visiveis = new Set(ETAPAS.map((e) => e.id));
  const s = new Set<string>();
  for (const e of v.etapas) {
    const m = /^(\d{2})-/.exec(e);
    if (m && visiveis.has(m[1])) s.add(m[1]);
  }
  return s;
}

function inferTipo(nome: string): (typeof TIPOS)[number] {
  if (nome.startsWith("pk_")) return "PACKAGE";
  if (nome.startsWith("fn_") || nome.startsWith("f_")) return "FUNCTION";
  return "PROCEDURE";
}

const TIPO_PILL: Record<string, string> = {
  PROCEDURE: "text-sky-300",
  FUNCTION: "text-violet-300",
  PACKAGE: "text-amber-300",
};

type FiltroStatus = "todas" | "completas" | "andamento" | "vazias";

export function Console({ rotinas }: { rotinas: Rotina[] }) {
  const router = useRouter();

  // Disparador
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("PROCEDURE");
  const [modo, setModo] = useState<Modo>("completo");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const [executando, setExecutando] = useState(false);
  const [cvsObjetos, setCvsObjetos] = useState<{ nome: string; path: string }[]>([]);
  const [carregandoCvs, setCarregandoCvs] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Catalogo
  const [filtro, setFiltro] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todas");
  const [executandoCat, setExecutandoCat] = useState<string | null>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregandoCvs(true);
    fetch(`/api/cvs-objetos?tipo=${encodeURIComponent(tipo)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelado) return;
        if (Array.isArray(j.objetos)) setCvsObjetos(j.objetos);
        else setCvsObjetos([]);
      })
      .finally(() => {
        if (!cancelado) setCarregandoCvs(false);
      });
    return () => {
      cancelado = true;
    };
  }, [tipo]);

  const sugestoes = useMemo(() => {
    const q = nome.trim().toLowerCase();
    if (!q) return cvsObjetos.slice(0, 30);
    return cvsObjetos
      .filter((o) => o.nome.toLowerCase().includes(q))
      .sort((a, b) => {
        const ai = a.nome.toLowerCase().startsWith(q) ? 0 : 1;
        const bi = b.nome.toLowerCase().startsWith(q) ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 30);
  }, [nome, cvsObjetos]);

  const dispararPor = async (
    n: string,
    t: (typeof TIPOS)[number],
    m: Modo,
  ): Promise<boolean> => {
    if (!n.trim()) {
      toast.error("Selecione um objeto");
      return false;
    }
    try {
      const r = await fetch("/api/executar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: n, tipo: t, schema: "HUMASTER", modo: m }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(j.erro ?? `Falha (${r.status})`);
        return false;
      }
      toast.success("Agente iniciado");
      router.push(`/execucoes/${encodeURIComponent(j.id)}`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  const executar = async () => {
    setExecutando(true);
    await dispararPor(nome, tipo, modo);
    setExecutando(false);
  };

  const executarRotina = async (r: Rotina) => {
    setExecutandoCat(r.nome);
    await dispararPor(r.nome, inferTipo(r.nome), "completo");
    setExecutandoCat(null);
  };

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return rotinas.filter((r) => {
      if (q && !r.nome.toLowerCase().includes(q)) return false;
      const c = progresso(r.versoes[0]).size;
      if (status === "completas") return c === ETAPAS.length;
      if (status === "andamento") return c > 0 && c < ETAPAS.length;
      if (status === "vazias") return c === 0;
      return true;
    });
  }, [rotinas, filtro, status]);

  const opcoesStatus: { id: FiltroStatus; label: string; n: number }[] = [
    { id: "todas", label: "todas", n: rotinas.length },
    {
      id: "completas",
      label: "completas",
      n: rotinas.filter((r) => progresso(r.versoes[0]).size === ETAPAS.length).length,
    },
    {
      id: "andamento",
      label: "em andamento",
      n: rotinas.filter((r) => {
        const c = progresso(r.versoes[0]).size;
        return c > 0 && c < ETAPAS.length;
      }).length,
    },
    {
      id: "vazias",
      label: "sem analise",
      n: rotinas.filter((r) => progresso(r.versoes[0]).size === 0).length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Command bar */}
      <div className="card-tech relative flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <div ref={comboRef} className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setTipo(inferTipo(e.target.value));
              setAberto(true);
              setDestaque(0);
            }}
            onFocus={() => setAberto(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAberto(true);
                setDestaque((d) => Math.min(d + 1, sugestoes.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setDestaque((d) => Math.max(d - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (aberto && sugestoes[destaque]) {
                  setNome(sugestoes[destaque].nome);
                  setTipo(inferTipo(sugestoes[destaque].nome));
                  setAberto(false);
                } else if (nome) {
                  void executar();
                }
              } else if (e.key === "Escape") {
                setAberto(false);
              }
            }}
            placeholder={
              carregandoCvs
                ? "carregando CVS..."
                : `buscar entre ${cvsObjetos.length} objetos...`
            }
            className="w-full rounded-md border border-transparent bg-transparent py-1.5 pl-8 pr-16 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            autoComplete="off"
            spellCheck={false}
          />
          {nome && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-300">
              {tipo}
            </span>
          )}
          {aberto && sugestoes.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-zinc-800 bg-[#16161c] shadow-2xl ring-1 ring-black/40">
              {sugestoes.map((s, i) => (
                <li
                  key={s.nome}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setNome(s.nome);
                    setTipo(inferTipo(s.nome));
                    setAberto(false);
                  }}
                  onMouseEnter={() => setDestaque(i)}
                  className={`flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm text-zinc-100 ${
                    i === destaque ? "bg-violet-500/15" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-sm text-zinc-100">{s.nome}</span>
                    {s.path && (
                      <span className="truncate font-mono text-[10px] text-zinc-500" title={s.path}>
                        {s.path}
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] uppercase ${
                      TIPO_PILL[inferTipo(s.nome)]
                    }`}
                  >
                    {inferTipo(s.nome)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex h-7 items-center self-stretch sm:border-l sm:border-white/[0.07] sm:pl-2" />

        <div className="relative">
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as Modo)}
            className="appearance-none rounded-md border border-white/[0.10] bg-[#1a1a1f] py-1.5 pl-2.5 pr-7 text-xs font-medium text-zinc-100 focus:border-violet-500/40 focus:outline-none"
          >
            {MODOS.filter((m) => !m.track).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            {TRACKS.map((t) => {
              const itens = MODOS.filter((m) => m.track === t.id);
              if (itens.length === 0) return null;
              return (
                <optgroup key={t.id} label={t.label.toUpperCase()}>
                  {itens.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
        </div>

        <button
          onClick={executar}
          disabled={executando || !nome.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 18px -6px rgba(139,92,246,0.55)",
          }}
        >
          {executando ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3 fill-current" />
          )}
          Executar
        </button>
      </div>

      {/* Filtro segmentado */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-md border border-white/[0.08] bg-[#16161c] p-0.5 text-xs">
          {opcoesStatus.map((o) => (
            <button
              key={o.id}
              onClick={() => setStatus(o.id)}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
                status === o.id
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {o.label}
              <span
                className={`rounded px-1 text-[10px] tabular-nums ${
                  status === o.id
                    ? "bg-white/20"
                    : "bg-white/[0.08] text-zinc-300"
                }`}
              >
                {o.n}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-44">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="filtrar tabela..."
            className="w-full rounded-md border border-white/[0.08] bg-[#16161c] py-1 pl-7 pr-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
          />
        </div>
      </div>

      {/* Tabela densa */}
      <div className="card-tech overflow-hidden">
        {filtradas.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-500">
            Nenhuma rotina corresponde ao filtro.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07] bg-[#1a1a1f] text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Rotina</th>
                <th className="hidden px-2 py-2 text-left font-medium sm:table-cell">Tag</th>
                <th className="px-2 py-2 text-left font-medium">Etapas</th>
                <th className="px-2 py-2 text-right font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => {
                const ult = r.versoes[0];
                const concluidas = progresso(ult);
                const pct = Math.round((concluidas.size / ETAPAS.length) * 100);
                const tipo = inferTipo(r.nome);
                return (
                  <tr
                    key={r.nome}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-violet-500/[0.06]"
                  >
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/rotinas/${encodeURIComponent(r.nome)}`}
                        className="group flex items-center gap-2"
                      >
                        <span
                          className={`font-mono text-[10px] font-bold uppercase ${TIPO_PILL[tipo]}`}
                        >
                          {tipo.slice(0, 3)}
                        </span>
                        <span className="font-mono text-sm text-zinc-100 group-hover:text-violet-300">
                          {r.nome}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-2 py-1.5 sm:table-cell">
                      {ult ? (
                        <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                          {ult.tag}
                        </code>
                      ) : (
                        <span className="text-[10px] italic text-zinc-500">
                          sem analise
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {ETAPAS.map((e, i) => {
                            const track = TRACKS.find((t) => t.id === e.track)!;
                            const concluido = concluidas.has(e.id);
                            const trocaTrack =
                              i > 0 && ETAPAS[i - 1].track !== e.track;
                            return (
                              <span key={e.id} className="flex items-center">
                                {trocaTrack && (
                                  <span
                                    aria-hidden
                                    className="mx-0.5 h-3.5 w-px bg-white/[0.12]"
                                  />
                                )}
                                <span
                                  title={`${e.short} - ${track.label}`}
                                  className={`h-3.5 w-2 rounded-sm ${
                                    concluido ? track.classes.bg : "bg-white/[0.08]"
                                  }`}
                                />
                              </span>
                            );
                          })}
                        </div>
                        <span className="w-8 text-right font-mono text-[10px] tabular-nums text-zinc-500">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/rotinas/${encodeURIComponent(r.nome)}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/[0.06]"
                        >
                          abrir
                          <ArrowRight className="size-3" />
                        </Link>
                        <button
                          onClick={() => executarRotina(r)}
                          disabled={executandoCat === r.nome}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-violet-300 hover:bg-violet-500/15 disabled:opacity-50"
                        >
                          {executandoCat === r.nome ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Play className="size-3" />
                          )}
                          run
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
