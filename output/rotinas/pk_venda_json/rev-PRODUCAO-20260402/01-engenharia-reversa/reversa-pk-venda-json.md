# Engenharia Reversa: PK_VENDA_JSON

**Data:** 17/04/2026
**Analista:** Agente Eng. Reversa
**Versao CVS (tag PRODUCAO):** PRODUCAO-20260402 (02/04/2026)
**Origem CVS (spec):** C:\CVS\health_install\package\pk_venda_json.sql
**Origem CVS (body):** C:\CVS\health_install\package_body\pk_venda_json.sql
**Status em producao (MCP):**
- PACKAGE: VALID (02/04/2026) -- confirmado via all_objects
- PACKAGE BODY: nao visivel via all_objects para o usuario de consulta -- analisado exclusivamente via CVS
- SYNONYM PUBLIC.PK_VENDA_JSON: VALID (26/03/2026)

[ATENCAO] A01: Usuario informou Schema = HEALTH. Codigo CVS e objeto em producao estao em HUMASTER.
[ATENCAO] A02: PACKAGE BODY nao retornou em all_objects. Possivelmente sem grant de visualizacao para o usuario MCP. CVS prevalece como fonte de verdade.

---

## 1. Assinatura

| Atributo | Valor |
|---|---|
| Tipo | PACKAGE (spec + body) |
| Schema | HUMASTER |
| Nome | PK_VENDA_JSON |
| Linhas (spec) | 42 |
| Linhas (body) | 6.334 |
| Parametros | N/A -- package com multiplas rotinas internas |
| Retorno | N/A |

### 1.1 Variaveis Globais de Package (estado compartilhado)

[CRITICO] S04: 15 variaveis globais mutaveis declaradas na spec. Estado compartilhado entre chamadas distintas. Risco de corrupcao em execucoes concorrentes (ex: JOB paralelo + chamada BITIX simultanea).

| Variavel | Tipo | Proposito Inferido |
|---|---|---|
| G_PROVISORIO | varchar2(20) | Numero de controle provisorio da empresa sendo processada |
| G_NU_CONTROLE_TIT | varchar2(20) | Controle do titular saude |
| G_NU_CONTROLE_DEP | varchar2(20) | Controle do dependente saude |
| V_COD_FILIAL | varchar2(30) | Codigo da filial do vendedor |
| V_COD_OPERADORA | varchar2(30) | Hardcode 'BITIX' em pr_pim_insere_cnpj |
| G_PROPOSTA | varchar2(50) | Numero da proposta em processamento |
| G_STATUS_PROPOSTA | varchar2(2) | Status da proposta em processamento |
| G_COD_TITULAR | varchar2(25) | Codigo do titular |
| G_PROVISORIO_CRITICA | varchar2(25) | Controle provisorio para retorno de criticas |
| G_BENE_ALTO_RISCO | number | Flag de beneficiario alto risco |
| G_CD_EMP_ANTERIOR | varchar2(20) | Identificacao de proposta ADM: codigo da empresa anterior do contrato sendo renegociado; IS NOT NULL indica fluxo Venda Administrativa [REF RN17] |
| G_DELIBERACAO | number | Flag de deliberacao de alto risco |
| G_PROPOSTA_ERRO | varchar2(50) | Numero da proposta em caso de erro |
| G_TOTAL_BENEFICIARIO | number | Total de beneficiarios informado no JSON |
| G_COUNT_BENEFIIFIM | number | Contador de beneficiarios efetivamente processados |

### 1.2 Rotinas Internas

| Rotina | Tipo | Linhas | Visibilidade | Responsabilidade |
|---|---|---|---|---|
| pr_pim_pendencia | PROCEDURE | L7-131 | Privada | Atualiza tb_pendencia_usuario pos efetivacao |
| pr_efetiva | PROCEDURE | L132-801 | Publica | Orquestrador JOB: processa todas as propostas status 6 |
| pr_efetiva_baixa_manual | PROCEDURE | L802-1332 | Publica | Efetivacao de proposta especifica (manual ou JOB) |
| pr_efetiva_baixa_manual_emp | PROCEDURE | L1333-1746 | Publica | Efetivacao so da empresa (BITIX especifico) |
| pr_set_usuario_od | PROCEDURE | L1747-2772 | Publica | Cria/atualiza registros de beneficiarios odonto |
| pr_control_internet | PROCEDURE | L2773-2821 | Publica | Gerencia tb_pim_controle_cpf (mapeamento saude-odonto) |
| pr_set_usuario_internet | PROCEDURE | L2822-4343 | Publica | Insere beneficiarios do JSON em tb_usuario_titular/dependente_internet |
| fn_set_empresa_internet | FUNCTION | L4344-4636 | Publica | Desserializa JSON da empresa para tb_empresa_internet%ROWTYPE |
| pr_pim_insere_cnpj | PROCEDURE | L4637-6055 | Publica | Ponto de entrada JSON BITIX: processa proposta completa |
| fn_get_blocklist_emp | FUNCTION | L6056-6076 | Publica | Verifica se proposta tem documento blocklist |
| fn_get_pend_neoway | FUNCTION | L6077-6100 | Publica | Verifica se algum beneficiario esta com status Neoway (17) |
| fn_get_criticas_pendencias | FUNCTION | L6101-6290 | Publica | Motor de criticas e pendencias com 3 modos de validacao |

---

## 2. Arvore de Dependencias

### 2.1 Sub-rotinas Chamadas (externas)

| Sub-rotina | Tipo | Schema | Responsabilidade | Status MCP | Catalogada |
|---|---|---|---|---|---|
| fn_registro_sistema | FUNCTION | HUMASTER | Consulta parametros de configuracao do sistema | VALID | [REF] |
| pr_cadastramento_empresa_prov | PROCEDURE | HUMASTER | Cadastra empresa provisoria e retorna cd_empresa | Sinonimo VALID | [REF] |
| pr_odon_cad_empresa_prov | PROCEDURE | HUMASTER | Cadastra empresa odonto provisoria | Sinonimo VALID | [REF] |
| pr_critica_internet | PROCEDURE | HUMASTER | Executa criticas de beneficiario titular | Sinonimo VALID | [REF] |
| pr_cadastramento_internet2 | PROCEDURE | HUMASTER | Efetiva beneficiario individual | Sinonimo VALID | [REF] |
| PR_NAT_JURIDICA_ODON | PROCEDURE | HUMASTER | Processa natureza juridica odonto | Sinonimo VALID | [REF] |
| FN_VALIDA_COLIGADA | FUNCTION | HUMASTER | Valida se coligadas podem ser baixadas | Sinonimo VALID (09/04/26) | [-] Nao catalogada |
| PR_VALIDA_BAIXA_COLIGADA_BITIX | PROCEDURE | HUMASTER | Valida baixa de coligada BITIX | Sinonimo VALID (09/04/26) | [-] Nao catalogada |
| pr_cadastramento_empresa_baixa | PROCEDURE | HUMASTER | Criticas de empresa (pendencias de cadastro) | VALID (26/03/26) | [-] Nao catalogada |
| pr_critica_internet_odonto | PROCEDURE | HUMASTER | Executa criticas de beneficiario odonto | Sinonimo VALID (09/04/26) | [-] Nao catalogada |
| pr_odon_plano_odonto | PROCEDURE | HUMASTER | Resolve plano odonto a partir de cd_plano | Sinonimo VALID (23/06/24) | [-] Nao catalogada |
| pr_set_emp_fluxo_pos | PROCEDURE | HUMASTER | Registra status de fluxo POS na tabela de controle | Sinonimo VALID (30/09/25) | [-] Nao catalogada |
| fn_get_emp_fluxo_pos | FUNCTION | HUMASTER | Consulta status de fluxo POS | Sinonimo VALID (30/09/25) | [-] Nao catalogada |
| fn_get_confopera_emp | FUNCTION | HUMASTER | Indica se proposta segue fluxo POSBAIXA (conferencia documental apos efetivacao); retorna 1=POSBAIXA, 0=PRE | Sinonimo VALID (26/03/26) | [-] Nao catalogada |
| PR_VE_DIVERGENCIA_NEOWAY | PROCEDURE | HUMASTER | Compara dados cadastrais dos beneficiarios em staging contra a base Neoway; seta fl_status_processamento='17' nos beneficiarios com divergencia. Chamada SOMENTE em reintegracao de proposta com FL_STATUS=1 e parametro PK_VENDA_JSON_EXECUTA_NEOWAY='S' [REF RN14] | Sinonimo VALID (09/04/26) | [-] Nao catalogada |
| PR_CRITICA_65_ANOS_DIGITACAO | PROCEDURE | HUMASTER | Critica de limite de 65 anos na digitacao | Sinonimo VALID (09/04/26) | [-] Nao catalogada |
| pk_json_ext.get_string | PACKAGE FN | HUMASTER | Parser JSON: extrai campo string | Sinonimo VALID (23/06/24) | [-] Nao catalogada |
| pk_json_ext.get_json | PACKAGE FN | HUMASTER | Parser JSON: extrai sub-objeto JSON | Sinonimo VALID (23/06/24) | [-] Nao catalogada |

