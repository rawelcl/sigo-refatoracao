/**
 * Detecta a etapa do workflow SIGO a partir de sinais do agente.
 * Sinais: paths gravados via write_file e tokens no texto do agente.
 */

export type EtapaId =
  | "base"
  | "eng-reversa"
  | "ddd"
  | "c4"
  | "fluxos"
  | "refact"
  | "backlog"
  | "retro";

export type TrackId = "discovery" | "design" | "delivery";

/**
 * Tracks agrupam etapas em fases conceituais do workflow:
 * - Discovery: entender o legado
 * - Design: decidir o futuro (modelagem + plano)
 * - Delivery: construir e retroalimentar
 *
 * As classes Tailwind sao literais para o JIT detectar (NAO concatenar).
 */
export type TrackMeta = {
  id: TrackId;
  label: string;
  descricao: string;
  classes: {
    /** cor solida -- usada em barras concluidas, bolinhas visitadas */
    bg: string;
    /** cor solida com opacidade -- usada em barras pendentes */
    bgSoft: string;
    /** texto do track (cabecalhos, badges) */
    text: string;
    /** variante hover do texto (ja com prefixo hover:) */
    hoverText: string;
    /** ring do passo ativo no stepper */
    ring: string;
    /** background suave para badges/cartoes */
    badgeBg: string;
    /** texto sobre badgeBg */
    badgeText: string;
  };
};

export const TRACKS: TrackMeta[] = [
  {
    id: "discovery",
    label: "Discovery",
    descricao: "Entender o legado",
    classes: {
      bg: "bg-sky-500",
      bgSoft: "bg-sky-500/15",
      text: "text-sky-300",
      hoverText: "hover:text-sky-300",
      ring: "ring-sky-400/60",
      badgeBg: "bg-sky-500/15",
      badgeText: "text-sky-300",
    },
  },
  {
    id: "design",
    label: "Design",
    descricao: "Modelar o futuro e planejar a entrega",
    classes: {
      bg: "bg-violet-500",
      bgSoft: "bg-violet-500/15",
      text: "text-violet-300",
      hoverText: "hover:text-violet-300",
      ring: "ring-violet-400/60",
      badgeBg: "bg-violet-500/15",
      badgeText: "text-violet-300",
    },
  },
  {
    id: "delivery",
    label: "Delivery",
    descricao: "Construir e retroalimentar",
    classes: {
      bg: "bg-emerald-500",
      bgSoft: "bg-emerald-500/15",
      text: "text-emerald-300",
      hoverText: "hover:text-emerald-300",
      ring: "ring-emerald-400/60",
      badgeBg: "bg-emerald-500/15",
      badgeText: "text-emerald-300",
    },
  },
];

export const ETAPAS: {
  id: EtapaId;
  label: string;
  acao: string;
  ordem: number;
  track: TrackId;
}[] = [
  { id: "base",        label: "0 - Consulta base",      acao: "Consultando base de conhecimento",    ordem: 0, track: "discovery" },
  { id: "eng-reversa", label: "1 - Eng. Reversa",       acao: "Engenharia reversa",                  ordem: 1, track: "discovery" },
  { id: "ddd",         label: "2 - DDD",                acao: "Modelando dominio (DDD)",             ordem: 2, track: "design"    },
  { id: "c4",          label: "3 - C4 Model",           acao: "Desenhando arquitetura C4",           ordem: 3, track: "design"    },
  { id: "fluxos",      label: "4 - Fluxos",             acao: "Mapeando fluxos",                     ordem: 4, track: "design"    },
  { id: "backlog",     label: "5 - Backlog",            acao: "Gerando backlog de refatoracao",      ordem: 5, track: "design"    },
  { id: "refact",      label: "6 - Refatoracao",        acao: "Gerando codigo PL/SQL refatorado",    ordem: 6, track: "delivery" },
  { id: "retro",       label: "F - Retroalimentacao",   acao: "Retroalimentando base",               ordem: 7, track: "delivery" },
];

