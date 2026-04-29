# Referencia: Etapa 1 — Engenharia Reversa de PL/SQL Oracle

## Objetivo

Extrair e documentar todas as **regras de negocio**, **logica de decisao**, **dependencias** e **comportamentos** de uma rotina PL/SQL legada, de forma que o artefato gerado sirva como fonte de verdade para as etapas subsequentes de DDD, modelagem e backlog.

---

## Governanca de Codigo Fonte — Regra Inegociavel

**Antes de qualquer analise, confirmar a fonte do codigo:**

```
[ ] Codigo recuperado do CVS com tag PRODUCAO confirmada
[ ] Tag registrada no cabecalho do artefato: "Versao CVS: [tag]"
[ ] Se tag PRODUCAO nao existir: PARAR — documentar como [BLOQUEADO] e notificar o usuario
[ ] Nunca analisar codigo de origem desconhecida, copiado manualmente ou sem tag confirmada
```

---

## Protocolo de Analise

### Passo 1 — Leitura Estrutural Inicial

Antes de extrair qualquer regra, mapear a anatomia da rotina. Use o **MCP Server — HAPVIDA PRODUCAO (somente leitura)** para complementar a leitura do codigo CVS:

```
[ ] Tipo do objeto: PROCEDURE / FUNCTION / PACKAGE (spec + body) / TRIGGER
[ ] Assinatura completa: nome, parametros de entrada, parametros de saida, tipo de retorno
[ ] Status em producao: verificar via MCP (dba_objects) se o objeto existe e esta VALID
[ ] Dependencias de primeiro nivel: procedures/functions chamadas diretamente
      ? confirmar via MCP: dba_dependencies WHERE name = '[OBJETO]'
[ ] Tabelas lidas (SELECT/FROM)
      ? confirmar estrutura via MCP: dba_tab_columns WHERE table_name = '[TABELA]'
[ ] Tabelas escritas (INSERT/UPDATE/DELETE/MERGE)
[ ] Sequencias utilizadas
[ ] Packages Oracle utilizados (DBMS_*, UTL_*, etc.)
[ ] Cursores declarados (explicitos e implicitos)
[ ] Excecoes declaradas e tratadas
[ ] Constraints e indices relevantes nas tabelas principais
      ? verificar via MCP: dba_constraints, dba_indexes
```

### Passo 2 — Rastreamento Recursivo de Sub-rotinas

A engenharia reversa segue a **cadeia completa de chamadas**. Cada sub-rotina identificada inicia uma nova analise recursiva.

**Para cada sub-rotina chamada:**

1. Verificar existencia e status em producao via MCP (`dba_objects`) antes de buscar no CVS
2. Recuperar o codigo-fonte do CVS com tag `PRODUCAO` — se nao encontrado: `[BLOQUEADO]`
3. Se o CVS nao localizar o objeto, usar `dba_source` via MCP como fonte auxiliar — registrar como `[ATENCAO] codigo obtido via dba_source — sem confirmacao CVS`
4. Identificar o tipo (procedure local, function local, package externo, procedure de outro schema)
5. Mapear o contrato: o que entra, o que sai, o que escreve no banco
6. Documentar como o retorno condiciona o fluxo da rotina chamadora
7. Repetir recursivamente para as sub-rotinas desta sub-rotina

**Criterios de parada da recursao:**

| Criterio | Acao |
|---|---|
| Objeto e um package Oracle nativo (`DBMS_*`, `UTL_*`, `HTP.*`) | Parar — documentar apenas o contrato |
| Objeto ja foi analisado nesta sessao ou consta no indice da base de conhecimento | Parar — referenciar a analise existente com `[REF]` |
| Objeto e de schema externo sem acesso ao CVS | Parar — documentar como `[BLOQUEADO]` |
| Objeto e uma function/procedure utilitaria sem logica de negocio (ex: formatacao, log) | Parar — documentar apenas o proposito |
| Profundidade de recursao atingiu nivel 5 sem criterio de parada anterior | Parar — documentar o nivel e notificar o usuario |

### Passo 3 — Extracao de Regras de Negocio

Para cada bloco logico significativo:

- Nomear a regra em linguagem de negocio (nao tecnica)
- Descrever o gatilho (condicao de entrada)
- Descrever o comportamento (o que acontece)
- Descrever o resultado (saida, escrita no banco, excecao lancada)
- Extrair o snippet de codigo SQL/PLSQL como evidencia
- Classificar: validacao / calculo / orquestracao / persistencia / integracao

