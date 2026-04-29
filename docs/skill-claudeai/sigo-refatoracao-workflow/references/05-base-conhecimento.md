# Referencia: Etapas 0 e F — Base de Conhecimento Viva

## Objetivo

A base de conhecimento e a **memoria permanente do projeto de refatoracao**. Ela evita retrabalho, preserva decisoes tomadas, consolida padroes identificados em multiplas rotinas e serve como contexto acumulado para cada nova analise.

Ela nao substitui os artefatos de cada rotina — ela os **indexa, consolida e conecta**.

---

## Criacao Automatica de Arquivos

Se qualquer arquivo da base de conhecimento nao existir no momento em que o agente precisar atualiza-lo, ele deve ser criado imediatamente com a estrutura inicial do template correspondente (ver secoes abaixo), sem solicitar permissao ao usuario. Apos a criacao, informar:

```
[OK] Criado: _shared/base-conhecimento/[nome-do-arquivo].md
[OK] Estrutura inicial aplicada — pronto para receber conteudo desta etapa.
```

O mesmo vale para o diretorio `_shared/base-conhecimento/` inteiro: se nao existir, criar a pasta e todos os 8 arquivos de uma vez antes de prosseguir.

---

## Etapa 0 — Consulta Obrigatoria Antes de Iniciar

Antes de qualquer analise de rotina, ler os arquivos da base na seguinte ordem:

```
1. indice.md                  ? entender o estado atual do projeto
2. catalogo-objetos-plsql.md  ? verificar se a rotina ou sub-rotinas ja foram analisadas
3. catalogo-tabelas.md        ? identificar tabelas ja conhecidas (economiza tempo de mapeamento)
4. pendencias-abertas.md      ? verificar se ha [BLOQUEADO] ou [ATENCAO] relacionados a esta rotina
5. padroes-identificados.md   ? aplicar aprendizados de rotinas anteriores
```

Ao terminar a consulta, comunicar ao usuario:
- O que ja existe na base sobre esta rotina ou objetos relacionados
- Quais sub-rotinas ja foram analisadas (referenciar com `[REF]`)
- Pendencias abertas que impactam esta analise

---

## Etapa F — Retroalimentacao Obrigatoria Apos Cada Etapa

A retroalimentacao e **incremental** — nao acontece so no final da rotina, mas ao concluir cada etapa.

### Mapa de Atualizacao por Etapa

| Etapa Concluida | Arquivos a Atualizar |
|---|---|
| Etapa 1 — Eng. Reversa | `indice.md`, `catalogo-objetos-plsql.md`, `catalogo-tabelas.md`, `pendencias-abertas.md`, `riscos-ans.md` |
| Etapa 2 — DDD | `catalogo-regras-negocio.md`, `decisoes-design.md`, `padroes-identificados.md` |
| Etapa 3 — C4 | `indice.md` (registrar diagramas gerados) |
| Etapa 4 — Fluxos | `padroes-identificados.md` (se fluxo revelar padrao novo) |
| Etapa 5 — Impacto | `catalogo-tabelas.md` (novos comportamentos), `riscos-ans.md`, `pendencias-abertas.md` |
| Etapa 6 — Backlog | `indice.md` (registrar stories geradas) |
| Resolucao de pendencia | `pendencias-abertas.md` (marcar como `[OK]`) |

---

## Estrutura Detalhada dos Arquivos

---

### `indice.md` — Porta de Entrada

Funcao: navegacao rapida e visao executiva do projeto.

```markdown
# Base de Conhecimento — Projeto de Refatoracao SIGO
Ultima atualizacao: [data]

## Metricas do Projeto
| Metrica | Valor |
|---|---|
| Rotinas analisadas | [N] |
| Objetos PL/SQL mapeados | [N] |
| Tabelas identificadas | [N] |
| Riscos ANS abertos | [N] |
| Pendencias abertas | [N] |
| Scripts registrados | [N] |

## Rotinas Analisadas
| Rotina | Tipo | Etapas | Data | Analista | Link |
|---|---|---|---|---|---|
| pr_efetiva_internet | Procedure | E0-E6+EF | [data] | [nome] | [REF output/rotinas/pr_efetiva_internet/] |

## Objetos PL/SQL Referenciados (nao analisados como rotina principal)
| Objeto | Tipo | Referenciado por | Analise Propria |
|---|---|---|---|
| pkg_log.registrar | Package | pr_efetiva_internet | [OK] em catalogo-objetos-plsql.md |

## Ultimas Atualizacoes
| Data | Tipo | Descricao |
|---|---|---|
| [data] | Eng. Reversa | Analise de pr_efetiva_internet concluida |
```

---

### `catalogo-objetos-plsql.md` — Objetos Analisados

Funcao: repositorio de todos os objetos PL/SQL encontrados no projeto, com status de analise **por versao**.

