import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  titulo,
  descricao,
  voltarHref,
  voltarLabel,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  voltarHref?: string;
  voltarLabel?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        {voltarHref && (
          <Link
            href={voltarHref}
            className="mb-1 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="size-3" />
            {voltarLabel ?? "voltar"}
          </Link>
        )}
        <h1 className="text-base font-semibold tracking-tight text-zinc-50">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-0.5 text-xs text-zinc-500">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
      {children}
    </div>
  );
}
