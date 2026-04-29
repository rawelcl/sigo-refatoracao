# Roadmap de Refatoracao DDD -- pr_efetiva_internet

> **[OK 24/04/2026 -- Localizacao]** Arquivo realocado para `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/README-refatoracao.md` conforme Estrutura Canonica do projeto (CLAUDE.md). Na raiz da rotina permanece apenas `README-rotina.md`.
>
> **[REF]** Decisoes canonicas referenciadas neste roadmap:
> - [REF DD-01 -- `_shared/base-conhecimento/decisoes-design.md`] Contrato canonico de `pr_cadastramento_empresa_prov` (Opcao D Hibrida: Adapter/Facade + RECORD `pk_efetivacao_types.t_resultado_efetivacao` na Fase 3).
> - [REF DD-05] VJ (PK_VENDA_JSON) totalmente desacoplado do EI -- scheduler proprio.
> - [REF MIG-16 em `ddd-modelagem-dominio.md` Secao 13] Bloco BITIX do EI (DS13a + AG07 + R12 + RN30 + SP11 clausula BITIX) e `[REMOVER-NO-TO-BE]` -- migra para o VJ.
> - [REF `_shared/analise-comparativa-ddd-ei-vj.md`] Conflitos 1..10, em especial 3, 5 e 10.
> - [REF `rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/`] Modelagem canonica em execucao para o contrato de retorno.

## Visao Geral

| Métrica | Valor |
|---------|-------|
| **Linhas atuais** | ~2.290 |
| **Bounded Contexts** | 14 |
| **Tabelas afetadas (escrita)** | 14 |
| **Tabelas afetadas (leitura)** | 25+ |
| **Procedures externas chamadas** | 17 |
| **Fases de processamento** | 9 (sequenciais) |
| **Tipos de pendência** | 13 |
| **Blocos WHEN OTHERS THEN NULL** | 50+ |
| **Variáveis globais** | ~25 |
| **Duplicacao Saude/Odonto** | ~40% do codigo |

> **Nota:** A `pr_efetiva_internet` é um **JOB orquestrador** que roda periodicamente
> para efetivação automática de movimentações PIM (Portal Internet de Movimentação).
> Ela NÃO cria a empresa conveniada diretamente — delega para `pr_cadastramento_empresa_prov`
> (empresa) e `pr_cadastramento_internet2` (beneficiários). Processa 9 tipos diferentes de
> movimentação em sequência: carga PIM por modelo, propostas novas, odonto puro, inclusões,
> processamento completo, individuais, obrigação odonto, coligadas BITIX e coligadas SIGO.

---

## Fase 1 -- Quick Wins (PL/SQL -- Sem mudanca de arquitetura)

### 1.1 Extrair Motor de Pendências para Package
**Impacto: Elimina ~500 linhas de loops stp1..stp13 duplicados**

```sql
-- ANTES (repetido para cada cd_pendencia, saúde E odonto):
for stp1 in (select * from tb_tp_pend_empresa_internet
              where cd_pendencia = 1 and fl_status = 1) loop
  IF L_NOME_INV > 0 THEN
    COUNT_PENDENCIAS := 1;
    INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (...) VALUES (...);
    if l_empresa_odon.nu_controle is not null then
      INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (...) VALUES (...);
    end if;
  END IF;
end loop;

-- DEPOIS (1 linha):
pk_pendencia_pim.pr_avaliar_pendencia(
    p_cd_pendencia => 1,
    p_condicao     => l_nome_inv > 0,
    p_nu_controle  => st_e.nu_controle,
    p_nu_ctrl_odon => l_empresa_odon.nu_controle
);
```

### 1.2 Extrair Log de Baixa para Package
**Impacto: Elimina ~120 linhas de blocos repetidos de INSERT em tb_log_baixa_controle**

```sql
-- ANTES (repetido ~10 vezes):
begin
  select max(nvl(cb.cd_log,0))+1 into wcd_log from humaster.tb_log_baixa_controle cb;
  insert into humaster.tb_log_baixa_controle(cd_log, nu_controle, ds_observacao, fl_status)
  values(wcd_log, st_e.nu_controle, 'mensagem', '0');
  commit;
exception when others then null;
end;

-- DEPOIS (1 linha):
pk_log_baixa_pim.pr_registra(st_e.nu_controle, 'mensagem', '0');
```

