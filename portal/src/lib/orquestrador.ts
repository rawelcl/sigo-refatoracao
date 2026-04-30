/**
 * Loop principal do agente orquestrador rodando contra a Copilot Chat API.
 *
 * - Monta system prompt a partir de CLAUDE.md + agente-orquestrador.md.
 * - Em cada turn: chama chat completions, executa tool_calls localmente,
 *   adiciona resultados ao historico, repete ate o modelo encerrar (sem mais
 *   tool_calls) ou ate atingir o limite de iteracoes.
 * - Emite eventos no exec-store para SSE/replay.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { REPO_ROOT, AGENTS_DIR } from "./repo";
import {
  criar,
  emitirEvento,
  finalizar,
  obterExec,
  totalEmExecucao,
  aguardarInput,
} from "./exec-store";
import type { Execucao } from "./exec-store";
import { montarPrompt, type ParamsPrompt } from "./prompt";
import { chatCompletions, type ChatMessage } from "./copilot/client";
import { TOOLS, executarTool } from "./copilot/tools";
import {
  detectarEtapaPorPath,
  detectarEtapaPorTexto,
  ehFimDeTrack,
  trackDe,
  ETAPAS,
  TRACKS,
  type EtapaId,
  type TrackId,
} from "./etapas";

const MAX_ITER = Number(process.env.EXEC_MAX_ITER ?? 50);
const MAX_CONCURRENT = Number(process.env.EXEC_MAX_CONCURRENT ?? 1);

const TRACKS_ORDEM: Record<TrackId, number> = {
  discovery: 0,
  design: 1,
  delivery: 2,
};

const SYSTEM_FALLBACK = `Voce e o agente orquestrador do projeto SIGO de refatoracao PL/SQL Oracle.
Use as tools disponiveis (read_file, write_file, list_dir, glob, grep, run_command)
para ler o codigo legado, gerar artefatos em output/rotinas/<nome>/rev-<TAG>/ e
atualizar a base de conhecimento em _shared/base-conhecimento/.
Sempre responda em portugues. Sempre referencie tags do projeto ([OK], [ATENCAO], etc).`;

async function lerArquivoSeExiste(abs: string): Promise<string | null> {
  try {
    return await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
}

async function montarSystemPrompt(): Promise<string> {
  const claude = await lerArquivoSeExiste(path.join(REPO_ROOT, "CLAUDE.md"));
  const orq = await lerArquivoSeExiste(
    path.join(AGENTS_DIR, "agente-orquestrador.md"),
  );
  const partes: string[] = [];
  if (claude) {
    partes.push("# CLAUDE.md (regras globais)\n\n" + claude);
  }
  if (orq) {
    partes.push("# Agente Orquestrador\n\n" + orq);
  }
  if (partes.length === 0) {
    return SYSTEM_FALLBACK;
  }
  partes.push(
    "\n# Instrucoes operacionais (portal)\n" +
      "- Voce roda dentro do portal. As tools fornecidas sao: read_file, write_file, list_dir, glob, grep, run_command.\n" +
      "- write_file so e permitido em output/ e _shared/base-conhecimento/.\n" +
      "- Nao tente abrir arquivos fora do sandbox (a tool retornara erro).\n" +
      "- Quando terminar a tarefa, responda com texto final (sem mais tool_calls).\n" +
      "\n# Inicio do workflow (OBRIGATORIO)\n" +
      "- TODA execucao do workflow completo DEVE comecar pela etapa 0 - Consulta\n" +
      "  base de conhecimento. Antes de qualquer outra acao, leia OS arquivos\n" +
      "  relevantes em `_shared/base-conhecimento/` (ao menos `indice.md`,\n" +
      "  `catalogo-objetos-plsql.md`, `catalogo-regras-negocio.md`,\n" +
      "  `padroes-identificados.md`, `decisoes-design.md`).\n" +
      "- Sinalize o inicio com texto: '[ETAPA 0] Consultando base de conhecimento'.\n" +
      "- Apos consultar, prossiga para a etapa 1 - Engenharia Reversa.\n" +
      "- NAO pule a etapa 0 mesmo que o objeto pareca novo. A consulta e barata\n" +
      "  e evita retrabalho.\n" +
      "\n# Regras de aprovacao do workflow (gates por TRACK)\n" +
      "- O workflow e dividido em 3 tracks: Discovery (etapas 0-1), Design (etapas 2-5)\n" +
      "  e Delivery (etapas 6-F).\n" +
      "- O PORTAL abre automaticamente um gate de aprovacao quando voce tenta\n" +
      "  cruzar de um track para o proximo. NAO peca aprovacao no texto: apenas\n" +
      "  conclua a ultima etapa do track e siga normalmente. O portal vai\n" +
      "  interromper a execucao e aguardar a aprovacao do usuario antes de\n" +
      "  liberar a primeira etapa do proximo track.\n" +
      "- Etapas dentro de um mesmo track executam em sequencia, sem interrupcao.\n" +
      "- Fronteiras dos gates:\n" +
      "    * Discovery -> Design: apos a etapa 1 - Engenharia Reversa.\n" +
      "    * Design -> Delivery: apos a etapa 5 - Backlog.\n" +
      "- Se uma chamada sua a write_file/read_file for bloqueada com a mensagem\n" +
      "  'Salto de track bloqueado pelo gate de aprovacao', isso indica que voce\n" +
      "  tentou avancar antes da aprovacao. Aguarde a proxima rodada -- o portal\n" +
      "  ja esta abrindo o gate.\n" +
      "\n# Retroalimentacao da base de conhecimento (RETRO POR TRACK)\n" +
      "- A retroalimentacao da base NAO e uma etapa unica no fim do workflow.\n" +
      "- Ela DEVE ocorrer ao FIM DE CADA TRACK, ANTES do gate. O portal vai\n" +
      "  injetar um lembrete automatico se voce tentar avancar sem ter\n" +
      "  retroalimentado a base.\n" +
      "- Sequencia obrigatoria em cada fronteira de track:\n" +
      "    1. Concluir a ultima etapa do track (ex.: eng-reversa, backlog, refatoracao).\n" +
      "    2. EXECUTAR retroalimentacao parcial: consolidar o que foi descoberto/decidido\n" +
      "       neste track e atualizar OS arquivos relevantes em `_shared/base-conhecimento/`\n" +
      "       via write_file (catalogo-objetos-plsql.md, catalogo-tabelas.md,\n" +
      "       catalogo-regras-negocio.md, riscos-ans.md, decisoes-design.md,\n" +
      "       pendencias-abertas.md, padroes-identificados.md, indice.md).\n" +
      "    3. Sinalizar com texto: '[HANDOFF] retroalimentacao parcial -- track <Nome> concluida'.\n" +
      "    4. Aguardar o portal abrir o gate de aprovacao (NAO pedir voce mesmo).\n" +
      "- Conteudo da retroalimentacao por track:\n" +
      "    * Discovery: regras de negocio identificadas, dependencias, riscos ANS, pendencias\n" +
      "      detectadas durante a engenharia reversa.\n" +
      "    * Design: decisoes de design (DDD, C4, fluxos), padroes identificados,\n" +
      "      itens de backlog priorizados, ADRs referenciadas.\n" +
      "    * Delivery: padroes de implementacao adotados, divergencias entre backlog e codigo,\n" +
      "      lacunas remanescentes, ADRs ausentes detectadas durante a refatoracao.\n" +
      "- A etapa formal F - Retroalimentacao continua existindo como CONSOLIDACAO FINAL,\n" +
      "  fechando o workflow e atualizando o indice.md com a data da entrega.\n" +
      "- Nao se despeca nem encerre o workflow antes da retroalimentacao do track Delivery.\n" +
      "\n# Auditoria critica por track (Agente Auditor)\n" +
      "- AO FIM DE CADA TRACK (Discovery, Design, Delivery), ANTES da retroalimentacao\n" +
      "  parcial e ANTES do gate de aprovacao, voce DEVE assumir a persona do\n" +
      "  Agente Auditor (advogado do diabo) carregando `.github/agents/agente-auditor.md`\n" +
      "  e executar uma auto-auditoria critica do que voce mesmo produziu.\n" +
      "- Mecanica resumida (detalhes em agente-auditor.md):\n" +
      "    1. Liste 3 a 5 perguntas duras priorizadas: ANS > ADR > MIGRACAO > ATENCAO > EVIDENCIA.\n" +
      "    2. Responda cada pergunta com evidencia concreta (snippet PL/SQL com linha,\n" +
      "       artigo de normativo ANS, ADR vigente, etc.). Sem evidencia = INSUFICIENTE.\n" +
      "    3. Classifique cada resposta: [DEFENDIDO] | [INSUFICIENTE] | [REFUTADO] | [CONCEDIDO].\n" +
      "    4. Se [INSUFICIENTE], aprofunde 1 vez. Se ainda fraco, vira [REFUTADO].\n" +
      "    5. Se [CONCEDIDO], AJUSTE o artefato original imediatamente via write_file.\n" +
      "    6. Maximo de 3 rodadas de Q&A. Maximo de 5 perguntas por rodada.\n" +
      "- Salve o resultado em\n" +
      "  `output/rotinas/<nome>/rev-<TAG>/auditoria/auditoria-<track>.md`\n" +
      "  (track = discovery | design | delivery, em minusculas).\n" +
      "- Encerre a auditoria com UMA das frases:\n" +
      "    * `[AUDITORIA-OK] track <Nome>` -- todas respostas DEFENDIDO ou CONCEDIDO.\n" +
      "    * `[AUDITORIA-COM-RESSALVAS] track <Nome>` -- houve REFUTADO; registre\n" +
      "      os pendentes em `output/rotinas/<nome>/rev-<TAG>/auditoria/pendencias-abertas.md`\n" +
      "      como PEND-N (uma lista ESPECIFICA desta rotina/rev, nao em _shared/).\n" +
      "- A AUDITORIA OCORRE ANTES da retroalimentacao parcial:\n" +
      "    1. Concluir etapas do track\n" +
      "    2. AUDITAR -> auditoria-<track>.md + [AUDITORIA-OK|COM-RESSALVAS]\n" +
      "    3. Retroalimentacao parcial -> [HANDOFF] retroalimentacao parcial...\n" +
      "    4. Aguardar gate do portal\n" +
      "- Voce NAO precisa ser gentil consigo mesmo. Aja como auditor externo: cetico,\n" +
      "  hostil mas justo, exigindo evidencia. O objetivo e mitigar risco de decisoes\n" +
      "  baseadas em achismo, nao validar o que voce produziu.\n" +
      "\n# Etapa 5 - Backlog (Agente Backlog)\n" +
      "- Apos concluir DDD/C4/Fluxos (etapas 2/3/4) e o ddd-modelagem-dominio.md emitir\n" +
      "  [HANDOFF-BACKLOG], execute a etapa 5 lendo `.github/agents/agente-backlog.md`.\n" +
      "- Saida em `output/rotinas/<nome>/rev-<TAG>/07-backlog/` (pasta com numeracao historica).\n" +
      "- Token de saida: [HANDOFF-REFACT] no final do BACKLOG-*.md.\n" +
      "- ESTA etapa exige aprovacao do usuario antes de prosseguir para a refatoracao.\n" +
      "\n# Etapa 6 - Refatoracao (Agente Refatoracao)\n" +
      "- Executa SOMENTE apos aprovacao do backlog.\n" +
      "- Le `.github/agents/agente-refatoracao.md` e implementa o que foi solicitado nas\n" +
      "  user stories do backlog (07-backlog/BACKLOG-*.md).\n" +
      "- Saida em `output/rotinas/<nome>/rev-<TAG>/05-refact/` (pasta com numeracao historica):\n" +
      "  - `pk_<nome>_const.sql`\n" +
      "  - `pk_<nome>.pks`\n" +
      "  - `pk_<nome>.pkb`\n" +
      "  - `README-refact.md` (com [HANDOFF-TESTES] no final, sinalizando que a etapa 6.1 deve rodar)\n" +
      "\n# Etapa 6.1 - Testes utPLSQL (Agente Testes)\n" +
      "- Executa IMEDIATAMENTE apos a etapa 6 - Refatoracao concluir, ainda dentro do track Delivery.\n" +
      "- Le `.github/agents/agente-testes.md` e gera suite utPLSQL para a rotina refatorada.\n" +
      "- Saida no MESMO diretorio da etapa 6:\n" +
      "  `output/rotinas/<nome>/rev-<TAG>/05-refact/`:\n" +
      "  - `ut_pk_<nome>.pks` (package de teste, spec)\n" +
      "  - `ut_pk_<nome>.pkb` (package de teste, body)\n" +
      "  - `testes_dados.sql` (massa de teste sintetica)\n" +
      "  - `testes_cleanup.sql` (limpeza de dados de teste)\n" +
      "  - `README-testes.md` (matriz de cobertura R-N, US-N, ANS-N -> t_*)\n" +
      "- Cobertura obrigatoria: cada regra de negocio (R-N) da reversa, cada US do backlog\n" +
      "  e cada risco ANS DEVE ter ao menos 1 teste correspondente.\n" +
      "- Token de saida: [HANDOFF-RETRO] no final do README-testes.md, sinalizando que a etapa F\n" +
      "  - Retroalimentacao final pode comecar.\n" +
      "\n# Sobre Analise de Impacto\n" +
      "- A Analise de Impacto NAO e mais uma etapa separada.\n" +
      "- Ela passou a ser SUBETAPA da Engenharia Reversa (etapa 1) e e documentada\n" +
      "  nas secoes 11 a 15 do mesmo arquivo `reversa-[nome].md`:\n" +
      "    11. Mapa de Dependentes\n" +
      "    12. Impacto em Dados\n" +
      "    13. Jobs e Integracoes\n" +
      "    14. Riscos ANS Ampliados\n" +
      "    15. Plano de Rollback / Mitigacoes\n" +
      "- Nao crie a pasta `06-analise-impacto/` para versoes novas. Ela ainda pode\n" +
      "  existir em versoes legadas, apenas para leitura.\n" +
      "- O token [HANDOFF-DDD] so deve ser emitido apos as secoes 11-15 estarem preenchidas.\n" +
      "\n# Localizacao do codigo fonte legado (CVS - somente leitura)\n" +
      "- Os arquivos sao SEMPRE `<nome_objeto_em_minusculo>.sql`.\n" +
      "- PROCEDURE -> `C:/CVS/health_install/procedure/<nome>.sql`\n" +
      "- FUNCTION  -> `C:/CVS/health_install/function/<nome>.sql`\n" +
      "- PACKAGE (spec) -> `C:/CVS/health_install/package/<nome>.sql`\n" +
      "- PACKAGE (body) -> `C:/CVS/health_install/package_body/<nome>.sql`\n" +
      "- Use a tool read_file passando o caminho absoluto acima diretamente.\n" +
      "  Exemplo: read_file({ path: 'C:/CVS/health_install/procedure/pr_critica_internet_saude_15.sql' }).\n" +
      "- Se nao encontrar de primeira, NAO desista: tente list_dir('C:/CVS/health_install/procedure', max=20)\n" +
      "  ou glob({ pattern: '<nome>*', root: 'C:/CVS/health_install/procedure' }) para localizar variantes.\n" +
      "- O nome do objeto fornecido pelo usuario sempre corresponde ao nome do arquivo (em minusculo).\n",
  );
  return partes.join("\n\n---\n\n");
}

async function rodarLoop(exec: Execucao, params: ParamsPrompt) {
  let system: string;
  try {
    system = await montarSystemPrompt();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emitirEvento(exec.id, { type: "error", data: { message: msg } });
    await finalizar(exec.id, "error", msg);
    return;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: montarPrompt(params) },
  ];

  emitirEvento(exec.id, { type: "info", data: { message: "Iniciando agente" } });

  let etapaAtual: EtapaId | null = null;
  const etapasVisitadas = new Set<EtapaId>();
  // Ultima etapa "de trabalho" (ignora base e retro). Usada para decidir o
  // gate de fim de track mesmo quando o agente esta escrevendo na base de
  // conhecimento (retroalimentacao parcial).
  let ultimaEtapaTrabalho: EtapaId | null = null;
  // Flag: retroalimentacao parcial ja foi feita no track atualmente em curso?
  // Resetada quando comeca um track novo. Marcada quando ha write em base.
  let retroFeitaNoTrackAtual = false;
  let trackEmCurso: TrackId | null = null;
  // Tracks ja aprovados pelo usuario. Usado para nao reabrir o gate quando o
  // agente vai e volta entre artefatos. Cada track so e aprovado uma vez.
  const tracksAprovados = new Set<TrackId>();
  let nudgeRetroDado = false;
  let nudgeRetroParcialDado = false;
  const trocarEtapa = (nova: EtapaId | null, origem: string) => {
    if (!nova || nova === etapaAtual) return;
    // Monotonia: so avancar para etapas com ordem maior. Reads/writes em
    // artefatos de etapas anteriores (ex.: DDD lendo reversa-*.md, ou consulta
    // a _shared/base-conhecimento/) NAO devem voltar o stage atual.
    // Excecao: a primeira etapa pode ser qualquer uma (etapaAtual === null).
    if (etapaAtual !== null) {
      const ordemAtual = ETAPAS.find((e) => e.id === etapaAtual)?.ordem ?? -1;
      const ordemNova = ETAPAS.find((e) => e.id === nova)?.ordem ?? -1;
      if (ordemNova < ordemAtual) {
        // ainda assim marca como visitada para fins de bookkeeping interno,
        // mas nao emite stage e nao altera etapaAtual.
        etapasVisitadas.add(nova);
        return;
      }
    }
    etapaAtual = nova;
    etapasVisitadas.add(nova);
    if (nova !== "base" && nova !== "retro") {
      ultimaEtapaTrabalho = nova;
      const trackNovo = trackDe(nova).id;
      if (trackEmCurso !== trackNovo) {
        trackEmCurso = trackNovo;
        retroFeitaNoTrackAtual = false;
        nudgeRetroParcialDado = false;
      }
    }
    if (nova === "retro" || nova === "base") {
      // qualquer escrita em base-conhecimento conta como retro parcial
      retroFeitaNoTrackAtual = true;
    }
    emitirEvento(exec.id, {
      type: "stage",
      data: { etapa: nova, origem },
    });
  };

  /**
   * Abre o gate de aprovacao quando o track corrente esta no fim e ainda nao
   * foi aprovado pelo usuario. Antes de abrir, garante que a retroalimentacao
   * parcial daquele track ja foi feita -- caso contrario injeta um nudge e
   * retorna "nudged" para o caller continuar o loop.
   *
   * Retorna:
   *  - "passed": gate liberado (track ja aprovado ou nao ha gate aplicavel).
   *  - "nudged": foi injetado nudge de retro parcial; caller deve dar continue.
   *  - "approved": gate foi exibido, usuario aprovou; caller deve dar continue.
   *  - "cancelled": execucao foi cancelada durante a espera.
   */
  const tentarAbrirGate = async (
    motivo: string,
  ): Promise<"passed" | "nudged" | "approved" | "cancelled"> => {
    if (!ultimaEtapaTrabalho || !ehFimDeTrack(ultimaEtapaTrabalho)) {
      return "passed";
    }
    const trackAtual = trackDe(ultimaEtapaTrabalho);
    if (tracksAprovados.has(trackAtual.id)) {
      return "passed";
    }
    // Antes de abrir o gate, exigir retroalimentacao parcial do track.
    if (!retroFeitaNoTrackAtual && !nudgeRetroParcialDado) {
      nudgeRetroParcialDado = true;
      emitirEvento(exec.id, {
        type: "info",
        data: {
          message: `forcando retroalimentacao parcial do track ${trackAtual.label} antes do gate`,
        },
      });
      messages.push({
        role: "user",
        content:
          `Antes de avancar para o proximo track, execute a RETROALIMENTACAO PARCIAL do track ${trackAtual.label}. Atualize os arquivos relevantes em _shared/base-conhecimento/ via write_file (catalogo-objetos-plsql.md, catalogo-regras-negocio.md, catalogo-tabelas.md, riscos-ans.md, decisoes-design.md, pendencias-abertas.md, padroes-identificados.md, indice.md) com o que foi descoberto/decidido neste track. Ao concluir, sinalize com '[HANDOFF] retroalimentacao parcial -- track ${trackAtual.label} concluida'. NAO peca aprovacao -- o portal abrira o gate automaticamente.`,
      });
      return "nudged";
    }
    emitirEvento(exec.id, {
      type: "info",
      data: { message: `gate de track aberto (motivo: ${motivo})` },
    });
    const ordemAtual = TRACKS_ORDEM[trackAtual.id];
    const proximoTrack = TRACKS.find((t) => TRACKS_ORDEM[t.id] === ordemAtual + 1);
    const labelBotao = proximoTrack
      ? `iniciar ${proximoTrack.label.toLowerCase()}`
      : "concluir workflow";
    emitirEvento(exec.id, {
      type: "awaiting_input",
      data: {
        prompt: `Aprovar transicao do track ${trackAtual.label} para o proximo?`,
        sugestoes: [labelBotao],
      },
    });
    const resposta = await aguardarInput(exec.id);
    if (obterExec(exec.id)?.cancelled) {
      emitirEvento(exec.id, { type: "info", data: { message: "Cancelado pelo usuario" } });
      await finalizar(exec.id, "cancelled");
      return "cancelled";
    }
    const txt = (resposta ?? "").trim() || "aprovado";
    emitirEvento(exec.id, { type: "user_input", data: { text: txt } });
    // Heuristica: qualquer texto que nao seja explicitamente reprovacao
    // libera o track. Ressalvas tambem liberam (usuario assumiu o risco).
    const reprovou = /^(reprov|nao|n[ao]o aprov)/i.test(txt);
    if (reprovou) {
      messages.push({ role: "user", content: txt });
      return "approved";
    }
    tracksAprovados.add(trackAtual.id);
    // Avanca o trackEmCurso para o proximo track imediatamente, antes que o
    // agente comece a chamar tool_calls em paths do novo track. Sem isso,
    // toolCallsCruzamTrack detectaria o salto e bloquearia indevidamente os
    // writes (track origem ja aprovado mas trackEmCurso ainda nao atualizado).
    if (proximoTrack) {
      trackEmCurso = proximoTrack.id;
      retroFeitaNoTrackAtual = false;
      nudgeRetroParcialDado = false;
    }
    // Mensagem directiva: o modelo recebe ordem clara de iniciar o proximo
    // track gerando artefatos via tool_calls. Apenas eco do texto (ex.: "iniciar design")
    // costuma ser interpretado como reconhecimento e o modelo encerra sem agir.
    if (proximoTrack) {
      const etapasProximoTrack = ETAPAS.filter((e) => e.track === proximoTrack.id)
        .map((e) => `- ${e.label} (${e.acao})`)
        .join("\n");
      messages.push({
        role: "user",
        content:
          `[USUARIO APROVOU] ${txt}\n\n` +
          `O track ${trackAtual.label} foi APROVADO e ESTA ENCERRADO. ` +
          `A retroalimentacao parcial em \`_shared/base-conhecimento/\` ja foi feita.\n\n` +
          `**PROIBIDO** nesta proxima rodada:\n` +
          `- NAO escreva mais nada em \`_shared/base-conhecimento/\` agora ` +
          `(a retro deste track ja terminou; a proxima retro so ocorre no fim do proximo track).\n` +
          `- NAO repita artefatos de etapas ja concluidas (eng-reversa).\n\n` +
          `**INICIE AGORA** o track ${proximoTrack.label} executando suas etapas em ordem, ` +
          `com tool_calls (read_file/write_file/list_dir) gerando artefatos sob ` +
          `\`output/rotinas/<nome>/rev-<tag>/\` (use a MESMA pasta rev-* criada na engenharia reversa).\n\n` +
          `Etapas a executar no track ${proximoTrack.label}:\n${etapasProximoTrack}\n\n` +
          `Sinalize cada etapa com '[ETAPA N]' no inicio. Nao peca aprovacao -- o portal ` +
          `abrira o gate automaticamente ao fim do track ${proximoTrack.label}.`,
      });
    } else {
      messages.push({
        role: "user",
        content:
          `[USUARIO] ${txt}\n\nTodos os tracks foram aprovados. Encerre o workflow ` +
          `com um resumo final dos artefatos gerados.`,
      });
    }
    return "approved";
  };

  /**
   * Inspeciona tool_calls e retorna true se algum deles vai operar em path
   * de uma etapa pertencente a um track POSTERIOR ao trackEmCurso.
   * Usado para detectar tentativa de salto de track sem aprovacao.
   */
  const toolCallsCruzamTrack = (
    toolCalls: { function: { name: string; arguments: string } }[] | undefined,
  ): boolean => {
    if (!toolCalls || !trackEmCurso) return false;
    const ordemTrackAtual = TRACKS_ORDEM[trackEmCurso];
    for (const tc of toolCalls) {
      if (tc.function.name !== "write_file" && tc.function.name !== "read_file") continue;
      let args: { path?: unknown } = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        continue;
      }
      if (typeof args.path !== "string") continue;
      const det = detectarEtapaPorPath(args.path);
      if (!det) continue;
      const trackDet = trackDe(det).id;
      if (TRACKS_ORDEM[trackDet] <= ordemTrackAtual) continue;
      // Cruzamento detectado. Mas se TODOS os tracks intermediarios entre
      // o trackEmCurso e o trackDet ja estao aprovados, NAO e cruzamento
      // ilegal -- o usuario ja liberou. Isso cobre o caso de aprovacao em
      // andamento onde trackEmCurso ainda nao avancou no momento da chamada.
      let todosAprovados = true;
      for (let i = ordemTrackAtual; i < TRACKS_ORDEM[trackDet]; i++) {
        const trackInter = TRACKS.find((t) => TRACKS_ORDEM[t.id] === i)?.id;
        if (!trackInter || !tracksAprovados.has(trackInter)) {
          todosAprovados = false;
          break;
        }
      }
      if (!todosAprovados) return true;
    }
    return false;
  };

  for (let iter = 0; iter < MAX_ITER; iter++) {
    if (obterExec(exec.id)?.cancelled) {
      emitirEvento(exec.id, { type: "info", data: { message: "Cancelado pelo usuario" } });
      await finalizar(exec.id, "cancelled");
      return;
    }

    let resp;
    try {
      resp = await chatCompletions({ messages, tools: TOOLS });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emitirEvento(exec.id, { type: "error", data: { message: msg } });
      await finalizar(exec.id, "error", msg);
      return;
    }

    const choice = resp.choices[0];
    if (!choice) {
      const msg = "Resposta sem choices";
      emitirEvento(exec.id, { type: "error", data: { message: msg } });
      await finalizar(exec.id, "error", msg);
      return;
    }

    const m = choice.message;
    // Adiciona a mensagem assistente ao historico (preservando tool_calls)
    messages.push({
      role: "assistant",
      content: m.content ?? null,
      tool_calls: m.tool_calls,
    });

    if (m.content && m.content.length > 0) {
      emitirEvento(exec.id, { type: "text", data: { text: m.content } });
      trocarEtapa(detectarEtapaPorTexto(m.content), "texto");
    }

    // Gate proativo: se o agente vai cruzar para um track posterior via
    // tool_calls e o track corrente ainda nao foi aprovado, abre o gate
    // ANTES de executar as tools.
    if (m.tool_calls && m.tool_calls.length > 0 && toolCallsCruzamTrack(m.tool_calls)) {
      // IMPORTANTE: a Copilot API exige que cada tool_call seja respondido
      // por um message role:"tool" IMEDIATAMENTE apos a assistant message.
      // Pushear primeiro os tool_results de bloqueio, e SO DEPOIS chamar
      // tentarAbrirGate (que pode adicionar uma user message).
      for (const tc of m.tool_calls) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            error:
              "Salto de track bloqueado pelo gate de aprovacao. Aguarde o portal abrir o gate; refaca a chamada apenas se o usuario tiver aprovado a transicao.",
          }),
        });
      }
      const r = await tentarAbrirGate("salto de track detectado em tool_calls");
      if (r === "cancelled") return;
      // Em qualquer caso (passed/nudged/approved), pular a execucao normal
      // dos tool_calls -- ja foram respondidos com erro acima.
      continue;
    }

    if (!m.tool_calls || m.tool_calls.length === 0) {
      // Modelo terminou esta rodada. Aplica regras de gating:
      // - Gate de fim de track dispara automaticamente, independente do
      //   agente ter pedido aprovacao no texto.
      const pedindo = !!m.content && pedeAprovacao(m.content);

      if (ultimaEtapaTrabalho && ehFimDeTrack(ultimaEtapaTrabalho)) {
        const trackAtual = trackDe(ultimaEtapaTrabalho);
        if (!tracksAprovados.has(trackAtual.id)) {
          const r = await tentarAbrirGate(
            pedindo ? "agente pediu aprovacao" : "fim de track sem novas tool_calls",
          );
          if (r === "cancelled") return;
          if (r === "nudged" || r === "approved") continue;
        }
      }

      if (pedindo) {
        // Modelo pediu aprovacao em etapa que NAO e fim de track ou cujo
        // track ja foi aprovado. Auto-continua, sem bloquear.
        emitirEvento(exec.id, {
          type: "info",
          data: {
            message:
              "auto-continuando: aprovacao do usuario so e exigida ao cruzar tracks (Discovery/Design)",
          },
        });
        messages.push({
          role: "user",
          content:
            "Nao aguarde aprovacao nesta etapa. O portal abre o gate automaticamente quando o agente avanca de track. Prossiga normalmente.",
        });
        continue;
      }

      // Sem pedido de aprovacao e sem tool_calls => modelo quer encerrar.
      // Se ainda nao chegou em "retro" e ja passou por etapas de trabalho,
      // empurra um nudge unico para forcar a retroalimentacao.
      const etapasDeTrabalho: EtapaId[] = [
        "eng-reversa",
        "ddd",
        "c4",
        "fluxos",
        "backlog",
        "refact",
      ];
      const trabalhouAlgo = etapasDeTrabalho.some((e) => etapasVisitadas.has(e));
      const fezRefact = etapasVisitadas.has("refact");
      const fezRetro = etapasVisitadas.has("retro");
      if (
        params.modo === "completo" &&
        trabalhouAlgo &&
        fezRefact &&
        !fezRetro &&
        !nudgeRetroDado
      ) {
        nudgeRetroDado = true;
        emitirEvento(exec.id, {
          type: "info",
          data: {
            message: "forcando etapa F - Retroalimentacao (obrigatoria)",
          },
        });
        messages.push({
          role: "user",
          content:
            "A etapa F - Retroalimentacao da base de conhecimento e OBRIGATORIA quando as etapas anteriores foram executadas com sucesso. Execute-a agora: consolide as regras de negocio, decisoes de design, riscos e padroes detectados; atualize OS arquivos em _shared/base-conhecimento/ (catalogo-objetos-plsql.md, catalogo-tabelas.md, catalogo-regras-negocio.md, riscos-ans.md, decisoes-design.md, pendencias-abertas.md, padroes-identificados.md, indice.md) usando write_file. Sinalize claramente no inicio da execucao desta etapa com a frase '[HANDOFF] iniciando retroalimentacao da base de conhecimento'. Quando concluir, encerre com texto final.",
        });
        continue;
      }

      await finalizar(exec.id, "done");
      return;
    }

    // Executa cada tool_call
    for (const tc of m.tool_calls) {
      if (obterExec(exec.id)?.cancelled) {
        emitirEvento(exec.id, { type: "info", data: { message: "Cancelado pelo usuario" } });
        await finalizar(exec.id, "cancelled");
        return;
      }
      let args: Record<string, unknown> = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch (e) {
        const msg = `argumentos invalidos: ${e instanceof Error ? e.message : e}`;
        emitirEvento(exec.id, {
          type: "tool_error",
          data: { name: tc.function.name, message: msg },
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: msg }),
        });
        continue;
      }

      emitirEvento(exec.id, {
        type: "tool_call",
        data: { id: tc.id, name: tc.function.name, args },
      });

      const argPath =
        typeof (args as { path?: unknown }).path === "string"
          ? ((args as { path: string }).path)
          : undefined;
      if (argPath && (tc.function.name === "write_file" || tc.function.name === "read_file")) {
        let det = detectarEtapaPorPath(argPath);
        // write_file em _shared/base-conhecimento/ -> retroalimentacao parcial
        // (ou final). MAS so promover de "base" para "retro" se o track atual
        // AINDA NAO foi aprovado. Se ja foi, a retro parcial daquele track
        // terminou; novos writes em _shared sao ruido (e nao devem fazer o
        // stage visual saltar para F).
        if (
          det === "base" &&
          tc.function.name === "write_file" &&
          ultimaEtapaTrabalho !== null
        ) {
          const trackUlt = trackDe(ultimaEtapaTrabalho).id;
          if (!tracksAprovados.has(trackUlt)) {
            det = "retro";
          } else {
            // Track aprovado: ignorar write em _shared para fins de stage.
            // Nao promover, nao regredir.
            det = null;
          }
        }
        trocarEtapa(det, `${tc.function.name}:${argPath}`);
      }

      try {
        const result = await executarTool(tc.function.name, args);
        emitirEvento(exec.id, {
          type: "tool_result",
          data: { id: tc.id, name: tc.function.name, result: resumir(result) },
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: serializarResult(result),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        emitirEvento(exec.id, {
          type: "tool_error",
          data: { id: tc.id, name: tc.function.name, message: msg },
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: msg }),
        });
      }
    }
  }

  const msg = `Limite de ${MAX_ITER} iteracoes atingido sem conclusao`;
  emitirEvento(exec.id, { type: "error", data: { message: msg } });
  await finalizar(exec.id, "error", msg);
}