### 2.2 Dependentes (quem chama PK_VENDA_JSON)

| Objeto | Tipo | Schema | Fonte | Rotina chamada |
|---|---|---|---|---|
| PR_EFETIVA_INTERNET | PROCEDURE | HUMASTER | [REF] catalogo-objetos-plsql.md | PK_VENDA_JSON.pr_efetiva |
| BITIX (sistema externo) | APLICACAO | Externo | Inferido de pr_pim_insere_cnpj | PK_VENDA_JSON.pr_pim_insere_cnpj |
| T229B (tela operacional) | APLICACAO | Externo | Inferido de p_origem='T229B' | PK_VENDA_JSON.pr_efetiva_baixa_manual |

[ATENCAO] A03: all_dependencies retornou apenas o sinonimo PUBLIC. Dependentes reais nao visiveis para o usuario MCP. PR_EFETIVA_INTERNET e a unica dependente confirmada via CVS.

### 2.3 Tabelas Acessadas

| Tabela | Operacao | Rotina | Condicao Principal | Observacao |
|---|---|---|---|---|
| TB_PROPOSTA_VENDA | SELECT, UPDATE | pr_efetiva, pr_efetiva_baixa_manual | fl_status = 6, nu_controle = p_nu_controle | Tabela central de ciclo de vida |
| TB_EMPRESA_INTERNET | INSERT, UPDATE, SELECT | pr_pim_insere_cnpj, pr_efetiva | nu_controle = pnu_controle | Staging de empresa saude |
| TB_ODON_EMPRESA_INTERNET | INSERT, UPDATE, SELECT | pr_pim_insere_cnpj, pr_efetiva | nu_controle = pnu_controle_od | Staging de empresa odonto |
| TB_EMPRESA_CONVENIADA | UPDATE | pr_efetiva, pr_efetiva_baixa_manual | cd_empresa_conveniada = l_emp | Empresa definitiva |
| TB_PENDENCIA_EMPRESA | DELETE, INSERT | pr_efetiva, pr_efetiva_baixa_manual | cd_empresa_conveniada = l_emp | Pendencias POS empresa |
| TB_PENDENCIA_EMPRESA_INTERNET | SELECT | fn_get_criticas_pendencias | nu_controle = p_nu_controle | Pendencias staging |
| TB_USUARIO_TITULAR_INTERNET | UPDATE, SELECT | pr_efetiva, fn_get_pend_neoway | cd_empresa = 'T'||nu_controle | Titulares staging |
| TB_USUARIO_DEPENDENTE_INTERNET | UPDATE, SELECT | pr_efetiva, fn_get_pend_neoway | cd_empresa = 'T'||nu_controle | Dependentes staging |
| TB_USUARIO_CRITICA_INTERNET | SELECT | fn_get_criticas_pendencias | nu_controle = reg.nu_controle | Criticas de beneficiario |
| TB_EMPRESA_COLIGADA_BITX | SELECT, INSERT, DELETE | pr_efetiva, pr_pim_insere_cnpj | tprovisorio = nu_controle | Registro de coligadas BITIX |
| TB_PENDENCIA_USUARIO | DELETE, INSERT | pr_pim_pendencia | nu_usuario = wnu_usuario | Pendencias SIGO do beneficiario |
| TB_PESSOA, TB_USUARIO | SELECT | pr_pim_pendencia | u.fl_status_usuario IN (1,2,5) | Lookup usuario definitivo |
| TB_FILE_DOCUMENTO_BITIX | SELECT, DELETE | fn_get_blocklist_emp, pr_pim_insere_cnpj | tprovisorio = p_nu_controle | Documentos e blocklist BITIX |
| TB_STATUS_PROPOSTA_CADASTRO | INSERT, SELECT | pr_pim_insere_cnpj | nu_provisorio = pnu_controle | Log de status de cadastro |
| TB_PIM_CONTROLE_CPF | SELECT, INSERT, UPDATE | pr_set_usuario_od, pr_control_internet | nu_controle = pnu_controle | Mapeamento controle saude-odonto |
| TB_EMPRESA_CNAE | INSERT | pr_efetiva, pr_efetiva_baixa_manual | cd_empresa_conveniada = l_emp | CNAE da empresa |
| TB_USUARIO_ALT_RISCO | DELETE, SELECT, INSERT | pr_pim_insere_cnpj (DELETE), pr_set_usuario_internet (SELECT+INSERT) | tprovisorio = pnu_controle | Beneficiarios alto risco ADM: INSERT em pr_set_usuario_internet quando DEVOLUCAO_TIT_ADM='S' [REF RN18] |
| TB_USUARIO_VENDA_ADM | DELETE, INSERT | pr_pim_insere_cnpj (DELETE+INSERT nivel empresa), pr_set_usuario_internet (INSERT nivel beneficiario) | cd_emp_anterior = G_CD_EMP_ANTERIOR | Registro de venda ADM [REF RN17, RN19, RN21] |
| TB_DECLARACAO_SAUDE_INTERNET | INSERT | pr_set_usuario_internet | nu_controle = TT_DEC.NU_CONTROLE | Declaracao de saude ADM: importada do contrato anterior quando V_CD_USU_ANT_TITULAR IS NOT NULL [REF RN20] |
| TB_VI_DEC_SAUDE_INT_GRUPO_CID | INSERT | pr_set_usuario_internet | nu_controle = TT_DEC.NU_CONTROLE | CID da declaracao de saude ADM importada do contrato anterior [REF RN20] |
| TB_NATUREZA_JURIDICA_EMP | DELETE | pr_pim_insere_cnpj | tprovisorio = pnu_controle | Natureza juridica staging |
| TB_TP_PEND_EMPRESA_INTERNET | SELECT | fn_get_criticas_pendencias | cd_pendencia = a.cd_pendencia | Tipos de pendencia |

### 2.4 Outros Objetos

| Objeto | Tipo | Finalidade |
|---|---|---|
| SQ_EMPRESA_INTERNET | SEQUENCE | Gera pnu_controle e pnu_controle_od (Sinonimo VALID) |
| SQ_CONTROLE_INTERNET | SEQUENCE | Gera pnu_controle_tit_od (Sinonimo VALID) |
| SQ_CONTROLE_PENDENCIA | SEQUENCE | Gera nu_controle_pendencia (Sinonimo VALID) |
| TP_JSON | TYPE | Objeto Oracle JSON -- parse e construcao (Sinonimo VALID) |
| TP_JSON_LIST | TYPE | Lista de objetos JSON Oracle (Sinonimo VALID) |
| DBMS_LOB | PACKAGE Oracle | Manipulacao de CLOBs (createtemporary) |

---

## 3. Regras de Negocio

### RN01 -- Controle de fluxo por parametro de sistema (pr_efetiva)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Sempre que pr_efetiva e executada (JOB ou chamada direta)
**Comportamento:** A function fn_registro_sistema('PK_VENDA_JSON_PR_EFETIVA_01') retorna 'S' ou 'N'.
Se 'N': fluxo legado simplificado (dois loops separados: nao-coligadas e coligadas).
Se 'S': fluxo avancado com CTE (WITH QTD_COLIGADA) que verifica completude do grupo antes de baixar.
**Resultado:** Caminhos completamente distintos de processamento.
**Ambiguidade:** [ATENCAO] A04: valor deste parametro em producao nao foi verificado via MCP. O caminho efetivamente executado e desconhecido sem confirmacao do DBA.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 163
if fn_registro_sistema('PK_VENDA_JSON_PR_EFETIVA_01') = 'S' then
  -- fluxo legado: dois loops separados nao-coligadas e coligadas
  for st_e in (SELECT BB.NU_CONTROLE FROM TB_PROPOSTA_VENDA BB
               WHERE BB.FL_STATUS = 6
               AND NOT EXISTS (SELECT 1 FROM TB_EMPRESA_COLIGADA_BITX T
                               WHERE T.TPROVISORIO = BB.NU_CONTROLE)) loop
    ...
  else
    -- fluxo avancado: CTE + validacao de grupo completo
    FOR ST_VAL IN (SELECT NU_CONTROLE, NU_CONTROLE_OD FROM TB_PROPOSTA_VENDA CC,
                   (SELECT TO_NUMBER(TPROVISORIO) NU_CONTROLEZ FROM
                     (WITH QTD_COLIGADA AS (...) SELECT ... WHERE TOTAL_EMP_COLIGADA = QTD
                      UNION ALL SELECT BB.NU_CONTROLE FROM TB_PROPOSTA_VENDA BB
                      WHERE BB.FL_STATUS = 6 AND NOT EXISTS (...)) NU_CONTROLE
                    WHERE NU_CONTROLEZ = CC.NU_CONTROLE))
