# Projeto de Refatoracao SIGO — Orquestrador

> Este arquivo e carregado automaticamente pelo Claude Code ao abrir o workspace.
> Contem as regras compartilhadas por todos os agentes do projeto.

---

## Identidade do Projeto

Sistema: **SIGO** — Sistema de Gestao de Operadora de Planos de Saude (Hapvida)
Dominio: Saude Suplementar regulada pela ANS
Stack legada: PL/SQL Oracle 19c
Objetivo: Refatoracao incremental de rotinas legadas com rastreabilidade completa

### Objetivo Estrategico da Refatoracao

As rotinas refatoradas **permanecem em PL/SQL Oracle** — essa e a premissa de curto prazo.
Porem, todo artefato produzido deve considerar uma **fase futura de modernizacao**, na qual
as rotinas poderao ser migradas para microsservicos ou outras arquiteturas modernas.

Isso significa que cada decisao de refatoracao deve:

- **Eliminar acoplamentos desnecessarios** — logica de negocio nao deve depender de
  detalhes de infraestrutura Oracle (ex: tipos especificos, packages proprietarios sem
  equivalente em outras plataformas)
- **Isolar regras de negocio** — cada regra deve ser identificavel, nomeavel e
  extraivel individualmente, preparando-a para virar um metodo de Domain Service
- **Nomear com intencao** — usar a Ubiquitous Language do DDD nos nomes de objetos,
  variaveis e procedures, facilitando o mapeamento futuro para classes e servicos
- **Documentar pontos de ruptura** — identificar e sinalizar com `[MIGRACAO]` os trechos
  que precisarao de atencao especial na migracao (ex: uso de CURSOR, BULK COLLECT,
  DBMS_*, integracao direta com tabelas sem abstrecao)
- **Modelar como se fosse microsservico** — o modelo DDD deve ser valido tanto para
  a implementacao atual em PL/SQL quanto para uma futura implementacao em microsservico

### ADRs — Architecture Decision Records

**Toda decisao de arquitetura deve ser consultada e baseada nas ADRs do projeto.**

Caminho do repositorio de ADRs:
```
C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
```

**Regras de uso das ADRs:**

- **Antes de qualquer decisao de design** (Etapa 2 — DDD): ler as ADRs relevantes
  para verificar se a decisao ja foi tomada e documentada
- **Nunca contradizer uma ADR vigente** sem registrar explicitamente a divergencia
  e notificar o usuario
- **Se uma ADR nao existir** para o cenario em questao: registrar a lacuna como
  `[ATENCAO]` e sugerir a criacao de uma nova ADR antes de prosseguir
- **Referenciar sempre** a ADR utilizada na decisao de design:
  `[REF ADR-00N — titulo da ADR]`
- ADRs com status `Deprecated` ou `Superseded` nao devem ser usadas como base —
  identificar a ADR substituta antes de prosseguir

---

## Mapa de Agentes

| Etapa | Agente | Arquivo |
|---|---|---|
| Orquestracao | Agente Orquestrador | `.github/agents/agente-orquestrador.md` |
| 0 — Consulta base | Agente Base | `.github/agents/agente-base-conhecimento.md` |
| 1 — Eng. Reversa | Agente Eng. Reversa | `.github/agents/agente-eng-reversa.md` |
| 2/3/4 — DDD + C4 + Fluxos | Agente DDD | `.github/agents/agente-ddd.md` |
| 5/6 — Impacto + Backlog | Agente Backlog | `.github/agents/agente-backlog.md` |
| F — Retroalimentacao | Agente Base | `.github/agents/agente-base-conhecimento.md` |
| Scripts | Agente Scripts | `.github/agents/agente-scripts.md` |

---

## Orquestracao do Workflow

A orquestracao do workflow de refatoracao (workflow completo, etapas isoladas,
pausas para aprovacao, deteccao de handoff, controle de retomada) esta
delegada ao **Agente Orquestrador**:

> `.github/agents/agente-orquestrador.md`

Quando o usuario solicitar inicio, retomada ou coordenacao do workflow de
uma rotina, carregar esse agente. Este `CLAUDE.md` permanece como referencia
das regras gerais (estrutura canonica, ADRs, governanca CVS, tokens, principios)
consumidas por TODOS os agentes — incluindo o orquestrador.

**Prompts de ativacao reconhecidos** (detalhes e algoritmo de decisao no
proprio agente orquestrador):

```
# Workflow completo
Inicie o workflow completo de refatoracao.
Objeto : [NOME]
Tipo   : [PROCEDURE/FUNCTION/PACKAGE]
Schema : [SCHEMA]
Modo   : completo

# Etapa unica
Objeto : [NOME] | Etapa : eng-reversa | ddd | backlog | retroalimentacao
```

---

## Estrutura Canonica do Projeto