```markdown
# Catalogo de Objetos PL/SQL

## Como usar este catalogo
- Antes de analisar uma sub-rotina, verificar se ela ja consta aqui
- Se constar com status [OK] na versao atual, usar [REF] e nao reanalisar
- Se a versao CVS mudou em relacao ao registro existente, criar nova entrada de versao

---

## [NOME_DO_OBJETO]

**Tipo:** Procedure / Function / Package Body  
**Schema:** [schema]  
**Responsabilidade:** [descricao em uma linha do que o objeto faz]  
**Sub-rotinas que chama:** [lista]  
**Tabelas que le:** [lista]  
**Tabelas que escreve:** [lista]  

### Versoes Analisadas

| Tag CVS | Analisado como principal | Referenciado por | Status | Link |
|---|---|---|---|---|
| rev-PRODUCAO-2.4.1 | Sim | — | [OK] | [REF output/rotinas/[nome]/rev-PRODUCAO-2.4.1/] |
| rev-PRODUCAO-3.0.0 | Nao | pr_efetiva_internet | [OK] | — |

**Versao ativa:** rev-[TAG_ATUAL]  
**Observacoes:** [smells, riscos ANS, decisoes relevantes identificadas na versao ativa]  
```

---

### `catalogo-tabelas.md` — Tabelas do Banco

Funcao: mapa de dados do dominio — quais tabelas existem, o que guardam, quem as acessa.

```markdown
# Catalogo de Tabelas Oracle

## Como usar este catalogo
- Ao identificar uma tabela nova em qualquer analise, adicionar aqui
- Ao rever uma tabela ja catalogada, atualizar a coluna "Rotinas que Acessam"

---

## [NOME_DA_TABELA]

**Schema:** [schema]  
**Descricao de negocio:** [o que esta tabela representa em linguagem de dominio]  
**Rotinas que LEEM:** [lista]  
**Rotinas que ESCREVEM:** [lista — INSERT / UPDATE / DELETE / MERGE]  
**Campos criticos identificados:** [campos com logica de negocio relevante]  
**Relacionamentos conhecidos:** [tabelas parent/child relevantes]  
**Observacoes:** [particularidades, volumes, criticidade]  
```

---

### `catalogo-regras-negocio.md` — Regras Consolidadas

Funcao: repositorio de regras de negocio extraidas de multiplas rotinas, organizadas por dominio. Permite identificar regras duplicadas ou conflitantes entre rotinas diferentes.

```markdown
# Catalogo de Regras de Negocio

## Dominio: [Nome do Bounded Context]

### RNG-[DOMINIO]-001 — [Nome da Regra]

**Descricao:** [descricao em linguagem de negocio]  
**Categoria:** Validacao / Calculo / Orquestracao / Persistencia  
**Risco ANS:** [ANS] [descricao] — ou — N/A  
**Implementada em:** [lista de rotinas que implementam esta regra]  
**Duplicidade identificada:** Sim ([lista de rotinas com logica equivalente]) / Nao  
**Inconsistencia identificada:** [ATENCAO] [descricao] — ou — N/A  
**Status de consolidacao:** Unica fonte / Duplicada / Conflitante  
**Origem:** [REF output/rotinas/[nome]/01-engenharia-reversa/reversa-[nome].md — RN0X]  
```

---

### `riscos-ans.md` — Riscos Regulatorios

Funcao: painel centralizado de todos os riscos regulatorios ANS identificados no projeto.

```markdown
# Riscos Regulatorios ANS

## Como usar este arquivo
- Todo [ANS] identificado em qualquer etapa de qualquer rotina deve ser registrado aqui
- Revisar este arquivo ao iniciar analise de novas rotinas — riscos ANS tendem a ser sistemicos
- Classificar severidade: Alta (impacta conformidade ANS diretamente) / Media / Baixa

---

## [ANS-001] — [Titulo do Risco]

**Area regulatoria:** Carencia / Portabilidade / Cobertura / Prazo / Reajuste / Nota Tecnica  
**Descricao:** [descricao do risco em linguagem de negocio e regulatoria]  
**Rotinas afetadas:** [lista]  
**Regras relacionadas:** [REF RNG-XXX-00N]  
**Severidade:** Alta / Media / Baixa  
**Status:** Aberto / Em validacao / Resolvido  
**Acao necessaria:** [o que precisa ser feito]  
**Responsavel:** [PO / DBA / Arquiteto]  
**Data de identificacao:** [data]  
**Data de resolucao:** [data — se resolvido]  
```

---

### `decisoes-design.md` — Decisoes Arquiteturais

Funcao: registro permanente de decisoes de refatoracao tomadas, com contexto e justificativa — evita revisitar decisoes ja analisadas.