### Passo 4 — Identificacao de Smells e Problemas

Registrar explicitamente:

- **Logica de negocio embutida em SQL** (regras que deveriam estar na camada de aplicacao)
- **Cursores com N+1** (cursor dentro de cursor sem bulk collect)
- **COMMIT/ROLLBACK dentro de procedures** chamadas por outras procedures
- **Hardcode de valores** que deveriam ser parametros ou configuracoes
- **Tratamento de excecao generico** (`WHEN OTHERS THEN NULL` ou equivalente)
- **Dependencia circular** entre objetos
- **Logica duplicada** presente em multiplas rotinas

### Passo 5 — Identificacao de Riscos ANS

Verificar e documentar explicitamente se a rotina toca areas reguladas pela ANS:

| Area de Risco | Exemplos a verificar |
|---|---|
| Carencia | Logica de calculo ou isencao de carencia |
| Portabilidade | Regras de portabilidade especial ou ordinaria |
| Cobertura | Inclusao/exclusao de procedimentos cobertos |
| Prazos regulatorios | Prazos de implantacao, vigencia, cancelamento |
| Reajuste | Logica de aplicacao de reajuste por faixa etaria |
| Nota tecnica | Calculo de premios e mensalidades |

Para cada risco ANS identificado:
- Usar o token `[ANS]` na descricao da regra de negocio afetada
- Registrar na secao "Riscos ANS" do indice da base de conhecimento
- Incluir no Painel de Decisao Estrategica (secao 8 do template)

---

## Template de Output — `reversa-[nome].md`

```markdown
# Engenharia Reversa: [NOME_DA_ROTINA]

**Data da Analise:** [data]
**Analista:** [nome]
**Versao CVS (tag PRODUCAO):** [tag confirmada]
**Origem:** C:\CVS\health_install\[tipo]\[nome]

---

## 1. Cabecalho e Assinatura

| Atributo | Valor |
|---|---|
| Tipo | PROCEDURE / FUNCTION / PACKAGE |
| Schema | [schema] |
| Nome | [nome completo] |
| Parametros de Entrada | [lista] |
| Parametros de Saida | [lista] |
| Retorno | [tipo, se function] |

---

## 2. Arvore de Dependencias

### 2.1 Sub-rotinas Chamadas

| Sub-rotina | Tipo | Schema | O que faz | Impacto no fluxo principal | Status |
|---|---|---|---|---|---|
| [nome] | Procedure | [schema] | [descricao] | [como o retorno altera o fluxo] | [OK] / [BLOQUEADO] / [REF] |

### 2.2 Tabelas Acessadas

| Tabela | Operacao | Condicao Principal | Observacao |
|---|---|---|---|
| [nome] | SELECT / INSERT / UPDATE / DELETE | [where principal] | [observacao] |

### 2.3 Outros Objetos

| Objeto | Tipo | Finalidade |
|---|---|---|
| [sequence/package/dblink] | [tipo] | [para que e usado] |

---

## 3. Regras de Negocio Extraidas

### RN01 — [Nome da Regra em Linguagem de Negocio]

**Categoria:** Validacao / Calculo / Orquestracao / Persistencia / Integracao

**Risco ANS:** [ANS] [descricao] — ou — N/A

**Gatilho:** [condicao que ativa esta regra]

**Comportamento:** [o que acontece quando a regra e ativada]

**Resultado:** [saida, escrita em banco, excecao]

**Ambiguidades:** [ATENCAO] [descricao da duvida] — ou — N/A

**Evidencia (codigo):**
```sql
-- trecho de codigo que implementa esta regra
-- Origem: [nome_da_rotina_ou_sub_rotina]
```

---

## 4. Fluxo de Decisao (Descricao Textual)

[Narrativa do fluxo principal, incluindo ramificacoes condicionais, na ordem de execucao]

---

## 5. Matriz de Regras de Decisao

| ID | Gatilho / Condicao | Logica / Validacao | Resultado | Classificacao | Risco ANS |
|---|---|---|---|---|---|
| RN01 | ... | ... | ... | Validacao / Calculo / etc. | [ANS] / N/A |

---

## 6. Problemas e Smells Identificados

| ID | Tipo de Problema | Localizacao | Impacto | Sugestao |
|---|---|---|---|---|
| P01 | [tipo] | [linha/bloco] | Alto / Medio / Baixo | [sugestao] |

---

## 7. Tratamento de Excecoes

| Excecao | Codigo ORA | Quando Ocorre | Tratamento Atual | Tratamento Recomendado |
|---|---|---|---|---|
| [nome] | ORA-XXXXX | [condicao] | [o que o codigo faz] | [o que deveria fazer] |

---

## 8. Riscos ANS Identificados

| ID | Descricao do Risco | Regras Relacionadas | Severidade | Acao Recomendada |
|---|---|---|---|---|
| ANS01 | [descricao] | RN0X | Alta / Media / Baixa | [acao] |

---

## 9. Mapeamento de Dependencias (Ecossistema)

- **Input (Origem):** [Tabelas/Sistemas de origem]
- **Output (Destino):** [Tabelas/Sistemas de destino]

---

## 10. Painel de Decisao Estrategica (PO Feedback)

**Pontos de Atencao / Ambiguidades Documentadas:**

| ID | Descricao | Tipo | Acao Necessaria |
|---|---|---|---|
| A01 | [descricao da ambiguidade] | [ATENCAO] / [CRITICO] / [ANS] | Validar com PO / DBA |

**Aprovacao de Escopo:**
- [ ] Aprovado: seguir com as regras extraidas
- [ ] Aprovado com ressalvas: [detalhar]
- [ ] Reprovado: redesenhar antes de continuar
```

