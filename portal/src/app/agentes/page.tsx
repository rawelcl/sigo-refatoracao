import Link from "next/link";
import { listarAgentes, lerArtefato } from "@/lib/repo";
import { PageShell, PageHeader } from "@/components/page-shell";
import { FileCode2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentesPage() {
  const agentes = await listarAgentes();
  const conteudos = await Promise.all(
    agentes.map(async (a) => {
      try {
        const txt = await lerArtefato(a.path);
        const primeira = txt.split("\n").find((l) => l.trim().length > 0) ?? "";
        return { ...a, resumo: primeira.replace(/^#+\s*/, "").slice(0, 140) };
      } catch {
        return { ...a, resumo: "" };
      }
    }),
  );

  return (
    <PageShell>
      <PageHeader
        titulo="Agentes"
        descricao="Definicoes em .github/agents/"
      />

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {conteudos.map((a) => (
          <li key={a.nome} className="card-tech p-3 transition hover:border-violet-500/40">
            <Link
              href={`/visualizar?path=${encodeURIComponent(a.path)}`}
              className="flex items-start gap-2"
            >
              <FileCode2 className="mt-0.5 size-4 text-violet-400" />
              <div className="min-w-0">
                <div className="truncate font-mono text-xs font-semibold text-zinc-100">
                  {a.nome}
                </div>
                {a.resumo && (
                  <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                    {a.resumo}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
        {conteudos.length === 0 && (
          <li className="col-span-full rounded-md border border-white/[0.06] bg-[var(--surface)] p-4 text-center text-xs text-zinc-500">
            Nenhum agente encontrado.
          </li>
        )}
      </ul>
    </PageShell>
  );
}