### 1.3 Encapsular Contexto em Record Type
**Impacto: Elimina ~25 variáveis globais e reset manual**

```sql
-- ANTES (25 variáveis declaradas individualmente + reset):
l_aux_dep := 0; l_aux_dep_sob := 0; l_aux_tit := 0;
l_qtd_vidas := 0; p_return := null; ...

-- DEPOIS:
TYPE t_ctx_efetivacao IS RECORD (
    aux_dep      NUMBER, aux_dep_sob NUMBER, aux_tit NUMBER,
    qtd_vidas    NUMBER, return_msg  VARCHAR2(32767), ...
);
v_ctx t_ctx_efetivacao := pk_efetiva_internet.fn_ctx_novo();
```

### 1.4 Unificar Duplicacao Saude/Odonto
**Impacto: Elimina ~40% de código duplicado**

Abstrair operações que são espelhadas entre saúde e odonto em um loop sobre uma coleção de controles:

```sql
-- ANTES: cada operação repetida com IF l_empresa_odon.nu_controle IS NOT NULL
-- DEPOIS:
TYPE t_controles IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
v_controles t_controles;
v_controles(1) := st_e.nu_controle;
IF l_empresa_odon.nu_controle IS NOT NULL THEN
    v_controles(2) := l_empresa_odon.nu_controle;
END IF;
FOR i IN 1..v_controles.COUNT LOOP
    pk_pendencia_pim.pr_inserir(v_controles(i), cd_pendencia, ...);
END LOOP;
```

---

## Fase 2 -- Extracao de Packages por Bounded Context

### Prioridade de extracao (por risco e complexidade):

| # | Package | BC | Linhas estimadas | Risco | Prioridade |
|---|---------|----|-----------------:|-------|-----------|
| 1 | `pk_log_baixa_pim` | BC-EI-08 | ~40 | Baixo | P0 |
| 2 | `pk_pendencia_pim` | BC-EI-02 | ~250 | Medio | P0 |
| 3 | `pk_critica_pim` | BC-EI-03 | ~100 | Medio | P1 |
| 4 | `pk_config_sistema_pim` | BC-EI-09 | ~30 | Baixo | P1 |
| 5 | `pk_status_pim` | BC-EI-07 | ~80 | Medio | P1 |
| 6 | `pk_efetivacao_empresa_pim` | BC-EI-04 | ~120 | Alto | P2 |
| 7 | `pk_efetivacao_odonto_pim` | BC-EI-05 | ~80 | Alto | P2 |
| 8 | `pk_baixa_beneficiario` | BC-EI-06 | ~300 | Alto | P2 |
| 9 | `pk_integracao_externa_pim` | BC-EI-10 | ~50 | Baixo | P3 |
| 10 | `pk_carga_modelo_pim` | BC-EI-11 | ~100 | Medio | P3 |
| 11 | `pk_individual_pim` | BC-EI-12 | ~80 | Medio | P3 |
| 12 | `pk_odonto_puro_pim` | BC-EI-13 | ~80 | Medio | P3 |
| 13 | `pk_coligada_sigo_pim` | BC-EI-14 | ~15 | Baixo | P4 |
| 14 | `pk_efetiva_internet` | BC-EI-01 | ~150 | Alto | P5 (final) |

> **[REF MIG-16]** O package foi renomeado de `pk_coligada_pim` para `pk_coligada_sigo_pim` e tem escopo reduzido (~15 linhas). Toda logica BITIX do BC-EI-14 (PR_COLIGA_EMPRESA_BITIX + chamada PK_VENDA_JSON.pr_efetiva + flag `COLIGADA_EMPRESA_BITIX`) sai do EI e migra para o VJ. O pre-requisito do deploy do EI refatorado e a criacao previa do DBMS_JOB/DBMS_SCHEDULER para `PK_VENDA_JSON.pr_efetiva` (A9 em `pendencias-abertas.md`). [REF DD-05]

### Estrutura alvo de cada package:
```
pk_<nome>/
  pk_<nome>.pks          -- Especificacao (interface publica)
  pk_<nome>.pkb          -- Body (implementacao)
  test_pk_<nome>.sql     -- Testes unitarios
```

---

## Fase 3 -- Procedure Refatorada (Orquestrador Limpo)

Após extração de todos os packages, a procedure principal ficará assim:

