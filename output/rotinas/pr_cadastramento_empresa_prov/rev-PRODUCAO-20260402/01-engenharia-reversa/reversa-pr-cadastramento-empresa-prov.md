# Engenharia Reversa: PR_CADASTRAMENTO_EMPRESA_PROV

**Data:** 17/04/2026
**Analista:** Agente Eng. Reversa (Claude Sonnet 4.6)
**Versao CVS (tag PRODUCAO):** PRODUCAO-20260402
**Origem CVS:** C:\CVS\health_install\procedure\pr_cadastramento_empresa_prov.sql
**Status em producao (MCP):** Sinonimo PUBLICO VALID (16/04/2026) -- objeto HUMASTER nao visivel via all_objects pelo usuario C_RAWEL

---

## 1. Assinatura

| Atributo           | Valor                                                   |
|--------------------|---------------------------------------------------------|
| Tipo               | PROCEDURE                                               |
| Schema             | HUMASTER                                                |
| Nome               | PR_CADASTRAMENTO_EMPRESA_PROV                           |
| Parametros de Entrada | p_nu_controle IN NUMBER -- numero de controle da proposta provisoria |
| Parametros de Saida   | p_erro_controle OUT VARCHAR2 -- mensagem de resultado/erro |
| Retorno            | N/A                                                     |
| Tamanho            | 5.025 linhas, 202 KB                                    |

**Responsabilidade sintetica:** Efetiva o cadastramento definitivo de uma empresa
conveniada a partir de uma proposta provisoria armazenada em `tb_empresa_internet`
(fl_status_processamento IN (0, 8)), criando o contrato e toda a parametrizacao
necessaria em mais de 40 tabelas operacionais.

---

## 2. Arvore de Dependencias

### 2.1 Sub-rotinas Chamadas

| Sub-rotina                         | Tipo      | Schema/Package       | Responsabilidade                                               | Impacto no fluxo                                     | Status |
|------------------------------------|-----------|----------------------|----------------------------------------------------------------|------------------------------------------------------|--------|
| fn_empresa_conveniada              | FUNCTION  | HUMASTER (sinonimo)  | Gera proximo codigo de empresa disponivel                      | Bloqueia sem codigo gerado (loop ate 10001 tentativas) | VALID  |
| fn_cd_tb_preco_plano               | FUNCTION  | HUMASTER (sinonimo)  | Gera proximo cd_tabela disponivel em tb_preco_plano            | Bloqueia sem tabela de precos                        | VALID  |
| fn_copia_tabela_preco              | FUNCTION  | HUMASTER (sinonimo)  | Copia tabela de precos de inativos (RN279)                     | Define lcd_tabela_copia_inativo para RN279           | VALID  |
| fn_checa_contrato_affix            | FUNCTION  | HUMASTER (sinonimo)  | Verifica se contrato e do modelo AFFIX/administradora          | Altera logica de empresa_plano e faixa ANS           | VALID  |
| fn_check_caepf                     | FUNCTION  | HUMASTER (sinonimo)  | Valida numero CAEPF                                            | Critica se CPF sem CAEPF valido                      | VALID  |
| fn_buscar_dia_pagamento            | FUNCTION  | HUMASTER (sinonimo)  | Busca dia de pagamento para a data corrente                    | Preenche dt_dia_pagamento em tb_empresa_conveniada   | VALID  |
| fn_registro_sistema                | FUNCTION  | HUMASTER (direto+sin)| Recupera valor de parametro do sistema                         | Controla FL_LOG_BAIXA_CONTROLE e FL_ATIVA_PIM_ADM    | VALID  |
| fn_terminal                        | FUNCTION  | HUMASTER (direto+sin)| Retorna identificador do terminal corrente                     | Usado em inserts de cd_terminal                      | VALID  |
| fn_verifica_prorrogacao_vigencia   | FUNCTION  | HUMASTER (sinonimo)  | Verifica se contrato tem prorrogacao de vigencia               | Define V_COUNT_DT_ASSINATURA e branch do INSERT      | VALID  |
| fn_plano_livre_escolha             | FUNCTION  | HUMASTER (sinonimo)  | Verifica se plano e de livre escolha (reembolso)               | Controla replicacao de reembolso por plano           | VALID  |
| pr_tabela_inativos_rn279           | PROCEDURE | HUMASTER (sinonimo)  | Busca tabela de inativos valida conforme RN279/309             | Define lcd_tabela_inativo e lfl_atende_rn279         | VALID  |
| pr_desconto_empresa                | PROCEDURE | HUMASTER (sinonimo)  | Aplica descontos da empresa via parametrizacao PIM ADM         | Executa apenas se FL_ATIVA_PIM_ADM = 'S'             | VALID  |
| pr_cobranca_falta_param            | PROCEDURE | HUMASTER (sinonimo)  | Verifica parametros de cobranca em falta                       | Chamada sempre ao final; exception engolida          | VALID  |
| pr_con_emp_prov                    | PROCEDURE | HUMASTER (sinonimo)  | Log de acompanhamento da baixa do contrato                     | Se retorno='N': interrompe com exit                  | VALID  |
| pr_odon_param_esp_empresa          | PROCEDURE | HUMASTER (sinonimo)  | Parametriza repasse odonto automatico por operadora            | Executa se parametro 225=1 e empresa tem repasse     | VALID  |
| pr_send_mail                       | PROCEDURE | HUMASTER (direto+sin)| Envia email texto simples                                      | Email boas-vindas para empresas Hapvida (plano != 7 e != 14) | VALID  |
| pr_send_mail_html_rn               | PROCEDURE | HUMASTER (sinonimo)  | Envia email HTML                                               | Email boas-vindas para empresas RN Saude (plano = 7) | VALID  |
| pr_vcc_empresa_super_simples       | PROCEDURE | HUMASTER (sinonimo)  | Replica empresa para modulo odonto urgente (Super Simples)     | Executa se empresa nao tem odonto proprio vinculado   | VALID  |
| pk_administracao.fn_check_cic      | FUNCTION  | PK_ADMINISTRACAO     | Valida CNPJ/CPF: 1=CPF, 2=CNPJ, 3=CAEPF; 0=invalido           | Critica digito verificador; define fl_tipo_pessoa     | VALID  |
| pk_administracao.fn_digito_out     | FUNCTION  | PK_ADMINISTRACAO     | Adiciona digito verificador ao cd_pessoa                        | Gera cd_pessoa definitivo com digito                 | VALID  |
| pk_administracao.fn_encripta       | FUNCTION  | PK_ADMINISTRACAO     | Criptografa senha para acesso internet                          | Gera cd_senha criptografada em tb_acesso_internet    | VALID  |

### 2.2 Dependentes (quem chama esta rotina)

| Objeto                          | Tipo      | Schema   | Fonte           |
|---------------------------------|-----------|----------|-----------------|
| PR_EFETIVA_INTERNET             | PROCEDURE | HUMASTER | CVS (verificado)|
| PR_BAIXA_EMPRESA_COLIGADA       | PROCEDURE | HUMASTER | CVS (verificado)|
| PR_BAIXA_EMP_COLIGADA_SAUDE     | PROCEDURE | HUMASTER | CVS (verificado)|
| PR_EFETIVA_BAIXA_COLIGADA       | PROCEDURE | HUMASTER | CVS (verificado)|
| PK_PIM (package_body)           | PACKAGE   | HUMASTER | CVS (verificado)|

### 2.3 Tabelas Acessadas

#### Leitura (SELECT / Cursor)