```

---

### RN02 -- Selecao de propostas elegiveis para efetivacao automatica

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Loop principal de pr_efetiva
**Comportamento:** Apenas propostas com FL_STATUS = 6 sao processadas automaticamente.
**Resultado:** Propostas em outros status sao ignoradas pelo JOB.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 158
for st_e in (SELECT BB.NU_CONTROLE FROM TB_PROPOSTA_VENDA BB
              WHERE BB.FL_STATUS = 6
                AND NOT EXISTS (SELECT 1 FROM TB_EMPRESA_COLIGADA_BITX T
                               WHERE T.TPROVISORIO = BB.NU_CONTROLE))
```

---

### RN03 -- Grupo coligado deve estar completo para ser efetivado (fluxo legado)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Loop de coligadas no fluxo legado (PK_VENDA_JSON_PR_EFETIVA_01 = 'S')
**Comportamento:** Verifica se existe alguma proposta do grupo mae fora dos status 6, 7 ou 10.
Se COUNT_NAO_APTA_BAIXA > 0: proposta nao e efetivada neste ciclo.
Se COUNT_NAO_APTA_BAIXA = 0 E FN_VALIDA_COLIGADA = 0: efetiva.
**Resultado:** Coligadas ficam bloqueadas ate que todas as filhas do grupo cheguem ao status 6.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 263
SELECT COUNT(1) INTO V_COUNT_NAO_APTA_BAIXA
  FROM TB_EMPRESA_COLIGADA_BITX X, TB_PROPOSTA_VENDA F
 WHERE X.TPROVISORIO = F.NU_CONTROLE
   AND X.CD_PROPOSTA_MAE = V_CD_MAE_COLIGADA
   AND F.FL_STATUS NOT IN(6,7,10);

IF NVL(V_COUNT_NAO_APTA_BAIXA,1) = 0 AND R_TORNO_FUNC = 0 THEN
  pr_efetiva_baixa_manual(st_e.nu_controle, 'N');
END IF;
```

---

### RN04 -- Motor de Criticas e Pendencias: tres modos de validacao

**Categoria:** Validacao
**Risco ANS:** N/A (riscos ANS estao nas sub-rotinas chamadas)
**Gatilho:** Toda efetivacao chama fn_get_criticas_pendencias antes de prosseguir
**Comportamento:**
- p_revalidar_pendencias = 'N': apenas conta criticas/pendencias existentes, nao reexecuta pr_critica_internet
- p_revalidar_pendencias = 'E': conta criticas + pendencias de excecao (cd_pendencia IN (1,12) -- assoc/sind e Neoway)
- p_revalidar_pendencias = 'S' (default): conta criticas + TODAS as pendencias
Se v_retorno > 0 E p_valida_nao_coligada = 'S': atualiza FL_STATUS = 9 em TB_PROPOSTA_VENDA
**Resultado:** Retorna COUNT de criticas/pendencias. Zero = apta para efetivacao.
**Ambiguidade:** [ATENCAO] A07: a funcao mistura responsabilidade de leitura (contar criticas) com escrita (UPDATE fl_status=9). Efeito colateral inesperado quando p_valida_nao_coligada='S'.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 6101
function fn_get_criticas_pendencias(p_nu_controle number,
                                    p_revalidar_pendencias varchar2 default 'S',
                                    p_valida_nao_coligada varchar2 default 'N') return number is
...
IF (nvl(p_revalidar_pendencias, 'S') = 'N') THEN
  SELECT SUM(COUNT_VALIDA) INTO v_retorno FROM (
    SELECT COUNT(1) COUNT_VALIDA FROM TB_USUARIO_CRITICA_INTERNET CI,
           TB_USUARIO_TITULAR_INTERNET I
     WHERE I.CD_EMPRESA = 'T' || p_nu_controle
       AND CI.NU_CONTROLE = I.NU_CONTROLE);
elsIF (nvl(p_revalidar_pendencias, 'S') = 'E') THEN
  ... -- adiciona cd_pendencia IN (1,12)
else
  ... -- adiciona TODAS as pendencias
end if;
...
IF (v_retorno > 0) and (p_valida_nao_coligada = 'S') THEN
  UPDATE TB_PROPOSTA_VENDA PR SET PR.FL_STATUS = 9
   WHERE PR.NU_CONTROLE = p_nu_controle;
  COMMIT;
END IF;
```

---

### RN05 -- Efetivacao de empresa via pr_cadastramento_empresa_prov com retorno por parsing

**Categoria:** Persistencia / Integracao
**Risco ANS:** N/A
**Gatilho:** Proposta sem criticas (COUNT_VALIDA = 0) em pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp
**Comportamento:** Chama pr_cadastramento_empresa_prov(nu_controle, w_erro OUT).
Extrai cd_empresa definitivo via: l_emp := substr(w_erro, instr(w_erro, ',') + 1)
**Resultado:** l_emp contem o cd_empresa se a string retornou com virgula. Se w_erro IS NULL ou nao contem virgula: l_emp = NULL e nenhuma efetivacao ocorre silenciosamente.
**Ambiguidade:** [CRITICO] S03/A05: identico ao smell S11 de PR_EFETIVA_INTERNET. Retorno fragil via parsing de string. Qualquer alteracao na formatacao de w_erro quebra o processo.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 897 (pr_efetiva_baixa_manual)
humaster.pr_cadastramento_empresa_prov(st_e.nu_controle, w_erro);
l_emp := substr(w_erro, instr(w_erro, ',') + 1);
if st_e.nu_controle_od is not null and w_erro is not null then
  humaster.pr_odon_cad_empresa_prov(st_e.nu_controle_od, l_emp, w_erro_od);
end if;
IF l_emp IS NOT NULL THEN
  update tb_empresa_internet set CD_EMPRESA = l_emp, ...
```

---

### RN06 -- Efetivacao de beneficiarios apos cadastro de empresa

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** l_emp IS NOT NULL (empresa cadastrada com sucesso)
**Comportamento:** Loop por titulares em TB_USUARIO_TITULAR_INTERNET WHERE cd_empresa = l_emp.
Para cada titular: (1) pr_critica_internet(nu_controle, 1, 'N') -- revalida criticas
(2) SELECT COUNT(1) criticas INTO v_cont
(3) Se v_cont = 0: pr_cadastramento_internet2(nu_controle) -- efetiva
(4) pr_pim_pendencia(nu_controle, 0) -- atualiza pendencia usuario
**Resultado:** Cada titular sem critica e efetivado individualmente. Titulares com critica permanecem em staging.
**Smell:** [S05] Cursor N+1: loop de cursor com SELECT COUNT por iteracao.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 1240
for reg in (select nu_controle from tb_usuario_titular_internet i
             where i.cd_empresa = l_emp) loop
  pr_critica_internet(reg.nu_controle, 1, 'N');
  select count(1) into v_cont from tb_usuario_critica_internet i
   where i.nu_controle = reg.nu_controle;
  if v_cont = 0 then
    pr_cadastramento_internet2(reg.nu_controle);
    begin pr_pim_pendencia(reg.nu_controle, 0); exception when others then null; end;
  end if;
end loop;
```

---

