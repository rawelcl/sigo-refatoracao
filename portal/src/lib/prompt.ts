/**
 * Monta o prompt enviado ao agente orquestrador.
 * Compartilhado entre client (preview) e server (execucao).
 */

import type { TrackId } from "./etapas";

export type Modo =
  | "completo"
  | "eng-reversa"
  | "ddd"
  | "refatoracao"
  | "backlog"
  | "retroalimentacao";

export type ParamsPrompt = {
  nome: string;
  tipo: string;
  schema: string;
  modo: Modo;
};

export const MODOS: { value: Modo; label: string; track?: TrackId }[] = [
  { value: "completo", label: "Workflow completo" },
  { value: "eng-reversa", label: "Etapa 1 - Engenharia Reversa", track: "discovery" },
  { value: "ddd", label: "Etapas 2/3/4 - DDD + C4 + Fluxos", track: "design" },
  { value: "backlog", label: "Etapa 5 - Backlog", track: "design" },
  { value: "refatoracao", label: "Etapa 6 - Refatoracao (PL/SQL)", track: "delivery" },
  { value: "retroalimentacao", label: "Retroalimentacao da base", track: "delivery" },
];

export const TIPOS = ["PROCEDURE", "FUNCTION", "PACKAGE"] as const;

export function montarPrompt(p: ParamsPrompt): string {
  const cvsPath = caminhoCvs(p.nome, p.tipo);
  const linhaCvs = cvsPath ? `Caminho CVS: ${cvsPath}` : "";

  if (p.modo === "completo") {
    return [
      "Inicie o workflow completo de refatoracao.",
      `Objeto : ${p.nome}`,
      `Tipo   : ${p.tipo}`,
      `Schema : ${p.schema}`,
      "Modo   : completo",
      linhaCvs,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Objeto : ${p.nome}`,
    `Tipo   : ${p.tipo}`,
    `Schema : ${p.schema}`,
    `Etapa  : ${p.modo}`,
    linhaCvs,
  ]
    .filter(Boolean)
    .join("\n");
}

function caminhoCvs(nome: string, tipo: string): string | null {
  const n = nome.toLowerCase();
  switch (tipo.toUpperCase()) {
    case "PROCEDURE":
      return `C:/CVS/health_install/procedure/${n}.sql`;
    case "FUNCTION":
      return `C:/CVS/health_install/function/${n}.sql`;
    case "PACKAGE":
      return `C:/CVS/health_install/package/${n}.sql (spec) | C:/CVS/health_install/package_body/${n}.sql (body)`;
    default:
      return null;
  }
}

const RE_IDENT = /^[A-Za-z0-9_]+$/;

export function validarParams(p: Partial<ParamsPrompt>): {
  ok: true;
  value: ParamsPrompt;
} | { ok: false; erro: string } {
  if (!p.nome || !RE_IDENT.test(p.nome)) {
    return { ok: false, erro: "nome invalido (apenas A-Z, 0-9, _)" };
  }
  if (!p.tipo || !TIPOS.includes(p.tipo as (typeof TIPOS)[number])) {
    return { ok: false, erro: "tipo invalido" };
  }
  if (!p.schema || !RE_IDENT.test(p.schema)) {
    return { ok: false, erro: "schema invalido" };
  }
  const modos = MODOS.map((m) => m.value);
  if (!p.modo || !modos.includes(p.modo as Modo)) {
    return { ok: false, erro: "modo invalido" };
  }
  return {
    ok: true,
    value: { nome: p.nome, tipo: p.tipo, schema: p.schema, modo: p.modo as Modo },
  };
}