| Tabela                         | Operacao | Condicao Principal                                                    | Observacao                                     |
|--------------------------------|----------|-----------------------------------------------------------------------|------------------------------------------------|
| tb_empresa_internet            | Cursor   | nu_controle = p_nu_controle AND fl_status_processamento IN (0, 8)    | Cursor principal -- aciona o processamento     |
| tb_odon_empresa_internet       | SELECT   | nu_controle_saude = st_e.nu_controle                                  | Verifica se ha proposta odonto vinculada        |
| tb_vendedor_plano              | SELECT   | cd_vendedor_plano = st_e.cd_vendedor_plano                            | Valida vendedor + busca filial                  |
| tb_area_venda                  | SELECT   | cd_area_venda = v.cd_area_venda                                       | Resolve filial via vendedor                     |
| tb_emp_internet_filial         | SELECT   | nu_controle = st_e.nu_controle                                        | Override de filial para tela TAFFIX             |
| tb_filial                      | SELECT   | cd_filial = lcd_filial                                                 | Busca cd_empresa_plano                          |
| tb_pessoa_lista_negra          | SELECT   | sysdate BETWEEN dt_inicial AND dt_final AND nu_cpf_cnpj               | Verifica CNPJ em lista negra                    |
| tb_empresa_neg                 | Cursor   | cd_modelo_negocio, fl_natureza_empresa, qt vidas, dt_inicio           | Busca parametros de negociacao (tabela negocio) |
| tb_empresa_coligada            | SELECT   | CONTRATO = 'T'||nu_controle; COD_MAE_SIGO                            | Consolida vidas de empresas coligadas SIGO      |
| tb_empresa_coligada_bitx       | SELECT   | TPROVISORIO = st_e.nu_controle                                        | Busca proposta mae BITIX                        |
| tb_cep_logradouro              | Cursor   | cd_cep_logradouro = pcd_cep_endereco                                  | Valida CEP / resolve logradouro                  |
| tb_cep_localidade              | Cursor   | cd_uf_localidade + nm_localidade; fl_tipo_cidade = '3'                | Fallback de localidade                          |
| tb_uf                          | Cursor   | cd_uf = pcd_uf_endereco                                               | Valida UF                                       |
| tb_area_venda_proposta_senha   | SELECT   | ds_senha + cd_vendedor_plano                                          | Resolve cd_empresa_plano por senha              |
| tb_plano                       | SELECT   | cd_plano = st_preco.cd_plano                                          | Busca cd_tipo_acomodacao                        |
| tb_plano_ans                   | SELECT   | cd_plano + nu_reg_plano_ans                                           | Filtra planos por participacao de copart        |
| tb_registro_plano_ans          | SELECT   | nu_reg_plano_ans + fl_participacao                                    | Seleciona planos copart ou nao copart           |
| tb_empresa_neg_tabela          | SELECT   | nu_controle = lnu_controle; fl_pim=0; fl_tipo_tabela=1               | Valores por plano/faixa/empregados              |
| tb_empresa_neg_carencia        | SELECT   | nu_controle = lnu_controle                                            | Carencias contratadas                           |
| tb_empresa_neg_grupo           | SELECT   | nu_controle = lnu_controle                                            | Grupos de beneficiarios                         |
| tb_empresa_neg_modulo          | SELECT   | nu_controle = lnu_controle                                            | Modulos contratados                             |
| tb_empresa_neg_fator           | SELECT   | nu_controle = lnu_controle                                            | Fatores de ajuste faixa etaria                  |
| tb_empresa_neg_fidelizacao     | SELECT   | nu_controle = lnu_controle                                            | Fidelizacao contratada                          |
| tb_empresa_neg_franquia        | SELECT   | nu_controle = lnu_controle                                            | Franquias (coparticipacao franquia)             |
| tb_empresa_neg_pln_esp         | SELECT   | nu_controle = lnu_controle                                            | Planos especiais contratados                    |
| tb_empresa_neg_desconto        | SELECT   | nu_controle = lnu_controle                                            | Descontos contratados                           |
| tb_empresa_neg_controle        | SELECT   | nu_controle = lnu_controle                                            | cd_tabela_fator_moderador                       |
| tb_empresa_neg_isenta_copart   | SELECT   | nu_controle = lnu_controle                                            | Isencoes de coparticipacao                      |
| tb_empresa_neg_isnt_cop_tp_ben | SELECT   | nu_controle = lnu_controle                                            | Isencoes copart por tipo beneficiario           |
| tb_empresa_cop_intern_pj       | SELECT   | nu_controle = lnu_controle                                            | Parametros copart internacao PJ                 |
| tb_taxa_implantacao            | SELECT   | nu_controle = lnu_controle                                            | Valor de taxa de adesao/implantacao             |
| tb_empresa_internet_com        | SELECT   | nu_controle = p_nu_controle                                           | Consultor comercial vinculado                   |
| tb_numero_extenso              | Cursor   | qt_numero IN (7, 12, 14, 16)                                          | Codigos de servico para acesso internet         |
| tb_param_minimo_contratual     | SELECT   | nu_controle + cd_ativo='S' + vigencia                                 | Parametros de minimo contratual                 |
| tb_indice_modelo_calculo_neg   | SELECT   | nu_controle = lnu_controle                                            | Indice de reajuste contratado                   |
| tb_odon_parametro_diversos     | SELECT   | cd_parametro_diversos = 225                                           | Flag de automacao de repasse odonto             |
| tb_empresa_conveniada          | SELECT   | cd_empresa_conveniada = lcd_empresa                                   | Verifica existencia no handler de erro          |
| tb_reemb_plano_prazo_pag       | Cursor   | cd_plano = rb.cd_plano                                                | Reembolso: prazos do plano                      |
| tb_reemb_plano_prazo_pag_tip   | Cursor   | cd_plano = rb.cd_plano                                                | Reembolso: tipos de prazo                       |
| tb_reemb_plano_tabela          | Cursor   | cd_plano = rb.cd_plano                                                | Reembolso: tabela do plano                      |
| tb_reemb_plano_composicao      | Cursor   | cd_plano = rb.cd_plano                                                | Reembolso: composicao                           |
| tb_odon_empresa_neg_grupo      | SELECT   | nu_controle = lnu_controle                                            | Grupos odonto contratados                       |
| tb_terapias_espec_emp_padrao   | SELECT   | nu_controle = lnu_controle                                            | Terapias especializadas padrao                  |
| tb_config_isnt_cop_tp_benef    | SELECT   | nu_controle = lnu_controle                                            | Config isencao copart tipo beneficiario         |
| tb_copart_tabela_plano         | SELECT   | nu_controle = lnu_controle                                            | Tabela de coparticipacao do plano               |

#### Escrita (INSERT/UPDATE/DELETE)

