# Catalogo de Objetos PL/SQL

> Atualizado em: 17/04/2026
> Fonte: Agente Eng. Reversa

---

## PK_VENDA_JSON

| Atributo          | Valor                                                              |
|-------------------|--------------------------------------------------------------------|
| Tipo              | PACKAGE (spec + body)                                              |
| Schema            | HUMASTER                                                           |
| CVS (spec)        | C:\CVS\health_install\package\pk_venda_json.sql                    |
| CVS (body)        | C:\CVS\health_install\package_body\pk_venda_json.sql               |
| Versao CVS        | PRODUCAO-20260402 (02/04/2026)                                     |
| Tamanho           | 6.334 linhas body, 275 KB                                          |
| Status Producao   | PACKAGE VALID (02/04/2026); SYNONYM PUBLIC VALID (26/03/2026); PACKAGE BODY nao visivel via all_objects |
| Parametros IN     | Varia por rotina -- ver spec                                       |
| Eng. Reversa      | [OK] `output/rotinas/pk_venda_json/rev-PRODUCAO-20260402/01-engenharia-reversa/reversa-pk-venda-json.md` |

**Responsabilidade:** Package de integracao JSON (origem BITIX) e efetivacao automatica de propostas PIM/PME/POS provenientes dessa ferramenta de venda.
Ponto de entrada para propostas via sistema BITIX (pr_pim_insere_cnpj).
Motor de criticas/pendencias com 3 modos (fn_get_criticas_pendencias).
Chamado por PR_EFETIVA_INTERNET (pr_efetiva) e pelo sistema externo BITIX.
Trata propostas de **Venda Administrativa (ADM)**: identificacao via CD_EMP_ANTERIOR no JSON, recuperacao de carencia (CD_CONVENIO=542), tratamento de alto risco com deliberacao (FL_STATUS=3 AGUARDANDO_ADM) e importacao de declaracao de saude do contrato anterior. [REF RN17-RN22]

**Rotinas internas:**

| Rotina | Tipo | Visibilidade | Responsabilidade |
|---|---|---|---|
| pr_pim_pendencia | PROC | Privada | Atualiza tb_pendencia_usuario pos efetivacao |
| pr_efetiva | PROC | Publica | Orquestrador JOB: processa propostas status 6 em batch |
| pr_efetiva_baixa_manual | PROC | Publica | Efetivacao de proposta especifica (manual/JOB) |
| pr_efetiva_baixa_manual_emp | PROC | Publica | Efetivacao so da empresa (BITIX) |
| pr_set_usuario_od | PROC | Publica | Cria/atualiza beneficiarios odonto |
| pr_control_internet | PROC | Publica | Gerencia tb_pim_controle_cpf |
| pr_set_usuario_internet | PROC | Publica | Insere beneficiarios do JSON em staging |
| fn_set_empresa_internet | FUNC | Publica | Deserializa JSON empresa -> %ROWTYPE |
| pr_pim_insere_cnpj | PROC | Publica | Entrada JSON BITIX: processa proposta completa, retorna JSON |
| fn_get_blocklist_emp | FUNC | Publica | Verifica blocklist em tb_file_documento_bitix |
| fn_get_pend_neoway | FUNC | Publica | Verifica fl_status_processamento=17 (Neoway) |
| fn_get_criticas_pendencias | FUNC | Publica | Motor de criticas/pendencias (3 modos: N/E/S) |

**Sub-rotinas externas chamadas (novas -- nao catalogadas anteriormente):**

| Sub-rotina | Tipo | Status MCP |
|---|---|---|
| FN_VALIDA_COLIGADA | FUNCTION | Sinonimo VALID (09/04/26) |
| PR_VALIDA_BAIXA_COLIGADA_BITIX | PROCEDURE | Sinonimo VALID (09/04/26) |
| pr_cadastramento_empresa_baixa | PROCEDURE | VALID (26/03/26) |
| pr_critica_internet_odonto | PROCEDURE | Sinonimo VALID (09/04/26) |
| pr_odon_plano_odonto | PROCEDURE | Sinonimo VALID (23/06/24) |
| pr_set_emp_fluxo_pos | PROCEDURE | Sinonimo VALID (30/09/25) |
| fn_get_emp_fluxo_pos | FUNCTION | Sinonimo VALID (30/09/25) |
| fn_get_confopera_emp | FUNCTION | Sinonimo VALID (26/03/26) |
| PR_VE_DIVERGENCIA_NEOWAY | PROCEDURE | Sinonimo VALID (09/04/26) -- compara dados cadastrais dos beneficiarios em staging (TB_USUARIO_TITULAR_INTERNET, TB_USUARIO_DEPENDENTE_INTERNET) contra a base Neoway; seta fl_status_processamento='17' nos beneficiarios com divergencia cadastral. Chamada em pr_pim_insere_cnpj SOMENTE quando FL_STATUS=1 (proposta devolvida) e PK_VENDA_JSON_EXECUTA_NEOWAY='S'. [REF RN14] |
| PR_CRITICA_65_ANOS_DIGITACAO | PROCEDURE | Sinonimo VALID (09/04/26) |
| pk_json_ext | PACKAGE | Sinonimo VALID (23/06/24) |

