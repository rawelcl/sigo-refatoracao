/**
 * Tools expostas para o agente orquestrador.
 *
 * Cada tool tem:
 *  - schema (JSON Schema estilo OpenAI function-calling)
 *  - executor server-side com sandbox de FS e whitelist de comandos
 *
 * Limites e sandboxes sao aplicados aqui (defesa em profundidade).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ToolDef } from "./client";
import { REPO_ROOT, OUTPUT_DIR, SHARED_DIR, AGENTS_DIR, CVS_ROOT, ADRS_ROOT } from "../repo";

const MAX_FILE_BYTES = 500 * 1024;
const RUN_TIMEOUT_MS = Number(process.env.RUN_COMMAND_TIMEOUT_MS ?? 60_000);

const ROOTS_LEITURA = [OUTPUT_DIR, SHARED_DIR, AGENTS_DIR, REPO_ROOT, CVS_ROOT, ADRS_ROOT];
const ROOTS_ESCRITA = [
  OUTPUT_DIR,
  path.join(SHARED_DIR, "base-conhecimento"),
];

const BIN_WHITELIST = new Set([
  "python",
  "python3",
  "py",
  "node",
  "npm",
  "npx",
  "pwsh",
  "powershell",
  "git",
]);

function dentroDe(abs: string, root: string): boolean {
  return abs === root || abs.startsWith(root + path.sep);
}

function resolverSeguro(rel: string, roots: string[]): string {
  if (typeof rel !== "string" || rel.length === 0) {
    throw new Error("path vazio");
  }
  // Normaliza barras
  let norm = rel.replace(/\\/g, "/");

  // Suporta path absoluto SOMENTE se cair dentro de algum root permitido
  // (ex.: C:/CVS/health_install/procedure/pr_critica_internet_saude_15.spc).
  if (path.isAbsolute(norm)) {
    const abs = path.resolve(norm);
    const ok = roots.some((r) => dentroDe(abs, r));
    if (!ok) {
      throw new Error(
        `path absoluto fora do sandbox: '${rel}' (permitidos: ${roots.join(", ")})`,
      );
    }
    return abs;
  }

  norm = norm.replace(/^\/+/, "");

  // Prefixo virtual 'cvs/...' resolve dentro do CVS_ROOT.
  if (/^cvs\//i.test(norm)) {
    const sub = norm.replace(/^cvs\//i, "");
    const abs = path.resolve(
      roots.find((r) => r.toLowerCase().includes("cvs")) ?? roots[0],
      sub,
    );
    const ok = roots.some((r) => dentroDe(abs, r));
    if (!ok) {
      throw new Error(`path 'cvs/' fora do sandbox: '${rel}'`);
    }
    return abs;
  }

  const abs = path.resolve(REPO_ROOT, norm);
  const ok = roots.some((r) => dentroDe(abs, r));
  if (!ok) {
    throw new Error(
      `path fora do sandbox: '${rel}' (permitidos: ${roots.map((r) => path.relative(REPO_ROOT, r) || ".").join(", ")})`,
    );
  }
  return abs;
}

// ---------- executores ----------

async function execReadFile(args: { path: string }) {
  const abs = resolverSeguro(args.path, ROOTS_LEITURA);
  const stat = await fs.stat(abs);
  if (stat.isDirectory()) throw new Error("path e diretorio, use list_dir");
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`arquivo excede ${MAX_FILE_BYTES} bytes (${stat.size})`);
  }
  return await fs.readFile(abs, "utf8");
}

async function execWriteFile(args: { path: string; content: string }) {
  const abs = resolverSeguro(args.path, ROOTS_ESCRITA);
  if (typeof args.content !== "string") throw new Error("content deve ser string");
  if (Buffer.byteLength(args.content, "utf8") > MAX_FILE_BYTES * 4) {
    throw new Error("content excede 2MB");
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, args.content, "utf8");
  return { ok: true, bytes: Buffer.byteLength(args.content, "utf8") };
}

async function execListDir(args: { path: string; max?: number }) {
  const abs = resolverSeguro(args.path, ROOTS_LEITURA);
  const stat = await fs.stat(abs);
  if (!stat.isDirectory()) throw new Error("path nao e diretorio");
  const entradas = await fs.readdir(abs, { withFileTypes: true });
  const max = Math.min(Math.max(args.max ?? 200, 1), 1000);
  const items = entradas.slice(0, max).map((e) => ({
    name: e.name,
    type: e.isDirectory() ? "dir" : e.isFile() ? "file" : "other",
  }));
  if (entradas.length > max) {
    return {
      truncado: true,
      total: entradas.length,
      retornados: items.length,
      hint: "Use 'glob' com padrao especifico (ex.: 'pr_critica*') ou 'max' maior.",
      items,
    };
  }
  return items;
}

async function caminhar(dir: string, ate: number, acc: string[]): Promise<void> {
  if (acc.length >= ate) return;
  const entradas = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entradas) {
    if (acc.length >= ate) return;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      await caminhar(abs, ate, acc);
    } else {
      acc.push(abs);
    }
  }
}

async function execGlob(args: { pattern: string; root?: string; max?: number }) {
  // Glob simples: ** = recursivo, * = qualquer chars exceto /, ? = um char.
  // Implementacao minima sem dep externa.
  const max = Math.min(Math.max(args.max ?? 200, 1), 1000);
  const baseRel = args.root && args.root.length > 0 ? args.root : ".";
  const baseAbs = resolverSeguro(baseRel, ROOTS_LEITURA);

  const arquivos: string[] = [];
  await caminhar(baseAbs, max * 4, arquivos);

  const re = globParaRegex(args.pattern);
  const matches = arquivos
    .map((abs) => {
      const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
      // Quando fica fora do REPO_ROOT (ex.: CVS), devolve absoluto normalizado.
      return rel.startsWith("../") ? abs.replace(/\\/g, "/") : rel;
    })
    .filter((rel) => re.test(rel) || re.test(rel.split("/").pop() ?? ""))
    .slice(0, max);
  return matches;
}

function globParaRegex(glob: string): RegExp {
  // escapa, depois aplica wildcards
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 2;
        if (glob[i] === "/") i++;
        continue;
      }
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|{}[]\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
    i++;
  }
  return new RegExp("^" + re + "$");
}

async function execGrep(args: {
  pattern: string;
  path?: string;
  regex?: boolean;
  max?: number;
}) {
  const max = Math.min(Math.max(args.max ?? 100, 1), 500);
  const baseRel = args.path && args.path.length > 0 ? args.path : ".";
  const baseAbs = resolverSeguro(baseRel, ROOTS_LEITURA);
  const re = args.regex
    ? new RegExp(args.pattern, "i")
    : new RegExp(args.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const arquivos: string[] = [];
  const stat = await fs.stat(baseAbs);
  if (stat.isFile()) {
    arquivos.push(baseAbs);
  } else {
    await caminhar(baseAbs, 5000, arquivos);
  }

  const matches: { path: string; line: number; text: string }[] = [];
  for (const abs of arquivos) {
    if (matches.length >= max) break;
    const s = await fs.stat(abs).catch(() => null);
    if (!s || s.size > MAX_FILE_BYTES) continue;
    const conteudo = await fs.readFile(abs, "utf8").catch(() => "");
    const linhas = conteudo.split(/\r?\n/);
    for (let l = 0; l < linhas.length; l++) {
      if (re.test(linhas[l])) {
        matches.push({
          path: path.relative(REPO_ROOT, abs).replace(/\\/g, "/"),
          line: l + 1,
          text: linhas[l].slice(0, 300),
        });
        if (matches.length >= max) break;
      }
    }
  }
  return matches;
}

async function execRunCommand(args: {
  command: string;
  args?: string[];
  cwd?: string;
  timeout_ms?: number;
}) {
  const bin = String(args.command || "").trim();
  if (!bin || !BIN_WHITELIST.has(bin)) {
    throw new Error(
      `binario '${bin}' nao esta na whitelist (${[...BIN_WHITELIST].join(", ")})`,
    );
  }
  const argv = Array.isArray(args.args) ? args.args.map(String) : [];
  // bloqueia chars suspeitos em cada arg (paranoia, ja que nao usamos shell)
  for (const a of argv) {
    if (/[\r\n\0]/.test(a)) throw new Error("argumento contem caractere invalido");
  }

  const cwdRel = args.cwd && args.cwd.length > 0 ? args.cwd : ".";
  const cwdAbs = resolverSeguro(cwdRel, ROOTS_LEITURA);

  const timeout = Math.min(args.timeout_ms ?? RUN_TIMEOUT_MS, 5 * 60_000);

  return await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
    (resolve) => {
      const proc = spawn(bin, argv, {
        cwd: cwdAbs,
        env: process.env,
        shell: false,
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      const limite = 256 * 1024;
      proc.stdout.on("data", (b) => {
        if (stdout.length < limite) stdout += b.toString("utf8");
      });
      proc.stderr.on("data", (b) => {
        if (stderr.length < limite) stderr += b.toString("utf8");
      });
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {
          /* noop */
        }
      }, timeout);
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({ exitCode: -1, stdout, stderr: stderr + String(err) });
      });
    },
  );
}

