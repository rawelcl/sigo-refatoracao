# Base de Conhecimento -- Indice

> Porta de entrada obrigatoria para todos os agentes.
> Consultar ANTES de iniciar qualquer analise. Atualizar APOS concluir cada etapa.

---

## [REGRA META] Retroalimentacao da Base de Conhecimento

**OBRIGATORIO.** Sempre que o usuario trouxer uma nova regra, orientacao ou esclarecimento
de negocio que interfira em decisoes, terminologia ou documentacao ja criada, o agente DEVE
imediatamente retroalimentar a base de conhecimento antes de encerrar a interacao:

1. Consolidar a regra em um dos catalogos (`catalogo-regras-negocio.md`, `decisoes-design.md`,
   `padroes-identificados.md`, `pendencias-abertas.md`) ou em `_shared/dicionario-*.md`.
2. Propagar a mudanca para todos os artefatos ja produzidos (DDDs, analises, C4, fluxos).
3. Atualizar `indice.md` (este arquivo) com a data da retroalimentacao.
4. Registrar `[OK]` em `pendencias-abertas.md` com a data e referencia cruzada.

Nao se deve esperar o usuario repetir a informacao. Se a regra nao foi escrita, ela se perde.

---

## Conceitos Fundamentais do Dominio -- Leitura Obrigatoria

### Taxonomia de Proposta: TIPO vs ORIGEM (24/04/2026)

Propostas tem **duas dimensoes ortogonais** que NUNCA devem ser confundidas:

| Dimensao | O que define | Valores conhecidos | Campo tecnico |
|---|---|---|---|
| **TIPO / PRODUTO** | Porte/caracteristicas da proposta/cliente PJ -- determina fluxo de negocio | PIM (=SS Super Simples), PME, Individual, Odonto | Derivado de `nu_total_empregado` e modelo de negocio |
| **ORIGEM / FERRAMENTA** | Ferramenta de venda em que a proposta foi digitada -- determina qual rotina efetiva | BITIX, WEBHAP, TAFFIX | `cd_operados` |

**Valores de `cd_operados` confirmados:**

| Origem | `cd_operados` | Rotina de efetivacao | Observacoes |
|---|---|---|---|
| BITIX | `'BITIX'` | PK_VENDA_JSON | Ferramenta externa NDI Minas. API JSON. |
| WEBHAP | `'WEBHAP'` | PR_EFETIVA_INTERNET | Portal do Corretor (nome legado: "Portal PIM"). |
| TAFFIX | `'PONTO'` | PR_EFETIVA_INTERNET | Administradoras de Beneficios. Contratos por adesao. |

**Regras de uso:**
- Nunca usar "canal PIM" ou "canal BITIX". Usar "origem BITIX" / "origem WEBHAP" / "tipo PIM" / "tipo PME".
- PIM/SS e PME podem vir de qualquer origem. A escolha da rotina e pela ORIGEM.
- Expressoes como "canal-a-canal" (em textos legados) significam "origem-a-origem".
- TAFFIX != WEBHAP. Sao ferramentas distintas que compartilham staging mas geram fluxos de contrato distintos.
- **[REF DD-11 -- decisoes-design.md]** | **[REF A10 e A11 -- pendencias-abertas.md]** | **[REF dicionario-siglas.md secao 2]**

### Particionamento de Tabelas Compartilhadas (24/04/2026)

Tabelas de staging (`TB_EMPRESA_INTERNET`, `TB_ODON_EMPRESA_INTERNET`, `TB_PENDENCIA_EMPRESA_INTERNET`,
`TB_USUARIO_CRITICA_INTERNET`) sao fisicamente compartilhadas entre EI e VJ, mas **logicamente
particionadas por `cd_operados`** -- escrita disjunta:
- EI grava/atualiza linhas com `cd_operados IN ('WEBHAP','PONTO',...)`.
- VJ grava/atualiza linhas com `cd_operados = 'BITIX'`.
- Nao ha transacao compartilhada. Modelos DDD distintos por BC sao padrao esperado.

**TB_PROPOSTA_VENDA e exclusiva da origem BITIX** (confirmado via CVS 24/04/2026): EI nao deve
acessa-la no to-be. AG07 e R12 removidos do DDD EI.

### Produtores Disjuntos de `fl_status_processamento='17'` (24/04/2026)

Dois produtores por origem, **sem interferencia mutua**:
- **WEBHAP**: atribuido pelo **Portal do Corretor Super Simples** (antes/fora do EI).
- **BITIX**: atribuido por `PR_VE_DIVERGENCIA_NEOWAY` via VJ (RN14).

Nao ha fluxo cruzado entre contextos. [REF Conflito 2 em analise-comparativa-ddd-ei-vj.md]

### Unificacao de Coligadas em `TB_EMPRESA_COLIGADA` (24/04/2026)

`TB_EMPRESA_COLIGADA` e a **tabela canonica unica** de coligadas, independentemente
da origem da proposta. `TB_EMPRESA_COLIGADA_BITX` e apenas **staging** da origem BITIX.
A procedure `PR_COLIGA_EMPRESA_BITIX` transfere as coligadas BITIX do staging para
a tabela canonica. Nao sao hierarquias paralelas -- toda coligada (inclusive BITIX)
termina em `TB_EMPRESA_COLIGADA`. [REF RN-T10 em catalogo-regras-negocio.md] [REF
Conflito 8 em analise-comparativa-ddd-ei-vj.md]

---

## Rotinas Analisadas

