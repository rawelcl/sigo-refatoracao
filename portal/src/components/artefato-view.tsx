import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

type Props = {
  path: string;
  extensao: string;
  conteudo: string;
};

export function ArtefatoView({ path, extensao, conteudo }: Props) {
  if (extensao === "svg") {
    // SVGs (PUML) sao desenhados com cores claras; mantemos fundo claro para legibilidade
    return (
      <div className="card-tech p-2">
        <div
          className="mx-auto max-w-full overflow-auto rounded-md bg-white p-4"
          // SVG vem do filesystem controlado (lerArtefato bloqueia path traversal)
          dangerouslySetInnerHTML={{ __html: conteudo }}
        />
      </div>
    );
  }

  if (extensao === "md") {
    return (
      <article className="markdown card-tech px-6 py-7 sm:px-8">
        <MDXRemoteSafe source={conteudo} />
      </article>
    );
  }

  // puml, sql, outros: mostrar como codigo
  return (
    <pre className="card-tech overflow-auto p-4 text-xs leading-relaxed text-zinc-200">
      <code className="font-mono">{conteudo}</code>
      <span className="sr-only">{path}</span>
    </pre>
  );
}

async function MDXRemoteSafe({ source }: { source: string }) {
  try {
    return (
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [],
          },
        }}
      />
    );
  } catch {
    return (
      <pre className="overflow-auto whitespace-pre-wrap text-xs">
        <code>{source}</code>
      </pre>
    );
  }
}