| Tabela                            | Operacao        | Condicao / Observacao                                            |
|-----------------------------------|-----------------|------------------------------------------------------------------|
| tb_pessoa                         | INSERT / UPDATE | Cria ou atualiza cadastro da pessoa juridica/fisica              |
| tb_preco_plano                    | INSERT          | Nova tabela de precos para empresa modelo_negocio=1              |
| tb_valor_plano                    | INSERT / UPDATE | Valores por faixa/empregados; ajuste fl_tipo_faixa               |
| tb_parametro_franquia             | INSERT          | Parametros de franquia contratados                               |
| tb_desconto_preco_plano           | INSERT          | Descontos por plano/tabela                                       |
| tb_empresa_conveniada             | INSERT          | Registro principal -- contrato efetivado                         |
| tb_empresa_internet               | UPDATE          | Atualiza dt_inicio, dt_dia_pagamento, dt_validade_contrato       |
| tb_natureza_juridica_emp          | UPDATE          | Vincula empresa definitiva a natureza juridica                   |
| tb_empresa_conveniada_nat         | INSERT          | Historico de natureza juridica da empresa                        |
| tb_emp_conveniada_saude_flags     | INSERT          | Flag de modelo de notificacao (PJ); apenas se nat.jur=2135       |
| tb_modelo_reaj_empresa            | INSERT          | Vincula indice de reajuste contratado a empresa                  |
| tb_implantacao_emp                | INSERT          | Taxa de adesao/implantacao (GAP 1179)                            |
| tb_empresa_conveniada_com         | INSERT          | Consultor comercial da empresa                                   |
| tb_empresa_cnpj_contratante       | INSERT          | CNPJ contratante para modelos de negocio != 1 (AFFIX etc.)      |
| tb_empresa_conveniada_imagem      | UPDATE          | Vincula imagens provisorias ao codigo definitivo                 |
| tb_empresa_conveniada_unidade     | INSERT          | Unidade principal (cd=1) da empresa                             |
| tb_parametros_unidade             | INSERT          | Parametros por unidade/plano                                     |
| tb_parametros_unidade_pln_esp     | INSERT          | Parametros de planos especiais por unidade                       |
| tb_controle_fator_empresa         | INSERT / UPDATE | Fator moderador; fl_cobra_internacao; isencoes copart            |
| tb_terapias_espec_empresa         | INSERT          | Terapias especializadas contratadas                              |
| tb_fator_empresa                  | INSERT          | Fatores de ajuste de faixa etaria por plano                      |
| tb_fidelizacao_empresa            | INSERT          | Fidelizacao contratada (dt_fim = dt_inicio + 1000 dias)          |
| tb_empresa_endereco               | INSERT / UPDATE | Endereco da empresa (faturamento e correspondencia)              |
| tb_endereco_pessoa                | INSERT          | Endereco da pessoa juridica                                      |
| tb_contato_pessoa                 | INSERT / UPDATE | Contatos da empresa                                              |
| tb_meio_comunicacao_pessoa        | INSERT          | Meios de comunicacao (telefones, emails)                         |
| tb_hist_empresa_conveniada        | INSERT          | Historico de criacao do contrato                                 |
| tb_compra_carencia                | INSERT          | Carencias contratadas                                            |
| tb_compra_grupo                   | INSERT          | Grupos de beneficiarios contratados                              |
| tb_compra_modulo                  | INSERT          | Modulos contratados                                              |
| tb_odon_compra_grupo              | INSERT          | Grupos odonto contratados                                        |
| tb_copart_internacao_param_pj     | INSERT          | Parametros de coparticipacao internacao PJ                       |
| tb_copart_isnt_tp_benef           | INSERT          | Isencoes de copart por tipo de beneficiario                      |
| tb_copart_tipo_reembolso          | INSERT / UPDATE | Tipos de reembolso com coparticipacao                            |
| tb_copart_tab_empresa             | INSERT          | Tabela de coparticipacao da empresa                              |
| tb_reemb_empresa_prazo_pag        | INSERT          | Prazos de reembolso da empresa                                   |
| tb_reemb_empresa_prazo_pag_tip    | INSERT          | Tipos de prazo de reembolso                                      |
| tb_reemb_empresa_tabela           | INSERT          | Tabela de reembolso da empresa                                   |
| tb_reemb_empresa_composicao       | INSERT          | Composicao de reembolso                                          |
| tb_acesso_internet                | INSERT          | Acesso internet da empresa (cd_tipo_acesso=5)                    |
| tb_controle_internet              | INSERT / UPDATE | Servicos de acesso internet (codigos 7, 12, 14, 16)              |
| tb_emp_limite_acesso_contra       | INSERT          | Limite de acesso ao contrato                                     |
| tb_usuario_titular_internet       | UPDATE          | Vincula cd_acesso ao titular provisorio                          |
| tb_usuario_dependente_internet    | UPDATE          | Vincula cd_acesso ao dependente provisorio                       |
| tb_empresa_breakeven              | INSERT          | Valor breakeven = 70 (hardcode)                                  |
| tb_acesso_dados_empresa           | INSERT          | Email ADM da empresa (cd_tipo_acesso=5)                          |
| tb_log_envio_kit                  | INSERT          | Log do email de boas-vindas enviado                              |
| tb_empresa_minimo_contratual      | INSERT          | Vincula parametros de minimo contratual a empresa                |
| tb_log_baixa_controle             | INSERT          | Log de erros/etapas (se FL_LOG_BAIXA_CONTROLE = 'S')             |
| tb_pendencia_empresa_internet     | INSERT          | Pendencia CD_PENDENCIA=9 quando ocorre erro na baixa             |

### 2.4 Outros Objetos

| Objeto                         | Tipo     | Finalidade                                             |
|--------------------------------|----------|--------------------------------------------------------|
| sq_pessoa                      | SEQUENCE | Gera proximo cd_pessoa                                 |
| sq_acesso_internet             | SEQUENCE | Gera proximo cd_acesso                                 |
| sq_empresa_minimo_contratual   | SEQUENCE | Gera proximo cd_minimo_contratual                      |
| sq_controle_pendencia          | SEQUENCE | Gera NU_CONTROLE_PENDENCIA em tb_pendencia_empresa_internet |
| pk_administracao               | PACKAGE  | Funcoes administrativas: fn_check_cic, fn_digito_out, fn_encripta |

---

## 3. Regras de Negocio

### RN01 -- Selecao de Propostas para Processamento

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Chamada com p_nu_controle
**Comportamento:** Processa todos os registros de tb_empresa_internet com nu_controle = p_nu_controle e fl_status_processamento IN (0, 8)
**Resultado:** Loop sobre registros elegíveis; sem registros = nenhuma acao

**Evidencia:**
```sql
-- Origem: pr_cadastramento_empresa_prov, cursor cr_empresa_internet
cursor cr_empresa_internet is
  select *
    from tb_empresa_internet
   where nu_controle = p_nu_controle
     and fl_status_processamento in (0, 8);
```

---

### RN02 -- Somente Inclusao de Empresas Novas

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** tp_operacao = '1'
**Comportamento:** Toda a logica de cadastramento esta dentro de IF st_e.tp_operacao = '1'. Nao ha tratamento para tp_operacao = '2' (alteracao) ou '3' (exclusao) nesta procedure.
**Resultado:** Apenas inclusoes sao processadas; outros valores de tp_operacao resultam em execucao vazia sem erro

**Evidencia:**
```sql
-- Origem: linha 217
if st_e.tp_operacao = '1' then
  -- ... 4748 linhas de logica de inclusao ...
end if; -- inclusao --
```

---

### RN03 -- Geracao do Codigo da Empresa com Tentativas Multiplas

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Inicio do processamento de inclusao
**Comportamento:** Chama fn_empresa_conveniada() em loop ate obter um codigo nao nulo, com limite de 10.001 tentativas para evitar loop infinito
**Resultado:** lcd_empresa preenchido; sem codigo apos 10.001 tentativas o processamento continua com lcd_empresa = NULL, causando falha subsequente

**Ambiguidade:** [ATENCAO] Nao ha tratamento explicito de falha se todas as 10.001 tentativas retornarem NULL -- a procedure prosseguiria com lcd_empresa nulo ate falhar no INSERT

**Evidencia:**
```sql
-- Origem: linha ~255
V_COUNT_EMP := 0;
while (lcd_empresa is null) AND (V_COUNT_EMP < 10001) loop
  lcd_empresa := fn_empresa_conveniada();
  V_COUNT_EMP := V_COUNT_EMP + 1;
end loop;
```

---

### RN04 -- Validacao do Vendedor Ativo

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** Verifica existencia do vendedor em tb_vendedor_plano. Se nao encontrado, lanca ORA-20201 'vendedor nao cadastrado ou nao ativo'
**Resultado:** Interrupcao da baixa com raise_application_error; INSERT em tb_log_baixa_controle se FL_LOG = 'S'

**Evidencia:**
```sql
-- Origem: linha ~268
select 1 into l_aux from tb_vendedor_plano
 where cd_vendedor_plano = st_e.cd_vendedor_plano;
-- exception: raise_application_error(-20201, 'vendedor nao cadastrado ou nao ativo')
```

---

### RN05 -- Bloqueio de CNPJ na Lista Negra

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** Verifica se o CNPJ da proposta existe em tb_pessoa_lista_negra dentro do periodo de vigencia (sysdate between dt_inicial and dt_final). Se existir, lanca ORA-20201
**Resultado:** Empresa bloqueada nao pode ser efetivada