Todo agente DEVE respeitar esta estrutura. Qualquer arquivo ou pasta ausente deve ser
criado automaticamente com conteudo inicial correto — nunca bloquear execucao por
ausencia de estrutura.

```
WS-PROJETO-REFACT-SIGO/
?
??? CLAUDE.md                              ? este arquivo
??? README.md                             ? indice geral de status de todas as rotinas
?
??? .github/
?   ??? agents/                           ? agentes especializados
?       ??? agente-orquestrador.md
?       ??? agente-eng-reversa.md
?       ??? agente-ddd.md
?       ??? agente-backlog.md
?       ??? agente-base-conhecimento.md
?       ??? agente-scripts.md
?
??? _templates/
?   ??? README-rotina.md                  ? template do historico de versoes
?   ??? rotina-template/                  ? copiar para rev-[TAG_CVS]/ dentro da rotina
?       ??? README-refatoracao.md
?       ??? 01-engenharia-reversa/
?       ??? 02-ddd/
?       ??? 03-c4-model/src/ + svg/
?       ??? 04-fluxos/src/ + svg/
?       ??? 05-refact/                  ? codigo PL/SQL inicial refatorado (gerado pelo Agente DDD)
?       ??? 06-analise-impacto/
?       ??? 07-backlog/
?
??? _shared/
?   ??? c4-model/src/ + svg/
?   ??? context-map-dominio.puml
?   ??? dicionario-dominio.md
?   ??? base-conhecimento/
?       ??? indice.md                     ? porta de entrada obrigatoria
?       ??? catalogo-objetos-plsql.md
?       ??? catalogo-tabelas.md
?       ??? catalogo-regras-negocio.md
?       ??? riscos-ans.md
?       ??? decisoes-design.md
?       ??? pendencias-abertas.md
?       ??? padroes-identificados.md
?
??? scripts/
?   ??? catalogo-scripts.md
?   ??? lib/utils.py
?   ??? eng-reversa/
?   ??? base-conhecimento/
?   ??? projeto/
?
??? output/rotinas/
    ??? [nome-da-rotina]/
        ??? README-rotina.md              ? historico de versoes desta rotina
        ??? rev-[TAG_CVS]/               ? UMA PASTA POR VERSAO
            ??? README-refatoracao.md
            ??? 01-engenharia-reversa/
            ??? 02-ddd/
            ??? 03-c4-model/src/ + svg/
            ??? 04-fluxos/src/ + svg/
            ??? 05-refact/              ? codigo PL/SQL inicial refatorado (gerado pelo Agente DDD)
            ??? 06-analise-impacto/
            ??? 07-backlog/
```

---

## Versionamento de Rotinas

Convencao de nomenclatura da subpasta de versao: `rev-[TAG_CVS]`

| Situacao | Acao |
|---|---|
| Primeira analise de uma rotina | Criar `output/rotinas/[nome]/rev-[TAG]/` |
| Continuar etapas da mesma tag CVS | Usar a pasta existente |
| Nova tag CVS (codigo mudou no legado) | Criar nova subpasta `rev-[NOVA_TAG]/` |
| Corrigir artefato de versao ja analisada | Editar na pasta da versao correspondente |

`README-rotina.md` e obrigatorio na raiz de cada rotina — registra o historico de versoes.

---

## Governanca de Codigo Fonte (CVS)

- **O CVS com tag `PRODUCAO` e a unica fonte de codigo aceita**
- **Sempre usar a ultima versao disponivel com a tag `PRODUCAO`** — o agente deve
  resolver automaticamente qual e a tag mais recente antes de iniciar qualquer analise,
  sem solicitar confirmacao ao usuario
- Se nenhuma versao com tag `PRODUCAO` existir para o objeto: PARAR, registrar
  `[BLOQUEADO]`, notificar o usuario
- Registrar a tag CVS resolvida no cabecalho de todo artefato de eng. reversa
- A subpasta de versao e nomeada com a tag resolvida: `rev-[TAG_RESOLVIDA]/`

```
Procedures : C:\CVS\health_install\procedure\
Functions  : C:\CVS\health_install\function\
Packages   : C:\CVS\health_install\package\
```

---

## Acesso Oracle via MCP Server — HAPVIDA PRODUCAO (somente leitura)

Disponivel para todos os agentes. Nunca executar DML. Nunca substituir o CVS como
fonte de verdade.

Queries padrao de uso frequente:

