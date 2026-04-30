import { notFound } from "next/navigation";
import Link from "next/link";
import { listarRotinas, listarArquivosVersao } from "@/lib/repo";
import { trackPorPrefixo } from "@/lib/etapas";
import { PageShell, PageHeader } from "@/components/page-shell";
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  FileType2,
  Folder,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ETAPA_ICON: Record<string, string> = {
  "01": "ER",
  "02": "DDD",
  "03": "C4",
  "04": "FLX",
  "05": "RFT",
  "06": "IMP",
  "07": "BLG",
};

function iconePorTipo(tipo: string) {
  if (tipo === "md") return <FileText className="size-3.5 text-zinc-400" />;
  if (tipo === "svg") return <ImageIcon className="size-3.5 text-cyan-400" />;
  if (tipo === "puml") return <FileType2 className="size-3.5 text-amber-400" />;
  if (tipo === "sql") return <FileCode className="size-3.5 text-violet-400" />;
  return <FileText className="size-3.5 text-zinc-500" />;
}

export default async function RotinaPage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;
  const rotinas = await listarRotinas();
  const rotina = rotinas.find((r) => r.nome === nome);
  if (!rotina) return notFound();

  const versoesComArquivos = await Promise.all(
    rotina.versoes.map(async (v) => ({
      ...v,
      arquivos: await listarArquivosVersao(rotina.nome, v.tag),
    })),
  );

  return (
    <PageShell>
      <PageHeader
        titulo={rotina.nome}
        descricao={`${rotina.versoes.length} versao(oes) analisada(s)`}
        voltarHref="/"
        voltarLabel="catalogo"
        acoes={
          <code className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-zinc-300">
            {rotina.path}
          </code>
        }
      />

      {versoesComArquivos.length === 0 && (
        <div className="card-tech p-6 text-center text-xs text-zinc-500">
          Nenhuma versao analisada ainda.
        </div>
      )}

      <div className="space-y-4">
        {versoesComArquivos.map((v) => {
          const total = v.arquivos.reduce((a, e) => a + e.arquivos.length, 0);
          const etapasComArquivos = v.arquivos.filter(
            (e) => e.arquivos.length > 0,
          );
          return (
            <section key={v.tag} className="card-tech p-3">
              <header className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.05] pb-2">
                <div className="flex items-center gap-2">
                  <Folder className="size-3.5 text-violet-400" />
                  <h2 className="font-mono text-xs font-semibold text-zinc-100">
                    rev-{v.tag}
                  </h2>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {etapasComArquivos.length}/{v.arquivos.length} etapas
                  </span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {total} arq
                  </span>
                </div>
              </header>

              {etapasComArquivos.length === 0 ? (
                <p className="px-2 py-3 text-xs italic text-zinc-500">
                  Nenhum artefato gerado nesta versao.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {etapasComArquivos.map((e) => {
                    const id = e.etapa.slice(0, 2);
                    const track = trackPorPrefixo(id);
                    return (
                      <div
                        key={e.etapa}
                        className="rounded-md border border-white/[0.06] bg-[var(--surface-2)] p-2"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${track.classes.badgeBg} ${track.classes.badgeText}`}
                          >
                            {ETAPA_ICON[id] ?? id}
                          </span>
                          <span className="truncate font-mono text-[11px] text-zinc-300">
                            {e.etapa}
                          </span>
                          <span className="ml-auto font-mono text-[10px] tabular-nums text-zinc-500">
                            {e.arquivos.length}
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {e.arquivos.slice(0, 12).map((a) => (
                            <li key={a.path}>
                              <Link
                                href={`/visualizar?path=${encodeURIComponent(a.path)}`}
                                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-white/[0.04] ${track.classes.hoverText}`}
                              >
                                {iconePorTipo(a.tipo)}
                                <span className="truncate">{a.nome}</span>
                              </Link>
                            </li>
                          ))}
                          {e.arquivos.length > 12 && (
                            <li className="px-1.5 text-[10px] italic text-zinc-500">
                              +{e.arquivos.length - 12} arquivo(s)
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