**Evidencia:**
```sql
-- Origem: linha ~285
select count(*) into l_aux from tb_pessoa_lista_negra
 where (sysdate between dt_inicial and dt_final)
   and nu_cpf_cnpj = st_e.nu_cgc_cpf;
if l_aux > 0 then
  raise_application_error(-20201, 'cnpj contem restricao no sistema e nao podera ser cadastrado');
```

---

### RN06 -- Resolucao de Filial com Hierarquia de Prioridade

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** Resolve filial em 3 niveis de prioridade: (1) filial do contrato TAFFIX (tb_emp_internet_filial); (2) filial da area de venda do vendedor; (3) default. Para tela TAFFIX, a filial do contrato prevalece sobre a do vendedor.
**Resultado:** lcd_filial preenchido; usado em toda parametrizacao subsequente

**Evidencia:**
```sql
-- Origem: linha ~320 e ~351
-- 1o: via vendedor + area_venda
select a.cd_filial into lcd_filial from tb_vendedor_plano v, tb_area_venda a
 where cd_vendedor_plano = st_e.cd_vendedor_plano and a.cd_area_venda = v.cd_area_venda;
-- 2o: override TAFFIX
select cd_filial_modelo into lcd_filial_modelo from tb_emp_internet_filial
 where nu_controle = st_e.nu_controle;
if lcd_filial_modelo is not null then lcd_filial := lcd_filial_modelo; end if;
-- SACTI 1026849: override por cd_filial_contrato
if st_e.cd_filial_contrato is not null then lcd_filial := st_e.cd_filial_contrato; end if;
```

---

### RN07 -- Consolidacao de Vidas para Empresas Coligadas SIGO

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** Empresa tem contrato mae em tb_empresa_coligada (canal SIGO)
**Comportamento:** Soma nu_total_empregado de todas as coligadas que compartilham o mesmo COD_CONTRATO_MAE; usa o total consolidado para buscar parametros de negociacao (tabela negocio)
**Resultado:** Empresa coligada e precificada com base no total do grupo, nao no proprio volume

**Evidencia:**
```sql
-- Origem: linha ~470
SELECT SUM(C.NU_TOTAL_EMPREGADO) INTO NU_TOTAL_EMPREGADO_SIGO
  FROM TB_EMPRESA_COLIGADA B, TB_EMPRESA_INTERNET C
 WHERE B.CONTRATO = 'T' || C.NU_CONTROLE
   AND B.COD_CONTRATO_MAE = 'T' || V_COD_MAE_SIGO;
IF NU_TOTAL_EMPREGADO_SIGO > 0 THEN
  ST_E.NU_TOTAL_EMPREGADO := NU_TOTAL_EMPREGADO_SIGO;
```

---

### RN08 -- Selecao de Parametros de Negociacao por Canal (SIGO vs BITIX)

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** Existencia ou nao de cd_operados = 'BITIX' em tb_empresa_internet
**Comportamento:** Empresas SIGO buscam parametros em cr_empresa_neg usando dt_inicio; empresas BITIX usam cr_empresa_neg_bitix com dt_assinatura. Para BITIX, o total de vidas e consolidado entre coligadas BITIX
**Resultado:** lnu_controle preenchido com o nu_controle do parametro de negociacao; usado em toda parametrizacao

**Evidencia:**
```sql
-- Origem: linha ~490 (SIGO) e ~527 (BITIX)
-- SIGO:
open cr_empresa_neg(wcd_modelo_negocio, lcd_filial, st_e.fl_natureza_empresa, NU_TOTAL_EMPREGADO_SIGO, st_e.dt_inicio);
-- BITIX:
open cr_empresa_neg_bitix(wcd_modelo_negocio, lcd_filial, st_e.fl_natureza_empresa, V_NU_TOTAL_BITIX, st_e.dt_assinatura);
```

---

### RN09 -- Validacao Tripla de Documento (CNPJ/CPF/CAEPF)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** (1) Verifica se nu_cgc_cpf nao e nulo; (2) valida digito verificador via pk_administracao.fn_check_cic (aceita retorno 1=CPF, 2=CNPJ, 3=CAEPF); (3) se for CPF (retorno=1), exige CAEPF valido via fn_check_caepf
**Resultado:** Empresa sem documento valido ou sem CAEPF para CPF nao pode ser efetivada

**Evidencia:**
```sql
-- Origem: linha ~618
if st_e.nu_cgc_cpf is null then raise_application_error(-20201, 'obrigatorio informar cnpj'); end if;
if not pk_administracao.fn_check_cic(st_e.nu_cgc_cpf) in (1, 2, 3) then
  raise_application_error(-20201, 'digito de controle cnpj/cpf incorreto');
end if;
if pk_administracao.fn_check_cic(st_e.nu_cgc_cpf) = 1 and fn_check_caepf(nvl(st_e.nu_caepf, 0)) = 0 then
  raise_application_error(-20201, 'numero CAEPF incorreto');
end if;
```

---

### RN10 -- Validacao Completa de Dados Cadastrais

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** Valida obrigatoriedade de: razao social, natureza empresa (0-9), total empregados > 0, CEP, UF, cidade, tipo logradouro, rua, numero, plano, data inicio, data cancelamento nao preenchida
**Resultado:** Qualquer campo invalido gera ORA-20201 especifico; todos os erros sao registrados em tb_log_baixa_controle quando FL_LOG_BAIXA_CONTROLE = 'S'

**Evidencia:**
```sql
-- Exemplo: linha ~686
if st_e.nm_pessoa_razao_social is null then
  raise_application_error(-20201, 'obrigatorio informar a razao social');
end if;
-- + ~18 outras validacoes similares (CEP, UF, cidade, natureza, empregados, plano, datas...)
```

---

### RN11 -- Determinacao do Canal de Venda por Faixa de Vidas

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao, apos consolidar total de empregados
**Comportamento:** 1-29 vidas = cd_canal_venda=1 (pequenas); 30-99 vidas = cd_canal_venda=2 (medias); >= 100 vidas = NULL. Hierarquia: SIGO coligada > BITIX > proprio
**Resultado:** wcd_canal_venda gravado em tb_empresa_conveniada; define segmento para relatorios e regras de comissao

**Evidencia:**
```sql
-- Origem: linha ~1861
if st_e.nu_total_empregado >= 1 and st_e.nu_total_empregado <= 29 then
  wcd_canal_venda := 1;
elsif st_e.nu_total_empregado >= 30 and st_e.nu_total_empregado <= 99 then
  wcd_canal_venda := 2;
else
  wcd_canal_venda := null;
end if;
```

---

### RN12 -- Tabela de Precos Propria vs Compartilhada (Modelo AFFIX)

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** wfl_tabela_geral (S/N) baseado em cd_modelo_negocio != 1 AND cd_tabela_saude IS NOT NULL
**Comportamento:** Se modelo_negocio=1 (atacado padrao): cria nova tb_preco_plano exclusiva para a empresa. Se modelo_negocio != 1 (AFFIX e similares): reutiliza tabela unica compartilhada por filial (lcd_tabela_saude)
**Resultado:** Empresas AFFIX reutilizam tabela de preco da operadora; empresas atacado tem tabela dedicada

**Ambiguidade:** [ATENCAO] SACTI 449802 alterou condicao de `lcd_modelo_negocio = 2` para `lcd_modelo_negocio != 1`, ampliando escopo para todos os modelos nao-atacado. Deve-se verificar se ha modelos de negocio com tabela compartilhada que nao deveriam ter essa logica.

**Evidencia:**
```sql
-- Origem: linha ~605
if lcd_modelo_negocio != 1 and lcd_tabela_saude is not null then
  wfl_tabela_geral := 'S'; -- usa tabela compartilhada
else
  wfl_tabela_geral := 'N'; -- cria tabela exclusiva
end if;
-- Na criacao da tabela (linha ~1497):
if wfl_tabela_geral = 'S' then
  lcd_tabela := lcd_tabela_saude; -- reutiliza
else
  lcd_tabela := fn_cd_tb_preco_plano; -- cria nova
  insert into tb_preco_plano (...) values (lcd_tabela, 'Tabela empresa '||...);
end if;
```