| Rotina                     | Tipo      | Schema  | Versao CVS              | Status Eng. Reversa | Status DDD   | Status Backlog |
|----------------------------|-----------|---------|-------------------------|---------------------|--------------|----------------|
| PR_EFETIVA_INTERNET        | PROCEDURE | HUMASTER| PRODUCAO-20251014        | [OK] 17/04/2026     | [OK] 24/04/2026| [-]            |
| PR_CADASTRAMENTO_EMPRESA_PROV | PROCEDURE | HUMASTER | PRODUCAO-20260402     | [OK] 17/04/2026     | [OK] 21/04/2026 | [-]            |
| PK_VENDA_JSON                 | PACKAGE   | HUMASTER| PRODUCAO-20260402        | [OK] 17/04/2026     | [OK] 24/04/2026| [-]           |

---

## Arquivos da Base

| Arquivo                       | Descricao                                      | Ultima Atualizacao |
|-------------------------------|------------------------------------------------|--------------------|
| `catalogo-objetos-plsql.md`   | Catalogo de todos os objetos PL/SQL analisados | 24/04/2026         |
| `catalogo-tabelas.md`         | Catalogo de tabelas com estrutura e volumes    | 24/04/2026         |
| `catalogo-regras-negocio.md`  | Regras de negocio transversais                 | 24/04/2026         |
| `riscos-ans.md`               | Riscos regulatorios ANS identificados          | 17/04/2026         |
| `decisoes-design.md`          | Decisoes de design e arquitetura               | 24/04/2026         |
| `pendencias-abertas.md`       | Pendencias e bloqueios em aberto               | 24/04/2026         |
| `padroes-identificados.md`    | Smells e padroes transversais identificados    | 24/04/2026         |

## Dicionarios Compartilhados

| Arquivo                              | Descricao                                              | Ultima Atualizacao |
|--------------------------------------|--------------------------------------------------------|--------------------|
| `_shared/dicionario-dominio.md`      | Termos de negocio e linguagem ubiqua do dominio        | 24/04/2026         |
| `_shared/dicionario-siglas.md`       | Siglas usadas em diagramas, artefatos e codigo         | 24/04/2026         |
| `_shared/analise-comparativa-ddd-ei-vj.md` | Analise comparativa DDD entre EI e VJ (conflitos e reconciliacoes) | 24/04/2026 |

---

## Links Rapidos por Rotina

### PR_EFETIVA_INTERNET
- Eng. Reversa: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/01-engenharia-reversa/reversa-pr-efetiva-internet.md`
- DDD (versionado): `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/02-ddd/ddd-modelagem-dominio.md`
- DDD (legado/referencia): `rotinas/pr_efetiva_internet/02-ddd/ddd-modelagem-dominio.md`
- C4 AS-IS: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/03-c4-model/c4-2-container-as-is.puml`
- C4 TO-BE: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/03-c4-model/c4-2-container-to-be.puml`
- Componente: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/03-c4-model/c4-3-component-pr-efetiva-internet.puml`
- Fluxo AS-IS: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/04-fluxos/fluxo-pr-efetiva-internet-as-is.puml`
- Fluxo TO-BE: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/04-fluxos/fluxo-pr-efetiva-internet-to-be.puml`
- Analise de Impacto: `rotinas/pr_efetiva_internet/01-engenharia-reversa/analise-impacto-pr-efetiva-internet.md`
- Proposta de Contrato: `rotinas/pr_efetiva_internet/01-engenharia-reversa/proposta-novo-contrato-retorno.md`

### PK_VENDA_JSON
- Eng. Reversa: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/01-engenharia-reversa/reversa-pk-venda-json.md`
- DDD: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/02-ddd/ddd-modelagem-dominio.md`
- C4 Contexto: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-1-system-context.puml` + `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/svg/c4-1-system-context.svg`
- C4 AS-IS: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-as-is.puml`
- C4 TO-BE: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-to-be.puml`
- C4 TO-BE Fase 3: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-to-be-fase3.puml`
- C4 Landscape: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-landscape-evolucao.puml`
- Componente: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-3-component-pk-venda-json.puml`
- Fluxo AS-IS: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/04-fluxos/src/fluxo-pk-venda-json-as-is.puml`
- Fluxo TO-BE: `rotinas/pk_venda_json/rev-PRODUCAO-20260402/04-fluxos/src/fluxo-pk-venda-json-to-be.puml`
- Dicionario de Dominio: `_shared/dicionario-dominio.md`

### PR_CADASTRAMENTO_EMPRESA_PROV
- Eng. Reversa: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/01-engenharia-reversa/reversa-pr-cadastramento-empresa-prov.md`
- DDD: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/02-ddd/ddd-modelagem-dominio.md`
- C4 Contexto: `_shared/c4-model/src/c4-1-system-context.puml` + `_shared/c4-model/svg/c4-1-system-context.svg`
- C4 AS-IS: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-as-is.puml`
- C4 TO-BE: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-to-be.puml`
- C4 TO-BE Fase 3: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-to-be-fase3.puml`
- C4 Componente: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src/c4-3-component-orquestrador.puml`
- C4 Landscape: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src/c4-landscape-evolucao.puml`
- SVGs: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/svg/`
- Fluxo AS-IS: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/04-fluxos/src/fluxo-pr-cadastramento-empresa-prov-as-is.puml`
- Fluxo TO-BE: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/04-fluxos/src/fluxo-pr-cadastramento-empresa-prov-to-be.puml`
- SVGs Fluxos: `rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/04-fluxos/svg/`
