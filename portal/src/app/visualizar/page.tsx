import Link from "next/link";
import { lerArtefato } from "@/lib/repo";
import { PageShell, PageHeader } from "@/components/page-shell";
import { ArtefatoView } from "@/components/artefato-view";
import { AlertTriangle, Download } from "lucide-react";

export const dynamic = "force-dynamic";

function extensao(p: string): string {
  return (p.split(".").pop() ?? "").toLowerCase();
}

function inferirVoltar(p: string): { href: string; label: string } {
  const partes = p.split("/");
  // output/rotinas/<nome>/...
  if (partes[0] === "output" && partes[1] === "rotinas" && partes[2]) {
    return { href: `/rotinas/${encodeURIComponent(partes[2])}`, label: partes[2] };
  }
  // .github/agents/...
  if (partes[0] === ".github" && partes[1] === "agents") {
    return { href: "/agentes", label: "agentes" };
  }
  return { href: "/", label: "inicio" };
}

export default async function VisualizarPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const { path: p } = await searchParams;

  if (!p) {
    return (
      <PageShell>
        <PageHeader titulo="Visualizar" voltarHref="/" voltarLabel="inicio" />
        <div className="card-tech flex items-center gap-2 p-4 text-xs text-zinc-400">
          <AlertTriangle className="size-4 text-amber-400" />
          Parametro <code className="rounded bg-white/[0.06] px-1">path</code> ausente.
        </div>
      </PageShell>
    );
  }

  const ext = extensao(p);
  const voltar = inferirVoltar(p);
  const nome = p.split("/").pop() ?? p;

  let conteudo: string | null = null;
  let erro: string | null = null;
  try {
    conteudo = await lerArtefato(p);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  return (
    <PageShell>
      <PageHeader
        titulo={nome}
        descricao={p}
        voltarHref={voltar.href}
        voltarLabel={voltar.label}
        acoes={
          <a
            href={`/api/artefato?path=${encodeURIComponent(p)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-white/[0.10] bg-[#1a1a1f] px-2.5 py-1 text-[11px] text-zinc-300 hover:border-violet-500/40 hover:text-violet-300"
          >
            <Download className="size-3" />
            raw
          </a>
        }
      />

      {erro ? (
        <div className="card-tech flex items-center gap-2 p-4 text-xs text-red-300">
          <AlertTriangle className="size-4" />
          Erro ao ler artefato: {erro}
          <Link href="/" className="ml-auto text-zinc-400 underline">
            voltar
          </Link>
        </div>
      ) : (
        <ArtefatoView path={p} extensao={ext} conteudo={conteudo ?? ""} />
      )}
    </PageShell>
  );
}