---

### RN13 -- Selecao de Planos por Coparticipacao da Proposta

**Categoria:** Calculo
**Risco ANS:** [ANS] Coparticipacao e regulada pela RN195 e anexos; selecao errada de planos pode gerar cobranças nao reguladas
**Gatilho:** fl_coparticipacao da proposta (S/N)
**Comportamento:** Ao copiar valores para tb_valor_plano, filtra planos pelo campo fl_participacao da tb_registro_plano_ans, que deve corresponder ao fl_coparticipacao da proposta
**Resultado:** Empresa de coparticipacao recebe planos com participacao; empresa sem coparticipacao recebe planos sem

**Evidencia:**
```sql
-- Origem: linha ~1571
and upper(r.fl_participacao) = upper(nvl(st_e.fl_coparticipacao, 'N'))
-- seleciona os planos de acordo ser ou nao empresa de coparticipacao
```

---

### RN14 -- Aplicacao da RN279/309 (Tabela de Inativos) [ANS]

**Categoria:** Calculo
**Risco ANS:** [ANS] RN279 e RN309 da ANS regulam a permanencia de inativos nos planos coletivos; nao aplicar corretamente gera risco regulatorio grave
**Gatilho:** Sempre; pr_tabela_inativos_rn279 e chamado com parametros da empresa
**Comportamento:** Busca tabela de inativos valida para a empresa. Se encontrada e lfl_atende_rn279='S', copia a tabela (fn_copia_tabela_preco) e define ldt_rn_279_309_2 = dt_inicio e lfl_rn_279_309 = 2. Se nao atende ou nao encontra, campos ficam NULL
**Resultado:** Campos dt_rn_279_309_2 e fl_rn_279_309 em tb_empresa_conveniada refletem se empresa tem tabela de inativos conforme RN279/309

**Evidencia:**
```sql
-- Origem: linha ~1957
pr_tabela_inativos_rn279(lcd_empresa, trunc(st_e.dt_inicio), lcd_filial,
                          st_e.fl_natureza_empresa, st_e.nu_total_empregado,
                          st_e.cd_modelo_negocio, lcd_tabela_inativo,
                          lnu_controle_inativos, lfl_atende_rn279);
if lcd_tabela_inativo is not null then
  lcd_tabela_copia_inativo := fn_copia_tabela_preco(lcd_tabela_inativo);
  if lcd_tabela_copia_inativo > 0 and lfl_atende_rn279 = 'S' then
    ldt_rn_279_309_2 := trunc(st_e.dt_inicio);
    lfl_rn_279_309   := 2;
  end if;
end if;
```

---

### RN15 -- Flag de Faixa Etaria ANS (RN195) [ANS]

**Categoria:** Calculo
**Risco ANS:** [ANS] RN195 define regras de reajuste por faixa etaria em planos coletivos; flag define se empresa segue essa regra
**Gatilho:** Contrato AFFIX (fn_checa_contrato_affix='S') OU wcd_canal_venda IN (1, 2) OU st_e.nu_total_empregado = 100
**Comportamento:** Se qualquer uma das condicoes acima for verdadeira, v_fl_faixa_ans = 'S', que e gravado em fl_faixa_etaria_ans em tb_empresa_conveniada
**Resultado:** Empresas com ate 100 vidas ou contratos AFFIX tem reajuste por faixa etaria ANS habilitado

**Evidencia:**
```sql
-- Origem: linha ~1948
if fn_checa_contrato_affix(p_nu_controle, 'S') = 'S' or
   wcd_canal_venda in (1, 2) or st_e.nu_total_empregado = 100 then
  v_fl_faixa_ans := 'S';
end if;
-- ... gravado em INSERT tb_empresa_conveniada como fl_faixa_etaria_ans
```

---

### RN16 -- Dois Branches de INSERT em tb_empresa_conveniada (dt_assinatura)

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** dt_inicio <= sysdate AND V_COUNT_DT_ASSINATURA > 0 (fn_verifica_prorrogacao_vigencia retornou TRUE)
**Comportamento:** Branch 1 (dt_inicio passado + prorrogacao vigencia): usa V_DT_PROCESSAMENTO=TRUNC(SYSDATE) como dt_processamento; dt_assinatura=NULL. Branch 2 (demais casos): usa st_e.dt_inicio diretamente; mantem dt_assinatura
**Resultado:** Contratos com prorrogacao de vigencia sao cadastrados com data corrente, nao com data retroativa da proposta

**Ambiguidade:** [ATENCAO] A logica inverte: V_COUNT_DT_ASSINATURA=1 define dt_assinatura=NULL e usa data corrente; parece contraintuitivo. Validar com desenvolvedor se a nomenclatura da variavel corresponde ao comportamento esperado

**Evidencia:**
```sql
-- Origem: linha ~2059
IF st_e.dt_inicio <= sysdate and V_COUNT_DT_ASSINATURA > 0 then
  -- Branch 1: insert com V_DT_PROCESSAMENTO, dt_assinatura=trunc(sysdate)
  insert into tb_empresa_conveniada (..., dt_processamento, dt_assinatura, ...)
  values (..., V_DT_PROCESSAMENTO, trunc(sysdate), ...);
else
  -- Branch 2: insert com dt_inicio original
  insert into tb_empresa_conveniada (..., dt_processamento, dt_assinatura, ...)
  values (..., trunc(st_e.dt_inicio), st_e.dt_assinatura, ...);
end if;
```

---

### RN17 -- Validade do Contrato: 12 Meses ou Herdada do Modelo

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** cd_modelo_negocio != 1 (modelos AFFIX e similares)
**Comportamento:** Para modelo_negocio = 1: dt_validade_contrato = dt_inicio + 12 meses. Para outros modelos: herda dt_validade_contrato da empresa-mae/modelo (cd_empresa_cobranca). Se prorrogacao: recalcula para max(12 meses a partir de hoje, validade original)
**Resultado:** Contratos AFFIX herdam vigencia da administradora; contratos atacado tem vigencia propria de 12 meses

**Evidencia:**
```sql
-- Origem: linha ~1926
if st_e.Cd_Modelo_Negocio != 1 then
  select dt_validade_contrato into vdt_validade_contrato
    from tb_empresa_conveniada e
   where upper(e.cd_empresa_conveniada) = st_e.cd_empresa_cobranca
     and e.fl_status = 2 and rownum <= 1;
end if;
if vdt_validade_contrato is null then
  vdt_validade_contrato := add_months(st_e.dt_inicio, 12);
end if;
```

---

### RN18 -- Senha de Acesso Internet: Ultimos 6 Digitos do Codigo Pessoa

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** A senha de acesso internet e gerada como os ultimos 6 digitos do cd_pessoa criptografados via pk_administracao.fn_encripta(senha, 1, 10)
**Resultado:** Empresa recebe acesso internet com senha derivada do proprio codigo; enviada no email de boas-vindas

**Ambiguidade:** [ATENCAO] Senha derivada deterministicamente do cd_pessoa: se cd_pessoa for previsivel, a senha pode ser adivinhada. Risco de seguranca moderado.

**Evidencia:**
```sql
-- Origem: linha ~4355
pk_administracao.fn_encripta(
  substr(to_char(lcd_pessoa), (length(lcd_pessoa) - 5), 6),
  1, 10)
-- Senha exibida no email:
'Senha de acesso a internet: ' || substr(to_char(lcd_pessoa),(length(lcd_pessoa) - 5),6)
```

---

### RN19 -- Controles de Acesso Internet por Dia de Pagamento

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Sempre na inclusao
**Comportamento:** Insere 4 controles de servico (codigos 7, 12, 14, 16) em tb_controle_internet. Para servico 7 (boleto/fatura): dia_limite = 10 se dt_dia_pagamento=5, senao = 15. Para demais: dia_limite = 31
**Resultado:** Controla prazo de acesso por tipo de servico; dia 5 de pagamento tem tolerancia menor

