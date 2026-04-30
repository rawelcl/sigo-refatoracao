import { notFound } from "next/navigation";
import { obterExec, listar } from "@/lib/exec-store";
import { PageShell, PageHeader } from "@/components/page-shell";
import { LogViewer } from "@/components/log-viewer";

export const dynamic = "force-dynamic";

export default async function ExecucaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let exec = obterExec(id);
  if (!exec) {
    const todas = await listar();
    exec = todas.find((e) => e.id === id);
  }
  if (!exec) return notFound();

  return (
    <PageShell>
      <PageHeader
        titulo={exec.params.nome}
        descricao={`${exec.params.tipo} - modo ${exec.params.modo} - schema ${exec.params.schema}`}
        voltarHref="/execucoes"
        voltarLabel="historico"
        acoes={
          <code className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-zinc-300">
            {id}
          </code>
        }
      />
      <LogViewer id={id} />
    </PageShell>
  );
}
