# Codigo Refatorado: PK_VENDA_JSON

**Schema:** HUMASTER
**Baseado em:** reversa-pk-venda-json.md (rev-PRODUCAO-20260402)
**DDD:** ddd-modelagem-dominio.md (rev-PRODUCAO-20260402)
**Data:** 22/04/2026
**Etapa:** 5 -- Geracao de Codigo Inicial Refatorado (Agente DDD)

**Artefatos de referencia:**
- `01-engenharia-reversa/reversa-pk-venda-json.md`
- `02-ddd/ddd-modelagem-dominio.md`
- `03-c4-model/src/c4-2-container-to-be.puml`
- `04-fluxos/src/fluxo-pk-venda-json-to-be.puml`

---

## Arquivos Gerados

| Arquivo | Conteudo |
|---|---|
| `pk_venda_json_const.sql` | Package de constantes -- elimina valores magicos e hardcodes |
| `pk_venda_json.pks` | Package spec refatorada -- sem variaveis globais, tipos tipados |
| `pk_venda_json.pkb` | Package body refatorado -- CQRS, core privado, log estruturado |
| `README-refact.md` | Este arquivo |

---

## Decisoes Aplicadas

| # | Decisao | Artefato de Origem | Trecho no Codigo |
|---|---|---|---|
| DD01 | Separar ACL de efetivacao | DDD Sec 11 / [REF ADR-05] | pr_pim_insere_cnpj isolado da logica de efetivacao via delegacao |
| DD02 | Contrato tipado OUT (parcial) | DDD Sec 11 / S03 | t_resultado_empresa na spec; fn_extrair_cd_empresa encapsula parsing fragil |
| DD03 | Eliminar 15 variaveis globais | DDD Sec 11 / S04 | Variaveis locais em pr_pim_insere_cnpj; t_contexto_efetivacao como TYPE |
| DD04 | CQRS: query separada de command | DDD Sec 11 / [REF ADR-03] | fn_motor_criticas_query (puro) + pr_aplicar_status_erro_command (escrita) |
| DD05 | Consolidar codigo triplicado | DDD Sec 11 / S02+S07 | pr_efetiva_core privado -- 3 rotinas delegam para este nucleo |
| DD06 | Log estruturado substitui NULL silencioso | Eng. Rev. Sec 7 / S01 | pr_log_erro chamado em todos os EXCEPTION handlers |
| DD07 | Constantes substituem hardcodes | DDD Sec 11 / S08+A06+A08 | pk_venda_json_const: COD_OPERADORA_BITIX, COD_EMPRESA_PAI_MIDDLE_SEM_CONTA, etc. |

---

## Rastreabilidade RN -> Codigo

| RN | Descricao Resumida | Arquivo | Procedure/Function |
|---|---|---|---|
| RN01 | fn_registro_sistema controla fluxo de batch | pk_venda_json.pkb | pr_efetiva (selecao de fluxo legado vs avancado) |
| RN02 | FL_STATUS = 6 para elegibilidade | pk_venda_json.pkb | fn_spec_proposta_elegivel |
| RN03 | Grupo coligado completo antes de efetivar | pk_venda_json.pkb | fn_spec_grupo_coligado_completo / fn_grupo_coligado_apto |
| RN04 | Motor de criticas 3 modos (N/E/S) | pk_venda_json.pkb | fn_motor_criticas_query (CQRS Query) |
| RN05 | Retorno fragil de pr_cadastramento_empresa_prov | pk_venda_json.pkb | fn_extrair_cd_empresa (encapsula S03) |
| RN06 | Loop titulares: critica + efetivacao individual | pk_venda_json.pkb | pr_efetivar_beneficiarios |
| RN07 | Status final 7 (PRE/POS ressalva) ou 10 (POS limpo) | pk_venda_json.pkb | pr_decidir_status_final |
| RN08 | Auto-baixa POS no ato da integracao | pk_venda_json.pkb | fn_spec_auto_baixa_pos_elegivel / pr_pim_insere_cnpj |
| RN09 | Idempotencia de integracao por status | pk_venda_json.pkb | fn_verificar_idempotencia |
| RN10 | Mapeamento 1:1 controle saude-odonto | pk_venda_json.pkb | pr_control_internet / pr_set_usuario_od |
| RN11 | Middle 30-99 sem conta conjunta: cobranca separada | pk_venda_json.pkb | pr_efetiva_core (v_empresa_saude_pai / v_empresa_cobranca) |
| RN12 | Coligada POS registra fluxo 7 | pk_venda_json.pkb | pr_pim_insere_cnpj (bloco de coligada POS) |
| RN13 | Blocklist BITIX impede auto-baixa | pk_venda_json.pkb | fn_get_blocklist_emp / fn_spec_auto_baixa_pos_elegivel |
| RN14 | Pendencia Neoway (status 17) impede auto-baixa | pk_venda_json.pkb | fn_get_pend_neoway / fn_spec_auto_baixa_pos_elegivel |
| RN15 | Replicacao automatica staging saude -> odonto | pk_venda_json.pkb | pr_pim_insere_cnpj (insercao TB_ODON_EMPRESA_INTERNET) -- [PENDENTE detalhamento] |
| RN16 | Contagem de beneficiarios vs JSON deve coincidir | pk_venda_json.pkb | pr_pim_insere_cnpj (validacao v_count_benef_fim vs v_total_benef) |

