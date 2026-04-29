# Referencia: Etapas 5 e 6 — Analise de Impacto e Backlog

---

## Etapa 5 — Analise de Impacto

### Objetivo

Mapear os efeitos colaterais da refatoracao sobre outros objetos, rotinas e processos do SIGO, garantindo que nenhuma dependencia critica seja quebrada durante a modernizacao.

### Dimensoes de Analise

#### 5.1 Impacto em Objetos Oracle Dependentes

Identificar todos os objetos que chamam a rotina sendo refatorada:

```sql
-- Consulta base para identificar dependencias no Oracle
SELECT owner, name, type, referenced_owner, referenced_name, referenced_type
FROM dba_dependencies
WHERE referenced_name = UPPER('[NOME_DA_ROTINA]')
  AND referenced_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE')
ORDER BY type, name;
```

Para cada dependente, avaliar:
- Vai continuar funcionando com a nova assinatura?
- Precisa de ajuste no contrato (parametros)?
- Precisa de recompilacao?

#### 5.2 Impacto em Jobs e Schedulers

Verificar se a rotina e chamada por jobs Oracle (DBMS_SCHEDULER) ou pelo scheduler da aplicacao.

#### 5.3 Impacto em Integrações

Mapear se a rotina e parte de fluxos de integracao (chamada via API, servico externo, middleware).

#### 5.4 Impacto em Dados

Avaliar se a refatoracao altera o comportamento de escrita nas tabelas:
- Novos campos preenchidos?
- Campos que deixam de ser preenchidos?
- Mudanca na logica de validacao que pode afetar dados existentes?

---

### Template de Output — `analise-impacto.md`

```markdown
# Analise de Impacto: [NOME_DA_ROTINA]

**Data:** [data]
**Baseado em:** reversa-[nome].md + ddd-modelagem-dominio.md

---

## 1. Mapa de Dependentes

| Objeto | Tipo | Schema | Como Usa a Rotina | Impacto da Refatoracao |
|---|---|---|---|---|
| [nome] | Procedure/Function/Job | [schema] | [como chama] | Nenhum / Ajuste de contrato / Recompilacao |

**Total de dependentes:** [N]
**Dependentes criticos (requerem ajuste):** [N]

---

## 2. Mudancas no Contrato (Assinatura)

| Parametro | Situacao Atual | Situacao Proposta | Justificativa | Impacto |
|---|---|---|---|---|
| [param] | IN VARCHAR2 | IN VARCHAR2 (sem mudanca) | — | Nenhum |
| [param] | OUT NUMBER | Removido | Substituido por excecao | Todos os chamadores afetados |

---

## 3. Impacto em Dados

| Tabela | Comportamento Atual | Comportamento Novo | Risco |
|---|---|---|---|
| [T_XXXX] | INSERT sem validacao de duplicidade | INSERT com controle de idempotencia | Baixo — dados existentes nao afetados |

---

## 4. Impacto em Jobs / Integrações

| Job / Integracao | Frequencia | Impacto | Acao Necessaria |
|---|---|---|---|
| [JOB_EFETIVACAO] | Diario - 02:00 | Nenhum | — |

---

## 5. Plano de Rollback

**Estrategia:** [manter versao legada em schema de backup / feature flag / versionamento de package]

**Condicoes para ativar rollback:**
- [condicao 1]
- [condicao 2]

---

## 6. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| [risco] | Alta/Media/Baixa | Alto/Medio/Baixo | [acao] |

---

## 7. Aprovacao

- [ ] Analisado pelo Arquiteto
- [ ] Validado pelo DBA
- [ ] Aprovado pelo PO
```

---

## Etapa 6 — Backlog (Epicos, Features e User Stories)

### Objetivo

Traduzir o modelo DDD e o fluxo TO-BE em itens de backlog rastreáveis, prontos para priorizacao e execucao pela equipe de desenvolvimento.

### Hierarquia do Backlog

```
EPICO
??? FEATURE
    ??? USER STORY
        ??? CRITERIOS DE ACEITE (Gherkin)
```

### Criterios de Aceite — Formato Gherkin

```gherkin
DADO QUE [pre-condicao]
QUANDO [acao do usuario ou sistema]
ENTAO [resultado esperado]
E [resultado adicional, se houver]
```

---

