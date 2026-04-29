# Catalogo de Prompts — Projeto de Refatoracao SIGO

> Copie o prompt desejado, substitua os valores entre colchetes e cole no Claude Code.
> Todos os prompts pressupõem que o `CLAUDE.md` esta na raiz do workspace.

---

## 1. WORKFLOW COMPLETO

Dispara o ciclo inteiro de uma rotina em sequencia automatica.
O orquestrador pausa para aprovacao apos Etapa 1 e apos Etapas 2/3/4.

```
Inicie o workflow completo de refatoracao.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
Modo   : completo
```

---

## 2. ENGENHARIA REVERSA

### 2.1 Iniciar eng. reversa (usa ultima tag PRODUCAO automaticamente)

```
@.github/skills/agente-eng-reversa.md

Inicie a engenharia reversa da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
```

### 2.2 Retomar eng. reversa a partir de uma etapa especifica

```
@.github/skills/agente-eng-reversa.md

Retome a engenharia reversa da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
Retomar do Passo: [2 — rastreamento de sub-rotinas | 3 — extracao de regras | 4 — smells | 5 — riscos ANS]
```

### 2.3 Eng. reversa com escopo reduzido

```
@.github/skills/agente-eng-reversa.md

Inicie a engenharia reversa da rotina abaixo com escopo reduzido.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
Escopo : [apenas mapear dependencias e tabelas | apenas extrair regras de negocio | apenas identificar riscos ANS]
```

### 2.4 Eng. reversa de sub-rotina especifica

```
@.github/skills/agente-eng-reversa.md

Realize a engenharia reversa da sub-rotina abaixo, identificada durante a analise de [ROTINA_PAI].
Objeto     : [NOME_DA_SUB_ROTINA]
Tipo       : [PROCEDURE | FUNCTION | PACKAGE]
Schema     : [SCHEMA]
Referenciado por: [NOME_DA_ROTINA_PAI]
```

---

## 3. MODELAGEM DDD

### 3.1 Iniciar modelagem DDD completa (DDD + C4 + fluxogramas)

```
@.github/skills/agente-ddd.md

Inicie a modelagem DDD da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
```

### 3.2 Apenas modelagem DDD (sem diagramas)

```
@.github/skills/agente-ddd.md

Execute apenas a modelagem DDD da rotina abaixo. Nao gerar diagramas C4 nem fluxogramas neste momento.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
Schema : [SCHEMA]
```

### 3.3 Apenas diagramas C4

```
@.github/skills/agente-ddd.md

Gere apenas os diagramas C4 da rotina abaixo. A modelagem DDD ja foi concluida.
Objeto  : [NOME_DA_ROTINA]
Schema  : [SCHEMA]
Niveis  : [2 — container | 3 — component | 2 e 3]
```

### 3.4 Gerar codigo inicial refatorado (apos DDD concluido)

```
@.github/skills/agente-ddd.md

Gere o codigo inicial refatorado da rotina abaixo com base na modelagem DDD ja concluida.
Objeto : [NOME_DA_ROTINA]
Schema : [SCHEMA]
```

> O codigo sera armazenado em `output/rotinas/[nome]/rev-[TAG]/05-refact/`.
> A pasta sera criada automaticamente se nao existir.
> Arquivos gerados: `pk_[nome]_const.sql`, `pk_[nome].pks`, `pk_[nome].pkb`, `README-refact.md`.

### 3.5 Revisar modelagem DDD existente com nova orientacao de arquitetura