### RN07 -- Status final de proposta: PRE vs POS

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Apos efetivacao bem-sucedida (l_emp IS NOT NULL)
**Comportamento:**
- fn_get_confopera_emp = 0 (PRE): status = 7 (efetivado)
- fn_get_confopera_emp = 1 (POS) E sem Neoway (fluxo 17) E sem BlockList (fluxo 99) E sem fluxo 7: status = 10 (implantada em analise cadastral)
- fn_get_confopera_emp = 1 (POS) E com qualquer dos bloqueios acima: status = 7
**Resultado:** Status 7 = efetivado PRE ou POSBAIXA com ressalvas. Status 10 = POSBAIXA limpo aguardando conferencia pos-efetivacao.
**Ambiguidade:** [ATENCAO] A06: a logica PRE/POS e replicada identicamente nas tres rotinas de efetivacao (pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp). Nenhuma diferenca observada exceto em pr_efetiva_baixa_manual que tem p_revalidar_pendencias = 'N' para indicar execucao pelo JOB.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 1262
if (fn_get_confopera_emp(st_e.nu_controle) = 0) or (p_revalidar_pendencias = 'N') then
  update tb_proposta_venda set fl_status = 7, cd_empresa = l_emp, ... where nu_controle = st_e.nu_controle;
else
  if (fn_get_emp_fluxo_pos(st_e.nu_controle, 99) = 0) and
     (fn_get_emp_fluxo_pos(st_e.nu_controle, 17) = 0) and
     (fn_get_emp_fluxo_pos(st_e.nu_controle, 7) = 0) then
    update tb_proposta_venda set fl_status = 10, ... -- Caminho feliz do pos
  else
    update tb_proposta_venda set fl_status = 7, ... -- POS com ressalvas
  end if;
end if;
```

---

### RN08 -- Auto-baixa POSBAIXA via pr_pim_insere_cnpj (NDI Minas)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** fn_get_confopera_emp=1 E FL_COMMIT='S' E V_COLIGADA='N' E sem criticas
**Comportamento:** Ao receber proposta JSON do canal POS, apos integrar, verifica se pode fazer a baixa automatica.
Se fn_get_criticas_pendencias = 0: verifica Blocklist e Neoway. Se tudo limpo: atualiza FL_STATUS=6 e chama pr_efetiva_baixa_manual(pnu_controle, 'E', 'BAIXAPOS')
**Resultado:** Proposta POSBAIXA sem pendencias e baixada automaticamente no mesmo ato da integracao.
**Contexto:** Implementado para o projeto NDI Minas.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 5979
if (fn_get_confopera_emp(pnu_controle) = 1) and (nvl(wfl_commit, 'N') = 'S') and (nvl(V_COLIGADA, 'N') = 'N') then
  N_TOTAL_BLOQUEIO := fn_get_criticas_pendencias(pnu_controle);
  if (N_TOTAL_BLOQUEIO = 0) then
    if (fn_get_blocklist_emp(pnu_controle) = 0) and (fn_get_pend_neoway(pnu_controle) = 0) then
      update tb_proposta_venda set fl_status = 6 where nu_controle = pnu_controle;
      commit;
      pr_set_emp_fluxo_pos(pnu_controle, '', 10);
      pr_efetiva_baixa_manual(pnu_controle, 'E', 'BAIXAPOS');
    end if;
  else
    pr_set_emp_fluxo_pos(pnu_controle, '', 7);
  end if;
end if;
```

---

### RN09 -- Controle de status de proposta BITIX ja integrada (idempotencia)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** pr_pim_insere_cnpj recebe JSON de proposta que ja existe
**Comportamento (PK_VENDA_JSON_RESPOSTA_BITIX_01 = 'S'):** Status IN (1,2,3,6,7,9,10): retorna 'JA INTEGRADO'. Status 4: retorna 'DEVOLVIDO'. Status 8: retorna 'CANCELADO'.
**Comportamento (PK_VENDA_JSON_RESPOSTA_BITIX_01 = 'N'):** Apenas status IN (1,7,10) retorna 'JA INTEGRADO'.
**Resultado:** Idempotencia parcial. No path 'N', status 2, 3, 6, 9 reprocessam a proposta, potencialmente sobrescrevendo dados.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 4731
if fn_registro_sistema('PK_VENDA_JSON_RESPOSTA_BITIX_01') = 'S' then
  if V_STATUS in ('1', '2', '3', '6', '7', '9', '10') then
    R_JSON.PUT('INTEGRACAO', '0'); R_JSON.PUT('MENSAGEM', 'JA INTEGRADO'); return;
  end if;
else
  if V_STATUS in ('1', '7', '10') then
    R_JSON.PUT('INTEGRACAO', '0'); R_JSON.PUT('MENSAGEM', 'JA INTEGRADO'); return;
  end if;
end if;
```

---

### RN10 -- Vinculo de empresa odonto ao controle saude

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Proposta com nu_controle_od IS NOT NULL
**Comportamento:** Empresa odonto e criada com NU_CONTROLE_SAUDE = pnu_controle (saude).
O codigo provisorio do titular odonto e reaproveitado de TB_PIM_CONTROLE_CPF quando existente.
Se nao existente: gera novo via SQ_CONTROLE_INTERNET.nextval e insere em TB_PIM_CONTROLE_CPF.
**Resultado:** Mapeamento 1:1 entre controle saude e controle odonto rastreado em TB_PIM_CONTROLE_CPF.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 1920
Begin
  select nu_controle_tit_od into pnu_controle_tit_od from tb_pim_controle_cpf
   where NU_CONTROLE_TIT = od.nu_controle and nu_controle = pnu_controle;
exception
  when others then
    SELECT sq_controle_internet.nextval into pnu_controle_tit_od FROM DUAL;
    pr_control_internet(pnu_controle, od.nu_controle, null, null, null, pnu_controle_tit_od, null, 2);
end;
```

---

### RN11 -- Middle (30-99 empregados): odonto com conta separada

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** nu_total_empregado BETWEEN 30 AND 99 E fl_conta_conjunta_odonto = 'N'
**Comportamento:** Para empresas Middle sem conta conjunta: cd_empresa_associada do odonto aponta para saude; mas cd_empresa_cobranca = NULL e cd_empresa_conveniada_saude_pai = '-999' (codigo especial).
Para demais: cd_empresa_cobranca = l_emp (saude) e vinculo normal.
**Resultado:** Estrutura de cobranca diferenciada para Middle sem conta conjunta.
**Ambiguidade:** [ATENCAO] A08: codigo '-999' e um valor magico sem documentacao.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 1159
if wnu_total_empregado >= 30 and wnu_total_empregado <= 99 then
  if nvl(wfl_conta_conjunta_odonto, 'N') = 'N' then
    l_empresa_conveniada_saude_pai := '-999';
    l_empresa_cobranca             := null;
  end if;
end if;
```

---

### RN12 -- Validacao de coligada POSBAIXA via registro de fluxo

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** fn_get_confopera_emp=1 E FL_COMMIT='S' E V_COLIGADA='S'
**Comportamento:** Ao integrar proposta coligada POSBAIXA, registra fluxo 7 via pr_set_emp_fluxo_pos para impedir que a baixa posterior atribua status 10 (reservado para POSBAIXA nao-coligado limpo).
**Resultado:** Controla qual status recebera a proposta apos efetivacao.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 6006
if (fn_get_confopera_emp(pnu_controle) = 1) and (nvl(wfl_commit, 'N') = 'S') and (nvl(V_COLIGADA, 'N') = 'S') then
  pr_set_emp_fluxo_pos(pnu_controle, '', 7);
end if;
```

---

### RN13 -- Verificacao de Blocklist BITIX

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Qualquer efetivacao POS
**Comportamento:** fn_get_blocklist_emp conta registros em TB_FILE_DOCUMENTO_BITIX WHERE fl_doc_blocklist = 1.
Se count > 0: retorna 1 (ha blocklist).
**Resultado:** Proposta com documento blocklist nao e baixada automaticamente; registra fluxo 99.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 6056
select count(1) into v_retorno from tb_file_documento_bitix
 where tprovisorio = p_nu_controle and nvl(fl_doc_blocklist, 0) = 1;
