# Backlog — Refatoração DDD: pr_efetiva_internet (PL/SQL)

> **Produto:** SIGO Health — Efetivação Automática PIM  
> **Épico:** Refatoração PL/SQL do Orquestrador de Efetivação Internet  
> **Procedure legada:** `humaster.pr_efetiva_internet` (~2.290 linhas PL/SQL)  
> **Estratégia:** Strangler Fig Pattern (3 fases de refatoração + 1 fase de go-live)  
> **Data de criação:** 2025-07  
> **Referências:** `ddd-modelagem-dominio.md`, `README-refatoracao.md`

---

## Sumário

1. [Épico](#epico)
2. [Feature 01 — Fundação e Quick Wins PL/SQL](#feature-01)
3. [Feature 02 — Extração de Packages Supporting/Generic](#feature-02)
4. [Feature 03 — Extração de Packages Core Domain](#feature-03)
5. [Feature 04 — Orquestrador Limpo (Procedure Refatorada)](#feature-04)
6. [Feature 05 — Homologação, UAT e Go-Live](#feature-05)
7. [Visão Geral do Backlog (Roadmap)](#roadmap)
8. [Critérios de Priorização](#priorizacao)
9. [Definition of Ready / Definition of Done](#dor-dod)

---

<a id="epico"></a>
## ?? ÉPICO

### EP-01: Refatoração PL/SQL do Orquestrador de Efetivação PIM

| Campo | Valor |
|-------|-------|
| **Título** | Refatorar a procedure `pr_efetiva_internet` utilizando DDD e decomposição em packages PL/SQL |
| **Objetivo de Negócio** | Reduzir o risco operacional do JOB de efetivação automática PIM, eliminar duplicação saúde?odonto (~40%), melhorar rastreabilidade de erros e criar base testável |
| **Valor Entregue** | • Redução de 60% no tempo de diagnóstico de falhas no PIM<br>• Eliminação de ~500 linhas de loops de pendência duplicados<br>• Eliminação de ~120 linhas de log duplicado<br>• Eliminação de 50+ blocos WHEN OTHERS THEN NULL<br>• Testabilidade unitária (0% ? 70% coverage)<br>• Procedure principal de ~2.290 ? ~150 linhas<br>• Rastreabilidade completa via log centralizado |
| **KPIs** | • Tempo médio de diagnóstico PIM: de 2h ? 15min<br>• Incidentes no JOB PIM: reduzir 50%<br>• Coverage de testes PL/SQL: ? 70%<br>• Zero breaking changes (regressão funcional = 0)<br>• Disponibilidade do JOB: 99.5% |
| **Stakeholders** | PO Comercial, Tech Lead, Arquiteto, DBA, Equipe PIM |
| **Bounded Contexts** | 14 (BC-EI-01 a BC-EI-14) |
| **Aggregates** | 10 |
| **Procedures externas** | 17 |
| **Estratégia** | Strangler Fig Pattern — Fases incrementais sem big-bang |

**Hipótese de valor:**
> "Se decompormos o JOB monolítico de 2.290 linhas em packages PL/SQL isolados por bounded context (Fases 1-3) e realizarmos homologação rigorosa com cenários de regressão para cada uma das 9 fases de processamento (Fase 4), então reduziremos o risco operacional do PIM, aumentaremos a rastreabilidade de erros e permitiremos evolução segura."

---

<a id="feature-01"></a>
## ?? FEATURE 01 — Fundação e Quick Wins (PL/SQL)

> **Fase:** 1 — Quick Wins  
> **Prioridade:** P0 (Primeiras semanas)  
> **Risco:** ?? Baixo  
> **Impacto:** Elimina ~620 linhas de código duplicado, encapsula estado, centraliza log

### US-01.01 — Extrair log de baixa para package pk_log_baixa_pim

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor/DBA |
| **Quero** | que os ~10 blocos de log repetidos (INSERT em tb_log_baixa_controle com MAX+1) sejam substituídos por chamadas a `pk_log_baixa_pim` |
| **Para que** | eu elimine ~120 linhas de boilerplate e centralize a lógica de auditoria do PIM |
| **BC** | BC-EI-08 (Auditoria e Log) |
| **Package alvo** | `pk_log_baixa_pim` (~40 linhas) |
| **Critérios de aceite** | <ul><li>Package `pk_log_baixa_pim` criado com spec + body</li><li>Procedure `pr_registra(p_nu_controle, p_observacao, p_status)` funcional</li><li>Procedure `pr_registra_critica(p_nu_controle, p_titular, p_dependente, p_empresa, p_critica)` funcional</li><li>Sequência manual MAX+1 substituída por Oracle SEQUENCE</li><li>Todos os blocos de INSERT em tb_log_baixa_controle substituídos</li><li>Testes: log com status 0, 5, 10; truncamento de ds_observacao a 1024</li></ul> |
| **Estimativa** | 2 pts |
| **Dependências** | Nenhuma |

---

### US-01.02 — Extrair motor de pendências para package pk_pendencia_pim

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que os 13 loops de avaliação de pendência (stp1..stp13) sejam extraídos para `pk_pendencia_pim` com Specifications |
| **Para que** | cada tipo de pendência seja avaliado por uma Specification testável e a duplicação saúde?odonto seja eliminada |
| **BC** | BC-EI-02 (Validação de Pendências) |
| **Package alvo** | `pk_pendencia_pim` (~250 linhas) |
| **Critérios de aceite** | <ul><li>Package `pk_pendencia_pim` criado com spec + body</li><li>Procedure `pr_avaliar_todas(p_st_e, p_ctx)` que orquestra os 13 tipos</li><li>Procedure `pr_limpar_pendencias(p_nu_controle)` para DELETE prévio</li><li>Function `fn_avaliar_nome_invalido(p_razao_social, p_fantasia)` RETURN BOOLEAN</li><li>Function `fn_avaliar_localidade(p_cidade)` RETURN BOOLEAN</li><li>Function `fn_avaliar_vendedor_filial(p_vendedor, p_filial_loc, p_vendedor_nac)` RETURN BOOLEAN</li><li>Function para cada tipo de pendência (1..13)</li><li>Espelhamento automático para odonto quando p_nu_ctrl_odon IS NOT NULL</li><li>Testes unitários para cada um dos 13 tipos de pendência</li></ul> |
| **Estimativa** | 8 pts |
| **Dependências** | US-01.01 |

---

### US-01.03 — Encapsular contexto de efetivação em Record Type

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que as ~25 variáveis globais sejam encapsuladas em um Record Type `t_ctx_efetivacao` com função factory de inicialização |
| **Para que** | o reset de variáveis entre iterações do loop seja automático e confiável, eliminando bugs por variável não-resetada |
| **BC** | BC-EI-01 (Orquestração) |
| **Critérios de aceite** | <ul><li>TYPE `t_ctx_efetivacao` definido com todos os campos necessários</li><li>Function `fn_ctx_novo()` que retorna record inicializado</li><li>Substituição de todas as variáveis globais por `v_ctx.<campo>`</li><li>Teste: verificar que fn_ctx_novo retorna valores zerados/nulos</li></ul> |
| **Estimativa** | 3 pts |
| **Dependências** | Nenhuma |

---

### US-01.04 — Unificar duplicação Saúde?Odonto com coleção de controles

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que as operações duplicadas entre saúde e odonto (INSERT pendência, UPDATE status, migração código) usem um loop sobre coleção de controles |
| **Para que** | cada correção ou evolução seja aplicada uma única vez e reflita automaticamente em ambas as operadoras |
| **BC** | Todos (transversal) |
| **Critérios de aceite** | <ul><li>TYPE `t_controles` (TABLE OF NUMBER INDEX BY PLS_INTEGER) criado</li><li>Coleção preenchida com nu_controle saúde + nu_controle odonto (quando existe)</li><li>Todos os IF l_empresa_odon.nu_controle IS NOT NULL substituídos por loop sobre coleção</li><li>Comportamento funcional idêntico ao legado</li><li>Testes: proposta só saúde, proposta saúde+odonto</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-01.02, US-01.03 |

---

### US-01.05 — Criar estrutura de testes unitários PL/SQL

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que exista um framework de testes unitários PL/SQL (utPLSQL) configurado para os packages da pr_efetiva_internet |
| **Para que** | todos os packages extraídos possam ter testes automatizados executados no pipeline CI |
| **Critérios de aceite** | <ul><li>utPLSQL instalado no schema de testes</li><li>Template de teste criado (`test_pk_<nome>.sql`)</li><li>Script de execução no pipeline (`azure-pipelines.yaml`)</li><li>Dados de teste isolados (rollback automático)</li><li>Relatório de cobertura gerado</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | Nenhuma |

---

<a id="feature-02"></a>
## ?? FEATURE 02 — Extração de Packages Supporting/Generic (BCs de Suporte)

> **Fase:** 2 — Extração (Prioridades P1 e P3)  
> **Risco:** ?? Médio  
> **Impacto:** Isola domínios de suporte, reduz acoplamento

### US-02.01 — Extrair pk_config_sistema_pim (BC-EI-09)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o carregamento de flags de sistema (FL_CRITICA_SAUDE_ODONTO, FL_LOG_BAIXA_CONTROLE, etc.) seja extraído para `pk_config_sistema_pim` |
| **Para que** | as configurações sejam carregadas uma vez e passadas como parâmetro, eliminando chamadas repetidas a fn_registro_sistema |
| **BC** | BC-EI-09 (Configuração de Sistema) |
| **Package alvo** | `pk_config_sistema_pim` (~30 linhas) |
| **Critérios de aceite** | <ul><li>TYPE `t_config` com campos para cada flag</li><li>Function `fn_carregar()` RETURN t_config</li><li>Flags: fl_critica, fl_log, cd_empresa_odon_puro, fl_checa_venda_odon, habilita_65anos, movimentacao_pim_auto, pendencia_neoway</li><li>Testes para: flags ativas, flags inativas, flags ausentes (default)</li></ul> |
| **Estimativa** | 2 pts |
| **Dependências** | US-01.05 |

---

### US-02.02 — Extrair pk_critica_pim (BC-EI-03)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a lógica de execução de críticas (pr_critica_internet para saúde e odonto, contagem, log de críticas) seja extraída para `pk_critica_pim` |
| **Para que** | o fluxo de críticas seja testável e a lógica de decisão "tem crítica ? não efetiva" fique isolada |
| **BC** | BC-EI-03 (Crítica de Beneficiários) |
| **Package alvo** | `pk_critica_pim` (~100 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_executar_criticas(p_st_e, p_ctx)` funcional</li><li>Executa pr_critica_internet para cada titular (saúde + odonto)</li><li>Conta críticas novas (wqtd_critica_novas + wqtd_critica_novas_od)</li><li>Registra log de críticas (via pk_log_baixa_pim) quando FL_LOG=S</li><li>Atualiza proposta_venda (fl_status=9) quando existem críticas</li><li>Insere pendência 9 com descrição das críticas</li><li>Testes: sem críticas, com críticas saúde, com críticas odonto, com ambas</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-01.01, US-01.03 |

---

### US-02.03 — Extrair pk_status_pim (BC-EI-07)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que as atualizações de status em tb_empresa_internet, tb_empresa_conveniada, tb_pendencia_empresa e tb_proposta_venda sejam extraídas para `pk_status_pim` |
| **Para que** | a máquina de estados fique centralizada e transições inválidas sejam prevenidas |
| **BC** | BC-EI-07 (Gestão de Status) |
| **Package alvo** | `pk_status_pim` (~80 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_atualizar_staging(p_st_e, p_ctx)` — atualiza tb_empresa_internet (CD_EMPRESA, FL_STATUS=9)</li><li>Procedure `pr_marcar_empresa_nova(p_cd_empresa)` — FL_EMPRESA_NOVA='S'</li><li>Procedure `pr_migrar_pendencias(p_cd_empresa)` — DELETE + INSERT pendência 1</li><li>Procedure `pr_verificar_nao_efetivados(p_ctx)` — marca pendente se existem titulares fl_status=8</li><li>Procedure `pr_reverter_empresa(p_cd_empresa, p_observacao)` — fl_status=1</li><li>Testes para: efetivação ok, efetivação com não-efetivados, reversão</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-01.03 |

---

### US-02.04 — Extrair pk_integracao_externa_pim (BC-EI-10)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que as chamadas a fn_checa_divergencia, fn_vi_checa_orcamento e fn_efetiva_adesao_digital sejam encapsuladas em `pk_integracao_externa_pim` |
| **Para que** | o acoplamento com sistemas externos (Neoway, orçamento, adesão digital) fique isolado atrás de uma ACL |
| **BC** | BC-EI-10 (Integração Externa) |
| **Package alvo** | `pk_integracao_externa_pim` (~50 linhas) |
| **Critérios de aceite** | <ul><li>Function `fn_tem_divergencia_neoway(p_nu_controle)` RETURN BOOLEAN</li><li>Function `fn_orcamento_valido(p_nu_controle)` RETURN BOOLEAN — retorna FALSE se fn_vi_checa_orcamento IN ('C','S')</li><li>Function `fn_adesao_digital_aprovada(p_nu_controle)` RETURN BOOLEAN — retorna TRUE se fn_efetiva_adesao_digital = 3</li><li>Function `fn_is_bitix(p_nu_controle)` RETURN BOOLEAN</li><li>Testes com mocks</li></ul> |
| **Estimativa** | 3 pts |
| **Dependências** | US-01.05 |

---

### US-02.05 — Extrair pk_carga_modelo_pim (BC-EI-11)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o bloco de carga automática PIM por modelo (linhas 60-175, loop sobre área_venda ? empresa ? pr_cadastramento_internet2) seja extraído para `pk_carga_modelo_pim` |
| **Para que** | a Fase 2 (carga por modelo) fique isolada e testável independentemente do loop principal |
| **BC** | BC-EI-11 (Carga Automática PIM Modelo) |
| **Package alvo** | `pk_carga_modelo_pim` (~100 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_processar(p_cfg)` que implementa toda a lógica da Fase 2</li><li>Loop sobre áreas de venda com fl_baixa_automatica=1</li><li>Loop sobre empresas ?29 vidas</li><li>Chamada a pr_cadastramento_internet2 para cada titular pendente</li><li>UPDATE cd_tipo_internet=0 após processamento</li><li>Testes: área com baixa, área sem baixa, empresa >29 vidas (não processa)</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-02.04 |

---

### US-02.06 — Extrair pk_individual_pim (BC-EI-12)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o processamento de contratos individuais/familiares (fn_individual_familiar='00100', linhas 2170-2280) seja extraído para `pk_individual_pim` |
| **Para que** | a Fase 7 (individual) fique isolada e testável |
| **BC** | BC-EI-12 (Individual/Familiar) |
| **Package alvo** | `pk_individual_pim` (~80 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_processar(p_cfg)` que implementa toda a lógica da Fase 7</li><li>Filtra apenas individuais (fn_individual_familiar='00100')</li><li>Executa pr_critica_internet</li><li>SE sem crítica: autoriza (fl_status=8) + pr_cadastramento_internet2</li><li>SE com erro: rollback + registra crítica '999-ERRO'</li><li>SE com crítica: marca como pendente (fl_status=1)</li><li>Validação Neoway (not exists pendência Neoway)</li><li>Validação adesão digital e orçamento</li><li>Testes para: individual ok, com crítica, com erro na pr_cadastramento_internet2</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-02.02, US-02.04 |

---

### US-02.07 — Extrair pk_odonto_puro_pim (BC-EI-13)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o processamento de empresas odonto puro (sem saúde, linhas 1870-2000) seja extraído para `pk_odonto_puro_pim` |
| **Para que** | a Fase 4 (odonto puro) fique isolada |
| **BC** | BC-EI-13 (Odonto Puro) |
| **Package alvo** | `pk_odonto_puro_pim` (~80 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_processar(p_cfg)` que implementa toda a Fase 4</li><li>Filtra tb_odon_empresa_internet com fl_status=9, ?29 vidas</li><li>Executa pr_critica_internet por titular</li><li>SE sem crítica (com bypass de tb_critica_liberada): autoriza + pr_cadastramento_internet2</li><li>UPDATE tb_compra_carencia SET dias_adm_especial = 30</li><li>UPDATE cd_vendedor na empresa conveniada</li><li>Rollback em caso de erro + registro de crítica '999-ERRO'</li><li>Testes: odonto ok, com crítica, com crítica liberada, com erro</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-02.04 |

---

### US-02.08 — Extrair pk_coligada_pim (BC-EI-14)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o processamento de coligadas BITIX e SIGO (linhas 2260-2290) seja extraído para `pk_coligada_pim` |
| **Para que** | a Fase 9 (coligadas) fique isolada |
| **BC** | BC-EI-14 (Coligada BITIX/SIGO) |
| **Package alvo** | `pk_coligada_pim` (~30 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_processar(p_cfg)` funcional</li><li>SE COLIGADA_EMPRESA_BITIX=1: PR_COLIGA_EMPRESA_BITIX + PK_VENDA_JSON.pr_efetiva</li><li>SE COLIGADA_EMPRESA=1: pr_processa_empresa_coligada</li><li>Testes: ambas ativas, nenhuma ativa, apenas BITIX, apenas SIGO</li></ul> |
| **Estimativa** | 2 pts |
| **Dependências** | US-02.01 |

---

<a id="feature-03"></a>
## ??? FEATURE 03 — Extração de Packages Core Domain

> **Fase:** 2 — Extração (Prioridade P2)  
> **Risco:** ?? Alto  
> **Impacto:** Isola o core domain — efetivação de empresa, integração odonto e baixa de beneficiários

### US-03.01 — Extrair pk_efetivacao_empresa_pim (BC-EI-04)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a lógica de chamar pr_cadastramento_empresa_prov, extrair código definitivo do retorno e tratar erros seja extraída para `pk_efetivacao_empresa_pim` |
| **Para que** | a delegação para a procedure de domínio fique encapsulada com ACL para parsing do retorno |
| **BC** | BC-EI-04 (Cadastro de Empresa PJ) |
| **Package alvo** | `pk_efetivacao_empresa_pim` (~120 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_efetivar(p_st_e, p_ctx)` funcional</li><li>SE cd_empresa IS NOT NULL (ex-cliente): reativar empresa (fl_status=2)</li><li>SENÃO: chamar pr_cadastramento_empresa_prov(nu_controle, p_return)</li><li>Parsing do retorno: extrair código após ','</li><li>Validação 'ORA-' no retorno (indica erro)</li><li>Lógica especial quando FL_LOG=S e nu_controle_odonto NOT NULL</li><li>INSERT pendência 9 em caso de erro</li><li>Testes: efetivação ok, ex-cliente, erro ORA-, retorno vazio</li></ul> |
| **Estimativa** | 8 pts |
| **Dependências** | US-01.01, US-01.03 |

---

### US-03.02 — Extrair pk_efetivacao_odonto_pim (BC-EI-05)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a lógica de efetivar empresa odonto (pr_odon_cad_empresa_prov + PR_NAT_JURIDICA_ODON) seja extraída para `pk_efetivacao_odonto_pim` |
| **Para que** | a integração saúde?odonto fique isolada |
| **BC** | BC-EI-05 (Integração Saúde-Odonto) |
| **Package alvo** | `pk_efetivacao_odonto_pim` (~80 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_efetivar(p_st_e, p_ctx)` funcional</li><li>Só processa se l_empresa_conveniada_saude IS NOT NULL</li><li>SE cd_empresa_odonto IS NOT NULL (ex-cliente odonto): reativar</li><li>SENÃO: pr_odon_cad_empresa_prov + PR_NAT_JURIDICA_ODON</li><li>Validação nu_controle_saude = nu_controle E mesmo CNPJ</li><li>Extração de código odonto do retorno</li><li>INSERT pendência 9 em caso de erro</li><li>Testes: sem odonto, com odonto ok, com odonto ex-cliente, com erro</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-03.01 |

---

### US-03.03 — Extrair pk_baixa_beneficiario (BC-EI-06)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que toda a lógica de migração de código provisório?definitivo, autorização de titulares/dependentes, chamada a pr_cadastramento_internet2 e processamento de inclusões/completo seja extraída para `pk_baixa_beneficiario` |
| **Para que** | o core domain de processamento de beneficiários fique isolado e testável |
| **BC** | BC-EI-06 (Processamento de Beneficiários) |
| **Package alvo** | `pk_baixa_beneficiario` (~300 linhas) |
| **Critérios de aceite** | <ul><li>Procedure `pr_migrar_codigo_provisorio(p_cd_empresa, p_nu_controle)` — UPDATE cd_empresa de 'T'+ctrl para definitivo (titulares + dependentes)</li><li>Procedure `pr_autorizar_e_efetivar(p_st_e, p_ctx)` — Canal 1: fl_status 0?8, internet2; Canal 2: apenas dt_inicio</li><li>Procedure `pr_processar_inclusoes(p_cfg)` — Fase 5 (tipo_internet=2)</li><li>Procedure `pr_processar_completo(p_cfg)` — Fase 6 (tipo_internet=1) + reversão para pendente com cd_pendencia=499</li><li>Procedure `pr_limpar_observacoes(p_cd_usuario)` — UPDATE tb_usuario, tb_usuario_titular_internet, tb_usuario_dependente_internet</li><li>Rollback em caso de erro + registro de crítica '999-ERRO'</li><li>Commits intermediários mantidos (compatibilidade)</li><li>Processamento saúde + odonto via coleção de controles</li><li>Testes: canal 1, canal 2, inclusão, completo, erro na internet2</li></ul> |
| **Estimativa** | 13 pts |
| **Dependências** | US-01.04, US-02.02, US-02.04 |

---

<a id="feature-04"></a>
## ?? FEATURE 04 — Orquestrador Limpo (Procedure Refatorada)

> **Fase:** 3 — Refactoring da procedure principal  
> **Prioridade:** P5 (Última)  
> **Risco:** ?? Alto  
> **Impacto:** Procedure de ~2.290 ? ~150 linhas

### US-04.01 — Criar procedure refatorada pk_efetiva_internet (BC-EI-01)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a procedure `pr_efetiva_internet` seja reescrita como um orquestrador limpo que delega para os packages extraídos |
| **Para que** | a procedure principal tenha ~150 linhas legíveis com clara separação das 9 fases de processamento |
| **BC** | BC-EI-01 (Orquestração) |
| **Critérios de aceite** | <ul><li>Procedure pr_efetiva_internet com ~150 linhas</li><li>9 fases claramente separadas com comentários</li><li>Todas as chamadas delegadas para packages</li><li>Zero lógica de negócio na procedure principal</li><li>Exception handler geral com log centralizado</li><li>Regressão funcional = 0 (output idêntico ao legado)</li></ul> |
| **Estimativa** | 8 pts |
| **Dependências** | Todas as US anteriores |

---

### US-04.02 — Criar cursor principal parametrizado

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que o cursor principal (que seleciona propostas PIM para processamento) seja extraído como função no package `pk_efetiva_internet` |
| **Para que** | os filtros do cursor sejam testáveis e evoluíveis sem editar a procedure |
| **BC** | BC-EI-01 |
| **Critérios de aceite** | <ul><li>Function `cr_propostas_pim(p_cfg)` RETURN SYS_REFCURSOR</li><li>Filtros: tp_operacao=1, fl_status IN (0,1,8), fl_sinaliza_vidas_ok='S'</li><li>Filtro coligada: tb_empresa_coligada com fl_baixa_automatica</li><li>Filtro ex-cliente</li><li>Filtro faixa de empregados (1-29 ou 30-99 conforme coligada)</li><li>Testes: proposta válida, proposta ex-cliente, proposta fora da faixa</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-02.01 |

---

<a id="feature-05"></a>
## ? FEATURE 05 — Homologação, UAT e Go-Live

> **Fase:** 4 — Validação  
> **Risco:** ?? Médio

### US-05.01 — Cenários de regressão para as 9 fases

| Campo | Valor |
|-------|-------|
| **Como** | QA/desenvolvedor |
| **Quero** | que existam cenários de teste de regressão para cada uma das 9 fases de processamento |
| **Para que** | eu garanta que o comportamento do JOB refatorado é idêntico ao legado |
| **Critérios de aceite** | <ul><li>Cenários para Fase 2 (carga modelo): empresa com modelo, sem modelo, >29 vidas</li><li>Cenários para Fase 3 (PIM): proposta sem pendência, com cada tipo de pendência (1-13), ex-cliente, com críticas, BITIX, odonto vinculado</li><li>Cenários para Fase 4 (odonto puro): com/sem crítica, crítica liberada</li><li>Cenários para Fase 5 (inclusão): titular pendente, já processado</li><li>Cenários para Fase 6 (completo): sem crítica pós, com crítica pós (cd_pendencia=499)</li><li>Cenários para Fase 7 (individual): ok, com crítica, com erro</li><li>Cenários para Fases 8-9 (coligadas): flags ativas/inativas</li><li>Total mínimo: 40 cenários</li></ul> |
| **Estimativa** | 8 pts |
| **Dependências** | US-04.01 |

---

### US-05.02 — Comparação de output legado vs refatorado

| Campo | Valor |
|-------|-------|
| **Como** | DBA |
| **Quero** | executar o JOB legado e o JOB refatorado em paralelo com os mesmos dados e comparar os resultados |
| **Para que** | eu tenha certeza de que a refatoração não altera o comportamento funcional |
| **Critérios de aceite** | <ul><li>Script de comparação criado (diff de tb_empresa_internet, tb_pendencia_empresa_internet, tb_usuario_titular_internet, tb_empresa_conveniada)</li><li>Execução em homologação com ?100 propostas</li><li>Zero divergências entre legado e refatorado</li><li>Relatório de comparação documentado</li></ul> |
| **Estimativa** | 5 pts |
| **Dependências** | US-05.01 |

---

### US-05.03 — Deploy gradual (canary)

| Campo | Valor |
|-------|-------|
| **Como** | Tech Lead |
| **Quero** | que o deploy da procedure refatorada seja feito de forma gradual (canary) com possibilidade de rollback imediato |
| **Para que** | eu minimize o risco de impacto em produção |
| **Critérios de aceite** | <ul><li>Procedure legada mantida como `pr_efetiva_internet_v1`</li><li>Procedure refatorada como `pr_efetiva_internet_v2`</li><li>Flag `fn_registro_sistema('USA_EFETIVA_V2')` para alternar entre versões</li><li>Procedure wrapper que direciona para v1 ou v2</li><li>Runbook de rollback documentado (ALTER para v1)</li><li>Monitoramento: comparar métricas v1 vs v2 por 1 semana</li></ul> |
| **Estimativa** | 3 pts |
| **Dependências** | US-05.02 |

---

<a id="roadmap"></a>
## ?? Visão Geral do Backlog (Roadmap)

```
Fase 1 — Quick Wins (Sprint 1-2)
??? US-01.01 Log de baixa (2 pts)
??? US-01.02 Motor de pendências (8 pts)
??? US-01.03 Record Type contexto (3 pts)
??? US-01.04 Unificar saúde/odonto (5 pts)
??? US-01.05 Framework testes (5 pts)
                                        Total: 23 pts

Fase 2 — Packages Supporting (Sprint 3-5)
??? US-02.01 Config sistema (2 pts)
??? US-02.02 Críticas (5 pts)
??? US-02.03 Status (5 pts)
??? US-02.04 Integração externa (3 pts)
??? US-02.05 Carga modelo (5 pts)
??? US-02.06 Individual (5 pts)
??? US-02.07 Odonto puro (5 pts)
??? US-02.08 Coligada (2 pts)
                                        Total: 32 pts

Fase 2 — Packages Core (Sprint 6-8)
??? US-03.01 Efetivação empresa (8 pts)
??? US-03.02 Efetivação odonto (5 pts)
??? US-03.03 Baixa beneficiário (13 pts)
                                        Total: 26 pts

Fase 3 — Orquestrador (Sprint 9)
??? US-04.01 Procedure refatorada (8 pts)
??? US-04.02 Cursor parametrizado (5 pts)
                                        Total: 13 pts

Fase 4 — Homologação (Sprint 10-11)
??? US-05.01 Cenários regressão (8 pts)
??? US-05.02 Comparação output (5 pts)
??? US-05.03 Deploy canary (3 pts)
                                        Total: 16 pts

???????????????????????????????????
TOTAL GERAL:                 110 pts
???????????????????????????????????
```

---

<a id="priorizacao"></a>
## ?? Critérios de Priorização

| Critério | Peso |
|----------|------|
| **Risco de regressão** | 40% |
| **Redução de código duplicado** | 25% |
| **Testabilidade** | 20% |
| **Dependências** | 15% |

---

<a id="dor-dod"></a>
## ? Definition of Ready / Definition of Done

### Definition of Ready (DoR)
- [ ] User Story tem critérios de aceite claros
- [ ] BC e package alvo identificados
- [ ] Linhas da procedure legada mapeadas
- [ ] Dependências de outras US identificadas
- [ ] Dados de teste disponíveis

### Definition of Done (DoD)
- [ ] Package criado com spec + body
- [ ] Procedure legada chama o novo package
- [ ] Testes unitários (utPLSQL) com ?70% coverage
- [ ] Testes de regressão passando
- [ ] Code review realizado
- [ ] Pipeline CI verde
- [ ] Documentação atualizada (ddd-modelagem-dominio.md)
- [ ] Zero breaking changes
