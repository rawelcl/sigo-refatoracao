import { listarRotinas } from "@/lib/repo";
import { Console } from "@/components/console";
import { PageShell, PageHeader } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rotinas = await listarRotinas();

  return (
    <PageShell>
      <PageHeader
        titulo="Console de refatoracao"
        descricao="Selecione um objeto, escolha o modo e dispare. Ou execute direto pela tabela."
      />
      <Console rotinas={rotinas} />
    </PageShell>
  );
}