```sql
-- Estrutura de tabela
SELECT column_name, data_type, data_length, nullable
FROM   dba_tab_columns
WHERE  table_name = UPPER('[TABELA]')
ORDER BY column_id;

-- Dependentes de um objeto
SELECT owner, name, type
FROM   dba_dependencies
WHERE  referenced_name = UPPER('[OBJETO]')
  AND  referenced_type IN ('PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY')
ORDER BY type, name;

-- Dependencias de um objeto
SELECT referenced_owner, referenced_name, referenced_type
FROM   dba_dependencies
WHERE  name = UPPER('[OBJETO]') AND owner = UPPER('[SCHEMA]')
ORDER BY referenced_type, referenced_name;

-- Codigo compilado (fallback quando CVS nao localizado)
SELECT line, text
FROM   dba_source
WHERE  name = UPPER('[OBJETO]') AND type = UPPER('[TIPO]') AND owner = UPPER('[SCHEMA]')
ORDER BY line;

-- Status do objeto em producao
SELECT object_name, object_type, status, last_ddl_time
FROM   dba_objects
WHERE  object_name = UPPER('[OBJETO]') AND owner = UPPER('[SCHEMA]');
```

Se `dba_source` divergir do CVS: registrar `[ATENCAO]` e notificar. O CVS prevalece.
Dados de beneficiarios amostrados devem ser anonimizados nos artefatos.

---

## Base de Conhecimento — Regras para Todos os Agentes

- **Consultar `_shared/base-conhecimento/indice.md` ANTES de iniciar qualquer analise**
- **Atualizar a base APOS concluir cada etapa** — retroalimentacao e incremental, nao so no final
- **Nunca duplicar** — se ja esta na base, usar `[REF]`; nao redocumentar
- Se qualquer arquivo da base nao existir, cria-lo automaticamente com estrutura inicial
- **[REGRA META] Retroalimentacao reativa obrigatoria:** sempre que o usuario trouxer em
  conversa uma nova regra, orientacao, esclarecimento de negocio ou correcao terminologica
  que interfira em decisoes ou artefatos ja produzidos, o agente DEVE, antes de encerrar
  a interacao:
  1. Consolidar a regra no catalogo apropriado (`catalogo-regras-negocio.md`,
     `decisoes-design.md`, `padroes-identificados.md`, `pendencias-abertas.md`)
     ou em `_shared/dicionario-*.md`.
  2. Propagar a mudanca para TODOS os artefatos afetados (DDDs, analises, C4, fluxos).
  3. Atualizar `indice.md` com a data.
  4. Registrar `[OK] RESOLVIDO` em `pendencias-abertas.md` quando aplicavel, com referencia
     cruzada a DD-XX em `decisoes-design.md`.
  Nao esperar o usuario repetir a informacao. Se a regra nao for persistida, ela se perde.
  [REF DD-12 em decisoes-design.md]

---

## Tokens Textuais do Projeto

Usados em todos os artefatos `.md`. **Emojis sao proibidos** em arquivos do projeto.

| Token | Significado |
|---|---|
| `[OK]` | Concluido e revisado |
| `[EM-CURSO]` | Em andamento |
| `[-]` | Pendente |
| `[REVISAO]` | Requer revisao |
| `[CRITICO]` | Problema critico |
| `[ANS]` | Risco regulatorio ANS |
| `[ATENCAO]` | Ambiguidade documentada |
| `[REF]` | Referencia a outro artefato |
| `[BLOQUEADO]` | Aguardando informacao externa |
| `[HANDOFF-DDD]` | Eng. reversa concluida — pronta para DDD |
| `[HANDOFF-BACKLOG]` | DDD concluido — pronto para backlog |
| `[MIGRACAO]` | Ponto de atencao para futura migracao para microsservico |
| `[ADR-AUSENTE]` | Decisao sem ADR correspondente — requer criacao de ADR |

---

## Principios Universais (validos para todos os agentes)

- **Criacao automatica:** arquivo ou pasta ausente deve ser criado imediatamente com
  conteudo inicial correto. Informar `[OK] Criado: [caminho]` e seguir sem interrupcao.
- **Idioma:** sempre portugues em todos os artefatos e comunicacoes
- **Encoding:** todos os `.md`, `.py` e `.ps1` gerados devem ser UTF-8 sem BOM
- **Rastreabilidade:** todo artefato referencia os da etapa anterior
- **Codigo como evidencia:** regras de negocio sempre acompanham snippet PL/SQL
- **Ambiguidades viram `[ATENCAO]`:** nunca suposicao silenciosa
- **Riscos ANS sinalizados imediatamente** com token `[ANS]`
- **Scripts sao ativos:** criar script ? executar ? registrar em `scripts/catalogo-scripts.md`
- **Conecte codigo a processo:** cada regra tecnica deve ser descrita em linguagem de negocio
- **ADRs sao a lei:** toda decisao de arquitetura deve referenciar uma ADR vigente.
  Sem ADR correspondente: sinalizar `[ADR-AUSENTE]` e notificar o usuario
- **Preparar para migracao:** sinalizar com `[MIGRACAO]` todo trecho que exigira
  atencao especial na futura migracao para microsservico