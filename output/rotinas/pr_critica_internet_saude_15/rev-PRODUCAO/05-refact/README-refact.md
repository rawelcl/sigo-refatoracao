# Código Refatorado: pr_critica_internet_saude_15

**Schema:** HUMASTER
**Baseado em:** reversa-pr_critica_internet_saude_15.md (rev-PRODUCAO)
**DDD:** ddd-modelagem-dominio.md (rev-PRODUCAO)
**Data:** [data atual]
**Etapa:** 6 -- Geração de Código Refatorado (Agente Refatoração)

**Artefatos de referência:**
- `01-engenharia-reversa/reversa-pr_critica_internet_saude_15.md`
- `02-ddd/ddd-modelagem-dominio.md`
- `03-c4-model/src/c4-2-container-to-be.puml`
- `04-fluxos/src/fluxo-pr_critica_internet_saude_15-to-be.puml`

---

## Arquivos Gerados

| Arquivo | Conteúdo |
|---|---|
| `pk_pr_critica_internet_saude_15_const.sql` | Constantes -- elimina hardcodes |
| `pk_pr_critica_internet_saude_15.pks` | Spec refatorada |
| `pk_pr_critica_internet_saude_15.pkb` | Body refatorado |
| `README-refact.md` | Este arquivo |

---

## Decisões Aplicadas

| # | Decisão | Artefato de Origem | Trecho no Código |
|---|---|---|---|
| DD01 | Extrair constantes | DDD Sec 11 | `pk_pr_critica_internet_saude_15_const.sql` |
| DD02 | Isolar regras de negócio | DDD Sec 11 | `pk_pr_critica_internet_saude_15.pks` |

---

## Rastreabilidade RN -> Código

| RN | Descrição Resumida | Arquivo | Procedure/Function |
|---|---|---|---|
| RN01 | Validar idade crítica | pk_pr_critica_internet_saude_15.pkb | pr_validar_idade |
| RN02 | Registrar críticas | pk_pr_critica_internet_saude_15.pkb | pr_registrar_critica |

---

## Smells Eliminados vs Encapsulados

| Smell | Descrição | Status | Solução |
|---|---|---|---|
| S01 | Hardcodes de idade | [OK] Eliminado | Constantes no package `pk_pr_critica_internet_saude_15_const` |
| S02 | Código duplicado de críticas | [OK] Eliminado | Procedures centralizadas |

---

## Pontos de Atenção para Migração (Fase 3)

| ID | Trecho | Motivo | Equivalente Microsserviço |
|---|---|---|---|
| MIG01 | Uso de constantes Oracle | Dependência Oracle | Substituir por configuração externa |

---

## Pendências de Implementação

- [ ] Nenhuma pendência identificada.

---

[WORKFLOW-CONCLUIDO]