```markdown
# Decisoes de Design

## Como usar este arquivo
- Antes de propor uma decisao de refatoracao, verificar se decisao equivalente ja foi tomada
- Decisoes aqui registradas sao a referencia canonicade refatoracao — nao reconsiderar sem registro

---

## [DD-001] — [Titulo da Decisao]

**Data:** [data]  
**Rotina de origem:** [rotina que motivou a decisao]  
**Contexto:** [qual problema ou dilema gerou esta decisao]  
**Opcoes consideradas:**  
- Opcao A: [descricao] — [vantagens / desvantagens]  
- Opcao B: [descricao] — [vantagens / desvantagens]  

**Decisao:** [opcao escolhida e justificativa]  
**Impacto:** [quais rotinas futuras serao afetadas por esta decisao]  
**Status:** Vigente / Revisada (ver DD-00N) / Revogada  
```

---

### `pendencias-abertas.md` — Pendencias e Bloqueios

Funcao: lista viva de todos os `[ATENCAO]` e `[BLOQUEADO]` nao resolvidos. Revisada ao iniciar cada nova rotina.

```markdown
# Pendencias Abertas

## Como usar este arquivo
- Todo [ATENCAO] ou [BLOQUEADO] gerado em qualquer etapa deve ser registrado aqui
- Ao resolver uma pendencia, marcar como [OK] e registrar a resolucao
- Nao remover pendencias resolvidas — manter historico

---

## [PEND-001] — [Titulo da Pendencia]

**Tipo:** [ATENCAO] ambiguidade / [BLOQUEADO] codigo nao localizado / [CRITICO] problema grave  
**Rotina:** [rotina de origem]  
**Etapa:** [etapa em que foi identificada]  
**Descricao:** [descricao detalhada do problema ou duvida]  
**Impacto se nao resolvido:** [o que fica pendente ou errado]  
**Responsavel pela resolucao:** [PO / DBA / Arquiteto / usuario]  
**Data de identificacao:** [data]  
**Status:** Aberto / Em andamento / [OK] Resolvido em [data]  
**Resolucao:** [descricao do que foi decidido — preencher ao resolver]  
```

---

### `padroes-identificados.md` — Padroes Recorrentes

Funcao: repositorio de padroes de codigo e design que aparecem em multiplas rotinas — fundamenta refatoracoes sistematicas e evita tratar cada ocorrencia isoladamente.

```markdown
# Padroes Identificados

## Como usar este arquivo
- Ao identificar um smell ou padrao que ja apareceu em outra rotina, registrar ou atualizar aqui
- Padroes com 3+ ocorrencias devem virar um item de backlog sistemico (user story de refatoracao transversal)

---

## [PAD-001] — [Nome do Padrao]

**Tipo:** Smell / Anti-padrao / Padrao de negocio recorrente / Padrao de integracao  
**Descricao:** [descricao do padrao identificado]  
**Ocorrencias:** [lista de rotinas onde aparece]  
**Impacto:** Alto / Medio / Baixo  
**Refatoracao recomendada:** [descricao da correcao ideal]  
**User Story gerada:** [REF US-XX em backlog sistemico] — ou — Pendente  
```

---

## Checklist de Retroalimentacao — Etapa F

```
APOS ETAPA 1 (Eng. Reversa):
[ ] indice.md: rotina adicionada ou status atualizado
[ ] catalogo-objetos-plsql.md: objeto principal + sub-rotinas adicionados/atualizados
[ ] catalogo-tabelas.md: todas as tabelas novas adicionadas; tabelas existentes atualizadas
[ ] pendencias-abertas.md: todos os [ATENCAO] e [BLOQUEADO] registrados
[ ] riscos-ans.md: todos os [ANS] registrados

APOS ETAPA 2 (DDD):
[ ] catalogo-regras-negocio.md: regras do dominio consolidadas
[ ] decisoes-design.md: decisoes tomadas na modelagem registradas
[ ] padroes-identificados.md: padroes identificados adicionados ou contadores atualizados

APOS ETAPAS 3 e 4 (C4 e Fluxos):
[ ] indice.md: diagramas gerados referenciados
[ ] padroes-identificados.md: padroes de fluxo recorrentes registrados

APOS ETAPA 5 (Impacto):
[ ] catalogo-tabelas.md: novos comportamentos de escrita registrados
[ ] riscos-ans.md: riscos novos ou atualizados
[ ] pendencias-abertas.md: pendencias de impacto registradas

APOS ETAPA 6 (Backlog):
[ ] indice.md: metricas do projeto atualizadas

AO RESOLVER QUALQUER PENDENCIA:
[ ] pendencias-abertas.md: pendencia marcada como [OK] com descricao da resolucao
[ ] Arquivo relacionado atualizado (catalogo, decisoes, etc.)
```