```sql
CREATE OR REPLACE PROCEDURE humaster.pr_efetiva_internet AS
    v_cfg pk_config_sistema_pim.t_config;
BEGIN
    -- 1. Carregar configurações do sistema
    v_cfg := pk_config_sistema_pim.fn_carregar();

    -- 2. Carga automática PIM por modelo (?29 vidas com template)
    pk_carga_modelo_pim.pr_processar(v_cfg);

    -- 3. Loop principal PIM (propostas novas/pendentes 1-29 vidas)
    FOR st_e IN pk_efetiva_internet.cr_propostas_pim(v_cfg) LOOP
        DECLARE
            v_ctx pk_efetiva_internet.t_ctx_efetivacao;
        BEGIN
            -- 3a. Inicializar contexto
            v_ctx := pk_efetiva_internet.fn_ctx_novo(st_e, v_cfg);

            -- 3b. Avaliar pendências (13 tipos)
            pk_pendencia_pim.pr_avaliar_todas(st_e, v_ctx);

            -- 3c. Efetivar se sem pendências
            IF v_ctx.count_pendencias = 0 THEN
                -- Críticas de beneficiários
                pk_critica_pim.pr_executar_criticas(st_e, v_ctx);

                IF v_ctx.qt_critica_sd = 0 THEN
                    -- Efetivar empresa (saúde + odonto)
                    pk_efetivacao_empresa_pim.pr_efetivar(st_e, v_ctx);
                    pk_efetivacao_odonto_pim.pr_efetivar(st_e, v_ctx);

                    -- Atualizar staging e migrar códigos
                    pk_status_pim.pr_atualizar_staging(st_e, v_ctx);

                    -- Baixar beneficiários
                    pk_baixa_beneficiario.pr_autorizar_e_efetivar(st_e, v_ctx);

                    -- Verificar não-efetivados
                    pk_status_pim.pr_verificar_nao_efetivados(v_ctx);
                END IF;
            END IF;

            -- 3d. Log de finalização
            pk_log_baixa_pim.pr_finalizar(st_e, v_ctx);

        EXCEPTION
            WHEN OTHERS THEN
                pk_log_baixa_pim.pr_registra(
                    st_e.nu_controle,
                    SQLERRM,
                    '10'
                );
        END;
    END LOOP;

    -- 4. Odonto puro (sem saúde)
    pk_odonto_puro_pim.pr_processar(v_cfg);

    -- 5. Inclusão em empresa existente (cd_tipo_internet = 2)
    pk_baixa_beneficiario.pr_processar_inclusoes(v_cfg);

    -- 6. Processamento completo (cd_tipo_internet = 1)
    pk_baixa_beneficiario.pr_processar_completo(v_cfg);

    -- 7. Individual / Familiar
    pk_individual_pim.pr_processar(v_cfg);

    -- 8. Obrigação agregado odonto
    pr_odon_obrigacao_agregado;

    -- 9. Coligadas SIGO (sem BITIX -- [REF MIG-16])
    pk_coligada_sigo_pim.pr_processar(v_cfg);

    COMMIT;

END pr_efetiva_internet;
```

> **[REF DD-01 -- Contrato canonico de pr_cadastramento_empresa_prov]** A chamada dentro de `pk_efetivacao_empresa_pim.pr_efetivar` segue a Opcao D Hibrida: enquanto a Fase 3 canonica de `pr_cadastramento_empresa_prov` nao entrar em producao, o EI continua consumindo a assinatura legado `(p_nu_controle IN, p_erro_controle OUT VARCHAR2)` com parsing via ACL02. Quando a Fase 3 canonica for liberada (nova assinatura com `OUT pk_efetivacao_types.t_resultado_efetivacao`), `pk_efetivacao_empresa_pim` migra para acesso por campo (`v_res.cd_empresa`, `v_res.fl_status`, `v_res.ds_etapa_erro`) e o ACL02 e descontinuado -- **sem breaking change** (a procedure antiga permanece como Adapter/Facade). [REF MIG-09 -- Secao 13 do DDD] [REF `rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/`]

---

## Fase 4 -- Modernizacao (Stack Microsoft / Azure Cloud-Native)

### Stack de Tecnologia