### Template de Output — `BACKLOG-EPICO-FEATURES-USERSTORIES.md`

```markdown
# Backlog de Refatoracao: [NOME_DA_ROTINA]

**Baseado em:** reversa-[nome].md | ddd-modelagem-dominio.md | analise-impacto.md

---

## EPICO: [EP01] — [Nome do Epico em Linguagem de Negocio]

**Objetivo de negocio:** [por que este epico existe — valor entregue]
**Bounded Context:** [nome do BC]
**Criterio de conclusao:** [como saber que o epico esta concluido]

---

### FEATURE: [FT01] — [Nome da Feature]

**Descricao:** [o que esta feature entrega]
**Dependencias:** [outras features ou epicos que precisam estar prontos antes]

---

#### USER STORY: [US01] — [Titulo da Story]

**Como** [papel / ator]
**Quero** [acao / funcionalidade]
**Para** [beneficio / valor]

**Criterios de Aceite:**

```gherkin
Cenario 1: [nome do cenario]
  DADO QUE [pre-condicao]
  QUANDO [acao]
  ENTAO [resultado esperado]

Cenario 2: [cenario de excecao]
  DADO QUE [pre-condicao de erro]
  QUANDO [acao]
  ENTAO [resultado de erro esperado]
```

**Notas tecnicas:**
- [informacao relevante para o desenvolvedor]
- Origem: [RN0X da engenharia reversa que originou esta story]
- Objeto Oracle afetado: [procedure/function/package]

**Story Points:** [ ] 1 [ ] 2 [ ] 3 [ ] 5 [ ] 8 [ ] 13
**Prioridade:** [ ] Alta [ ] Media [ ] Baixa

---

#### USER STORY: [US02] — [Titulo]

[repetir estrutura]

---

### FEATURE: [FT02] — [Nome da Feature]

[repetir estrutura]

---

## Resumo do Backlog

| ID | Tipo | Titulo | Prioridade | Story Points | Status |
|---|---|---|---|---|---|
| EP01 | Epico | [nome] | Alta | — | Aberto |
| FT01 | Feature | [nome] | Alta | — | Aberto |
| US01 | Story | [nome] | Alta | 5 | Aberto |
```

---

## Boas Praticas para Stories de Refatoracao PL/SQL

### Story de Extracao de Regra de Negocio

Quando uma regra de negocio esta embutida em SQL e precisa ser movida para a camada de dominio:

```
Como desenvolvedor
Quero extrair a regra [RN0X] da query SQL para um Domain Service
Para que a logica de negocio seja testavel e reutilizavel
```

### Story de Correcao de Smell

Para cada smell identificado na Etapa 1:

```
Como operador do sistema
Quero que a rotina [nome] trate excecoes de forma granular
Para que erros sejam rastreados e o processo possa ser retomado sem perda de dados
```

### Story de Documentacao / Ubiquitous Language

```
Como membro da equipe
Quero que os nomes de procedures e variaveis reflitam os termos do dicionario de dominio
Para que o codigo seja autoexplicativo e alinhado com a linguagem do negocio
```

---

## Checklist de Entrega — Etapas 5 e 6

### Etapa 5 — Impacto
```
[ ] Todos os dependentes Oracle mapeados (via dba_dependencies)
[ ] Mudancas de contrato avaliadas para cada dependente
[ ] Impacto em dados avaliado tabela a tabela
[ ] Jobs e integracoes verificados
[ ] Plano de rollback definido
[ ] Riscos mapeados com mitigacoes
[ ] Arquivo salvo em: rotinas/[nome]/05-analise-impacto/analise-impacto.md
[ ] README.md raiz atualizado (Impacto = ?)
```

### Etapa 6 — Backlog
```
[ ] Pelo menos 1 Epico definido por rotina
[ ] Features mapeadas a partir das RNs da Etapa 1
[ ] User Stories com criterios de aceite em Gherkin
[ ] Rastreabilidade: cada story referencia a RN de origem
[ ] Stories de correcao de smells incluidas
[ ] Story Points estimados (ou marcados para refinamento)
[ ] Arquivo salvo em: rotinas/[nome]/06-backlog/BACKLOG-EPICO-FEATURES-USERSTORIES.md
[ ] README.md raiz atualizado (Backlog = ?)
```