export function trackDe(id: EtapaId): TrackMeta {
  const etapa = ETAPAS.find((e) => e.id === id);
  const trackId = etapa?.track ?? "design";
  return TRACKS.find((t) => t.id === trackId) ?? TRACKS[1];
}

export function trackPorPrefixo(prefixo: string): TrackMeta {
  // mapeamento direto pelas pastas historicas (01..07)
  const map: Record<string, TrackId> = {
    "01": "discovery",
    "02": "design",
    "03": "design",
    "04": "design",
    "05": "delivery", // 05-refact
    "06": "discovery", // legado: 06-analise-impacto -> ER
    "07": "design",   // 07-backlog
  };
  const trackId = map[prefixo] ?? "design";
  return TRACKS.find((t) => t.id === trackId) ?? TRACKS[1];
}

/**
 * Retorna true se `etapa` e a ULTIMA etapa do seu track na ordem do workflow.
 * Usado para gatear a transicao entre tracks (aprovacao do usuario).
 */
export function ehFimDeTrack(etapa: EtapaId): boolean {
  const e = ETAPAS.find((x) => x.id === etapa);
  if (!e) return false;
  // Mesma track tem alguma etapa com ordem maior?
  const hasProximaNoMesmoTrack = ETAPAS.some(
    (x) => x.track === e.track && x.ordem > e.ordem,
  );
  if (hasProximaNoMesmoTrack) return false;
  // E existe um proximo track depois?
  const hasProximoTrack = ETAPAS.some((x) => x.ordem > e.ordem);
  return hasProximoTrack;
}

const REGRAS_PATH: { re: RegExp; etapa: EtapaId }[] = [
  { re: /01[-_]engenharia[-_]reversa/i, etapa: "eng-reversa" },
  { re: /02[-_]ddd/i, etapa: "ddd" },
  { re: /03[-_]c4[-_]?model/i, etapa: "c4" },
  { re: /04[-_]fluxos/i, etapa: "fluxos" },
  { re: /05[-_]refact/i, etapa: "refact" },
  // Legado: pasta 06-analise-impacto/ deixou de existir; analise de impacto
  // agora vive como secoes 11-15 do documento reversa-[nome].md (etapa 1).
  { re: /06[-_]analise[-_]impacto|analise[-_]impacto/i, etapa: "eng-reversa" },
  { re: /07[-_]backlog|05[-_]backlog|06[-_]backlog/i, etapa: "backlog" },
  { re: /base[-_]conhecimento/i, etapa: "base" },
];

const REGRAS_TEXTO: { re: RegExp; etapa: EtapaId }[] = [
  { re: /agente[-_ ]base/i, etapa: "base" },
  { re: /agente[-_ ]eng[-_ ]reversa|engenharia reversa|analise de impacto/i, etapa: "eng-reversa" },
  { re: /agente[-_ ]ddd|domain[-_ ]driven/i, etapa: "ddd" },
  { re: /c4[-_ ]model/i, etapa: "c4" },
  { re: /agente[-_ ]refatoracao|refatorac[ao]o de codigo|geracao do codigo refatorado/i, etapa: "refact" },
  { re: /agente[-_ ]backlog/i, etapa: "backlog" },
  { re: /\[HANDOFF-DDD\]/i, etapa: "ddd" },
  { re: /\[HANDOFF-REFACT\]/i, etapa: "refact" },
  { re: /\[HANDOFF-BACKLOG\]/i, etapa: "backlog" },
  { re: /retroalimentac/i, etapa: "retro" },
];

export function detectarEtapaPorPath(p: string): EtapaId | null {
  for (const r of REGRAS_PATH) if (r.re.test(p)) return r.etapa;
  return null;
}

export function detectarEtapaPorTexto(t: string): EtapaId | null {
  for (const r of REGRAS_TEXTO) if (r.re.test(t)) return r.etapa;
  return null;
}