---

## PR_EFETIVA_INTERNET

| Atributo          | Valor                                                     |
|-------------------|-----------------------------------------------------------|
| Tipo              | PROCEDURE                                                 |
| Schema            | HUMASTER                                                  |
| CVS               | C:\CVS\health_install\procedure\pr_efetiva_internet.sql   |
| Versao CVS        | PRODUCAO-20251014 (14/10/2025)                            |
| Tamanho           | 2.290 linhas, 99 KB                                       |
| Status Producao   | Sinonimo PUBLICO INVALID (09/04/2026); objeto HUMASTER sem grant visivel para C_RAWEL |
| Natureza          | JOB orquestrador (DBMS_JOB / DBMS_SCHEDULER)             |
| Parametros IN     | Nenhum                                                    |
| Parametros OUT    | Nenhum                                                    |
| Retorno           | N/A                                                       |
| Eng. Reversa      | [OK] `rev-PRODUCAO-20251014/01-engenharia-reversa/reversa-pr-efetiva-internet.md` |

**Responsabilidade:** Batch orquestrador de efetivacao automatica de movimentacoes PIM.
Processa 9 fases sequenciais: PME modelo, PIM principal, odonto puro, inclusoes, completo, individual, obrigacao odonto, BITIX, coligadas SIGO.

**Sub-rotinas chamadas:**

| Sub-rotina                    | Tipo              | Schema  | Status MCP                         |
|-------------------------------|-------------------|---------|------------------------------------|
| fn_registro_sistema           | FUNCTION          | HUMASTER| VALID (12/03/2026)                 |
| fn_vi_checa_orcamento         | FUNCTION          | HUMASTER| Sinonimo VALID; objeto sem grant   |
| Fn_Efetiva_Adesao_Digital     | FUNCTION          | HUMASTER| VALID (26/03/2026)                 |
| pr_cadastramento_internet2    | PROCEDURE         | HUMASTER| Sinonimo VALID (16/04/2026)        |
| pr_cadastramento_empresa_prov | PROCEDURE         | HUMASTER| Sinonimo VALID (16/04/2026)        |
| pr_critica_empresa_internet_1 | PROCEDURE         | HUMASTER| Sinonimo VALID (09/04/2026)        |
| fn_checa_divergencia          | FUNCTION          | HUMASTER| Sinonimo VALID (23/06/2024)        |
| pr_critica_internet           | PROCEDURE         | HUMASTER| Sinonimo VALID (09/04/2026)        |
| pr_odon_cad_empresa_prov      | PROCEDURE         | HUMASTER| Sinonimo VALID (09/04/2026)        |
| PR_NAT_JURIDICA_ODON          | PROCEDURE         | HUMASTER| Sinonimo VALID (09/04/2026)        |
| pr_odon_Obrigacao_Agregado    | PROCEDURE         | HUMASTER| Sinonimo VALID (01/02/2026)        |
| PR_COLIGA_EMPRESA_BITIX       | PROCEDURE         | HUMASTER| Sinonimo VALID (15/11/2024) -- registra em TB_EMPRESA_COLIGADA as coligadas vindas da origem BITIX (descritas em TB_EMPRESA_COLIGADA_BITX). E a procedure responsavel por unificar as coligadas BITIX na tabela canonica TB_EMPRESA_COLIGADA. [REF RN-T10] |
| PK_VENDA_JSON.pr_efetiva      | PACKAGE PROCEDURE | HUMASTER| PACKAGE VALID (02/04/2026)         |
| pr_processa_empresa_coligada  | PROCEDURE         | HUMASTER| Sinonimo VALID (09/04/2026)        |
| fn_valida_coligada_baixa      | FUNCTION          | HUMASTER| Sinonimo VALID (09/04/2026)        |
| fn_individual_familiar        | FUNCTION          | HUMASTER| VALID (26/03/2026)                 |
| fn_odon_venda_pendente_site   | FUNCTION          | HUMASTER| Sinonimo VALID (23/06/2024)        |
| pk_administracao.fn_check_cic | PACKAGE FUNCTION  | HUMASTER| PACKAGE VALID (26/03/2026)         |
| pk_nk4trace.t                 | PACKAGE PROCEDURE | HUMASTER| Sinonimo VALID (23/06/2024)        |