if (v_retorno > 0) then v_retorno := 1; end if;
```

---

### RN14 -- Verificacao de divergencia cadastral Neoway: ciclo de vida completo

**Categoria:** Validacao / Orquestracao
**Risco ANS:** N/A
**Gatilho ATIVACAO:** pr_pim_insere_cnpj quando PK_VENDA_JSON_EXECUTA_NEOWAY='S' E proposta tem FL_STATUS=1 (devolvida)
**Gatilho CHECK:** Toda efetivacao POSBAIXA (fn_get_pend_neoway); toda chamada a fn_get_criticas_pendencias no modo 'E'

**Ciclo de vida completo:**

1. INTEGRACAO INICIAL (PR_PIM_INSERE_CNPJ, primeira vez):
   - Proposta entra normalmente no staging.
   - Neoway NAO e chamada neste momento.
   - Proposta recebe FL_STATUS=0 ou 6 (aguardando baixa).

2. DEVOLUCAO (qualquer rotina de efetivacao):
   - Motor de criticas encontra criticas ou pendencias.
   - Proposta recebe FL_STATUS=1 (devolvida para correcao) ou FL_STATUS=9 (com erro).

3. REINTEGRACAO (PR_PIM_INSERE_CNPJ, segunda vez ou mais):
   - BITIX reenvia o JSON da proposta.
   - PK_VENDA_JSON_EXECUTA_NEOWAY='S' (ativo): o sistema verifica se FL_STATUS=1.
   - SE FL_STATUS=1: chama PR_VE_DIVERGENCIA_NEOWAY(PNU_CONTROLE).
   - PR_VE_DIVERGENCIA_NEOWAY compara dados do beneficiario (staging) contra a base Neoway.
   - Beneficiarios com divergencia recebem fl_status_processamento='17'.

4. BLOQUEIO DA AUTO-BAIXA POSBAIXA:
   - fn_get_pend_neoway(pnu_controle) verifica SE EXISTE beneficiario titular OU dependente com fl_status_processamento='17'.
   - Se retornar 1: auto-baixa POSBAIXA e bloqueada (proposta NAO vai para FL_STATUS=6 e NAO e efetivada).

5. REGISTRO DO FLUXO 17:
   - fn_get_criticas_pendencias registra fluxo 17 via pr_set_emp_fluxo_pos quando:
     (a) proposta e POSBAIXA (fn_get_confopera_emp=1) E fn_get_pend_neoway=1.
   - O fluxo 17 fica rastreado em TB_PIM_FLUXO_POS.

6. IMPACTO NO STATUS FINAL (apos efetivacao batch ou manual):
   - Proposta POSBAIXA com fluxo 17 registrado: recebe FL_STATUS=7 (implantada com ressalva).
   - Proposta POSBAIXA sem fluxo 17 e sem fluxo 99 e sem fluxo 7: recebe FL_STATUS=10 (limpa).
   - v_observacao_pos recebe texto ' NEOWAY ' para rastreabilidade em relatorio.

7. PENDENCIA DE EMPRESA (CD_PENDENCIA=12):
   - fn_get_criticas_pendencias no modo 'E' (excecoes) contabiliza CD_PENDENCIA=12 como bloqueante.
   - CD_PENDENCIA=12 = "EMPRESA COM CONTROLE EM DIVERGENCIA COM A NEOWAY".
   - Inserida em TB_PENDENCIA_EMPRESA_INTERNET pelo processo de validacao.
   - Esta pendencia de EMPRESA e distinta da marcacao de BENEFICIARIO (fl_status_processamento='17').

[ATENCAO] PR_VE_DIVERGENCIA_NEOWAY NAO e chamada na integracao inicial -- somente em reintegracao de proposta com FL_STATUS=1. Isso significa que a divergencia Neoway so e detectada a partir da segunda tentativa de integracao.

[ATENCAO] O bloco de chamada a PR_VE_DIVERGENCIA_NEOWAY tem WHEN OTHERS THEN NULL: falha silenciosa. Se a procedure lancar excecao, a proposta continua sem a validacao Neoway sem nenhum aviso.

**Evidencia 1 -- Chamada condicional em pr_pim_insere_cnpj:**
```sql
-- Origem: pk_venda_json body, aprox. linha 5525
v_ativa_NEOWAY := fn_registro_sistema('PK_VENDA_JSON_EXECUTA_NEOWAY');
IF v_ativa_NEOWAY = 'S' THEN
  BEGIN
    SELECT G.FL_STATUS INTO V_VALIDA_NEOWAY FROM TB_PROPOSTA_VENDA G
     WHERE G.NU_CONTROLE = PNU_CONTROLE AND G.FL_STATUS = 1 AND ROWNUM = 1;
  EXCEPTION WHEN OTHERS THEN V_VALIDA_NEOWAY := 0;
  END;
  IF V_VALIDA_NEOWAY = 1 THEN
    BEGIN
      HUMASTER.PR_VE_DIVERGENCIA_NEOWAY(PNU_CONTROLE);
    EXCEPTION WHEN OTHERS THEN NULL; -- [CRITICO] falha silenciosa
    END;
  END IF;
END IF;
```

**Evidencia 2 -- fn_get_pend_neoway verifica fl_status_processamento='17':**
```sql
-- Origem: pk_venda_json body, aprox. linha 6077
function fn_get_pend_neoway(p_nu_controle number) return number is begin
  select 1 into v_retorno from (
    select 1 from tb_usuario_titular_internet
     where fl_status_processamento = '17' and cd_empresa = 'T' || p_nu_controle and rownum < 2
    union
    select 1 from tb_usuario_dependente_internet
     where fl_status_processamento = '17' and cd_empresa = 'T' || p_nu_controle and rownum < 2);
end;
```

**Evidencia 3 -- Registro do fluxo 17 e bloqueio de auto-baixa:**
```sql
-- Origem: pk_venda_json body, fn_get_criticas_pendencias, aprox. linha 6209
-- se teve neoway registra no fluxo 17
if (fn_get_confopera_emp(p_nu_controle) = 1) and
   (fn_get_pend_neoway(p_nu_controle) = 1) then
  pr_set_emp_fluxo_pos(p_nu_controle, '', 17);
end if;

-- Origem: pr_pim_insere_cnpj, aprox. linha 5989 -- auto-baixa
if (fn_get_blocklist_emp(pnu_controle) = 0) and
   (fn_get_pend_neoway(pnu_controle) = 0) then -- <<< bloqueio Neoway
  update tb_proposta_venda set fl_status = 6 where nu_controle = pnu_controle;
  pr_efetiva_baixa_manual(pnu_controle, 'E', 'BAIXAPOS');
end if;
```

**Evidencia 4 -- Impacto no status final (POSBAIXA com fluxo 17 = status 7):**
```sql
-- Origem: pk_venda_json body, pr_efetiva_baixa_manual, aprox. linha 722
-- Se e POSBAIXA, e nao teve neoway e blocklist, segue para status 10
if (fn_get_emp_fluxo_pos(st_e.nu_controle, 99) = 0) and
   (fn_get_emp_fluxo_pos(st_e.nu_controle, 17) = 0) and -- <<< fluxo Neoway
   (fn_get_emp_fluxo_pos(st_e.nu_controle, 7) = 0) then
  update tb_proposta_venda set fl_status = 10 ...;
else
  update tb_proposta_venda set fl_status = 7 ...; -- POSBAIXA com ressalva
  v_observacao_pos := substr(v_texto_pos || ' NEOWAY ', 1, 150); -- relatorio
end if;
```

**Evidencia 5 -- CD_PENDENCIA=12 no motor de criticas modo 'E':**
```sql
-- Origem: pk_venda_json body, fn_get_criticas_pendencias, aprox. linha 6142
AND C.CD_PENDENCIA IN (
  1,  -- VENDA PARA ASSOC, COND, INSTITUICAO E SINDICATOS
  12  -- EMPRESA COM CONTROLE EM DIVERGENCIA COM A NEOWAY
)
```

---

### RN14b -- Parametro de controle da ativacao Neoway

**Categoria:** Configuracao
**Risco ANS:** N/A
**Gatilho:** Leitura de PK_VENDA_JSON_EXECUTA_NEOWAY em fn_registro_sistema durante pr_pim_insere_cnpj
**Comportamento:** Se o parametro retornar valor diferente de 'S', toda a logica Neoway e desabilitada: PR_VE_DIVERGENCIA_NEOWAY nao e chamada, beneficiarios nunca recebem fl_status_processamento='17' por esta rotina, e fn_get_pend_neoway sempre retornara 0 para esta proposta.
**Resultado:** Switch de feature: Neoway pode ser desabilitado sem alteracao de codigo.
[ATENCAO] Quando Neoway esta desabilitado, propostas com divergencias cadastrais passam pelo fluxo normalmente sem deteccao.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 5526
v_ativa_NEOWAY := fn_registro_sistema('PK_VENDA_JSON_EXECUTA_NEOWAY');
IF v_ativa_NEOWAY = 'S' THEN ... END IF;
```

---

