---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
style: |
  section {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 22px;
  }
  h1 { color: #1a5276; font-size: 36px; }
  h2 { color: #2e86c1; font-size: 28px; }
  h3 { color: #2874a6; font-size: 24px; }
  table { font-size: 18px; }
  code { font-size: 16px; }
  .columns { display: flex; gap: 20px; }
  .col { flex: 1; }
  strong { color: #c0392b; }
  em { color: #7d3c98; }
  blockquote { border-left: 4px solid #2e86c1; padding-left: 16px; color: #555; font-size: 20px; }
---

<!-- _class: lead -->
<!-- _backgroundColor: #1a5276 -->
<!-- _color: #ffffff -->

# ?? Refatoração DDD
## pr_efetiva_internet
### JOB de Efetivação Automática PIM

**SIGO Health — Hapvida NotreDame Intermédica**

Fevereiro 2026

---

## ?? Agenda

1. **Contexto e Problema** — O que é o pr_efetiva_internet?
2. **Diagnóstico Técnico** — Por que precisa ser refatorado?
3. **Visão Geral da Solução** — DDD + Strangler Fig Pattern
4. **Arquitetura AS-IS vs TO-BE** — Diagramas C4
5. **Roadmap de 4 Fases** — Quick Wins ? Packages ? Orquestrador ? Go-Live
6. **Backlog** — Épico, Features e User Stories
7. **Estimativas e Riscos** — Pontos, timeline e mitigações
8. **Próximos Passos**

---

## ?? O que é o pr_efetiva_internet?

> Procedure PL/SQL executada automaticamente por **DBMS_SCHEDULER** (JOB) para efetivar propostas de planos empresariais cadastradas via Portal Internet de Movimentação (PIM).

### O que ele faz:

| Fase | Descrição | Procedures Chamadas |
|------|-----------|---------------------|
| **1** | Carga PIM por modelo (?29 vidas) | Lógica inline |
| **2** | Avaliação de 13 pendências | stp1..stp13 (inline) |
| **3a** | Criação de empresa conveniada | pr_cadastramento_empresa_prov |
| **3b** | Criação de empresa odonto | pr_odon_cad_empresa_prov |
| **3c** | Execução de críticas | pr_critica_internet |
| **3d** | Baixa de beneficiários | pr_cadastramento_internet2 |
| **4-7** | Odonto puro, inclusões, completo, individual | Variantes |
| **8-9** | Coligadas BITIX e SIGO | PR_COLIGA_EMPRESA_BITIX |

---

## ?? Diagnóstico — Os Números

<div class="columns">
<div class="col">

### ?? Métricas do Monolito

| Métrica | Valor |
|---------|-------|
| **Linhas de código** | **2.290** |
| **Fases sequenciais** | 9 |
| **Tabelas afetadas** | 25+ |
| **Procedures externas** | 17 |
| **Variáveis globais** | ~25 |
| **Testes unitários** | **0** |

</div>
<div class="col">

### ?? Problemas Críticos

| Problema | Impacto |
|----------|---------|
| **50+ WHEN OTHERS THEN NULL** | Erros invisíveis |
| **~40% duplicação saúde?odonto** | Fix em 2 lugares |
| **~120 linhas log repetido** | MAX+1 race condition |
| **Commits intermediários** | Dados inconsistentes |
| **25 vars globais sem reset** | Bugs por estado anterior |
| **IF-ELSE >6 níveis** | Impossível rastrear |

</div>
</div>

---

## ?? Impacto em Produção — Incidentes Reais

### Caso INC001772142 (Carência — Regra 4)

- **Bug:** `pr_emp_controle_mov` com 4 falhas lógicas em REGRA 4
- **Causa raiz:** Duplicação de lógica ? fix aplicado em apenas 1 lugar
- **Impacto:** **25.406 beneficiários** com carência incorreta
- **Tempo de diagnóstico:** >2 horas (código monolítico sem testes)

> **Se tivéssemos packages isolados com testes unitários**, o bug teria sido detectado antes do deploy e o diagnóstico levaria minutos em vez de horas.

---

## ?? Solução — DDD + Strangler Fig Pattern

### Estratégia: **Não é um big-bang. É incremental.**

```
 Fase 1          Fase 2          Fase 3          Fase 4
????????????   ????????????   ????????????   ????????????
?Quick Wins????? Packages ?????Orquestra-????? Homologa-?
?(inline)  ?   ?Supporting?   ?dor Limpo ?   ?ção + UAT ?
?~620 lin. ?   ?(14 pkgs) ?   ?(~150 lin)?   ?(40+ tests?
?eliminadas?   ?extraídos ?   ?no lugar  ?   ?regressão)?
????????????   ????????????   ????????????   ????????????
  3 semanas      6 semanas      3 semanas      2 semanas
```

### Princípios:
- ? **Zero breaking changes** — API permanece idêntica
- ? **Deploy canary** — v1 e v2 coexistem
- ? **Rollback imediato** — Flag para reverter ao legado
- ? **Teste antes de substituir** — Cada package testado antes de ativar

---

## ??? Arquitetura AS-IS (Monolito)

![width:900px](c4-model/svg/c4-2-container-as-is.svg)

---

## ??? Arquitetura TO-BE (14 Packages)

![width:900px](c4-model/svg/c4-2-container-to-be.svg)

---

## ?? Context Map — 14 Bounded Contexts

![width:850px](svg/context-map-efetiva-internet.svg)

---

## ?? Fluxo de Execução — 9 Fases

![width:900px](svg/fluxo-execucao-efetiva-internet.svg)

---

## ?? Fase 1 — Quick Wins (Semanas 1-3)

> **Risco:** ?? Baixo | **Impacto:** Elimina ~620 linhas

### O que será feito:

| # | Quick Win | Linhas eliminadas |
|---|-----------|------------------:|
| 1.1 | **Motor de pendências** ? pk_pendencia_pim | ~500 |
| 1.2 | **Log centralizado** ? pk_log_baixa_pim + SEQUENCE | ~120 |
| 1.3 | **Record Type** para 25 variáveis globais | 0 (refactoring) |
| 1.4 | **Coleção de controles** (unifica saúde?odonto) | ~400 |

### Exemplo — Antes vs Depois:

```sql
-- ANTES (repetido 10×, com MAX+1):
begin
  select max(nvl(cb.cd_log,0))+1 into wcd_log from tb_log_baixa_controle cb;
  insert into tb_log_baixa_controle(cd_log, nu_controle, ds_obs, fl_status)
  values(wcd_log, st_e.nu_controle, 'mensagem', '0'); commit;
exception when others then null; end;

-- DEPOIS (1 linha):
pk_log_baixa_pim.pr_registra(st_e.nu_controle, 'mensagem', '0');
```

---

## ?? Fase 2 — Extração de 14 Packages (Semanas 4-9)

| Prioridade | Package | BC | Linhas | Risco |
|:---:|---------|:---:|---:|:---:|
| P0 | pk_log_baixa_pim | BC-EI-08 | ~40 | ?? |
| P0 | pk_pendencia_pim | BC-EI-02 | ~250 | ?? |
| P1 | pk_critica_pim | BC-EI-03 | ~100 | ?? |
| P1 | pk_config_sistema_pim | BC-EI-09 | ~30 | ?? |
| P1 | pk_status_pim | BC-EI-07 | ~80 | ?? |
| P2 | pk_efetivacao_empresa_pim | BC-EI-04 | ~120 | ?? |
| P2 | pk_efetivacao_odonto_pim | BC-EI-05 | ~80 | ?? |
| P2 | pk_baixa_beneficiario | BC-EI-06 | ~300 | ?? |
| P3 | pk_integracao_externa_pim | BC-EI-10 | ~50 | ?? |
| P3 | pk_carga_modelo_pim | BC-EI-11 | ~100 | ?? |
| P3 | pk_individual_pim | BC-EI-12 | ~80 | ?? |
| P3 | pk_odonto_puro_pim | BC-EI-13 | ~80 | ?? |
| P4 | pk_coligada_pim | BC-EI-14 | ~30 | ?? |
| P5 | pk_efetiva_internet (orq.) | BC-EI-01 | ~150 | ?? |

---

## ?? Fase 3 — Orquestrador Limpo (~150 linhas)

```sql
CREATE OR REPLACE PROCEDURE humaster.pr_efetiva_internet AS
    v_cfg pk_config_sistema_pim.t_config;
BEGIN
    v_cfg := pk_config_sistema_pim.fn_carregar();
    pk_carga_modelo_pim.pr_processar(v_cfg);

    FOR st_e IN pk_efetiva_internet.cr_propostas_pim(v_cfg) LOOP
        DECLARE v_ctx pk_efetiva_internet.t_ctx_efetivacao;
        BEGIN
            v_ctx := pk_efetiva_internet.fn_ctx_novo(st_e, v_cfg);
            pk_pendencia_pim.pr_avaliar_todas(st_e, v_ctx);
            IF v_ctx.count_pendencias = 0 THEN
                pk_critica_pim.pr_executar_criticas(st_e, v_ctx);
                IF v_ctx.qt_critica_sd = 0 THEN
                    pk_efetivacao_empresa_pim.pr_efetivar(st_e, v_ctx);
                    pk_efetivacao_odonto_pim.pr_efetivar(st_e, v_ctx);
                    pk_baixa_beneficiario.pr_autorizar_e_efetivar(st_e, v_ctx);
                    pk_status_pim.pr_verificar_nao_efetivados(v_ctx);
                END IF;
            END IF;
            pk_log_baixa_pim.pr_finalizar(st_e, v_ctx);
        EXCEPTION WHEN OTHERS THEN
            pk_log_baixa_pim.pr_registra(st_e.nu_controle, SQLERRM, '10');
        END;
    END LOOP;
    pk_odonto_puro_pim.pr_processar(v_cfg);
    pk_baixa_beneficiario.pr_processar_inclusoes(v_cfg);
    pk_baixa_beneficiario.pr_processar_completo(v_cfg);
    pk_individual_pim.pr_processar(v_cfg);
    pk_coligada_pim.pr_processar(v_cfg);
    COMMIT;
END;
```

---

## ?? Diagrama C4 — Nível 3: Componentes do Orquestrador

![width:900px](c4-model/svg/c4-3-component-orquestrador.svg)

---

## ?? Estimativa de Redução

| Métrica | AS-IS | TO-BE | Redução |
|---------|------:|------:|--------:|
| **Linhas na procedure** | 2.290 | ~150 | **-93%** |
| **WHEN OTHERS THEN NULL** | 50+ | 0 | **-100%** |
| **Duplicação saúde?odonto** | ~40% | 0% | **-100%** |
| **Log duplicado (linhas)** | ~120 | 0 | **-100%** |
| **Variáveis globais** | ~25 | 0 (Record) | **-100%** |
| **Testes unitários** | 0 | 40+ cenários | **?** |
| **Tempo diagnóstico falhas** | ~2h | ~15min | **-87%** |

---

## ?? Backlog — Épico EP-01

### 5 Features | 18 User Stories | 110 Story Points

| Feature | Descrição | Stories | Pontos | Semanas |
|---------|-----------|:-------:|-------:|:-------:|
| **F01** | Quick Wins (Fundação) | 4 | 22 | 3 |
| **F02** | Packages Supporting/Generic | 6 | 28 | 3 |
| **F03** | Packages Core Domain | 4 | 34 | 3 |
| **F04** | Orquestrador Limpo | 2 | 10 | 2 |
| **F05** | Homologação + UAT + Go-Live | 3 | 16 | 3 |
| | **TOTAL** | **18** | **110** | **14** |

---

## ?? Top 5 Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|:---:|:---:|-----------|
| 1 | Regressão funcional | ?? Média | ?? Alto | Testes utPLSQL + comparação produção |
| 2 | Performance do JOB | ?? Baixa | ?? Alto | Benchmark antes/depois cada fase |
| 3 | Dependência pr_cad_empresa_prov | ?? Média | ?? Médio | ACL = interface estável |
| 4 | Commits intermediários | ?? Média | ?? Médio | SAVEPOINT gradual |
| 5 | Resistência do time | ?? Baixa | ?? Médio | Quick wins primeiro (ROI visível) |

---

## ?? Fase 4 — Visão Futura (Cloud-Native Microsoft)

| Camada | Tecnologia |
|--------|-----------|
| **Orquestração** | Azure Durable Functions (Saga) |
| **Workers** | ASP.NET Core 8 Background Services |
| **Mensageria** | Azure Service Bus (Topics) |
| **Hosting** | Azure Container Apps |
| **Banco** | Azure SQL + Oracle (transição) |
| **Observabilidade** | Application Insights + Azure Monitor |
| **CI/CD** | Azure DevOps Pipelines |
| **IaC** | Bicep |

> A refatoração PL/SQL (Fases 1-3) é **pré-requisito** para a migração cloud.
> Packages isolados = domínios prontos para virar microsserviços.

---

## ? Próximos Passos

1. **Sprint 1 (Semanas 1-2):**
   - US-01.01 — pk_log_baixa_pim (~40 linhas)
   - US-01.02 — pk_pendencia_pim (~250 linhas)

2. **Sprint 2 (Semanas 3-4):**
   - US-01.03 — Record Type para contexto
   - US-01.04 — Coleção de controles saúde?odonto

3. **Checkpoint:** Validar que o JOB roda identicamente com Quick Wins

4. **Sprint 3+ :** Extração dos packages Supporting/Core

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a5276 -->
<!-- _color: #ffffff -->

# Obrigado!

## Perguntas?

?? Documentação completa: `docs/refatoracao/pr_efetiva_internet/`
?? Diagramas C4: `c4-model/svg/`
?? Backlog: `BACKLOG-EPICO-FEATURES-USERSTORIES-PLSQL.md`

**Thiago RC** — Fevereiro 2026