| Camada | Tecnologia Microsoft |
|--------|---------------------|
| **Orquestração (Saga)** | Azure Durable Functions |
| **Workers** | ASP.NET Core 8 Background Services |
| **Mensageria** | Azure Service Bus (Topics + Subscriptions) |
| **Hosting** | Azure Container Apps |
| **Banco de Dados** | Azure SQL Database + Oracle (transição) |
| **Observabilidade** | Azure Application Insights + Azure Monitor |
| **CI/CD** | Azure DevOps Pipelines |
| **IaC** | Bicep |

### Microsservicos sugeridos (decomposicao das 8 fases -- BITIX removido, [REF MIG-16]):

```
+-----------------------------------------------------------------+
|          Azure Durable Functions (Orquestrador)                 |
|          +--------------------------------------------+         |
|          |  1. CargaModeloActivity                    |         |
|          |  2. EfetivacaoPIMActivity (fan-out/fan-in) |         |
|          |  3. OdontoPuroActivity                     |         |
|          |  4. InclusaoActivity                       |         |
|          |  5. ProcessamentoCompletoActivity          |         |
|          |  6. IndividualActivity                     |         |
|          |  7. OdontoAgregadoActivity                 |         |
|          |  8. ColigadaSigoActivity                   |         |
|          +--------------------------------------------+         |
+-----------------------------------------------------------------+
              |                                   |
    Azure Service Bus                  Azure Application Insights
    (Topics + Subscriptions)           (Distributed Tracing)
```

> **[REF MIG-16]** A `ColigadaBitixActivity` foi removida do inventario de microsservicos do EI. Toda a logica BITIX passa a ser responsabilidade do microsservico derivado do VJ (`Hapvida.Insurance.VendaJson.*`), acionado por seu proprio scheduler (Azure Function Timer Trigger). Ver `rotinas/pk_venda_json/rev-PRODUCAO-20260402/02-ddd/ddd-modelagem-dominio.md`.

### Eventos de dominio (Azure Service Bus Topics) -- [REF ADR-18]

> Topicos no padrao `hap-ins-pim-<evento>` (kebab-case, EN, passado). Payload em camelCase EN. Espelha a Secao 5 do `ddd-modelagem-dominio.md` (DE01..DE14).

- `hap-ins-pim-proposal-selected` -- `ProposalSelectedEvent` (DE01)
- `hap-ins-pim-validations-assessed` -- `ValidationsAssessedEvent` (DE02)
- `hap-ins-pim-proposal-cleared` -- `ProposalClearedEvent` (DE03)
- `hap-ins-pim-beneficiary-critiques-run` -- `BeneficiaryCritiquesRunEvent` (DE04)
- `hap-ins-pim-company-created` -- `CompanyCreatedEvent` (DE05)
- `hap-ins-pim-company-creation-failed` -- `CompanyCreationFailedEvent` (DE06)
- `hap-ins-pim-dental-company-created` -- `DentalCompanyCreatedEvent` (DE07)
- `hap-ins-pim-provisional-code-migrated` -- `ProvisionalCodeMigratedEvent` (DE08)
- `hap-ins-pim-beneficiary-effected` -- `BeneficiaryEffectedEvent` (DE09)
- `hap-ins-pim-beneficiary-failed` -- `BeneficiaryFailedEvent` (DE10)
- `hap-ins-pim-beneficiaries-not-effected` -- `BeneficiariesNotEffectedEvent` (DE11)
- `hap-ins-pim-company-status-reverted` -- `CompanyStatusRevertedEvent` (DE12)
- `hap-ins-pim-log-registered` -- `LogRegisteredEvent` (DE13)
- `hap-ins-pim-effection-completed` -- `EffectionCompletedEvent` (DE14)

> **Broker por evento:** DE05, DE06, DE08, DE09 (mudancas de estado criticas) -- Azure Service Bus (mensagens nao podem ser perdidas). DE13 (log) -- RabbitMQ aceito. Demais -- Service Bus por default.

---

## Arquivos Criados

| Arquivo | Descricao |
|---------|-----------|
| `ddd-modelagem-dominio.md` | Modelagem DDD completa (14 BCs, Aggregates, Entities, VOs, Services, Events) |
| `README-refatoracao.md` | Este documento (roadmap) |
| `BACKLOG-EPICO-FEATURES-USERSTORIES-PLSQL.md` | Backlog PL/SQL com epico, features e user stories |
| `context-map-efetiva-internet.puml` | Context Map visual (PlantUML) |
| `fluxo-execucao-efetiva-internet.puml` | Fluxo de execucao sequencial (PlantUML) |