**Evidencia:**
```sql
-- Origem: linha ~4391
for st_controle in (select qt_numero from tb_numero_extenso where qt_numero in (7, 12, 14, 16)) loop
  if st_e.dt_dia_pagamento = 5 and st_controle.qt_numero = 7 then
    wdia_limite := 10;
  elsif st_e.dt_dia_pagamento <> 5 and st_controle.qt_numero = 7 then
    wdia_limite := 15;
  else
    wdia_limite := 31;
  end if;
  insert into tb_controle_internet (cd_acesso, cd_servico, ..., dia_limite_acesso) ...
```

---

### RN20 -- Email de Boas-Vindas por Operadora

**Categoria:** Integracao
**Risco ANS:** N/A
**Gatilho:** st_e.ds_endereco_eletronico IS NOT NULL
**Comportamento:** Seleciona template e remetente conforme cd_empresa_plano: 7 (RN Saude) = pr_send_mail_html_rn com remetente naoresponda-rnsaude@sh.srv.br; demais (!= 14) = pr_send_mail com remetente naoresponda@hapvida.com.br; 14 (NDI SP) = sem envio
**Resultado:** Email enviado apenas para empresas Hapvida (cd_empresa_plano nao 14) ou RN Saude; NDI SP nao recebe email automatico

**Ambiguidade:** [ATENCAO] Dados sensiveis no corpo do email: CNPJ, endereço e senha de acesso transmitidos por email em texto claro. Risco de seguranca potencial dependendo do ambiente de email.

**Evidencia:**
```sql
-- Origem: linha ~4666
if nvl(wcd_empresa_plano, 1) = 7 then
  pr_send_mail_html_rn('naoresponda-rnsaude@sh.srv.br', st_mail.endereco, ...);
else
  if nvl(wcd_empresa_plano, 1) != 14 then
    pr_send_mail('naoresponda@hapvida.com.br', st_mail.endereco, ...);
  end if;
end if;
```

---

### RN21 -- Minimo Contratual Aplicado na Efetivacao

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Existencia de parametro ativo em TB_PARAM_MINIMO_CONTRATUAL para lnu_controle com vigencia cobrindo dt_inicio
**Comportamento:** Consulta parametros de minimo contratual (valor faturamento minimo, quantidade vidas, multa, tipo) e insere em tb_empresa_minimo_contratual com dt_vigencia_fim = NULL
**Resultado:** Empresa cadastrada com clausula de minimo contratual; sem registro = sem minimo contratual

**Evidencia:**
```sql
-- Origem: linha ~4799 (SACTI 1684652)
select cd_minimo_contratual, dt_vigencia_ini, dt_vigencia_fim, vl_multa,
       vl_faturamento_minimo, qtd_vida, fl_tipo_minimo, fl_cobra_comissao, cd_plano ...
  from TB_PARAM_MINIMO_CONTRATUAL
 where nu_controle = lnu_controle and cd_ativo = 'S'
   and DT_VIGENCIA_INI <= st_e.dt_inicio
   and nvl(DT_VIGENCIA_FIM, st_e.dt_inicio) >= st_e.dt_inicio;
insert into tb_empresa_minimo_contratual (...) values (..., null, ...); -- dt_vigencia_fim sempre NULL no cadastro
```

---

### RN22 -- Odonto Urgente (Super Simples) para Empresas sem Odonto

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa nao tem registro em tb_odon_empresa_internet com fl_status_processamento != 2
**Comportamento:** Se nao ha proposta odonto vinculada, chama Pr_Vcc_Empresa_Super_Simples(lcd_empresa) para replicar empresa no modulo de odonto urgente
**Resultado:** Toda empresa cadastrada sem plano odonto recebe automaticamente o modelo Super Simples (SACTI 1124736)

**Evidencia:**
```sql
-- Origem: linha ~4954 (SACTI 1124736, US 898)
select count(1) into wemp_odonto
  from tb_odon_empresa_internet oei, tb_empresa_internet ei
 where oei.nu_controle_saude = ei.nu_controle
   and ei.nu_controle = p_nu_controle
   and ei.fl_status_processamento not in (2);
if wemp_odonto = 0 then
  Humaster.Pr_Vcc_Empresa_Super_Simples(lcd_empresa);
end if;
```

---

### RN23 -- Tratamento de Erro: ROLLBACK + Pendencia + Mascaramento

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** WHEN OTHERS no bloco begin interno (inclusao)
**Comportamento:** Ao ocorrer qualquer excecao: (1) ROLLBACK; (2) log em tb_log_baixa_controle se FL_LOG_BAIXA_CONTROLE = 'S'; (3) verifica se tb_empresa_conveniada foi criado -- se sim, retorna 'procedimento efetuado para empresa,...'; (4) INSERT em TB_PENDENCIA_EMPRESA_INTERNET (CD_PENDENCIA=9); (5) COMMIT; (6) p_erro_controle = NULL
**Resultado:** Erro e silenciado ao retornar p_erro_controle = NULL; chamador nao consegue distinguir erro de sucesso pela variavel de retorno

**Ambiguidade:** [ATENCAO] [CRITICO] p_erro_controle = NULL no handler de erro e comportamento anormalmente perigoso: o chamador (PR_EFETIVA_INTERNET) pode interpretar como sucesso quando houve erro e pendencia. Validar com equipe tecnica.

**Evidencia:**
```sql
-- Origem: linha ~4966
exception
  when others then
    declare v_erro varchar2(1020); v_exists number; begin
      dbms_output.put_line(sqlerrm); -- nao logado em producao
      rollback;
      v_erro := SQLERRM; p_erro_controle := SQLERRM;
      -- ... INSERT tb_pendencia_empresa_internet (CD_PENDENCIA=9) ...
      p_erro_controle := null; -- MASCARA O ERRO
      commit;
    end;
```

---

## 4. Fluxo de Decisao (Narrativa)

A procedure recebe um numero de controle de proposta e processa todos os registros
de tb_empresa_internet com aquele numero e status 0 (nova) ou 8 (reprocessamento).

Para cada proposta elegivel, executa somente o fluxo de INCLUSAO (tp_operacao='1'):

**Fase 1 -- Inicializacao e Validacoes Pre-Processamento:**
Inicializa variaveis, verifica parametro de log, gera codigo de empresa via loop,
valida vendedor, CNPJ em lista negra, resolve filial (com override TAFFIX).

**Fase 2 -- Identificacao do Contrato de Negociacao:**
Detecta se e empresa SIGO coligada (consolida vidas) ou BITIX; busca parametros
de negociacao adequados no cursor cr_empresa_neg ou cr_empresa_neg_bitix.

**Fase 3 -- Validacoes Cadastrais:**
Valida documento (CNPJ/CPF/CAEPF), razao social, natureza empresa, empregados,
dados de endereco (CEP, UF, cidade, logradouro), plano, datas.

**Fase 4 -- Resolucao do Empresa Plano:**
Busca cd_empresa_plano via: (a) senha + area venda; (b) area venda; (c) vendedor;
(d) filial. Fallback: AFFIX=empresa-mae; BITIX=14; default=1.

**Fase 5 -- Gestao de Pessoa:**
Verifica se CNPJ ja tem cd_pessoa; cria novo com digito verificador se necessario.

**Fase 6 -- Estrutura de Precos:**
Para modelo atacado: cria tb_preco_plano exclusiva. Para AFFIX: reutiliza tabela
compartilhada. Copia tb_valor_plano, tb_parametro_franquia, tb_desconto_preco_plano.

**Fase 7 -- Calculos ANS e Vigencia:**
Calcula canal de venda, flag faixa etaria ANS (RN195), tabela de inativos (RN279/309),
verifica prorrogacao de vigencia, define validade do contrato.