---

## Boas Praticas de Engenharia Reversa PL/SQL Oracle

### Leitura de Cursores

```sql
-- Cursor explicito: sempre mapear a query completa e as variaveis de saida
CURSOR c_beneficiarios IS
  SELECT cd_beneficiario, dt_nascimento
  FROM t_beneficiario
  WHERE cd_empresa = p_cd_empresa;
-- Regra: para cada beneficiario da empresa, executa [X]

-- Cursor implicito em FOR: mesma logica
FOR r IN (SELECT ... FROM ... WHERE ...) LOOP
  -- mapear o que acontece dentro do loop
END LOOP;
```

### Tratamento de Excecoes

```sql
-- Padrao problematico — silencia todos os erros:
EXCEPTION
  WHEN OTHERS THEN NULL;  -- smell: excecao engolida

-- Padrao aceitavel — registra e relanca:
EXCEPTION
  WHEN OTHERS THEN
    pkg_log.registrar(SQLERRM);
    RAISE;
```

### Identificacao de Logica de Negocio em SQL

Atencao especial a:
- `DECODE` e `CASE` com logica de negocio embutida
- `WHERE` com regras complexas de elegibilidade
- Subqueries correlacionadas com logica de decisao
- `CONNECT BY` com logica hierarquica de negocio

---

## Checklist de Entrega — Etapa 1

```
[ ] Tag PRODUCAO do CVS confirmada e registrada no cabecalho
[ ] Base de conhecimento consultada antes do inicio
[ ] Assinatura completa documentada
[ ] Arvore de dependencias mapeada (criterios de parada aplicados)
[ ] Sub-rotinas com [BLOQUEADO] notificadas ao usuario
[ ] Sub-rotinas ja analisadas referenciadas com [REF]
[ ] Todas as tabelas acessadas listadas com operacao
[ ] Regras de negocio extraidas com evidencia de codigo e origem
[ ] Riscos ANS identificados e marcados com [ANS]
[ ] Ambiguidades documentadas com [ATENCAO] — nenhuma suposicao silenciosa
[ ] Smells e problemas identificados
[ ] Excecoes mapeadas
[ ] Fluxo de decisao descrito em linguagem de negocio
[ ] Painel de Decisao preenchido com pontos para o PO
[ ] Arquivo salvo em: rotinas/[nome]/01-engenharia-reversa/reversa-[nome].md
[ ] indice-base-conhecimento.md atualizado (retroalimentacao obrigatoria)
[ ] README.md raiz atualizado (Eng. Reversa = [OK])
```


---

## 1. Cabecalho e Assinatura

| Atributo | Valor |
|---|---|
| Tipo | PROCEDURE / FUNCTION / PACKAGE |
| Schema | [schema] |
| Nome | [nome completo] |
| Parametros de Entrada | [lista] |
| Parametros de Saida | [lista] |
| Retorno | [tipo, se function] |

---

## 2. Arvore de Dependencias

### 2.1 Sub-rotinas Chamadas

