/**
 * Persistencia do token OAuth obtido via GitHub Device Flow.
 * Arquivo gravado em <repo>/output/.auth/github.json (gitignored).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./repo";

const DIR = path.join(REPO_ROOT, "output", ".auth");
const FILE = path.join(DIR, "github.json");

export type AuthInfo = {
  access_token: string;
  token_type: string;
  scope: string;
  obtained_at: number;
  user_login?: string;
};

export async function salvarAuth(a: AuthInfo): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(a, null, 2), "utf8");
}

export async function lerAuth(): Promise<AuthInfo | null> {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    return JSON.parse(txt) as AuthInfo;
  } catch {
    return null;
  }
}

export async function limparAuth(): Promise<void> {
  try {
    await fs.unlink(FILE);
  } catch {
    /* ignora */
  }
}