### RN15 -- Replicacao de empresa odonto a partir da empresa saude no JSON

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** pr_pim_insere_cnpj ao receber JSON novo
**Comportamento:** Ao inserir TB_EMPRESA_INTERNET para saude, insere imediatamente TB_ODON_EMPRESA_INTERNET com os mesmos dados mais NU_CONTROLE_SAUDE = pnu_controle.
**Resultado:** Staging odonto e criado em conjunto com o staging saude, sem necessidade de segundo envio de JSON.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 5218
BEGIN
  insert into tb_empresa_internet values t_empresa_internet;
  -- Regra de replicar a empresa no controle ODONTO
  insert into tb_empresa_internet (nu_controle, tp_operacao, ...) values (pnu_controle_od, ...);
  INSERT INTO TB_ODON_EMPRESA_INTERNET (NU_CONTROLE, ..., NU_CONTROLE_SAUDE) VALUES (PNU_CONTROLE_OD, ..., PNU_CONTROLE);
```

---

### RN16 -- Validacao de contagem de beneficiarios vs JSON

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** FL_COMMIT = 'N' (staging) apos processar beneficiarios
**Comportamento:** Compara V_AUX (COUNT real de beneficiarios em staging) com G_COUNT_BENEFIIFIM (contador do processamento do JSON).
Se divergirem: insere registro em TB_PENDENCIA_EMPRESA_INTERNET (cd_pendencia=9) e TB_STATUS_PROPOSTA_CADASTRO.
**Resultado:** Proposta com divergencia de contagem fica bloqueada para revisao.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, aprox. linha 5622
IF V_AUX <> G_COUNT_BENEFIIFIM THEN
  INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (...) VALUES (SQ_CONTROLE_PENDENCIA.NEXTVAL, 9, G_PROVISORIO_CRITICA, SYSDATE, 'HUMASTER',
    'A quantidade de beneficiarios esta diferente da quantidade informada no JSON');
END IF;
```

---

> [REVISAO] RN17 a RN22 identificadas durante modelagem DDD (24/04/2026). Ausentes na eng. reversa original. Adicionadas como retroalimentacao.

### RN17 -- Identificacao de proposta como Venda Administrativa (ADM)

**Categoria:** Identificacao / ACL
**Risco ANS:** N/A
**Gatilho:** pr_pim_insere_cnpj ao receber JSON de empresa
**Comportamento:** Campo JSON "CD_EMP_ANTERIOR" e lido e armazenado em G_CD_EMP_ANTERIOR. Quando presente (IS NOT NULL), a proposta e classificada como Venda ADM e o fluxo de staging diverge nos pontos de carencia, devolucao e declaracao de saude.
**Resultado:** G_CD_EMP_ANTERIOR IS NULL = proposta nova; IS NOT NULL = proposta ADM.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 4729
G_CD_EMP_ANTERIOR := pk_json_ext.get_string(V_EMPRESA, 'CD_EMP_ANTERIOR');
```

---

### RN18 -- Proposta ADM com alto risco sem deliberacao retorna status 3 (AGUARDANDO_ADM)

**Categoria:** Validacao / Orquestracao
**Risco ANS:** [ANS] Beneficiario com alto risco sem deliberacao nao pode ser efetivado. Risco de selecao adversa regulatorio.
**Gatilho:** pr_set_usuario_internet quando DEVOLUCAO_TIT_ADM='S' AND V_FL_DELIBERACAO_TIT = 0
**Comportamento:** INSERT em TB_USUARIO_ALT_RISCO com FL_ALTO_RISCO=1, FL_DELIBERACAO=0. UPDATE TB_PROPOSTA_VENDA FL_STATUS=3. Proposta bloqueada ate deliberacao administrativa.
[ATENCAO] Comportamento de status 3 diverge conforme PK_VENDA_JSON_RESPOSTA_BITIX_01: 'S' = bloqueia reintegracao; 'N' = permite reprocessamento.
**Resultado:** FL_STATUS = 3 (AGUARDANDO_ADM) -- proposta nao avanca para status 6.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3265
IF DEVOLUCAO_TIT_ADM = 'S' AND V_FL_DELIBERACAO_TIT <> '2' THEN
  INSERT INTO TB_USUARIO_ALT_RISCO (...) VALUES (pnu_controle, 0, TT_TIT.NU_CONTROLE, 1, 1, V_FL_DELIBERACAO_TIT, SYSDATE);
  IF V_FL_DELIBERACAO_TIT = 0 THEN
    UPDATE TB_PROPOSTA_VENDA RR SET RR.FL_STATUS = 3 WHERE RR.NU_CONTROLE = pnu_controle;
  END IF;
END IF;
```

---

### RN19 -- Recuperacao de carencia em venda ADM: CD_CONVENIO=542 e ajuste de DT_ULTIMO_BOLETO

**Categoria:** Persistencia / Regra de Negocio
**Risco ANS:** [ANS] Aproveitamento de carencia sem nova declaracao de saude pode violar RN 195/2009 ANS (portabilidade de carencias).
**Gatilho:** G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL em pr_set_usuario_internet
**Comportamento:** (1) Se beneficiario anterior ativo (fl_status_usuario=2): substitui DT_ULTIMO_BOLETO_CONVENIO pela DT_INICIO da empresa atual. (2) INSERT em TB_USUARIO_VENDA_ADM nivel beneficiario. (3) UPDATE TB_USUARIO_TITULAR_INTERNET SET CD_CONVENIO=542 (recuperacao de carencia -- codigo magico).
[ATENCAO] A12: CD_CONVENIO=542 e valor magico sem constante nomeada. Confirmar com PO.
**Resultado:** Beneficiario ADM aproveita carencia do contrato anterior.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3044
IF G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL THEN
  INSERT INTO TB_USUARIO_VENDA_ADM (...) VALUES (G_CD_EMP_ANTERIOR, V_CD_USU_ANT_TITULAR, ...);
  UPDATE TB_USUARIO_TITULAR_INTERNET T SET T.CD_CONVENIO = 542
   WHERE T.CD_EMPRESA = 'T' || G_PROVISORIO_CRITICA AND T.NU_CONTROLE = G_NU_CONTROLE_TIT;
END IF;
```

---

### RN20 -- Declaracao de saude em venda ADM: importacao do contrato anterior

**Categoria:** Persistencia / Regra de Negocio
**Risco ANS:** [ANS] Declaracao de saude de contrato anterior pode nao refletir estado atual de saude do beneficiario. Avaliar obrigatoriedade de nova declaracao conforme RN 195/2009.
**Gatilho:** V_CD_USU_ANT_TITULAR IS NOT NULL AND V_DECLARACAO.COUNT > 0 em pr_set_usuario_internet
**Comportamento:** Em vez de inserir "NADA CONSTA", importa registros de TB_DECLARACAO_SAUDE_GRUPO_CID do usuario anterior para TB_DECLARACAO_SAUDE_INTERNET e TB_VI_DEC_SAUDE_INT_GRUPO_CID do novo staging.
**Resultado:** Beneficiario ADM herda declaracao de saude historica do contrato anterior.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3604
IF V_CD_USU_ANT_TITULAR IS NOT NULL AND V_DECLARACAO.COUNT > 0 THEN
  INSERT INTO TB_DECLARACAO_SAUDE_INTERNET
    SELECT TT_DEC.NU_CONTROLE, 0, A.CD_GRUPO, 'N', 'NADA CONSTA' FROM TB_GRUPO_DECLARACAO_SAUDE A;
  INSERT INTO TB_VI_DEC_SAUDE_INT_GRUPO_CID
    SELECT TT_DEC.NU_CONTROLE, 0, GC.CD_GRUPO, GC.CD_CID
      FROM TB_USUARIO U, TB_DECLARACAO_SAUDE_GRUPO_CID GC
     WHERE U.CD_USUARIO = V_CD_USU_ANT_TITULAR AND U.NU_USUARIO = GC.NU_USUARIO;
END IF;
```

---

