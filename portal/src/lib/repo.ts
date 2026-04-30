import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Raiz do repositorio. Em dev (npm run dev) cai no diretorio pai de portal/.
 * Em container, REPO_ROOT=/repo aponta para os volumes montados.
 */
export const REPO_ROOT =
  process.env.REPO_ROOT && process.env.REPO_ROOT.length > 0
    ? process.env.REPO_ROOT
    : path.resolve(process.cwd(), "..");

export const OUTPUT_DIR = path.join(REPO_ROOT, "output", "rotinas");
export const AGENTS_DIR = path.join(REPO_ROOT, ".github", "agents");
export const SHARED_DIR = path.join(REPO_ROOT, "_shared");

/**
 * Raiz do CVS legado (somente leitura). Configuravel por env CVS_ROOT.
 * Default: C:/CVS/health_install (estrutura padrao do projeto SIGO).
 */
export const CVS_ROOT =
  process.env.CVS_ROOT && process.env.CVS_ROOT.length > 0
    ? path.resolve(process.env.CVS_ROOT)
    : path.resolve("C:/CVS/health_install");

/**
 * Raiz das ADRs (Architecture Decision Records) do projeto Hapvida.
 * Somente leitura. Configuravel por env ADRS_ROOT. CLAUDE.md referencia
 * esta pasta como fonte de verdade para decisoes arquiteturais.
 */
export const ADRS_ROOT =
  process.env.ADRS_ROOT && process.env.ADRS_ROOT.length > 0
    ? path.resolve(process.env.ADRS_ROOT)
    : path.resolve(
        "C:/Users/thiagorc/Documents/Repos/Refatoracao/adrs arquitetura hapvida",
      );

export type Versao = {
  tag: string;
  path: string;
  etapas: string[];
};

export type Rotina = {
  nome: string;
  path: string;
  versoes: Versao[];
};

export type ArquivoArtefato = {
  nome: string;
  path: string; // relativo a REPO_ROOT
  tipo: "md" | "svg" | "puml" | "sql" | "outro";
};

export type EtapaArtefatos = {
  etapa: string;
  arquivos: ArquivoArtefato[];
};

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function listarRotinas(): Promise<Rotina[]> {
  const nomes = await safeReaddir(OUTPUT_DIR);
  const rotinas: Rotina[] = [];

  for (const nome of nomes.sort()) {
    const rotinaPath = path.join(OUTPUT_DIR, nome);
    if (!(await isDir(rotinaPath))) continue;

    const subs = await safeReaddir(rotinaPath);
    const versoes: Versao[] = [];
    for (const sub of subs.sort().reverse()) {
      const subPath = path.join(rotinaPath, sub);
      if (!(await isDir(subPath))) continue;
      if (!sub.startsWith("rev-")) continue;
      const etapas = (await safeReaddir(subPath)).filter((e) =>
        /^\d{2}-/.test(e),
      );
      versoes.push({
        tag: sub.replace(/^rev-/, ""),
        path: path.relative(REPO_ROOT, subPath).replaceAll("\\", "/"),
        etapas: etapas.sort(),
      });
    }

    rotinas.push({
      nome,
      path: path.relative(REPO_ROOT, rotinaPath).replaceAll("\\", "/"),
      versoes,
    });
  }

  return rotinas;
}

/**
 * Le um arquivo de texto restrito a pastas seguras dentro do REPO_ROOT.
 * Bloqueia path traversal e arquivos fora das areas permitidas.
 */
export async function lerArtefato(relativePath: string): Promise<string> {
  const safe = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(REPO_ROOT, safe);
  const allowed = [OUTPUT_DIR, SHARED_DIR, AGENTS_DIR];
  const ok = allowed.some((root) => abs === root || abs.startsWith(root + path.sep));
  if (!ok) {
    throw new Error("Caminho fora das pastas permitidas");
  }
  return fs.readFile(abs, "utf8");
}

function classificar(nome: string): ArquivoArtefato["tipo"] {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "md") return "md";
  if (ext === "svg") return "svg";
  if (ext === "puml") return "puml";
  if (ext === "sql" || ext === "pls" || ext === "plb") return "sql";
  return "outro";
}

async function caminharRecursivo(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entradas = await safeReaddir(dir);
  for (const e of entradas) {
    const abs = path.join(dir, e);
    if (await isDir(abs)) {
      const filhos = await caminharRecursivo(abs);
      out.push(...filhos);
    } else {
      out.push(abs);
    }
  }
  return out;
}

export async function listarArquivosVersao(
  rotina: string,
  tag: string,
): Promise<EtapaArtefatos[]> {
  const base = path.join(OUTPUT_DIR, rotina, `rev-${tag}`);
  if (!(await isDir(base))) return [];
  const etapas = (await safeReaddir(base)).filter((e) => /^\d{2}-/.test(e)).sort();
  const out: EtapaArtefatos[] = [];
  for (const etapa of etapas) {
    const etapaDir = path.join(base, etapa);
    const arquivosAbs = await caminharRecursivo(etapaDir);
    const arquivos = arquivosAbs
      .map<ArquivoArtefato>((abs) => ({
        nome: path.relative(etapaDir, abs).replaceAll("\\", "/"),
        path: path.relative(REPO_ROOT, abs).replaceAll("\\", "/"),
        tipo: classificar(abs),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    out.push({ etapa, arquivos });
  }
  return out;
}

export async function listarAgentes(): Promise<{ nome: string; path: string }[]> {
  const arquivos = await safeReaddir(AGENTS_DIR);
  return arquivos
    .filter((a) => a.endsWith(".md"))
    .sort()
    .map((a) => ({
      nome: a.replace(/\.md$/, ""),
      path: path.relative(REPO_ROOT, path.join(AGENTS_DIR, a)).replaceAll("\\", "/"),
    }));
}