| Sub-rotina | Tipo | Schema | O que faz | Impacto no fluxo principal |
|---|---|---|---|---|
| [nome] | Procedure | [schema] | [descricao] | [como o retorno altera o fluxo] |

### 2.2 Tabelas Acessadas

| Tabela | Operacao | Condicao Principal | Observacao |
|---|---|---|---|
| [nome] | SELECT / INSERT / UPDATE / DELETE | [where principal] | [observacao] |

### 2.3 Outros Objetos

| Objeto | Tipo | Finalidade |
|---|---|---|
| [sequence/package/dblink] | [tipo] | [para que e usado] |

---

## 3. Regras de Negocio Extraidas

### RN01 — [Nome da Regra em Linguagem de Negocio]

**Categoria:** Validacao / Calculo / Orquestracao / Persistencia / Integracao

**Gatilho:** [condicao que ativa esta regra]

**Comportamento:** [o que acontece quando a regra e ativada]

**Resultado:** [saida, escrita em banco, excecao]

**Evidencia (codigo):**
```sql
-- trecho de codigo que implementa esta regra
```

---

## 4. Fluxo de Decisao (Descricao Textual)

[Narrativa do fluxo principal, incluindo ramificacoes condicionais principais, na ordem de execucao]

---

## 5. Matriz de Regras de Decisao

| ID | Gatilho / Condicao | Logica / Validacao | Resultado | Classificacao |
|---|---|---|---|---|
| RN01 | ... | ... | ... | Validacao / Calculo / etc. |

---

## 6. Problemas e Smells Identificados

| ID | Tipo de Problema | Localizacao no Codigo | Impacto | Sugestao |
|---|---|---|---|---|
| P01 | [tipo] | [linha/bloco] | [Alto/Medio/Baixo] | [sugestao de correcao] |

---

## 7. Tratamento de Excecoes

| Excecao | Codigo ORA | Quando Ocorre | Tratamento Atual | Tratamento Recomendado |
|---|---|---|---|---|
| [nome] | ORA-XXXXX | [condicao] | [o que o codigo faz] | [o que deveria fazer] |

---

## 8. Painel de Decisao para o PO

**Pontos que precisam de validacao de negocio:**

1. [ponto 1 — regra ambigua ou potencialmente errada]
2. [ponto 2]

**Aprovacao:**
- [ ] Aprovado: seguir com as regras extraidas
- [ ] Aprovado com ressalvas: [detalhar]
- [ ] Reprovado: redesenhar antes de continuar
```

---

## Boas Praticas de Engenharia Reversa PL/SQL Oracle

### Leitura de Cursores

```sql
-- Cursor explicito: sempre mapear a query completa e as variaveis de saida
CURSOR c_beneficiarios IS
  SELECT cd_beneficiario, dt_nascimento
  FROM t_beneficiario
  WHERE cd_empresa = p_cd_empresa;
-- ? Regra: para cada beneficiario da empresa, executa [X]

-- Cursor implicito em FOR: mesma logica
FOR r IN (SELECT ... FROM ... WHERE ...) LOOP
  -- ? mapear o que acontece dentro do loop
END LOOP;
```

### Tratamento de Excecoes

```sql
-- Padrao problematico — silencia todos os erros:
EXCEPTION
  WHEN OTHERS THEN NULL;  -- ? smell: excecao engolida

-- Padrao aceitavel — registra e relanca:
EXCEPTION
  WHEN OTHERS THEN
    pkg_log.registrar(SQLERRM);
    RAISE;
```

### Identificacao de Logica de Negocio em SQL

Atencao especial a:
- `DECODE` e `CASE` com logica de negocio embutida
- `WHERE` com regras complexas de elegibilidade
- Subqueries correlacionadas com logica de decisao
- `CONNECT BY` com logica hierarquica de negocio

---

## Checklist de Entrega — Etapa 1

```
[ ] Assinatura completa documentada
[ ] Arvore de dependencias mapeada (pelo menos 2 niveis)
[ ] Todas as tabelas acessadas listadas com operacao
[ ] Regras de negocio extraidas com evidencia de codigo
[ ] Fluxo de decisao descrito em linguagem de negocio
[ ] Smells e problemas identificados
[ ] Excecoes mapeadas
[ ] Pontos de validacao com o PO identificados
[ ] Arquivo salvo em: rotinas/[nome]/01-engenharia-reversa/reversa-[nome].md
[ ] README.md raiz atualizado (Eng. Reversa = ?)
```