---

## Smells Eliminados vs Encapsulados

| Smell | Descricao | Status | Solucao |
|---|---|---|---|
| S01 | WHEN OTHERS THEN NULL silencioso | [OK] Eliminado | pr_log_erro em todos os handlers |
| S02 | Codigo triplicado nas 3 rotinas de efetivacao | [OK] Eliminado | pr_efetiva_core privado consolida a logica |
| S03 | Parsing fragil de w_erro (substr/instr) | [EM-CURSO] Encapsulado | fn_extrair_cd_empresa centraliza o parsing ate refatoracao de pr_cadastramento_empresa_prov |
| S04 | 15 variaveis globais de package | [OK] Eliminado | Variaveis locais; t_contexto_efetivacao como TYPE |
| S05 | Cursor N+1 no loop de titulares | [-] Pendente | Mantido por ora; otimizacao futura com BULK COLLECT |
| S06 | COMMIT dentro de sub-rotinas | [OK] Eliminado | COMMITs centralizados nos pontos de controle transacional |
| S07 | Logica PRE/POS triplicada | [OK] Eliminado | pr_decidir_status_final extrai e centraliza a logica |
| S08 | Valores hardcode de origem/operadora | [OK] Eliminado | PK_VENDA_JSON_CONST: COD_ORIGEM_*, COD_OPERADORA_BITIX |
| S09 | Convencao fragil de cd_empresa ('T'||nu_controle) | [OK] Encapsulado | PREFIXO_EMP_PROVISORIO constante (rastreavel) |
| S10 | JSON_VALUE re-executado multiplas vezes | [OK] Eliminado | v_fl_commit = JSON_VALUE cacheado no inicio |
| S11 | wfl_commit como variavel de package | [OK] Eliminado | v_fl_commit como variavel local em pr_pim_insere_cnpj |
| S12 | fn_get_criticas_pendencias com efeito colateral de UPDATE | [OK] Eliminado | CQRS: fn_motor_criticas_query (pura) + pr_aplicar_status_erro_command |

---

## Pontos de Atencao para Migracao (Fase 3)

| ID | Trecho | Motivo | Equivalente .NET 8 / Azure |
|---|---|---|---|
| MIG01 | Cursor FOR loop em pr_efetiva (loop batch) | Batch Oracle sem paralelismo nativo | Azure Functions Timer Trigger + Azure Service Bus eventos por proposta |
| MIG02 | Cursor FOR loop em pr_efetivar_beneficiarios (N+1) | N+1 queries por titular | IAsyncEnumerable<T> + EF Core batch + streaming |
| MIG03 | Sequences Oracle (SQ_EMPRESA_INTERNET, SQ_CONTROLE_INTERNET) | Geracao de ID acoplada ao banco Oracle | UUIDs v4 ou Azure SQL SEQUENCE/IDENTITY independente |
| MIG04 | TP_JSON / TP_JSON_LIST (objetos Oracle proprietarios) | Parse JSON Oracle-especifico sem equivalente direto | System.Text.Json + record types tipados em .NET 8 |
| MIG05 | r_json OUT CLOB (retorno JSON livre ao BITIX) | Contrato fragil sem schema definido | DTO tipado com OpenAPI schema + validacao |
| MIG06 | DBMS_OUTPUT para log | Logging Oracle nao persistente fora do contexto | ILogger<T> + Azure Application Insights (traces e metrics) |
| MIG07 | CTE WITH QTD_COLIGADA (fluxo avancado pr_efetiva) | SQL Oracle complexo sem equivalente ORM direto | LINQ com GroupBy + sub-query em EF Core ou Dapper |
| MIG08 | DBMS_LOB.CREATETEMPORARY | Gerenciamento manual de LOB Oracle | String/Stream nativo em .NET 8 |
| MIG09 | fn_registro_sistema (flags de sistema) | Configuracao acoplada ao banco | Azure App Configuration + IOptions<T> |
| MIG10 | pr_set_emp_fluxo_pos / fn_get_emp_fluxo_pos | Controle de fluxo POS via tabela de rastreamento | Estado gerenciado no microsservico com Azure Cosmos DB ou Redis |