**Fase 8 -- Criacao do Contrato Principal:**
INSERT em tb_empresa_conveniada (escolha de branch por prorrogacao).
UPDATE tb_empresa_internet (datas). INSERT tb_natureza_juridica relacionada.
INSERT tb_emp_conveniada_saude_flags, tb_modelo_reaj_empresa, tb_implantacao_emp,
tb_empresa_conveniada_com, tb_empresa_cnpj_contratante, tb_empresa_conveniada_unidade.
Ajuste tabela de precos (fl_tipo_faixa).

**Fase 9 -- Parametrizacao Operacional:**
INSERT tb_parametros_unidade (por plano), tb_controle_fator_empresa, tb_terapias_espec_empresa,
tb_fator_empresa (fatores faixa etaria), tb_fidelizacao_empresa (dt_fim = dt_inicio + 1000 dias).

**Fase 10 -- Endereco e Contatos:**
INSERT/UPDATE tb_empresa_endereco, tb_endereco_pessoa; INSERT tb_contato_pessoa,
tb_meio_comunicacao_pessoa (ate 8 meios de comunicacao).

**Fase 11 -- Historico e Carencias:**
INSERT tb_hist_empresa_conveniada; INSERT tb_compra_carencia, tb_compra_grupo,
tb_compra_modulo, tb_odon_compra_grupo.

**Fase 12 -- Coparticipacao:**
UPDATE tb_controle_fator_empresa (isencoes); INSERT tb_copart_internacao_param_pj,
tb_copart_isnt_tp_benef, tb_copart_tipo_reembolso, tb_copart_tab_empresa.

**Fase 13 -- Reembolso:**
Para cada plano de livre escolha: INSERT tb_reemb_empresa_prazo_pag,
tb_reemb_empresa_prazo_pag_tip, tb_reemb_empresa_tabela, tb_reemb_empresa_composicao.

**Fase 14 -- Acesso Internet:**
INSERT tb_acesso_internet (senha=ultimos 6 digitos cd_pessoa criptografados);
INSERT tb_controle_internet (4 servicos: 7, 12, 14, 16 com dia limite);
UPDATE tb_usuario_titular_internet + tb_usuario_dependente_internet.

**Fase 15 -- Finalizacao:**
INSERT tb_empresa_breakeven (valor=70), tb_acesso_dados_empresa (email ADM).
Envio email boas-vindas (pr_send_mail ou pr_send_mail_html_rn por operadora).
INSERT tb_log_envio_kit. COMMIT. Desconto PIM (pr_desconto_empresa se parametro ativo).
pr_cobranca_falta_param. pr_con_emp_prov (log odonto se ativo). pr_odon_param_esp_empresa
(repasse automatico se parametro 225=1). pr_vcc_empresa_super_simples (se sem odonto).

**Fase 16 (Exception Global):**
ROLLBACK, log de erro, INSERT pendencia, anulacao de p_erro_controle, COMMIT.

---

## 5. Matriz de Regras

| ID   | Gatilho                                          | Logica                                                    | Resultado                              | Categoria     | Risco ANS          |
|------|--------------------------------------------------|-----------------------------------------------------------|----------------------------------------|---------------|--------------------|
| RN01 | p_nu_controle recebido                           | Cursor: fl_status IN (0,8)                                | Loop de processamento                  | Orquestracao  | N/A                |
| RN02 | tp_operacao                                      | Apenas '1' = inclusao                                     | Apenas inclusao de empresas novas      | Orquestracao  | N/A                |
| RN03 | Inicio inclusao                                  | Loop fn_empresa_conveniada ate 10001 tentativas           | Codigo de empresa gerado               | Persistencia  | N/A                |
| RN04 | Sempre                                           | SELECT em tb_vendedor_plano                               | ORA-20201 se nao encontrado            | Validacao     | N/A                |
| RN05 | Sempre                                           | CNPJ em tb_pessoa_lista_negra (dentro de periodo)         | ORA-20201 se restrito                  | Validacao     | N/A                |
| RN06 | Sempre                                           | Hierarquia: contrato > TAFFIX > vendedor                  | lcd_filial definido                    | Orquestracao  | N/A                |
| RN07 | Empresa SIGO coligada                            | SUM vidas de tb_empresa_coligada                          | Precificacao pelo grupo                | Calculo       | N/A                |
| RN08 | Deteccao BITIX/SIGO                              | Cursores distintos com datas diferentes                   | lnu_controle de parametros             | Calculo       | N/A                |
| RN09 | Sempre                                           | fn_check_cic + fn_check_caepf                             | ORA-20201 se invalido                  | Validacao     | N/A                |
| RN10 | Sempre                                           | ~18 validacoes de campos obrigatorios                     | ORA-20201 por campo faltante           | Validacao     | N/A                |
| RN11 | Apos consolidar vidas                            | 1-29=canal1; 30-99=canal2; >=100=null                     | wcd_canal_venda                        | Calculo       | N/A                |
| RN12 | wfl_tabela_geral                                 | modelo=1: cria tabela; modelo!=1: reutiliza               | lcd_tabela                             | Persistencia  | N/A                |
| RN13 | fl_coparticipacao da proposta                    | Filtra planos por fl_participacao ANS                     | Planos corretos copiados               | Calculo       | [ANS] RN195        |
| RN14 | Sempre                                           | pr_tabela_inativos_rn279 + fn_copia_tabela_preco          | lfl_rn_279_309 e datas                 | Calculo       | [ANS] RN279/309    |
| RN15 | AFFIX ou 1-100 vidas                             | fn_checa_contrato_affix OU canal IN (1,2) OU 100 vidas    | v_fl_faixa_ans = 'S'                   | Calculo       | [ANS] RN195        |
| RN16 | dt_inicio <= sysdate + prorrogacao               | Dois branches do INSERT principal                         | Datas processamento diferenciadas      | Persistencia  | N/A                |
| RN17 | cd_modelo_negocio                                | modelo!=1: herda validade da mae; modelo=1: +12 meses     | vdt_validade_contrato                  | Calculo       | N/A                |
| RN18 | Sempre                                           | Ultimos 6 digitos cd_pessoa criptografados                | Senha acesso internet                  | Persistencia  | N/A                |
| RN19 | Sempre                                           | 4 servicos; dia_limite por dt_dia_pagamento               | Controles acesso internet              | Persistencia  | N/A                |
| RN20 | ds_endereco_eletronico nao nulo                  | Template por cd_empresa_plano (7/14/outros)               | Email boas-vindas enviado              | Integracao    | N/A                |
| RN21 | Existencia em TB_PARAM_MINIMO_CONTRATUAL         | Vigencia ativa cobrindo dt_inicio                         | INSERT tb_empresa_minimo_contratual    | Persistencia  | N/A                |
| RN22 | Ausencia de odonto vinculado                     | count oei = 0                                             | Pr_Vcc_Empresa_Super_Simples chamada   | Orquestracao  | N/A                |
| RN23 | WHEN OTHERS no bloco inclusao                    | ROLLBACK + pendencia + p_erro_controle=NULL + COMMIT      | Erro silenciado; pendencia registrada  | Orquestracao  | N/A                |

---

## 6. Smells Identificados