### RN21 -- Registro de TB_USUARIO_VENDA_ADM em nivel de empresa

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** G_CD_EMP_ANTERIOR IS NOT NULL ao final da integracao de empresa em pr_pim_insere_cnpj
**Comportamento:** SELECT COUNT INTO V_EXISTE_ADM. Se V_EXISTE_ADM=0: INSERT em TB_USUARIO_VENDA_ADM com CD_USU_ANT_TITULAR=NULL (registro nivel empresa). Registros de nivel beneficiario sao inseridos em pr_set_usuario_internet (RN19).
**Resultado:** TB_USUARIO_VENDA_ADM registra tanto a empresa (sem beneficiarios) quanto cada beneficiario com historico.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 5486
IF G_CD_EMP_ANTERIOR IS NOT NULL THEN
  SELECT COUNT(*) INTO V_EXISTE_ADM FROM TB_USUARIO_VENDA_ADM A
   WHERE A.CD_EMP_ANTERIOR = G_CD_EMP_ANTERIOR;
  IF V_EXISTE_ADM = 0 THEN
    INSERT INTO TB_USUARIO_VENDA_ADM (...) VALUES (G_CD_EMP_ANTERIOR, NULL, NULL, T_EMPRESA_INTERNET.NU_CONTROLE, SYSDATE, NULL, NULL);
  END IF;
END IF;
```

---

### RN22 -- Limpeza de dados ADM no reprocessamento (FL_COMMIT='N' + status 0/5/3)

**Categoria:** Idempotencia / Persistencia
**Risco ANS:** N/A
**Gatilho:** Reintegracao de proposta (status IN ('0','5','3')) com FL_COMMIT='N'
**Comportamento:** DELETE em TB_USUARIO_VENDA_ADM e TB_USUARIO_ALT_RISCO WHERE TPROVISORIO=pnu_controle. Garante que dados ADM de integracao anterior sejam limpos antes do reprocessamento. Faz parte do bloco geral de limpeza de staging.
**Resultado:** Reprocessamento comeca limpo sem dados remanescentes.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 4823
DELETE from TB_USUARIO_VENDA_ADM t WHERE t.tprovisorio = pnu_controle;
DELETE FROM TB_USUARIO_ALT_RISCO O WHERE O.TPROVISORIO = pnu_controle;
```

---

## 4. Fluxo de Decisao (Narrativa)

O package PK_VENDA_JSON e composto por dois grupos funcionais distintos:

**Grupo 1: Integracao BITIX (pr_pim_insere_cnpj)**
Recebe uma proposta via JSON do sistema externo BITIX. Verifica se a proposta ja existe (idempotencia).
Se nova: gera controles via sequence, persiste empresa em TB_EMPRESA_INTERNET e TB_ODON_EMPRESA_INTERNET (replicada).
Processa beneficiarios do JSON (pr_set_usuario_internet + pr_set_usuario_od).
Executa criticas de empresa (pr_cadastramento_empresa_baixa) e de beneficiarios (pr_critica_internet).
Monta resposta JSON com lista de criticas. Se POSBAIXA e apta: executa auto-baixa via pr_efetiva_baixa_manual.
Se coligada: gestao do grupo via TB_EMPRESA_COLIGADA_BITX e sinalizacao via FL_COMMIT.

**Grupo 2: Efetivacao JOB/Manual (pr_efetiva + pr_efetiva_baixa_manual)**
pr_efetiva processa em batch todas as propostas com FL_STATUS = 6.
Para cada proposta: valida coligadas, executa motor de criticas (fn_get_criticas_pendencias).
Se zero criticas: chama pr_cadastramento_empresa_prov -> extrai cd_empresa via parsing de string [CRITICO].
Apos empresa: efetiva beneficiarios individualmente, atualiza custeio, CNAE, atribui status final (7 PRE, 10 POSBAIXA limpo).
Se com criticas: registra fluxo Neoway/BlockList e atribui status 9 (com erro) ou 1 (devolver para reanalize).

---

## 5. Matriz de Regras

| ID | Gatilho | Logica | Resultado | Categoria | Risco ANS |
|---|---|---|---|---|---|
| RN01 | JOB executa pr_efetiva | fn_registro_sistema controla caminho de execucao | Dois fluxos possiveis | Orquestracao | N/A |
| RN02 | Selecao de propostas | FL_STATUS = 6 | Somente status 6 processado | Validacao | N/A |
| RN03 | Grupo coligado | Todas as coligadas do grupo devem estar em status 6/7/10 | Bloqueio se incompleto | Validacao | N/A |
| RN04 | Qualquer efetivacao | Motor 3 modos: N/E/S | COUNT criticas/pendencias | Validacao | N/A |
| RN05 | COUNT_VALIDA = 0 | pr_cadastramento_empresa_prov retorna via parsing string | cd_empresa ou NULL silencioso | Persistencia | N/A |
| RN06 | l_emp IS NOT NULL | Loop titulares: critica + efetivacao individual | Titulares sem critica efetivados | Persistencia | N/A |
| RN07 | l_emp IS NOT NULL | fn_get_confopera_emp determina status final | FL_STATUS 7 (PRE) ou 10 (POS) | Orquestracao | N/A |
| RN08 | POSBAIXA + FL_COMMIT='S' + nao coligada | Auto-baixa se sem criticas, Neoway, BlockList | pr_efetiva_baixa_manual automatico | Orquestracao | N/A |
| RN09 | JSON ja integrado | Verificacao idempotente por status atual | Retorna JA INTEGRADO ou reprocessa | Validacao | N/A |
| RN10 | Proposta com odonto | Reutilizacao de controle ou geracao via sequence | Mapeamento 1:1 em TB_PIM_CONTROLE_CPF | Persistencia | N/A |
| RN11 | Middle 30-99 sem conta conjunta | cd_empresa_cobranca = NULL, pai = '-999' | Cobranca separada | Calculo | N/A |
| RN12 | POSBAIXA + coligada + FL_COMMIT='S' | Registra fluxo 7 para impedir status 10 | Status final sera 7 | Validacao | N/A |
| RN13 | Toda efetivacao POSBAIXA | tb_file_documento_bitix.fl_doc_blocklist = 1 | Fluxo 99, nao baixa automatico | Validacao | N/A |
| RN14 | Toda efetivacao POSBAIXA | fl_status_processamento = '17' (Neoway) | Fluxo 17 registrado; status final 7; auto-baixa bloqueada | Validacao | N/A |
| RN14b | PR_VE_DIVERGENCIA_NEOWAY ativa (reintegracao FL_STATUS=1) | PK_VENDA_JSON_EXECUTA_NEOWAY='S' E FL_STATUS=1 | Beneficiarios divergentes recebem fl_status_processamento='17' | Configuracao | N/A |
| RN15 | JSON novo (pr_pim_insere_cnpj) | Replicacao automatica saude -> odonto | TB_ODON_EMPRESA_INTERNET criado | Persistencia | N/A |
| RN16 | FL_COMMIT='N' | COUNT beneficiarios real vs JSON | Pendencia 9 se divergente | Validacao | N/A |
| RN17 | JSON com CD_EMP_ANTERIOR | G_CD_EMP_ANTERIOR != NULL -> fluxo ADM | Proposta classificada como ADM | Identificacao | N/A |
| RN18 | DEVOLUCAO_TIT_ADM='S' AND FL_DELIBERACAO=0 | INSERT TB_USUARIO_ALT_RISCO + FL_STATUS=3 | Proposta bloqueada AGUARDANDO_ADM | Validacao | [ANS] Alto risco sem deliberacao |
| RN19 | G_CD_EMP_ANTERIOR NOT NULL AND USU_ANT NOT NULL | DT_ULTIMO_BOLETO + INSERT TB_USUARIO_VENDA_ADM + CD_CONVENIO=542 | Carencia aproveitada do contrato anterior | Persistencia | [ANS] RN195/2009 portabilidade |
| RN20 | V_CD_USU_ANT_TITULAR NOT NULL | INSERT TB_DECLARACAO_SAUDE_INTERNET + TB_VI_DEC_SAUDE_INT_GRUPO_CID do contrato anterior | Declaracao de saude historica herdada | Persistencia | [ANS] Declaracao desatualizada |
| RN21 | G_CD_EMP_ANTERIOR NOT NULL (nivel empresa) | SELECT COUNT + INSERT TB_USUARIO_VENDA_ADM nivel empresa | Registro ADM de empresa criado | Persistencia | N/A |
| RN22 | Reprocessamento status 0/5/3 | DELETE TB_USUARIO_VENDA_ADM + TB_USUARIO_ALT_RISCO | Dados ADM limpos para reprocessamento | Idempotencia | N/A |

---

## 6. Smells Identificados