```
@.github/skills/agente-ddd.md

Revise toda a modelagem DDD da rotina abaixo considerando as orientacoes de arquitetura
que passaram a vigorar no projeto.

Objeto : [NOME_DA_ROTINA]
Schema : [SCHEMA]

Escopo da revisao:

1. ADRs
   - Ler o repositorio: C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
   - Verificar se cada decisao de design registrada no artefato ddd-modelagem-dominio.md
     esta alinhada com as ADRs vigentes
   - Para decisoes sem ADR correspondente: registrar [ADR-AUSENTE] e indicar a lacuna
   - Para decisoes que contradizem alguma ADR: registrar [ATENCAO] e notificar

2. Preparacao para migracao futura (microsservico)
   - Revisar o modelo de agregados, domain services e eventos considerando
     a portabilidade para uma futura arquitetura de microsservico
   - Identificar e sinalizar com [MIGRACAO] todo trecho ou padrao que exigira
     atencao especial na migracao (cursores, bulk collect, packages Oracle
     proprietarios, acoplamentos de infraestrutura)
   - Preencher ou atualizar a secao "Pontos de Atencao para Migracao Futura"
     com o equivalente em microsservico para cada item

3. Diagramas C4
   - Revisar os arquivos .puml existentes em 03-c4-model/src/
   - Atualizar o que for necessario para refletir as correcoes da revisao
   - Gerar o SVG de cada .puml revisado:
       python scripts/projeto/gerar-svg.py output/rotinas/[nome]/rev-[TAG]/03-c4-model/src

4. Fluxogramas
   - Revisar os arquivos .puml existentes em 04-fluxos/src/
   - Atualizar o fluxo to-be se as decisoes de design foram alteradas
   - Gerar o SVG de cada .puml revisado:
       python scripts/projeto/gerar-svg.py output/rotinas/[nome]/rev-[TAG]/04-fluxos/src

Ao concluir:
- Atualizar ddd-modelagem-dominio.md com as correcoes
- Atualizar _shared/base-conhecimento/decisoes-design.md
- Confirmar que todos os .puml tem .svg correspondente em svg/
- Registrar [HANDOFF-BACKLOG] se a revisao estiver aprovada
```

### 3.6 Apenas fluxogramas

```
@.github/skills/agente-ddd.md

Gere apenas os fluxogramas da rotina abaixo. A modelagem DDD ja foi concluida.
Objeto  : [NOME_DA_ROTINA]
Schema  : [SCHEMA]
Fluxos  : [as-is | to-be | ambos]
```

---

## 4. ANALISE DE IMPACTO E BACKLOG

### 4.1 Analise de impacto e backlog completo

```
@.github/skills/agente-backlog.md

Inicie a analise de impacto e geracao de backlog da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Schema : [SCHEMA]
```

### 4.2 Apenas analise de impacto

```
@.github/skills/agente-backlog.md

Execute apenas a analise de impacto da rotina abaixo. Nao gerar backlog neste momento.
Objeto : [NOME_DA_ROTINA]
Schema : [SCHEMA]
```

### 4.3 Apenas backlog

```
@.github/skills/agente-backlog.md

Gere apenas o backlog da rotina abaixo. A analise de impacto ja foi concluida.
Objeto : [NOME_DA_ROTINA]
Schema : [SCHEMA]
```

---

## 5. BASE DE CONHECIMENTO

### 5.1 Consultar estado geral do projeto

```
@.github/skills/agente-base-conhecimento.md

Apresente o estado atual do projeto: rotinas analisadas, metricas e ultimas atualizacoes.
```

### 5.2 Consultar objeto especifico

```
@.github/skills/agente-base-conhecimento.md

O objeto abaixo ja foi analisado? Se sim, qual versao e quais etapas foram concluidas?
Objeto : [NOME_DO_OBJETO]
```

### 5.3 Listar pendencias abertas

```
@.github/skills/agente-base-conhecimento.md

Liste todas as pendencias abertas do projeto.
```

```
@.github/skills/agente-base-conhecimento.md

Liste as pendencias abertas do tipo [ATENCAO | BLOQUEADO | CRITICO] relacionadas a [NOME_DA_ROTINA].
```

### 5.4 Listar riscos ANS

```
@.github/skills/agente-base-conhecimento.md

Liste todos os riscos ANS identificados no projeto com severidade e status.
```

### 5.5 Retroalimentar base apos etapa concluida

```
@.github/skills/agente-base-conhecimento.md

Atualize a base de conhecimento com os resultados da etapa abaixo.
Objeto : [NOME_DA_ROTINA]
Etapa  : [E1 — eng. reversa | E2 — DDD | E3 — C4 | E4 — fluxos | E5 — impacto | E6 — backlog]
```

### 5.6 Resolver pendencia