| ID  | Tipo                            | Localizacao                              | Impacto  | Sugestao                                                                  |
|-----|---------------------------------|------------------------------------------|----------|---------------------------------------------------------------------------|
| S01 | Excecao engolida massiva        | 80+ blocos WHEN OTHERS THEN NULL         | Alto     | Propagar excecoes ou registrar todas em log; jamais silenciar             |
| S02 | COMMIT dentro de loop           | L2368: commit apos UPDATE tb_empresa_internet dentro do for loop | Alto     | Mover COMMIT para apos conclusao completa do processamento                |
| S03 | God Procedure                   | 5025 linhas, 40+ tabelas                 | Alto     | Decompor em procedures por dominio (Pessoa, Preco, Acesso, Endereco...) |
| S04 | Mascaramento de erro critico    | L5019: p_erro_controle := null no handler | Alto     | Retornar codigo de erro distinto; nao anular o retorno de erro           |
| S05 | MAX+1 como sequence              | ~15 ocorrencias (tb_log_baixa_controle, tb_reemb_empresa_prazo_pag, etc.) | Medio    | Usar SEQUENCE dedicada; MAX+1 gera race condition em concorrencia        |
| S06 | Dead code: ELSIF duplicado      | L2620: elsif lfl_tipo_faixa = 1 (igual ao IF L2599) | Baixo    | Remover bloco inacessivel; corrigir para lfl_tipo_faixa = 2 se intencional |
| S07 | Valores hardcoded               | fl_status=2, fl_tipo_empresa=1, fl_utilizacao=1, fl_tipo_contrato_emp=6, qt_meses=12, cd_pendencia=9, vl_breakeven=70 | Medio    | Extrair para TB_REG_ANS_PARAMETRO ou constantes nomeadas                |
| S08 | Logica de negocio em DECODE     | L2156: DECODE(cd_empresa_odonto, null, 85); L1428: DECODE(fn_check_cic, 1, 1, 2) | Medio    | Extrair para regras explicitas nomeadas                                   |
| S09 | Dados sensiveis em email plaintext | L4686, L4731: CNPJ e senha no corpo do email | Alto     | Nao transmitir CNPJ/senha em email; usar link seguro                    |
| S10 | Senha previsivel/deterministica | L4355: senha = ultimos 6 digitos do cd_pessoa | Alto     | Gerar senha aleatoria criptograficamente segura                          |
| S11 | Variavel declarada e comentada  | L0017: -- lexiste number;               | Baixo    | Remover declaracao morta                                                  |
| S12 | Cursor N+1 implicito            | Cursores aninhados (for st_preco in (...) loop / for st_fator in (...)) | Medio    | Reavaliar queries bulk em lugar de cursores aninhados                    |
| S13 | dbms_output em producao         | L4972: dbms_output.put_line(sqlerrm)    | Baixo    | Usar framework de log adequado; dbms_output nao e capturado em JOBs      |

---

## 7. Tratamento de Excecoes

| Excecao                    | ORA-    | Quando Ocorre                              | Tratamento Atual                              | Recomendado                                       |
|----------------------------|---------|--------------------------------------------|-----------------------------------------------|---------------------------------------------------|
| NO_DATA_FOUND (vendedor)   | -01403  | Vendedor nao existe em tb_vendedor_plano   | raise_application_error(-20201, ...)          | Adequado; melhorar mensagem                       |
| NO_DATA_FOUND (empresa_neg)| -01403  | Parametros negociacao nao encontrados      | raise_application_error(-20201, ...)          | Adequado; melhorar mensagem                       |
| DUP_VAL_ON_INDEX (acesso)  | -00001  | cd_acesso duplicado em tb_acesso_internet  | lcd_acesso := null (busca existente)          | Adequado                                          |
| OTHERS (inner blocks)      | N/A     | Qualquer erro em blocos internos           | WHEN OTHERS THEN NULL (80+ ocorrencias)       | [CRITICO] Propagar ou logar todas as excecoes     |
| OTHERS (outer handler)     | N/A     | Erro nao tratado em bloco inclusao         | ROLLBACK + pendencia + p_erro_controle=NULL   | [CRITICO] Nao anular p_erro_controle; retornar erro |

---

## 8. Riscos ANS

| ID    | Area              | Descricao                                                                 | Regras  | Severidade | Acao                                                       |
|-------|-------------------|---------------------------------------------------------------------------|---------|------------|-----------------------------------------------------------|
| ANS01 | Coparticipacao    | Planos selecionados por fl_coparticipacao (RN195): erro na flag gera planos errados | RN13    | Alta       | Validar alinhamento de fl_coparticipacao com ANS           |
| ANS02 | Inativos (RN279)  | Tabela de inativos e flags de RN279/309 gravados automaticamente na efetivacao | RN14    | Alta       | Validar logica de pr_tabela_inativos_rn279 periodicamente  |
| ANS03 | Faixa Etaria (RN195) | fl_faixa_etaria_ans define se empresa segue reajuste por faixa ANS       | RN15    | Alta       | Verificar se condicao (100 vidas exato) e correta vs regra atual ANS |
| ANS04 | Coparticipacao    | tb_controle_fator_empresa: fl_cobra_internacao e parametros de PJ         | S01     | Media      | Garantir que isencoes e parametros sejam auditaveis        |
| ANS05 | Vigencia          | dt_rn_279_309 e dt_rn_279_309_2 com valores hardcode (sysdate / dt_inicio)| RN14    | Media      | Revisar se datas gravadas estao conformes com RN279/309 ANS|

---

## 9. Ecossistema

- **Input:** tb_empresa_internet (fl_status_processamento IN 0,8) -- proposta provisoria da internet
- **Input parametros:** tb_empresa_neg, tb_empresa_neg_tabela e demais neg_* -- parametrizacao contratual
- **Output principal:** tb_empresa_conveniada -- contrato efetivado
- **Output secundario:** 40+ tabelas de parametrizacao operacional
- **Integracao:** pr_send_mail / pr_send_mail_html_rn -- email boas-vindas
- **Integracao:** pr_odon_param_esp_empresa -- repasse odonto automatico
- **Chamadores diretos:** PR_EFETIVA_INTERNET, PR_BAIXA_EMPRESA_COLIGADA, PR_BAIXA_EMP_COLIGADA_SAUDE, PR_EFETIVA_BAIXA_COLIGADA, PK_PIM

---

## 10. Painel de Decisao (PO)

**Ambiguidades e pendencias para validacao:**

| ID  | Descricao                                                                                      | Tipo        | Acao                                           |
|-----|-----------------------------------------------------------------------------------------------|-------------|------------------------------------------------|
| A01 | Sem tratamento para tp_operacao != '1': alteracao e exclusao de empresas nao implementados nesta procedure. Intencional? | [ATENCAO]  | Confirmar com PO se ha procedure separada para outros tp_operacao |
| A02 | p_erro_controle = NULL no handler de erro: chamador interpreta erro como sucesso              | [CRITICO]   | Validar com equipe tecnica urgente             |
| A03 | V_COUNT_DT_ASSINATURA=1 zera dt_assinatura: comportamento contraintuitivo na nomenclatura     | [ATENCAO]   | Validar com desenvolvedor original             |
| A04 | Condição fl_faixa_etaria_ans para 100 vidas exatas: e regra ANS ou limitacao tecnica?          | [ANS]       | Confirmar com equipe regulatoria ANS           |
| A05 | Senha gerada como ultimos 6 digitos do cd_pessoa: risco de seguranca para acesso internet     | [CRITICO]   | Avaliar com equipe de segurança                |
| A06 | wfl_tabela_geral: SACTI 449802 ampliou de modelo=2 para modelo!=1 -- outros modelos de negocio corretos? | [ATENCAO] | Verificar se todos os modelos != 1 devem compartilhar tabela |
| A07 | tb_empresa_breakeven com valor fixo=70: origem e significado do valor 70                     | [ATENCAO]   | Confirmar com PO o significado operacional     |
| A08 | dt_fim de fidelizacao = dt_inicio + 1000 dias (hardcode): regra de negocio ou placeholder?   | [ATENCAO]   | Confirmar com PO                               |

**Aprovacao:**
- [ ] Aprovado -- seguir com as regras extraidas
- [ ] Aprovado com ressalvas: [detalhar]
- [ ] Reprovado -- redesenhar antes de continuar

---

[HANDOFF-DDD]
Eng. reversa concluida. Artefato pronto para consumo pelo Agente DDD.
Leitura obrigatoria antes de iniciar DDD:
- Este arquivo: reversa-pr-cadastramento-empresa-prov.md
- _shared/base-conhecimento/catalogo-tabelas.md
- _shared/dicionario-dominio.md