---

## PR_CADASTRAMENTO_EMPRESA_PROV

| Atributo     | Valor                                    |
|--------------|------------------------------------------|
| Tipo         | PROCEDURE                                |
| Schema       | HUMASTER                                 |
| CVS          | C:\CVS\health_install\procedure\pr_cadastramento_empresa_prov.sql |
| Versao CVS   | PRODUCAO-20260402 (02/04/2026)           |
| Tamanho      | 5.025 linhas, 202 KB                     |
| Status MCP   | Sinonimo PUBLICO VALID (16/04/2026)      |
| Eng. Reversa | [OK] `output/rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/01-engenharia-reversa/reversa-pr-cadastramento-empresa-prov.md` |
| Chamado por  | PR_EFETIVA_INTERNET, PR_BAIXA_EMPRESA_COLIGADA, PR_BAIXA_EMP_COLIGADA_SAUDE, PR_EFETIVA_BAIXA_COLIGADA, PK_PIM |

**Responsabilidade:** Efetiva cadastramento definitivo de empresa conveniada a partir de proposta em tb_empresa_internet (fl_status IN 0,8). Cria contrato em tb_empresa_conveniada e parametriza mais de 40 tabelas operacionais. Suporta apenas tp_operacao='1' (inclusao).

**Parametros:**
- IN: p_nu_controle NUMBER -- controle da proposta em tb_empresa_internet
- OUT: p_erro_controle VARCHAR2 -- mensagem ('procedimento efetuado para empresa, XXXXX' em sucesso; NULL em erro tratado)

**Sub-rotinas chamadas:**

| Sub-rotina                          | Tipo      | Status MCP                    |
|-------------------------------------|-----------|-------------------------------|
| fn_empresa_conveniada               | FUNCTION  | Sinonimo VALID (09/04/2026)   |
| fn_cd_tb_preco_plano                | FUNCTION  | Sinonimo VALID (23/06/2024)   |
| fn_copia_tabela_preco               | FUNCTION  | Sinonimo VALID (23/06/2024)   |
| fn_checa_contrato_affix             | FUNCTION  | Sinonimo VALID (09/04/2026)   |
| fn_check_caepf                      | FUNCTION  | Sinonimo VALID (23/06/2024)   |
| fn_buscar_dia_pagamento             | FUNCTION  | Sinonimo VALID (06/06/2025)   |
| fn_registro_sistema                 | FUNCTION  | VALID (12/03/2026)            |
| fn_terminal                         | FUNCTION  | VALID (23/06/2025)            |
| fn_verifica_prorrogacao_vigencia    | FUNCTION  | Sinonimo VALID (23/06/2024)   |
| fn_plano_livre_escolha              | FUNCTION  | Sinonimo VALID (23/06/2024)   |
| pr_tabela_inativos_rn279            | PROCEDURE | Sinonimo VALID (23/06/2024)   |
| pr_desconto_empresa                 | PROCEDURE | Sinonimo VALID (09/04/2026)   |
| pr_cobranca_falta_param             | PROCEDURE | Sinonimo VALID (09/04/2026)   |
| pr_con_emp_prov                     | PROCEDURE | Sinonimo VALID (09/04/2026)   |
| pr_odon_param_esp_empresa           | PROCEDURE | Sinonimo VALID (09/04/2026)   |
| pr_send_mail                        | PROCEDURE | VALID (05/03/2026)            |
| pr_send_mail_html_rn                | PROCEDURE | Sinonimo VALID (23/06/2024)   |
| pr_vcc_empresa_super_simples        | PROCEDURE | Sinonimo VALID (09/04/2026)   |
| pk_administracao.fn_check_cic       | FUNC/PKG  | PK_ADMINISTRACAO              |
| pk_administracao.fn_digito_out      | FUNC/PKG  | PK_ADMINISTRACAO              |
| pk_administracao.fn_encripta        | FUNC/PKG  | PK_ADMINISTRACAO              |

**Contrato atual:**
```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
);
```
[CRITICO] Retorno via parsing de string -- ver `proposta-novo-contrato-retorno.md`.