### Diagramas C4 Model (`c4-model/`)

| Arquivo | Nivel C4 | Descricao |
|---------|----------|-----------|
| `c4-1-system-context.puml` | **Nivel 1 - Contexto** | Visao geral do JOB e atores/sistemas externos |
| `c4-2-container-as-is.puml` | **Nivel 2 - Container (AS-IS)** | Arquitetura atual: procedure monolitica |
| `c4-2-container-to-be.puml` | **Nivel 2 - Container (TO-BE Fase 2)** | Arquitetura alvo: packages PL/SQL |
| `c4-3-component-orquestrador.puml` | **Nivel 3 - Componente** | Detalhamento do orquestrador + todos os packages |

### Como visualizar os diagramas:
1. Instalar extensao **PlantUML** no VS Code
2. Abrir arquivo `.puml` -- `Alt+D` para preview
3. Ou usar https://www.plantuml.com/plantuml/uml/ (online)
4. Ou usar https://www.planttext.com/ (preview em tempo real)

---

## Riscos Identificados

1. **50+ blocos WHEN OTHERS THEN NULL**: Erros engolidos silenciosamente. Muitos problemas em producao sao invisiveis. [REF PADRAO-01 -- `_shared/base-conhecimento/padroes-identificados.md`]
2. **Duplicacao Saude/Odonto (~40%)**: Cada correcao precisa ser aplicada em dois lugares. Alto risco de regressao. [REF MIG-10]
3. **Commits intermediarios**: A procedure faz COMMIT dentro de loops, impedindo rollback completo. Uma falha parcial deixa dados inconsistentes. [REF MIG-05]
4. **Dependencia forte de pr_cadastramento_empresa_prov -- MITIGADA [24/04/2026]**: Antes era um risco bloqueante (parsing fragil via substr/instr sobre VARCHAR2 + acoplamento de assinatura). **Mitigado** pela adocao da Opcao D Hibrida em DD-01: a Fase 1-2 da refatoracao de `pr_cadastramento_empresa_prov` preserva a assinatura legado (zero breaking change no EI); a Fase 3 introduz o RECORD canonico `pk_efetivacao_types.t_resultado_efetivacao` e a procedure antiga permanece como Adapter/Facade. O EI e `pr_cadastramento_empresa_prov` podem evoluir em ondas independentes. **Risco residual:** o ACL02 (parsing fragil) continua ativo no EI enquanto a Fase 3 canonica nao entrar em producao. [REF DD-01] [REF MIG-09] [REF `rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/`]
5. **25 variaveis globais com reset manual**: Esquecer de resetar uma variavel causa comportamento incorreto na proxima iteracao do loop. [REF MIG-15]
6. **Migracao codigo provisorio -> definitivo**: Multiplos updates separados por commits. Falha entre eles deixa titulares com codigo provisorio e dependentes com definitivo (ou vice-versa). [REF DE08]
7. **JOB sem idempotencia**: Se o JOB falhar e re-executar, pode reprocessar propostas parcialmente efetivadas.
8. **Logica condicional profunda**: IF-ELSE aninhados com >6 niveis em varios pontos, dificultando rastreamento do fluxo.
9. **Queries com SELECT COUNT(*) sem indice explicito**: Podem causar full table scan em tabelas grandes (tb_usuario_titular_internet, tb_usuario_dependente_internet).
10. **Sequencia manual cd_log (MAX+1)**: Race condition em execucao paralela. Deveria usar SEQUENCE. [REF MIG-06 e PADRAO-03]
11. **Acoplamento de ciclo de vida EI->VJ (AS-IS) -- MITIGADO NO TO-BE [24/04/2026]**: No AS-IS o EI e o unico acionador do VJ via `PK_VENDA_JSON.pr_efetiva`, condicionado a `COLIGADA_EMPRESA_BITIX=1`. No TO-BE o bloco inteiro e REMOVIDO do EI e o VJ passa a ter scheduler proprio. **Pre-requisito de deploy:** criar o DBMS_JOB/DBMS_SCHEDULER para `PK_VENDA_JSON.pr_efetiva` **antes** do deploy do EI refatorado (A9). [REF DD-05] [REF MIG-16] [REF Conflito 10 -- `_shared/analise-comparativa-ddd-ei-vj.md`]
