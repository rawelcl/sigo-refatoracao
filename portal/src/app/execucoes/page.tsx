import Link from "next/link";
import { listar } from "@/lib/exec-store";
import { PageShell, PageHeader } from "@/components/page-shell";
import { ArrowRight, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const min = Math.floor(ms / 60_000);
  const seg = Math.round((ms % 60_000) / 1000);
  return `${min}m${seg}s`;
}

function formatarData(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", { hour12: false });
}

const STATUS_COR: Record<string, string> = {
  running: "text-blue-300 bg-blue-500/10 ring-blue-500/30",
  awaiting: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
  done: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
  error: "text-red-300 bg-red-500/10 ring-red-500/30",
  cancelled: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
};

export default async function ExecucoesPage() {
  const execucoes = await listar();
  const emCurso = execucoes.filter((e) => e.status === "running").length;

  return (
    <PageShell>
      <PageHeader
        titulo="Execucoes"
        descricao="Historico de invocacoes do agente orquestrador."
        acoes={
          emCurso > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300 ring-1 ring-blue-500/30">
              <Loader2 className="size-3 animate-spin" />
              {emCurso} em curso
            </span>
          ) : null
        }
      />

      {execucoes.length === 0 ? (
        <div className="card-tech p-8 text-center text-xs text-zinc-500">
          Nenhuma execucao registrada. Dispare uma rotina pelo console.
        </div>
      ) : (
        <div className="card-tech overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07] bg-[#1a1a1f] text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">Rotina</th>
                <th className="hidden px-2 py-2 text-left font-medium sm:table-cell">
                  Modo
                </th>
                <th className="hidden px-2 py-2 text-left font-medium md:table-cell">
                  Iniciada
                </th>
                <th className="px-2 py-2 text-right font-medium">Duracao</th>
                <th className="px-2 py-2 text-right font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((ex) => {
                const dur = ex.endedAt
                  ? formatarDuracao(ex.endedAt - ex.startedAt)
                  : formatarDuracao(Date.now() - ex.startedAt);
                return (
                  <tr
                    key={ex.id}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-violet-500/[0.06]"
                  >
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ring-1 ${
                          STATUS_COR[ex.status] ?? "text-zinc-400 bg-white/[0.06]"
                        }`}
                      >
                        {ex.status === "running" && (
                          <Loader2 className="size-2.5 animate-spin" />
                        )}
                        {ex.status === "awaiting" && (
                          <span className="size-2 animate-pulse rounded-full bg-amber-400" />
                        )}
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-sm text-zinc-100">
                        {ex.params.nome}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-zinc-500">
                        {ex.params.tipo}
                      </span>
                    </td>
                    <td className="hidden px-2 py-1.5 sm:table-cell">
                      <span className="font-mono text-[11px] text-zinc-400">
                        {ex.params.modo}
                      </span>
                    </td>
                    <td className="hidden px-2 py-1.5 md:table-cell">
                      <span className="font-mono text-[11px] text-zinc-400">
                        {formatarData(ex.startedAt)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-zinc-400">
                      {dur}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Link
                        href={`/execucoes/${encodeURIComponent(ex.id)}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/[0.06]"
                      >
                        abrir
                        <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