// ---------- registry ----------

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Le um arquivo de texto. Caminhos podem ser: (a) relativos a raiz do repo (output/, _shared/, .github/agents/, *.md); (b) absolutos dentro do CVS legado (ex.: C:/CVS/health_install/procedure/<rotina>.spc); (c) prefixo virtual 'cvs/...' resolvido em CVS_ROOT.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "caminho relativo a raiz do repo" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Cria ou sobrescreve um arquivo. Permitido apenas em output/ e _shared/base-conhecimento/.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Lista entradas de um diretorio (max 200 por padrao). Aceita paths relativos ao repo, absolutos dentro do CVS, ou prefixo 'cvs/...'. Para diretorios grandes, prefira 'glob' com padrao especifico.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          max: { type: "number", description: "limite de itens (default 200, max 1000)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "glob",
      description:
        "Busca arquivos por padrao glob (* ** ?). 'root' aceita relativo ao repo, absoluto dentro do CVS, ou 'cvs/...'. Retorna caminhos relativos ao repo (ou absolutos quando fora dele).",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          root: { type: "string", description: "subpasta inicial (default '.')" },
          max: { type: "number" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description:
        "Busca por texto/regex em arquivos. Retorna lista { path, line, text }.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string", description: "arquivo ou diretorio (default '.')" },
          regex: { type: "boolean", description: "true para regex, default false" },
          max: { type: "number" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Executa um comando da whitelist (python, node, npm, npx, pwsh, powershell, git). Sem shell, args como array.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          args: { type: "array", items: { type: "string" } },
          cwd: { type: "string" },
          timeout_ms: { type: "number" },
        },
        required: ["command"],
      },
    },
  },
];

export type ToolName =
  | "read_file"
  | "write_file"
  | "list_dir"
  | "glob"
  | "grep"
  | "run_command";

export async function executarTool(
  nome: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (nome as ToolName) {
    case "read_file":
      return await execReadFile(args as { path: string });
    case "write_file":
      return await execWriteFile(args as { path: string; content: string });
    case "list_dir":
      return await execListDir(args as { path: string; max?: number });
    case "glob":
      return await execGlob(args as { pattern: string; root?: string; max?: number });
    case "grep":
      return await execGrep(
        args as { pattern: string; path?: string; regex?: boolean; max?: number },
      );
    case "run_command":
      return await execRunCommand(
        args as {
          command: string;
          args?: string[];
          cwd?: string;
          timeout_ms?: number;
        },
      );
    default:
      throw new Error(`tool desconhecida: ${nome}`);
  }
}