```
@.github/skills/agente-base-conhecimento.md

Marque a pendencia abaixo como resolvida e registre a decisao tomada.
Pendencia  : [PEND-00N — titulo]
Rotina     : [NOME_DA_ROTINA]
Resolucao  : [descricao do que foi decidido]
```

### 5.7 Consultar decisoes de design

```
@.github/skills/agente-base-conhecimento.md

Quais decisoes de design foram tomadas para [NOME_DA_ROTINA | o dominio X]?
```

---

## 6. SCRIPTS

### 6.1 Criar estrutura de nova rotina

```
@.github/skills/agente-scripts.md

Execute o script de criacao de estrutura para a rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Tipo   : [PROCEDURE | FUNCTION | PACKAGE]
```

### 6.2 Validar estrutura de uma versao

```
@.github/skills/agente-scripts.md

Valide a estrutura de pastas da versao ativa da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
```

### 6.3 Gerar SVGs de uma rotina

```
@.github/skills/agente-scripts.md

Gere os SVGs de todos os arquivos .puml da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Escopo : [completo | apenas C4 | apenas fluxos]
```

### 6.4 Gerar relatorio de status do projeto

```
@.github/skills/agente-scripts.md

Gere o relatorio de status de todas as rotinas do projeto.
```

### 6.5 Criar novo script

```
@.github/skills/agente-scripts.md

Crie um script para [descricao do que o script deve fazer].
Agente  : [eng-reversa | base-conhecimento | projeto]
Rotina  : [NOME_DA_ROTINA — ou "geral" se de uso amplo]
```

---

## 8. ADRs E MIGRACAO

### 8.1 Consultar ADRs relevantes para uma rotina

```
Consulte o repositorio de ADRs abaixo e liste as ADRs relevantes para a rotina indicada.
Repositorio ADRs : C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
Rotina           : [NOME_DA_ROTINA]
Contexto         : [dominio / tipo de objeto / padrao de integracao relevante]
```

### 8.2 Verificar aderencia de uma decisao a ADRs existentes

```
Verifique se a decisao abaixo esta alinhada com as ADRs do projeto.
Repositorio ADRs : C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
Decisao          : [descricao da decisao de arquitetura]
Rotina           : [NOME_DA_ROTINA]
```

### 8.3 Listar pontos de atencao para migracao futura

```
@.github/skills/agente-ddd.md

Liste todos os pontos sinalizados com [MIGRACAO] na modelagem da rotina abaixo,
com sugestao de equivalente em microsservico para cada um.
Objeto : [NOME_DA_ROTINA]
```

### 8.4 Avaliar prontidao para migracao de uma rotina

```
@.github/skills/agente-ddd.md

Com base nos artefatos existentes, avalie o nivel de prontidao da rotina abaixo
para uma futura migracao para microsservico. Indique o que ainda precisa ser
refatorado para viabilizar a migracao.
Objeto : [NOME_DA_ROTINA]
```

### 7.1 Verificar objeto no banco (MCP)

```
Consulte o banco Oracle via MCP (HAPVIDA PRODUCAO) e informe:
- Status do objeto em producao (VALID/INVALID)
- Todos os objetos que dependem dele
- Todas as tabelas que ele acessa
Objeto : [NOME_DO_OBJETO]
Schema : [SCHEMA]
```

### 7.2 Verificar estrutura de tabela (MCP)

```
Consulte o banco Oracle via MCP (HAPVIDA PRODUCAO) e informe a estrutura completa da tabela.
Tabela : [NOME_DA_TABELA]
Schema : [SCHEMA]
Incluir: colunas, tipos, constraints, indices
```

### 7.3 Atualizar dicionario de dominio

```
Adicione os termos abaixo ao dicionario de dominio (_shared/dicionario-dominio.md).
Termos:
- [Termo 1]: [definicao de negocio]
- [Termo 2]: [definicao de negocio]
Contexto (Bounded Context): [nome do BC]
```

### 7.4 Atualizar README de status

```
Atualize a tabela de status no README.md raiz com o progresso atual da rotina abaixo.
Objeto : [NOME_DA_ROTINA]
Etapas concluidas: [E0, E1, E2, ...]
```