---

## Pendencias de Implementacao

- [ ] **DD02-PENDENTE**: refatorar pr_cadastramento_empresa_prov para expor `p_cd_empresa OUT VARCHAR2, p_status OUT NUMBER` e eliminar definitivamente o parsing via fn_extrair_cd_empresa.
- [ ] **S05-PENDENTE**: otimizar pr_efetivar_beneficiarios para eliminar o cursor N+1. Usar BULK COLLECT + avaliacao em memoria antes do loop.
- [ ] **fn_set_empresa_internet**: implementar mapeamento campo a campo do JSON BITIX para TB_EMPRESA_INTERNET%ROWTYPE (~50+ campos). Ver legado linhas 4344-4636.
- [ ] **pr_set_usuario_internet**: implementar mapeamento completo de beneficiarios JSON -> staging (~1522 linhas no legado). Converter G_TOTAL_BENEFICIARIO e G_COUNT_BENEFIIFIM de globais para OUT parameters.
- [ ] **pr_set_usuario_od**: implementar mapeamento completo de beneficiarios odonto (~1026 linhas no legado).
- [ ] **pr_pim_insere_cnpj**: implementar bloco completo de insercao em TB_EMPRESA_INTERNET, TB_ODON_EMPRESA_INTERNET e replicacao saude->odonto (RN15).
- [ ] **A04**: confirmar com PO/DBA o valor atual de PK_VENDA_JSON_PR_EFETIVA_01 em producao para determinar qual fluxo de batch esta ativo.
- [ ] **A05**: confirmar com PO se ha outros canais/operadores alem do BITIX usando pr_pim_insere_cnpj.
- [ ] **pr_log_erro**: integrar com pkg_log corporativo (ou equivalente) quando disponivel; substituir DBMS_OUTPUT.
- [ ] **Sub-rotinas nao catalogadas**: eng. reversa necessaria para FN_VALIDA_COLIGADA, PR_VALIDA_BAIXA_COLIGADA_BITIX, pr_cadastramento_empresa_baixa, pr_critica_internet_odonto antes de completar a implementacao.
- [ ] **TB_PENDENCIA_EMPRESA**: confirmar nome correto da tabela de pendencias POS de empresa (legado usa dois nomes distintos em contextos diferentes).

---

## Ordem de Implantacao Recomendada

1. `pk_venda_json_const.sql` -- sem dependencias; implantar primeiro
2. `pk_venda_json.pks` -- spec; implantar antes do body
3. `pk_venda_json.pkb` -- body completo apos spec

[ATENCAO] O body atual compila com stubs em pr_set_usuario_internet, fn_set_empresa_internet e pr_set_usuario_od. A implantacao em producao requer a conclusao dessas implementacoes (ver pendencias acima).

---

## Status por Bounded Context

| BC | Nome | Status Refat. |
|---|---|---|
| BC-VJ-01 | Recepcao de Proposta BITIX (ACL) | [EM-CURSO] -- pr_pim_insere_cnpj estruturada; desserializacao pendente |
| BC-VJ-02 | Validacao e Critica BITIX | [OK] -- CQRS implementado; specs implementadas |
| BC-VJ-03 | Efetivacao Empresa BITIX | [OK] -- pr_efetiva_core implementado; depende de DD02 |
| BC-VJ-04 | Efetivacao Beneficiarios BITIX | [OK] -- pr_efetivar_beneficiarios implementado; N+1 pendente |
| BC-VJ-05 | Gestao de Status Final | [OK] -- pr_decidir_status_final implementado |
| BC-VJ-06 | Grupo Coligado BITIX | [OK] -- fn_grupo_coligado_apto implementado |
| BC-VJ-07 | Mapeamento Saude-Odonto | [EM-CURSO] -- pr_control_internet ok; pr_set_usuario_od parcial |
| BC-VJ-08 | Auto-baixa POS | [OK] -- fn_spec_auto_baixa_pos_elegivel implementado |
| BC-VJ-09 | Configuracao de Sistema | [OK] -- via constantes; delegacao a fn_registro_sistema |
| BC-VJ-10 | Integracao Odonto | [EM-CURSO] -- pendente implementacao de pr_set_usuario_od completo |