function serializarResult(r: unknown): string {
  const txt = typeof r === "string" ? r : seguro(r);
  // Limite: ~24k chars (~6k tokens) por resposta de tool, evita estourar contexto.
  const MAX = Number(process.env.TOOL_RESULT_MAX_CHARS ?? 24000);
  if (txt.length <= MAX) return txt;
  return (
    txt.slice(0, MAX) +
    `\n\n[truncado: +${txt.length - MAX} chars omitidos. Refine a busca ou pagine os resultados.]`
  );
}

function seguro(r: unknown): string {
  try {
    return JSON.stringify(r);
  } catch {
    return String(r);
  }
}

const RE_APROVACAO = /(aprovad[oa]|reprovar|ressalvas|aguardando aprova|aprovacao|revisao|confirme|por favor[, ]+revise|aguardo seu retorno)/i;

function pedeAprovacao(texto: string): boolean {
  return RE_APROVACAO.test(texto);
}

function resumir(r: unknown): unknown {
  if (typeof r === "string") {
    return r.length > 500 ? r.slice(0, 500) + `... (+${r.length - 500} chars)` : r;
  }
  if (Array.isArray(r)) {
    return r.length > 20 ? [...r.slice(0, 20), `... (+${r.length - 20} itens)`] : r;
  }
  return r;
}

export async function iniciarExecucao(params: ParamsPrompt): Promise<
  | { ok: true; id: string }
  | { ok: false; status: number; erro: string }
> {
  if (totalEmExecucao() >= MAX_CONCURRENT) {
    return {
      ok: false,
      status: 409,
      erro: `Ja existe execucao em andamento (limite=${MAX_CONCURRENT})`,
    };
  }
  const exec = await criar(params);
  // Roda em background; nao aguarda
  void rodarLoop(exec, params).catch(async (e) => {
    const msg = e instanceof Error ? e.message : String(e);
    emitirEvento(exec.id, { type: "error", data: { message: msg } });
    await finalizar(exec.id, "error", msg);
  });
  return { ok: true, id: exec.id };
}