| ID | Tipo | Localizacao | Impacto | Sugestao |
|---|---|---|---|---|
| S01 | Excecao engolida (WHEN OTHERS THEN NULL) | Multiplos blocos em todas as rotinas | Alto | Substituir por log estruturado + reraise seletivo |
| S02 | Codigo triplicado | pr_efetiva / pr_efetiva_baixa_manual / pr_efetiva_baixa_manual_emp | Alto | Extrair logica comum para rotina privada central |
| S03 | Parsing fragil de retorno | L897, L1375, L410 -- substr/instr em w_erro de pr_cadastramento_empresa_prov | Critico | Mesma correccao do S11 de PR_EFETIVA_INTERNET: contrato tipado OUT |
| S04 | Estado global de package | Spec: G_PROVISORIO, G_PROPOSTA, etc. (15 variaveis) | Critico | Substituir por variaveis locais passadas por parametro |
| S05 | Cursor N+1 | pr_efetiva L717+: loop de titulares com SELECT COUNT por iteracao | Alto | BULK COLLECT + avaliacao em memória |
| S06 | COMMIT dentro de sub-rotinas | pr_control_internet (L2819), pr_pim_pendencia (L66), fn_get_criticas_pendencias | Alto | Centralizar controle transacional no chamador |
| S07 | Logica duplicada PRE/POS | pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp | Alto | Extrair rotina auxiliar de decisao de status |
| S08 | Valores hardcode de origem | p_origem: 'T229B', 'JOB', 'BITIX', 'BAIXAPOS', 'BPR' sem constantes | Medio | Definir constantes ou parametros de configuracao |
| S09 | Convencao fragil de cd_empresa | 'T' || nu_controle como cd_empresa provisorio em staging | Medio | Documentar e encapsular a convencao |
| S10 | JSON_VALUE re-executado | JSON_VALUE(to_clob(json), '$.FL_COMMIT') em 5+ locais | Medio | Cache em variavel local no inicio da rotina |
| S11 | Variavel wfl_commit de package | wfl_commit e v_texto_pos sao variaveis de package, nao locais | Medio | Converter para variaveis locais de pr_pim_insere_cnpj |
| S12 | Funcao fn_get_criticas_pendencias com efeito colateral de escrita | UPDATE tb_proposta_venda fl_status=9 dentro de funcao de leitura | Alto | Separar: funcao retorna contagem; procedure aplica status |

---

## 7. Tratamento de Excecoes

| Excecao | ORA- | Quando Ocorre | Tratamento Atual | Recomendado |
|---|---|---|---|---|
| WHEN OTHERS (pr_efetiva loop principal) | Qualquer | Erro em efetivacao de empresa/beneficiario | UPDATE fl_status=9, ds_erro=SQLERRM | Manter update, adicionar log estruturado, reraise opcional |
| WHEN OTHERS (pr_pim_insere_cnpj) | Qualquer | Erro geral na integracao JSON | Monta JSON de retorno com CRITICA tipo '3', COMMIT | Manter retorno JSON, adicionar rastreabilidade (correlation ID) |
| DUP_VAL_ON_INDEX (tb_empresa_internet) | ORA-00001 | Reintegracao de proposta ja existente | DELETE + reinsert (tratado) | Considerar MERGE para atomicidade |
| WHEN OTHERS (pr_pim_pendencia) | Qualquer | Erro ao atualizar tb_pendencia_usuario | NULL (silencioso) | Log obrigatorio -- pendencia nao criada e invisivel |
| WHEN OTHERS (fn_get_criticas_pendencias) | Qualquer | Erro no motor de criticas | v_retorno := 0 -- retorna "sem criticas" | [CRITICO]: retornar 0 mascarando erro pode efetuar empresa com problemas |

---

## 8. Riscos ANS

Nao foram identificados riscos ANS diretos neste package. PK_VENDA_JSON e uma camada de infraestrutura/integracao.
Os riscos ANS estao nas sub-rotinas chamadas:
- PR_CRITICA_65_ANOS_DIGITACAO [ANS]: limite de idade 65 anos
- pr_critica_internet [ANS]: validacoes de elegibilidade (ver eng. reversa desta rotina quando analisada)

[ATENCAO] A09: a logica de fn_get_criticas_pendencias quando retorna 0 mascarando excecao (WHEN OTHERS -> v_retorno:=0) pode efetuar empresas com beneficiarios que nao passaram pelas validacoes ANS de critica_internet.

---

## 9. Ecossistema

- **Input:**
  - JSON CLOB via BITIX (pr_pim_insere_cnpj)
  - Tabelas staging: TB_PROPOSTA_VENDA (fl_status=6), TB_EMPRESA_INTERNET, TB_USUARIO_TITULAR_INTERNET
  - Parametros de sistema: fn_registro_sistema (PK_VENDA_JSON_PR_EFETIVA_01, PK_VENDA_JSON_RESPOSTA_BITIX_01, PK_VENDA_JSON_EXECUTA_NEOWAY)

- **Output:**
  - JSON CLOB (pr_pim_insere_cnpj: retorno com TPROVISORIO, INTEGRACAO, MENSAGEM, MOTIVOS)
  - TB_PROPOSTA_VENDA.fl_status: 0, 1, 6, 7, 9, 10
  - TB_EMPRESA_CONVENIADA: empresa definitiva cadastrada
  - TB_EMPRESA_CNAE: CNAE da empresa
  - TB_PENDENCIA_EMPRESA: pendencias POS
  - TB_STATUS_PROPOSTA_CADASTRO: log de status de cadastro
  - PR_EFETIVA_INTERNET chama PK_VENDA_JSON.pr_efetiva como parte de sua Fase 9 (coligadas SIGO)

---

## 10. Painel de Decisao (PO)

**Ambiguidades e pendencias para validacao:**

| ID | Descricao | Tipo | Acao |
|---|---|---|---|
| A01 | Schema informado: HEALTH. Schema real: HUMASTER | [ATENCAO] | Confirmar com usuario -- sem impacto na analise |
| A02 | PACKAGE BODY nao visivel via all_objects | [ATENCAO] | Verificar grant com DBA se necessario para auditoria |
| A03 | Valor de PK_VENDA_JSON_PR_EFETIVA_01 em producao desconhecido | [ATENCAO] | Verificar via MCP: fn_registro_sistema('PK_VENDA_JSON_PR_EFETIVA_01') |
| A04 | Valor de PK_VENDA_JSON_RESPOSTA_BITIX_01 em producao desconhecido | [ATENCAO] | Verificar via MCP com DBA |
| A05 | pr_efetiva_baixa_manual_emp vs pr_efetiva_baixa_manual: diferenca de uso nao documentada | [ATENCAO] | Validar com desenvolvedor qual canal usa cada uma |
| A06 | V_COD_OPERADORA hardcode 'BITIX' mesmo que JSON contenha COD_OPERADORA | [ATENCAO] | Verificar se ha outros operadores alem de BITIX que usam este package |
| A07 | fn_get_criticas_pendencias: efeito colateral de UPDATE fl_status=9 quando p_valida_nao_coligada='S' | [CRITICO] | Separar funcao de consulta de procedure de efeito. Risco de updates nao intencionais |
| A08 | Valor '-999' em l_empresa_conveniada_saude_pai (Middle sem conta conjunta) | [ATENCAO] | Validar semantica do '-999' com equipe de cadastro |
| A09 | fn_get_criticas_pendencias WHEN OTHERS -> v_retorno:=0: mascarar excecao como "sem criticas" | [CRITICO] | Pode efetuar empresa com beneficiarios sem validacao ANS. Prioridade maxima de correcao |
| A10 | 6 sub-rotinas externas novas nao catalogadas (FN_VALIDA_COLIGADA, PR_VALIDA_BAIXA_COLIGADA_BITIX, pr_cadastramento_empresa_baixa, pr_critica_internet_odonto, fn_get_confopera_emp, PR_VE_DIVERGENCIA_NEOWAY, etc.) | [ATENCAO] | Analisar separadamente -- sao chaveadas neste fluxo |

**Aprovacao:**
- [ ] Aprovado -- seguir com as regras extraidas
- [ ] Aprovado com ressalvas: [detalhar]
- [ ] Reprovado -- redesenhar antes de continuar

---

[HANDOFF-DDD]
Eng. reversa concluida. Artefato pronto para consumo pelo Agente DDD.
Leitura obrigatoria antes de iniciar DDD:
- Este arquivo: reversa-pk-venda-json.md
- reversa-pr-efetiva-internet.md (contexto de chamada)
- _shared/base-conhecimento/catalogo-tabelas.md
- _shared/dicionario-dominio.md
