# Engenharia Reversa: PR_EFETIVA_INTERNET

**Data:** 17/04/2026
**Analista:** Agente Eng. Reversa (GitHub Copilot)
**Versao CVS (tag PRODUCAO):** PRODUCAO-20251014
**Origem CVS:** C:\CVS\health_install\procedure\pr_efetiva_internet.sql
**Ultima modificacao CVS:** 14/10/2025 15:35:26 (99.078 bytes, 2.290 linhas)
**Status MCP (dba_objects):** [ATENCAO] Objeto `HUMASTER.PR_EFETIVA_INTERNET` nao localizado via `all_objects` -- usuario C_RAWEL nao possui GRANT de acesso a procedures/functions de HUMASTER. Existe SINONIMO PUBLICO `PUBLIC.PR_EFETIVA_INTERNET` apontando para `HUMASTER.PR_EFETIVA_INTERNET` com STATUS=INVALID (09/04/2026). CVS (14/10/2025) prevalece como fonte de verdade do codigo.
**Oracle:** 19.22.0.0.0 -- Hapvida Producao

[ATENCAO] Schema real e HUMASTER (confirmado via sinonimo publico). O schema HEALTH solicitado pelo usuario nao tem objeto direto -- existe sinonimo publico INVALID apontando para HUMASTER.
[CRITICO] `MOVIMENTACAO_PIM_AUTOMATICO = 'NAO'` em producao -- o BLOCO PRINCIPAL PIM (Fase 2, ~80% do codigo, linhas 179-1858) esta DESLIGADO em producao no momento da analise.

---

## 1. Assinatura

| Atributo            | Valor                            |
|---------------------|----------------------------------|
| Tipo                | PROCEDURE                        |
| Schema              | HUMASTER (CVS: `humaster`)       |
| Nome                | PR_EFETIVA_INTERNET              |
| Parametros Entrada  | Nenhum (procedure sem parametros)|
| Parametros Saida    | Nenhum                           |
| Retorno             | N/A                              |
| Natureza            | JOB orquestrador (DBMS_JOB / DBMS_SCHEDULER) |
| Tamanho             | 2.290 linhas, ~99 KB             |

**Descricao funcional resumida:**
Procedure de batch que roda periodicamente para efetivacao automatica de movimentacoes PIM
(Portal Internet de Movimentacao). Processa 9 fases sequenciais de propostas de empresas
e beneficiarios do canal internet, desde a validacao ate a criacao definitiva no sistema.

---

## 2. Arvore de Dependencias

### 2.1 Sub-rotinas Chamadas (primeiro nivel)

| Sub-rotina                     | Tipo              | Schema    | Responsabilidade                                              | Impacto no fluxo                                        | Status     |
|--------------------------------|-------------------|-----------|---------------------------------------------------------------|---------------------------------------------------------|------------|
| `fn_registro_sistema`          | FUNCTION          | humaster  | Lê parametros/flags do sistema em `tb_registro_sistema`       | Controla ativacao de cada fase da rotina               | [-]        |
| `fn_vi_checa_orcamento`        | FUNCTION          | humaster  | Verifica se contrato e orcamento (retorna 'C' ou 'S')         | Filtra orcamentos de todos os loops de processamento   | [-]        |
| `Fn_Efetiva_Adesao_Digital`    | FUNCTION          | humaster  | Verifica aprovacao de adesao digital (retorna 3 = aprovado)   | Filtra contratos nao aprovados pelo RH                 | [-]        |
| `pr_cadastramento_internet2`   | PROCEDURE         | humaster  | Efetiva beneficiario (titular+dependentes) no sistema         | Criacao definitiva das vidas -- nucleo da efetivacao   | [-]        |
| `pr_cadastramento_empresa_prov`| PROCEDURE         | humaster  | Cadastra empresa provisoria, retorna cd_empresa via OUT       | Criacao da empresa conveniada definitiva (fase PIM)    | [-]        |
| `pr_critica_empresa_internet_1`| PROCEDURE         | humaster  | Critica de empresa (SACTI DIREX -- pendencia 11)              | Gera pendencia 11 se empresa nao passa na critica      | [-]        |
| `fn_checa_divergencia`         | FUNCTION          | humaster  | Verifica divergencia Neoway para o contrato                   | Gera pendencia 12 (Neoway)                             | [-]        |
| `pr_critica_internet`          | PROCEDURE         | humaster  | Critica de beneficiario individual                            | Gera criticas em `tb_usuario_critica_internet`         | [-]        |
| `pr_odon_cad_empresa_prov`     | PROCEDURE         | humaster  | Cadastra empresa provisoria odonto                            | Criacao da empresa odonto definitiva (espelha saude)   | [-]        |
| `PR_NAT_JURIDICA_ODON`         | PROCEDURE         | humaster  | Processa natureza juridica odonto (SAC: 1886321)              | Pos-criacao da empresa odonto                          | [-]        |
| `pr_odon_Obrigacao_Agregado`   | PROCEDURE         | humaster  | Gera obrigacao de odonto para agregado                        | Fase 7 -- obrigacao odonto apos processamento          | [-]        |
| `PR_COLIGA_EMPRESA_BITIX`      | PROCEDURE         | humaster  | Processa baixa de empresas BITIX enviadas via JSON            | Fase 8 -- integracao BITIX                             | [-]        |
| `PK_VENDA_JSON.pr_efetiva`     | PACKAGE PROCEDURE | humaster  | Efetiva propostas JSON BITIX                                  | Fase 8 -- chamada apos PR_COLIGA_EMPRESA_BITIX         | [-]        |
| `pr_processa_empresa_coligada` | PROCEDURE         | humaster  | Processa contratos coligados pendentes (site Hapvida)         | Fase 9 -- coligadas SIGO                               | [-]        |
| `fn_valida_coligada_baixa`     | FUNCTION          | humaster  | Valida coligada para baixa                                    | Pre-processamento de coligadas no inicio do bloco PIM  | [-]        |
| `fn_individual_familiar`       | FUNCTION          | humaster  | Verifica se empresa e individual/familiar (retorna '00100')   | Filtra individuais para fase 6                         | [-]        |
| `fn_odon_venda_pendente_site`  | FUNCTION          | humaster  | Verifica se venda odonto puro no site esta pendente           | Impede efetivacao de odonto puro sem venda finalizada  | [-]        |
| `pk_administracao.fn_check_cic`| PACKAGE FUNCTION  | humaster  | Valida CPF/CIC (retorna 1=valido, 3=CAEPF)                    | Validacao de CPF de titulares e dependentes            | [-]        |
| `pk_nk4trace.t`                | PACKAGE PROCEDURE | humaster  | Log/trace de execucao                                         | Registro de pendencias odonto (informativo)            | Utilitario |

### 2.2 Dependentes -- quem chama esta rotina

| Objeto         | Tipo | Schema   | Fonte                                             |
|----------------|------|----------|---------------------------------------------------|
| DBMS_JOB / DBMS_SCHEDULER | JOB | SYS/HUMASTER | Inferido -- procedure sem parametros nao e chamada interativamente |
| [BLOQUEADO]    | -    | -        | MCP dba_dependencies indisponivel -- verificar em producao |

### 2.3 Tabelas Acessadas

#### Escrita (DML)

| Tabela                          | Operacao          | Condicao Principal                                            | Observacao                                          |
|---------------------------------|-------------------|---------------------------------------------------------------|-----------------------------------------------------|
| `tb_pendencia_empresa_internet` | INSERT / DELETE   | nu_controle = st_e.nu_controle                               | INSERT por cd_pendencia; DELETE no inicio do loop   |
| `tb_empresa_internet`           | UPDATE            | nu_controle = st_e.nu_controle                               | Status, cd_empresa, dt_status_processamento         |
| `tb_empresa_conveniada`         | UPDATE            | cd_empresa_conveniada = l_cd_empresa                         | fl_status, fl_empresa_nova, ds_observacao           |
| `tb_usuario_titular_internet`   | UPDATE            | cd_empresa = l_cd_empresa / 'T'||nu_controle                 | fl_status_processamento, cd_empresa, dt_inicio      |
| `tb_usuario_dependente_internet`| UPDATE            | cd_empresa = l_cd_empresa / 'T'||nu_controle                 | fl_status_processamento, cd_empresa, dt_inicio      |
| `tb_usuario`                    | UPDATE            | cd_usuario = st_usu.cd_usuario                               | fl_status_usuario, ds_observacao                    |
| `tb_pendencia_empresa`          | DELETE / INSERT   | cd_empresa_conveniada = l_cd_empresa                         | Remove pendencias antigas e insere pendencia 1      |
| `humaster.tb_log_baixa_controle`| INSERT            | cd_log = max(cd_log)+1                                       | Log de processo de baixa PIM (flag FL_LOG_BAIXA_CONTROLE) |
| `tb_proposta_venda`             | UPDATE            | nu_controle = st_e.nu_controle                               | fl_status = 9 (nao processado com critica)          |
| `tb_usuario_critica_internet`   | INSERT            | nu_controle = st_reg.nu_controle / st_i.nu_controle          | Registra erro 999 em caso de excecao               |
| `tb_compra_carencia`            | UPDATE            | cd_empresa_conveniada = st_emp_od.cd_empresa                 | dias_adm_especial = 30 (somente odonto puro)        |
| `tb_odon_empresa_internet`      | UPDATE            | nu_controle = l_empresa_odon.nu_controle                     | cd_empresa, fl_status_processamento                 |

#### Leitura (SELECT)

| Tabela                          | Finalidade                                                    |
|---------------------------------|---------------------------------------------------------------|
| `tb_registro_sistema`           | Leitura de flags e parametros do sistema                      |
| `tb_empresa_digitada`           | Empresas digitadas aguardando 1a carga PME                    |
| `tb_empresa_internet`           | Propostas de empresa no PIM (fila principal)                  |
| `tb_empresa_conveniada`         | Dados da empresa conveniada existente                         |
| `tb_odon_empresa_internet`      | Empresa odonto temporaria vinculada a saude                   |
| `tb_usuario_titular_internet`   | Titulares PIM pendentes                                       |
| `tb_usuario_dependente_internet`| Dependentes PIM pendentes                                     |
| `tb_vendedor_plano`             | Dados do vendedor / area de venda                             |
| `tb_area_venda`                 | Area de venda, fl_baixa_automatica, fl_vendedor_nacional      |
| `tb_area_venda_cfg`             | Configuracao de vendedor nacional                             |
| `tb_modelo_empresa`             | Modelo de empresa para fl_baixa_automatica                    |
| `tb_empresa_neg`                | Modelo de negocio para lookup de agregados                    |
| `tb_empresa_agregado`           | Tipos de dependente permitidos por contrato                   |
| `tb_localidade_limitrofe`       | Localidades limitrofes para validacao de filial               |
| `tb_filial`                     | Dados da filial (cd_pessoa)                                   |
| `tb_pessoa`                     | Pessoa da filial (cd_pessoa)                                  |
| `tb_endereco_pessoa`            | Endereco da filial (nm_cidade_endereco)                       |
| `tb_tp_pend_empresa_internet`   | Tipos de pendencia ativos (fl_status=1) por cd_pendencia      |
| `tb_pendencia_empresa_internet` | Verifica existencia de pendencia 11                           |
| `tb_proposta_venda`             | Verifica existencia de proposta de venda para o contrato      |
| `tb_usuario_critica_internet`   | Contagem de criticas de beneficiarios                         |
| `tb_critica_liberada`           | Criticas isentas pelo operador (liberadas)                    |
| `tb_empresa_coligada`           | Contratos coligados pendentes de processamento                |
| `tb_odon_param_vendedor_pim`    | Parametros de vendedor PIM para odonto puro                   |
| `tb_usuario`                    | Verifica status efetivado do usuario                          |
| `humaster.tb_log_baixa_controle`| Calculo do proximo cd_log (max+1)                             |
| `tb_pendencia`                  | Verifica flag fl_neoway para filtrar pendencias Neoway        |

### 2.4 Outros Objetos

| Objeto                     | Tipo     | Finalidade                                               |
|----------------------------|----------|----------------------------------------------------------|
| `SQ_CONTROLE_PENDENCIA`    | SEQUENCE | Gera NU_CONTROLE_PENDENCIA para TB_PENDENCIA_EMPRESA_INTERNET |

---

## 3. Regras de Negocio

### RN01 -- Ativacao por Parametros do Sistema

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Inicio da execucao da procedure
**Comportamento:** Carrega 4 flags de controle via `fn_registro_sistema`:
- `FL_CRITICA_SAUDE_ODONTO`: habilita validacao de criticas T-Provisorio antes de cadastrar empresa
- `FL_LOG_BAIXA_CONTROLE`: habilita log detalhado de cada tentativa de baixa
- `CD_EMPRESA_INDIVIDUAL_ODONTO_PURO`: codigo da empresa padrao para venda individual odonto puro
- `HABILITA_65ANOS`: alterna limite de idade de 59 para 65 anos (RN08/RN09)
**Resultado:** Variaveis de controle inicializadas; comportamento da rotina configurado por parametros

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 42-54
wfl_critica := nvl(fn_registro_sistema('FL_CRITICA_SAUDE_ODONTO'),'N');
wfl_log_baixa_pim := nvl(fn_registro_sistema('FL_LOG_BAIXA_CONTROLE'),'N');
vCd_Empresa_Ind_Odon_Puro := fn_registro_sistema('CD_EMPRESA_INDIVIDUAL_ODONTO_PURO');
vFl_Checa_Venda_Odonto_Site := fn_registro_sistema('CHECA_VENDA_OD_PURO_FINALIZADA');
vHabilita_65anos := fn_registro_sistema('HABILITA_65ANOS');
```

---

### RN02 -- Baixa Automatica PME ate 29 Vidas (Carga por Modelo)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresas digitadas onde area de venda e modelo possuem `fl_baixa_automatica=1`, com ate 29 titulares, tp_operacao='1', cadastradas nos ultimos 30 dias
**Comportamento:**
1. Seleciona grupos por area de venda + modelo em tb_empresa_digitada
2. Verifica fl_baixa_automatica em tb_modelo_empresa E tb_area_venda
3. Para cada empresa com total <= 29 e fl_vidas_ok=1:
   - Filtra titulares com dependentes com mais de 43 anos (exclusao)
   - Filtra titulares ou dependentes com mais de 59 anos (exclusao)
   - Marca titular como status 8 (autorizado)
   - Chama `pr_cadastramento_internet2`
   - Atualiza tb_empresa_conveniada.cd_tipo_internet = 0 (operador)
**Resultado:** Empresa PME efetivada automaticamente; usuarios cadastrados no sistema
**Ambiguidade:** [ATENCAO] Dupla consulta de fl_baixa_automatica (tb_modelo_empresa E tb_area_venda) -- o segundo SELECT sobrescreve o primeiro dentro do mesmo bloco. A logica depende apenas do valor final de `fl_baixa`.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 65-88
select fl_baixa_automatica into fl_baixa from tb_modelo_empresa where cd_modelo = st_area_venda.cd_modelo;
select fl_baixa_automatica into fl_baixa
  from tb_area_venda a where a.cd_area_venda = st_area_venda.cd_area_venda; -- sobrescreve!
-- ...
if st_empresa.total <= 29 and fl_vidas_ok = 1 then
  -- ...
  pr_cadastramento_internet2(st_reg.nu_controle);
  update tb_empresa_conveniada ec set ec.cd_tipo_internet = 0 where ...;
```

---

### RN03 -- Verificacao de Ativacao do PIM Automatico

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Inicio do bloco principal de PIM (Fase 2)
**Comportamento:** Consulta `tb_registro_sistema` pela chave `MOVIMENTACAO_PIM_AUTOMATICO`. Se o valor for `'NAO'`, wVerificaPim > 0 e o bloco inteiro de processamento PIM (linhas ~193 a ~1858) e PULADO.
**Resultado:** Controle de liga/desliga do processamento PIM por parametro de sistema
**Ambiguidade:** [ATENCAO] Logica invertida: o bloco executa quando wVerificaPim = 0. Se a chave nao existir, wVerificaPim fica 0 (default) e o bloco EXECUTA. Ausencia da chave = PIM ligado. Presenca com valor 'NAO' = PIM desligado. Outros valores = PIM ligado.
**[CRITICO] Estado em producao:** `MOVIMENTACAO_PIM_AUTOMATICO = 'NAO'` -- BLOCO PIM DESLIGADO em 17/04/2026. Verificar motivo e previsao de reativacao.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 183-194
select count(*) into wVerificaPim
  from tb_registro_sistema
 where cd_chave = 'MOVIMENTACAO_PIM_AUTOMATICO' and vl_chave = 'NAO';
-- ...
if wVerificaPim > 0 then -- PIM desligado, pula o bloco
```

---

### RN04 -- Verificacao de Coligadas com Pendencia de Processamento

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Inicio do loop principal PIM, antes do loop de empresas
**Comportamento:** Busca contratos coligados (filhas ou maes) com FL_STATUS_PROCESSO=1 pendentes e chama `fn_valida_coligada_baixa` para cada um.
**Resultado:** Pre-validacao de coligadas antes do processamento das empresas
**Ambiguidade:** [ATENCAO] `fn_valida_coligada_baixa` e chamada com `V_PROPOSTA_MAE` (declarada como NULL) sem que o resultado seja utilizado ou tratado. Possivel codigo incompleto ou placeholder.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 241-260
FOR I IN (SELECT SUBSTR(CONTRATO, 2) CONTRATO FROM (...TB_EMPRESA_COLIGADA...))
LOOP
  v_result:= fn_valida_coligada_baixa(V_PROPOSTA_MAE); -- V_PROPOSTA_MAE sempre NULL
END LOOP;
```

---

### RN05 -- Selecao de Empresas PIM para Processamento (Fila Principal)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Bloco PIM ativo, loop sobre tb_empresa_internet
**Comportamento:** Seleciona empresas onde:
- `dt_cadastramento > '01/11/2012'` (hardcode de data de corte)
- `tp_operacao = 1` (novas empresas)
- `fl_status_processamento IN (1, 0, 8)` (digitado, pendente ou autorizado)
- `Fl_Sinaliza_Vidas_Ok = 'S'` (digitacao concluida pelo operador)
**Resultado:** Conjunto de empresas candidatas para efetivacao neste ciclo
**Ambiguidade:** [ATENCAO] Data hardcode `'01/11/2012'` -- empresas cadastradas antes desta data nunca sao processadas por este bloco. Regra historica que nao pode ser alterada sem impacto em dados legados.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 282-289
for st_e in (select * from tb_empresa_internet i
              where trunc(i.dt_cadastramento) > to_date('01/11/2012', 'dd/mm/yyyy')
                and i.tp_operacao = 1
                and fl_status_processamento in (1, 0, 8)
                and Fl_Sinaliza_Vidas_Ok = 'S') loop
```

---

### RN06 -- Exclusao de Ex-Clientes e PME 30-99 Vidas

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Para cada empresa no loop principal, se `HABILITA_65ANOS != 0`
**Comportamento:** Verifica se o CNPJ da empresa digitada ja possui empresa conveniada com fl_tipo_contrato=2. Se sim, sinaliza como ex-cliente (wexiste_ex_cliente > 0). Empresas com 30-99 funcionarios tambem sao excluidas (`nu_total_empregado BETWEEN 30 AND 99`).
**Resultado:** Se ex-cliente OU PME 30-99: empresa e ignorada neste ciclo (sem pendencia registrada, sem efetivacao)
**Ambiguidade:** [ATENCAO] Quando `HABILITA_65ANOS = 0`, `wexiste_ex_cliente` e forcado a 0 (nunca verifica ex-clientes). A logica de exclusao de ex-cliente e controlada por flag de 65 anos, o que semanticamente nao faz sentido.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 292-318
if nvl(vHabilita_65anos,0) = 0 then
  wexiste_ex_cliente := 0;
else
  select count(*) into wexiste_ex_cliente from tb_pessoa p
   where p.nu_cgc_cpf = st_e.nu_cgc_cpf
     and pk_administracao.fn_check_cic(st_e.nu_cgc_cpf) != 1
     and exists (select 1 from tb_empresa_conveniada c
                  where c.cd_pessoa = p.cd_pessoa and c.fl_tipo_contrato = 2);
end if;
if wexiste_ex_cliente = 0 and not(st_e.nu_total_empregado >= 30 and st_e.nu_total_empregado <= 99) then
```

---

### RN07 -- Determinacao do Canal de Venda por Tamanho de Empresa

**Categoria:** Calculo
**Risco ANS:** N/A
**Gatilho:** Para cada empresa elegivel no loop PIM
**Comportamento:** Classifica o canal de venda baseado em `nu_total_empregado`:
- 1 a 29 funcionarios: canal 1 (PME pequena)
- 30 a 99 funcionarios: canal 2 (Middle)
- Outros: canal null
**Resultado:** `wcd_canal_venda` utilizado para determinar se usuario recebe status 8 (autorizado) ou apenas tem dt_inicio atualizada (Middle nao efetiva no ato)

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 336-343
if st_e.nu_total_empregado >= 1 and st_e.nu_total_empregado <= 29 then
  wcd_canal_venda := 1;
elsif st_e.nu_total_empregado >= 30 and st_e.nu_total_empregado <= 99 then
  wcd_canal_venda := 2;
else
  wcd_canal_venda := null;
end if;
```

---

### RN08 -- Validacao: Pendencia por Nome Suspeito (cd_pendencia = 1)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Nome social ou fantasia da empresa contem 'ASSOC', 'CONDOM', 'INSTITUTO' ou 'SIND'
**Comportamento:** Insere pendencia tipo 1 para saude e odonto (se existir empresa odonto vinculada)
**Resultado:** Empresa bloqueada para efetivacao; operador deve revisar manualmente
**Ambiguidade:** [ATENCAO] Comparacao sem normalizacao de acentos -- 'ASSOC' nao captura 'ASSOC.' ou variantes. Sensivel a maiusculas (usa LIKE sem UPPER).

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 393-403
select 1 into l_nome_inv from dual
 where (st_e.NM_PESSOA_RAZAO_SOCIAL like '%ASSOC%' OR st_e.NM_PESSOA_RAZAO_SOCIAL like '%CONDOM%'
    OR  st_e.NM_PESSOA_RAZAO_SOCIAL like '%INSTITUTO%' OR st_e.NM_PESSOA_RAZAO_SOCIAL like '%SIND%')
    OR (st_e.nm_fantasia like '%ASSOC%' OR ...);
```

---

### RN09 -- Validacao: Localidade Limitrofe (cd_pendencia = 2)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Cidade do contrato (ou endereco da empresa) consta em `tb_localidade_limitrofe`
**Comportamento:** Se vendedor e nacional, usa cidade da filial do contrato; caso contrario usa cidade do endereco da empresa. Se a cidade constar em localidades limitrofes, insere pendencia 2 para saude e odonto.
**Resultado:** Empresa bloqueada; localidade limitrofe requer aprovacao manual

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 415-440
-- Vendedor nacional: usa cidade da filial do contrato
-- Outros: usa NM_CIDADE_ENDERECO da empresa
SELECT COUNT(1) INTO L_LOCALIDADE_LIMITROFE FROM TB_LOCALIDADE_LIMITROFE
 WHERE UPPER(DS_AREA_LIMITROFE) IN (UPPER(nvl(l_cidade_contrato, st_e.NM_CIDADE_ENDERECO)));
```

---

### RN10 -- Validacao: Vendedor Fora da Filial (cd_pendencia = 3)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Vendedor nao e nacional E (vendedor nao tem filial atribuida OU filial do vendedor difere da filial da localidade limitrofe) E cd_vendedor_plano != 2704
**Comportamento:** Insere pendencia tipo 3. Vendedores nacionais (fl_vendedor_nacional='S') sao isentos desta validacao.
**Resultado:** Empresa bloqueada; inconsistencia geografica de vendedor requer revisao
**Ambiguidade:** [ATENCAO] Hardcode do vendedor `2704` como excecao -- regra de negocio embutida sem parametrizacao.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 725-745
IF L_VERIFICA_VENDEDOR IS NULL OR L_CD_FILIAL IS NULL THEN
  COUNT_PENDENCIAS := 1; INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET ...
END IF;
IF L_VERIFICA_VENDEDOR <> L_CD_FILIAL AND ST_E.cd_vendedor_plano <> 2704 THEN
  COUNT_PENDENCIAS := 1; INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET ...
END IF;
```

---

### RN11 -- Validacao: Dependente Acima da Idade Limite (cd_pendencia = 4)

**Categoria:** Validacao
**Risco ANS:** [ANS] Regra de elegibilidade de dependentes por faixa etaria -- regulada pela ANS (RN 195/2009 e alteracoes). Dependentes acima de 43 anos podem nao ser cobertos conforme contrato.
**Gatilho:** Dependente com tipo diferente de 1 e com mais de 43 anos, nao configurado como agregado permitido
**Comportamento:** Conta dependentes acima de 43 anos que nao constam em `tb_empresa_agregado` para o modelo/negocio da empresa. Insere pendencia 4 se l_aux_dep > 0.
**Resultado:** Empresa bloqueada; dependente idoso requer validacao

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 600-615
select count(1) into l_aux_dep from tb_usuario_dependente_internet d
 where d.cd_empresa = 'T' || st_e.nu_controle
   and d.CD_TIPO_DEPENDENTE <> 1
   and trunc(MONTHS_BETWEEN(SYSDATE, d.dt_nascimento) / 12) > 43
   and d.cd_tipo_dependente not in (select a.cd_tipo_dependente from tb_empresa_agregado a
                                     where a.nu_controle = (select max(en1.nu_controle)
                                       from tb_empresa_neg en1 ...));
```

---

### RN12 -- Validacao: Sobrinho Acima de 23 Anos (cd_pendencia = 5)

**Categoria:** Validacao
**Risco ANS:** [ANS] Limite de idade para sobrinho como dependente -- regulado por contrato e normas ANS para planos empresariais.
**Gatilho:** Dependente do tipo 14 (sobrinho) com mais de 23 anos, nao parametrizado como agregado
**Comportamento:** Analoga a RN11, mas especifica para cd_tipo_dependente = 14 e limite de 23 anos
**Resultado:** Empresa bloqueada; sobrinho acima do limite requer validacao

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 619-635
select count(1) into l_aux_dep_sob from tb_usuario_dependente_internet d
 where d.cd_empresa = 'T' || st_e.nu_controle
   and trunc(MONTHS_BETWEEN(SYSDATE, d.dt_nascimento) / 12) > 23
   AND CD_TIPO_DEPENDENTE = 14
   AND d.cd_tipo_dependente not in (...tb_empresa_agregado...);
```

---

### RN13 -- Validacao: Titular ou Dependente Acima do Limite de Idade (cd_pendencia = 6 / 13)

**Categoria:** Validacao
**Risco ANS:** [ANS] Limite de idade para planos PME -- proposta pode ser recusada se titular ou dependente ultrapassar o limite (RN 63 ANS e normas de elegibilidade). Impacta diretamente a aceitacao do contrato.
**Gatilho:** Titular ou dependente com idade >= 59 anos (parametro HABILITA_65ANOS=0) OU >= 65 anos (HABILITA_65ANOS != 0)
**Comportamento:**
- Se HABILITA_65ANOS = 0: usa limite de 59 anos, insere pendencia 6
- Se HABILITA_65ANOS != 0: usa limite de 65 anos, insere pendencia 13
**Resultado:** Empresa bloqueada; beneficiario idoso requer validacao

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 638-700
if nvl(vHabilita_65anos,0) = 0 then
  select count(1) into l_aux_tit from tb_usuario_titular_internet t, tb_usuario_dependente_internet d
   where d.nu_controle(+) = t.nu_controle and t.cd_empresa = 'T' || st_e.nu_controle
     and (trunc(MONTHS_BETWEEN(SYSDATE, t.dt_nascimento) / 12) >= 59 or
          trunc(MONTHS_BETWEEN(SYSDATE, d.dt_nascimento) / 12) >= 59);
else -- >= 65
  ...
end if;
```

---

### RN14 -- Validacao: CPF Invalido (cd_pendencia = 7)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Titular com CPF invalido (pk_administracao.fn_check_cic nao retorna 1 ou 3) OU dependente acima de 18 anos sem CPF OU com CPF invalido
**Comportamento:** Insere pendencia 7 para saude e odonto
**Resultado:** Empresa bloqueada; inconsistencia de CPF requer correcao

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 700-718
select COUNT(1) INTO l_aux_tit_cpf from tb_usuario_titular_internet t, tb_usuario_dependente_internet d
 where d.nu_controle(+) = t.nu_controle and t.cd_empresa = 'T' || st_e.nu_controle
   and (pk_administracao.fn_check_cic(T.NU_CPF) NOT in (1, 3) OR
        (trunc(MONTHS_BETWEEN(SYSDATE, d.dt_nascimento) / 12) > 18 AND d.nu_cpf IS NULL) OR
        (trunc(MONTHS_BETWEEN(SYSDATE, d.dt_nascimento) / 12) > 18 AND d.nu_cpf IS NOT NULL AND
         pk_administracao.fn_check_cic(D.NU_CPF) NOT in (1, 3)));
```

---

### RN15 -- Validacao: Quantidade de Vidas Fora do Range (cd_pendencia = 8)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Total de titulares + dependentes (excluindo status 2) fora do range [1, 29]
**Comportamento:** Insere pendencia 8 para saude
**Resultado:** Empresa bloqueada; quantidade de vidas incompativel com contrato PME 3-29

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 835-845
IF l_qtd_vidas < 1 OR l_qtd_vidas > 29 then
  COUNT_PENDENCIAS := 1;
  INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET ...values(... 8 ...);
END IF;
```

---

### RN16 -- Validacao: Vida Digitada Tardiamente (cd_pendencia = 10)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Existem titulares ou dependentes digitados mais de 6 dias apos o cadastro da empresa
**Comportamento:** Insere pendencia 10 para saude (e odonto, se existir vinculo)
**Resultado:** Empresa bloqueada; digitacao tardia requer revisao

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 848-870
IF l_qtd_vidas_mais_6 > 0 then
  INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET ...values(... 10 ...);
END IF;
```

---

### RN17 -- Validacao: Critica de Empresa (cd_pendencia = 11)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Tipo de pendencia 11 ativo em tb_tp_pend_empresa_internet
**Comportamento:** Chama `pr_critica_empresa_internet_1(empresa_internet)` que pode inserir pendencia 11
**Resultado:** Empresa pode ser bloqueada por regra de critica especifica

---

### RN18 -- Validacao: Divergencia Neoway (cd_pendencia = 12)

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** Parametro `PENDENCIA_NEOWAY_PIM = 'S'` E empresa nao e BITIX E fn_checa_divergencia retorna 'S'
**Comportamento:** Verifica divergencia de dados cadastrais com Neoway. Empresas BITIX sao isentas (SACTI 1789837).
**Resultado:** Empresa bloqueada se dados divergem da base Neoway

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 912-960
IF v_valida_emp_bitix = 0 THEN -- exclui BITIX
  if nvl(fn_registro_sistema('PENDENCIA_NEOWAY_PIM'), 'S') = 'S' then
    vfl_divergencia := fn_checa_divergencia(st_e.nu_controle);
    if vfl_divergencia = 'S' then
      insert into tb_pendencia_empresa_internet ...(cd_pendencia=12)...;
    end if;
  end if;
END IF;
```

---

### RN19 -- Validacao de Criticas de Beneficiarios Antes do Cadastro

**Categoria:** Validacao
**Risco ANS:** N/A
**Gatilho:** `wfl_critica = 'S'` E empresa nao tem cd_empresa ainda (nova proposta) E existe empresa odonto vinculada
**Comportamento:**
1. Chama `pr_critica_internet` para cada titular da empresa saude
2. Conta criticas em tb_usuario_critica_internet
3. Repete para empresa odonto
4. Se existem criticas: marca proposta_venda status=9, insere pendencia 9 ("Contem Criticas")
5. Se nao ha criticas: prossegue para cadastro
**Resultado:** Protecao adicional -- impede cadastro de empresa com beneficiarios criticos
**Ambiguidade:** [ATENCAO] O log de criticas eh feito somente se `wfl_log_baixa_pim='S'` E `wnu_controle_odonto IS NOT NULL`. Se nao houver odonto, o log nao e gerado mesmo com criticas.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1001-1050
if nvl(wfl_critica,'N') = 'S' and st_e.cd_empresa is null then
  -- ...busca nu_controle_odonto...
  if wnu_controle_odonto is not null then
    -- chama pr_critica_internet para titulares saude
    -- chama pr_critica_internet para titulares odonto
    if nvl(wqt_critica_sd,0) > 0 then
      -- insere pendencia 9 / atualiza proposta_venda status=9
    end if;
  end if;
end if;
```

---

### RN20 -- Cadastro de Empresa Nova via pr_cadastramento_empresa_prov

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa sem pendencias E sem criticas de beneficiarios E nao tem cd_empresa (nova)
**Comportamento:**
1. Se nao ha criticas (wqt_critica_sd = 0): chama `pr_cadastramento_empresa_prov(nu_controle, p_return)`
2. Extrai cd_empresa do retorno via parsing fragil: `substr(p_return, instr(p_return, ',') + 1)`
3. Verifica se o retorno contem 'ORA-' (indica erro) -- se sim, anula o cd_empresa
**Resultado:** Empresa saude cadastrada definitivamente
**Ambiguidade:** [CRITICO] Parsing de string em `p_return` para extrair cd_empresa e extremamente fragil. Qualquer virgula extra na mensagem de sucesso ou erro ORA- subtil pode resultar em cd_empresa invalido. Ver `proposta-novo-contrato-retorno.md` (em `backup/01-engenharia-reversa/` -- evidencia historica do diagnostico). **Solucao canonica adotada em 24/04/2026:** Opcao D Hibrida -- Fase 1-2 mantem assinatura legado via Adapter/Facade; Fase 3 introduz RECORD `pk_efetivacao_types.t_resultado_efetivacao` (6 campos). [REF DD-01 -- _shared/base-conhecimento/decisoes-design.md] [REF rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/].

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1231-1258
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, p_return);
-- ...
if nvl(wfl_log_baixa_pim,'N') = 'S' and wnu_controle_odonto is not null then
  l_empresa_conveniada_saude := substr(nvl(st_e.cd_empresa,substr(p_return, instr(p_return, ',') + 1)),1,5);
  if instr(l_empresa_conveniada_saude,'ORA-') > 0 then
    l_empresa_conveniada_saude := null; -- tratamento de erro via string!
  ...
```

---

### RN21 -- Cadastro de Empresa Odonto Vinculada

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa saude cadastrada com sucesso (l_empresa_conveniada_saude != null) E existe empresa odonto temporaria vinculada com mesmo CGC
**Comportamento:**
1. Verifica se a empresa odonto ja tem cd_empresa: reativa (fl_status=2)
2. Se nova: chama `pr_odon_cad_empresa_prov` passando nu_controle_odon e cd_empresa_saude
3. Chama `PR_NAT_JURIDICA_ODON` apos cadastro
**Resultado:** Empresa odonto cadastrada/reativada em sincronia com a saude

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1264-1302
if l_empresa_conveniada_saude is not null then
  if l_empresa_odon.cd_empresa is not null then
    update tb_empresa_conveniada set ds_observacao = null, fl_status = 2 ...;
  elsif l_empresa_odon.nu_controle is not null then
    if l_empresa_odon.nu_controle_saude = st_e.nu_controle and l_empresa_odon.nu_cgc_cpf = st_e.nu_cgc_cpf then
      pr_odon_cad_empresa_prov(l_empresa_odon.nu_controle, l_empresa_conveniada_saude, p_return_od);
      PR_NAT_JURIDICA_ODON(ST_E.NU_CONTROLE);
    end if;
  end if;
end if;
```

---

### RN22 -- Pos-efetivacao: Migracao de Codigo de Empresa Provisorio para Definitivo

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Empresa saude cadastrada com sucesso
**Comportamento:**
1. Atualiza tb_empresa_internet: CD_EMPRESA = l_cd_empresa, FL_STATUS_PROCESSAMENTO = 9
2. Marca FL_EMPRESA_NOVA = 'S' em tb_empresa_conveniada
3. Limpa pendencias em tb_pendencia_empresa e insere pendencia 1 (nova empresa)
4. Atualiza tb_usuario_titular_internet e tb_usuario_dependente_internet: cd_empresa de 'T||nu_controle' para definitivo
5. Repete para odonto
**Resultado:** Empresa e usuarios oficialmente migrados do estado provisorio para definitivo

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1306-1370
update tb_empresa_internet set CD_EMPRESA = l_cd_empresa, FL_STATUS_PROCESSAMENTO = 9 ...;
update tb_empresa_conveniada set FL_EMPRESA_NOVA = 'S' ...;
delete tb_pendencia_empresa where CD_EMPRESA_CONVENIADA = l_cd_empresa;
insert into tb_pendencia_empresa (CD_EMPRESA_CONVENIADA, CD_PENDENCIA, ...) values (l_cd_empresa, 1, ...);
update tb_usuario_titular_internet set cd_empresa = l_cd_empresa where cd_empresa = 'T' || ST_E.NU_CONTROLE;
update tb_usuario_dependente_internet set cd_empresa = l_cd_empresa where cd_empresa = 'T' || ST_E.NU_CONTROLE;
```

---

### RN23 -- Efetivacao de Usuarios por Canal de Venda

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Empresa cadastrada (l_cd_empresa != null)
**Comportamento:**
- Canal 2 (Middle): apenas atualiza dt_inicio, NAO muda status para 8 (nao efetiva no ato)
- Canal 1 (PME): muda status para 8 (autorizado) e atualiza dt_inicio
- Para canal 1: chama `pr_cadastramento_internet2` para cada titular que ainda nao esta efetivado
**Resultado:** Usuarios efetivados ou marcados para efetivacao posterior

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1396-1430
If wcd_canal_venda = 2 Then -- Middle
  update tb_usuario_titular_internet set dt_inicio = nvl(v_dt_inicio_empresa, dt_inicio) ...;
Else -- PME
  update tb_usuario_titular_internet set fl_status_processamento = 8, dt_inicio = ... ...;
End If;
-- ...
If wcd_canal_venda != 2 Then -- Para Middle nao efetiva
  for st_usu in (...) loop
    pr_cadastramento_internet2(st_usu.nu_controle, wfl_critica_def);
  end loop;
End If;
```

---

### RN24 -- Tratamento de Empresa com Usuarios Nao Efetivados (Restricao PIM)

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** Apos tentativa de efetivacao, ainda existem titulares com fl_status_processamento = 8
**Comportamento:**
1. Insere pendencia 9 ("CRITICA NA DIGITACAO DAS VIDAS")
2. Reverte status da empresa para pendente (fl_status=1)
3. Atualiza usuarios com observacao "USUARIO NAO PASSOU PELA BAIXA AUTOMATICA DO PIM"
4. Marca usuarios como status 1 (pendente) via loop em tb_usuario + tb_titular
**Resultado:** Empresa fica em estado pendente; usuarios nao efetivados sinalizado para revisao manual

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1600-1660
if (qt_usuario_n_efetivados > 0) or (...) then
  INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET ...(cd_pendencia=9, 'CRITICA NA DIGITACAO DAS VIDAS')...;
  update tb_empresa_conveniada set DS_OBSERVACAO = 'EMPRESA PENDENTE...', FL_STATUS = 1 ...;
  update tb_usuario_titular_internet set DS_OBERVACAO = 'USUARIO NAO PASSOU PELA BAIXA AUTOMATICA...' ...;
  -- sacti 1907523: marca usuarios em tb_usuario como status 1
  for st in (select u.cd_usuario from tb_usuario u, tb_usuario_titular t, tb_empresa_conveniada c
              where u.nu_titular = t.nu_titular and ...) loop
    update tb_usuario set fl_status_usuario = 1, DS_OBSERVACAO = 'USUARIO PENDENTE PELA BAIXA AUTOMATICA DO PIM' ...;
  end loop;
end if;
```

---

### RN25 -- Processamento Odonto Puro (Empresas sem Saude Vinculada)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa em tb_odon_empresa_internet com fl_status_processamento=9, fl_sinaliza_vidas_ok='S', vendedor em tb_odon_param_vendedor_pim, sem usuarios ja cadastrados
**Comportamento:**
1. Conta titulares + dependentes (total <= 29 para processar)
2. Chama pr_critica_internet
3. Se nao tem critica: autoriza (status 8) e chama pr_cadastramento_internet2
4. Se tem critica: volta status para 1 (pendente)
5. Atualiza carencia: dias_adm_especial = 30
6. Atualiza vendedor: cd_vendedor = cd_vendedor_plano

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 1880-1970
for st_emp_od in (select od.cd_empresa, t.nu_controle, t.cd_vendedor_plano,
                   count(*) over(partition by od.cd_empresa) total
                    from tb_odon_empresa_internet od, tb_empresa_conveniada ec, ...
                   where ... od.fl_status_processamento = 9 and fl_sinaliza_vidas_ok = 'S'
                     and v.cd_vendedor = t.cd_vendedor_plano ...) loop
  if st_emp_od.total between 1 and 29 then
    pr_critica_internet(st_emp_od.nu_controle, 1, 'N');
    ...
    pr_cadastramento_internet2(st_emp_od.nu_controle);
  end if;
  update tb_compra_carencia set dias_adm_especial = 30 ...;
end loop;
```

---

### RN26 -- Processamento de Inclusoes (cd_tipo_internet = 2)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa com cd_tipo_internet=2 (somente inclusao) e titulares com fl_status_processamento in ('0','8') e tp_operacao='1' sem observacao de transferencia
**Comportamento:** Para cada titular elegivel: autoriza (status 8) e chama pr_cadastramento_internet2
**Resultado:** Novos beneficiarios incluidos em empresas existentes efetivados

---

### RN27 -- Processamento Completo (cd_tipo_internet = 1)

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Empresa com cd_tipo_internet=1 (processamento completo) e titulares pendentes
**Comportamento:** Similar a RN26 mas com verificacao adicional pos-baixa: se usuário ficou com criticas, volta status para 1 (pendente com cd_pendencia=499)
**Ambiguidade:** [ATENCAO] Codigo de pendencia `499` hardcoded -- sem descricao no codigo.

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 2120-2145
if wqtd_critica > 0 then
  update tb_usuario_titular_internet t
     set t.fl_status_processamento = '1', t.cd_pendencia=499 ...;
end if;
```

---

### RN28 -- Processamento Individual/Familiar

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Usuario com tp_operacao='1', fn_individual_familiar='00100', area de venda com fl_inclui_usuario_auto='S', digitado nos ultimos 30 dias, sem pendencia Neoway
**Comportamento:**
1. Chama pr_critica_internet
2. Se sem criticas: autoriza (status 8) e chama pr_cadastramento_internet2
3. Se com criticas: marca status 1 (pendente)
4. Em caso de erro em pr_cadastramento_internet2: rollback + insere critica 999

**Evidencia:**
```sql
-- Origem: pr_efetiva_internet, linhas 2153-2200
for st_i in (select t.nu_controle from tb_area_venda a, tb_vendedor_plano v, tb_usuario_titular_internet t
              where t.tp_operacao = '1'
                and fn_individual_familiar(t.cd_empresa) = '00100'
                and t.dt_digitacao >= sysdate - 30
                and nvl(a.fl_inclui_usuario_auto, 'N') = 'S' ...) loop
  pr_critica_internet(st_i.nu_controle);
  select count(*) into wqtd from tb_usuario_critica_internet ...;
  if wqtd = 0 then pr_cadastramento_internet2(st_i.nu_controle); end if;
```

---

### RN29 -- Obrigacao de Odonto Agregado

**Categoria:** Orquestracao
**Risco ANS:** N/A
**Gatilho:** Ao final de todas as fases de efetivacao
**Comportamento:** Delega para `pr_odon_Obrigacao_Agregado`
**Resultado:** Gera obrigacoes de odonto para agregados (fase 7)

---

### RN30 -- Processamento BITIX (Integracao JSON)

**Categoria:** Integracao
**Risco ANS:** N/A
**Gatilho:** `fn_registro_sistema('COLIGADA_EMPRESA_BITIX') = 1`
**Comportamento:** Chama `PR_COLIGA_EMPRESA_BITIX` e `PK_VENDA_JSON.pr_efetiva` para processar propostas enviadas via JSON pela BITIX
**Resultado:** Empresas e propostas BITIX efetivadas

---

### RN31 -- Processamento de Coligadas SIGO

**Categoria:** Integracao
**Risco ANS:** N/A
**Gatilho:** `fn_registro_sistema('COLIGADA_EMPRESA') = 1`
**Comportamento:** Chama `pr_processa_empresa_coligada` para processar contratos coligados digitados no site Hapvida
**Resultado:** Empresas coligadas processadas

---

## 4. Fluxo de Decisao (Narrativa)

A `pr_efetiva_internet` e um batch orquestrador executado periodicamente. Ao iniciar, carrega 4 parametros globais de controle. Em seguida, processa 9 fases em sequencia:

**Fase 1 (PME Modelo):** Verifica empresas digitadas com at 29 vidas que tem baixa automatica habilitada por modelo e area de venda. Para cada empresa elegivel, cadastra os beneficiarios via `pr_cadastramento_internet2` e marca a empresa como operador.

**Fase 2 (PIM Principal -- BLOCO CRITICO):** Se `MOVIMENTACAO_PIM_AUTOMATICO != 'NAO'`, entra no loop principal. Para cada proposta de empresa internet com `Fl_Sinaliza_Vidas_Ok='S'`:
- Ignora ex-clientes e PME 30-99 (se parametrizado)
- Avalia ate 13 tipos de pendencias (localidade, vendedor, idade, vidas, CPF, critica, Neoway)
- Se nenhuma pendencia: verifica criticas de beneficiarios (se flag ativa)
- Se sem criticas: cadastra empresa via `pr_cadastramento_empresa_prov`; extrai cd_empresa do retorno (parsing fragil); cadastra odonto; migra usuarios; efetiva por canal

**Fase 3 (Odonto Puro):** Para empresas odonto sem vinculo saude, com vendedores parametrizados, processsa efetivacao direta.

**Fase 4 (Inclusoes):** Efetiva novas vidas em empresas com cd_tipo_internet=2.

**Fase 5 (Completo):** Efetiva em empresas com cd_tipo_internet=1, com reprocessamento de criticas.

**Fase 6 (Individual/Familiar):** Efetiva beneficiarios individuais com area de venda habilitada.

**Fase 7 (Obrigacao Odonto):** Gera obrigacoes de agregados odonto.

**Fase 8 (BITIX):** Processa propostas JSON BITIX se flag ativa.

**Fase 9 (Coligadas SIGO):** Processa empresas coligadas se flag ativa.

---

## 5. Matriz de Regras

| ID    | Gatilho                                                | Logica                                              | Resultado                              | Categoria     | Risco ANS |
|-------|--------------------------------------------------------|-----------------------------------------------------|----------------------------------------|---------------|-----------|
| RN01  | Inicio da procedure                                    | Carrega 4 flags do sistema                          | Comportamento configurado              | Orquestracao  | N/A       |
| RN02  | PME <= 29 com baixa automatica por modelo/area         | fl_baixa=1 + fl_vidas_ok=1 + total<=29              | Empresa efetivada automaticamente      | Orquestracao  | N/A       |
| RN03  | Inicio bloco PIM                                       | MOVIMENTACAO_PIM_AUTOMATICO != 'NAO'                | PIM executado ou pulado                | Orquestracao  | N/A       |
| RN04  | Pre-processamento coligadas                            | fn_valida_coligada_baixa(V_PROPOSTA_MAE)             | Pre-validacao coligadas                | Orquestracao  | N/A       |
| RN05  | Loop PIM -- selecao de empresas                        | dt_cad>'01/11/2012', fl_sinaliza_ok='S'             | Fila de empresas candidatas            | Orquestracao  | N/A       |
| RN06  | Empresa no loop PIM                                    | ex-cliente OU 30-99 funcionarios                    | Empresa ignorada neste ciclo           | Validacao     | N/A       |
| RN07  | Empresa elegivel no loop PIM                           | nu_total_empregado 1-29 / 30-99                     | wcd_canal_venda 1 ou 2                 | Calculo       | N/A       |
| RN08  | Nome empresa contem palavras suspeitas                 | LIKE '%ASSOC%', '%SIND%', etc.                      | Pendencia 1 (saude + odonto)           | Validacao     | N/A       |
| RN09  | Cidade da empresa em localidade limitrofe              | IN tb_localidade_limitrofe                          | Pendencia 2 (saude + odonto)           | Validacao     | N/A       |
| RN10  | Vendedor nao nacional, filial incompativel             | L_VERIFICA_VENDEDOR <> L_CD_FILIAL                  | Pendencia 3 (saude + odonto)           | Validacao     | N/A       |
| RN11  | Dependente > 43 anos nao agregado                     | MONTHS_BETWEEN > 43                                 | Pendencia 4 (saude)                    | Validacao     | [ANS]     |
| RN12  | Sobrinho (tipo 14) > 23 anos                          | CD_TIPO_DEPENDENTE=14, MONTHS_BETWEEN > 23          | Pendencia 5 (saude)                    | Validacao     | [ANS]     |
| RN13  | Titular/dependente >= 59/65 anos                      | MONTHS_BETWEEN >= 59 ou 65                          | Pendencia 6 ou 13 (saude)              | Validacao     | [ANS]     |
| RN14  | CPF invalido                                          | fn_check_cic NOT IN (1,3)                           | Pendencia 7 (saude + odonto)           | Validacao     | N/A       |
| RN15  | Vidas fora de [1,29]                                  | l_qtd_vidas < 1 OR > 29                             | Pendencia 8 (saude)                    | Validacao     | N/A       |
| RN16  | Vida digitada > 6 dias apos cadastro empresa          | (dt_digitacao - dt_cadastramento) > 6               | Pendencia 10 (saude + odonto)          | Validacao     | N/A       |
| RN17  | Pendencia 11 ativa                                    | pr_critica_empresa_internet_1                        | Pendencia 11                           | Validacao     | N/A       |
| RN18  | Divergencia Neoway                                    | fn_checa_divergencia = 'S', empresa nao BITIX        | Pendencia 12                           | Validacao     | N/A       |
| RN19  | Criticas de beneficiarios antes do cadastro           | wfl_critica='S', sem cd_empresa, tem odonto          | Pendencia 9, proposta_venda status=9   | Validacao     | N/A       |
| RN20  | Empresa sem pendencias e sem criticas                 | pr_cadastramento_empresa_prov                        | Empresa saude cadastrada               | Orquestracao  | N/A       |
| RN21  | Empresa saude cadastrada com odonto vinculado         | pr_odon_cad_empresa_prov + PR_NAT_JURIDICA_ODON      | Empresa odonto cadastrada              | Orquestracao  | N/A       |
| RN22  | Empresa cadastrada com sucesso                        | UPDATE tb_empresa_internet/conveniada/usuarios       | Migracao provisorio->definitivo        | Persistencia  | N/A       |
| RN23  | Canal 1 vs Canal 2                                    | wcd_canal_venda = 2 apenas dt_inicio; else status=8  | Efetivacao imediata ou diferida        | Persistencia  | N/A       |
| RN24  | Usuarios nao efetivados apos baixa                    | qt_usuario_n_efetivados > 0                          | Pendencia 9 + empresa pendente         | Persistencia  | N/A       |
| RN25  | Odonto puro sem saude vinculada                       | Loop tb_odon_empresa_internet + tb_odon_param_vendedor| Efetivacao odonto + carencia 30 dias  | Orquestracao  | N/A       |
| RN26  | Empresa cd_tipo_internet=2 (inclusao)                 | Loop inclusoes                                       | Beneficiarios incluidos efetivados     | Orquestracao  | N/A       |
| RN27  | Empresa cd_tipo_internet=1 (completo)                 | Loop completo + check critica pos-baixa              | Efetivacao geral + cd_pendencia=499    | Orquestracao  | N/A       |
| RN28  | Individual/familiar com auto-inclusao                 | fn_individual_familiar='00100', auto='S'             | Individual efetivado ou pendenciado    | Orquestracao  | N/A       |
| RN29  | Fim das fases de efetivacao                           | pr_odon_Obrigacao_Agregado                           | Obrigacoes odonto geradas              | Orquestracao  | N/A       |
| RN30  | COLIGADA_EMPRESA_BITIX = 1                            | PR_COLIGA_EMPRESA_BITIX + PK_VENDA_JSON.pr_efetiva   | Propostas BITIX efetivadas             | Integracao    | N/A       |
| RN31  | COLIGADA_EMPRESA = 1                                  | pr_processa_empresa_coligada                         | Coligadas SIGO processadas             | Integracao    | N/A       |

---

## 6. Smells Identificados

| ID  | Tipo                              | Localizacao                                    | Impacto | Sugestao                                                                  |
|-----|-----------------------------------|------------------------------------------------|---------|---------------------------------------------------------------------------|
| S01 | WHEN OTHERS THEN NULL (50+)       | Todo o codigo                                  | Alto    | Substituir por log estruturado + reraise ou tratamento especifico         |
| S02 | WHEN OTHERS THEN Dbms_Output      | Todo o codigo                                  | Alto    | Substituir por `pk_nk4trace.t` ou mecanismo de log estruturado            |
| S03 | Cursor N+1                        | Loop st_usu dentro de loop st_e                | Alto    | Reescrever com BULK COLLECT + FORALL                                      |
| S04 | COMMIT dentro de sub-loops        | ~10 pontos (linhas 162, 967, 1372, 1430, etc.) | Alto    | Centralizar COMMITs; usar transacao unica por empresa                     |
| S05 | Hardcode de data de corte         | Linha 284: `to_date('01/11/2012')`             | Medio  | Parametrizar em tb_registro_sistema                                       |
| S06 | Hardcode de data odonto           | Linha 1909: `to_date('16/05/2017')`            | Medio  | Parametrizar em tb_registro_sistema                                       |
| S07 | Hardcode de vendedor 2704         | Linhas 741-742                                 | Medio  | Parametrizar ou mover para tabela de excecoes                             |
| S08 | Hardcode de operador 'HUMASTER'   | Todo o codigo (~20 ocorrencias)                | Baixo   | Usar constante ou parametro                                               |
| S09 | Hardcode de cd_pendencia 499      | Linha 2128                                     | Medio  | Registrar significado em tb_pendencia; usar constante                     |
| S10 | Hardcode sysdate - 30             | Linha 2166                                     | Medio  | Parametrizar em tb_registro_sistema                                       |
| S11 | Parsing fragil de retorno         | Linhas 1249-1258: `substr(p_return, instr...)`  | Critico | Refatorar contrato de pr_cadastramento_empresa_prov (ver proposta)        |
| S12 | ~40% duplicacao saude/odonto      | Blocos paralelos em todo Fase 2               | Alto    | Extrair logica comum em sub-rotinas parametrizadas                        |
| S13 | Logica de pendencia duplicada 13x | stp1..stp13: mesmo padrao INSERT repetido      | Alto    | Extrair motor de pendencias para package (ex: pk_pendencia_pim)           |
| S14 | Log de baixa duplicado ~10x       | Padrao select max(cd_log)+1 + insert           | Medio  | Extrair para procedure pk_log_baixa_pim.pr_registra                       |
| S15 | ~25 variaveis globais com reset   | Linhas 323-345: reset manual a cada empresa    | Medio  | Encapsular em RECORD TYPE t_ctx_efetivacao                                |
| S16 | 1e1 = 1e1 em WHERE                | Linha 348: `where 1e1 = 1e1`                   | Baixo   | Remover tautologia                                                        |
| S17 | Outer join pre-ANSI               | Varios: `d.nu_controle(+) = t.nu_controle`     | Baixo   | Migrar para LEFT JOIN padrao ANSI                                         |
| S18 | Codigo comentado                  | Linhas ~374: bloco l_verifica_adm comentado    | Baixo   | Remover codigo morto ou documentar motivo                                 |
| S19 | Semantica invertida de flag       | RN03: wVerificaPim > 0 = PIM DESLIGADO         | Medio  | Renomear variavel para wVerificaPimDesligado                              |
| S20 | Dependencia em string de retorno  | RN20: ORA- detectado via instr()               | Critico | Refatorar contrato de retorno (ver proposta-novo-contrato-retorno.md)     |

---

## 7. Tratamento de Excecoes

| Excecao          | ORA-   | Quando Ocorre                                              | Tratamento Atual                                    | Recomendado                                                              |
|------------------|--------|------------------------------------------------------------|-----------------------------------------------------|--------------------------------------------------------------------------|
| OTHERS           | varios | Em quase todos os blocos atomicos                          | `NULL` (silencioso) ou `Dbms_Output.put_line`       | Log estruturado + registro em tabela de erros + reraise se critico       |
| NO_DATA_FOUND    | 01403  | SELECT sem dado (ex: fl_baixa, vExiste, etc.)              | Atribuicao de valor default no handler              | Adequado para casos onde ausencia e esperada; insuficiente para outros   |
| TOO_MANY_ROWS    | 01422  | SELECT CD_Filial INTO de tb_localidade_limitrofe           | Segundo SELECT com filtro adicional por cd_filial    | Logica de desempate razoavel, mas frágil se nenhuma linha existir         |
| OTHERS (odonto)  | varios | pr_odon_cad_empresa_prov                                   | INSERT pendencia 9 + p_return_od := null             | Adequado como fallback; perda de contexto do erro                        |
| OTHERS (internet2) | varios | pr_cadastramento_internet2                                | ROLLBACK + INSERT critica 999 + `ERRM`              | Bom padrao de rollback; log insuficiente para rastreamento                |

---

## 8. Riscos ANS

| ID    | Area           | Descricao                                                                    | Regras     | Severidade | Acao                                                         |
|-------|----------------|------------------------------------------------------------------------------|------------|------------|--------------------------------------------------------------|
| ANS01 | Elegibilidade  | Limite de 43 anos para dependentes nao agragados                             | RN11       | Alta       | Verificar aderencia RN 195/2009 e contrato por modelo        |
| ANS02 | Elegibilidade  | Limite de 23 anos para sobrinho (tipo 14)                                    | RN12       | Alta       | Verificar regra contratual por modelo de negocio             |
| ANS03 | Elegibilidade  | Limite de 59/65 anos para titulares e dependentes (parametrizado por flag)   | RN13       | Alta       | Verificar RN 63 ANS; confirmar qual limite e valido por produto|
| ANS04 | Carencia       | dias_adm_especial = 30 hardcode para odonto puro                             | RN25       | Media      | Verificar se carencia de 30 dias e parametro ou regra fixa   |
| ANS05 | Portabilidade  | Exclusao de ex-clientes condicionada a flag HABILITA_65ANOS (inconsistencia) | RN06       | Media      | Separar logica de ex-cliente da logica de limite de idade    |

---

## 9. Ecossistema

- **Input:**
  - tb_empresa_internet (propostas digitadas aguardando efetivacao)
  - tb_empresa_digitada (PME por modelo)
  - tb_odon_empresa_internet (propostas odonto)
  - tb_registro_sistema (configuracao/flags)
  - tb_tp_pend_empresa_internet (tipos de pendencia ativos)

- **Output:**
  - tb_empresa_conveniada (empresa definitiva criada/atualizada)
  - tb_usuario_titular_internet / tb_usuario_dependente_internet (status atualizado, cd_empresa definitivo)
  - tb_usuario (usuario efetivado)
  - tb_pendencia_empresa_internet (pendencias inseridas/removidas)
  - tb_pendencia_empresa (pendencia 1 da nova empresa)
  - humaster.tb_log_baixa_controle (log de processo)
  - tb_usuario_critica_internet (criticas de erro 999)
  - tb_compra_carencia (carencia odonto)
  - tb_proposta_venda (status atualizado)

---

## 10. Painel de Decisao (PO)

**Ambiguidades e pendencias para validacao:**

| ID  | Descricao                                                                                          | Tipo        | Acao                                                              |
|-----|----------------------------------------------------------------------------------------------------|-------------|-------------------------------------------------------------------|
| A01 | Schema real e HUMASTER; usuario informou HEALTH -- confirmar se existe sinonimo publico em HEALTH  | [ATENCAO]   | Verificar com DBA                                                 |
| A02 | Dupla consulta de fl_baixa (tb_modelo_empresa depois tb_area_venda sobrescreve) -- qual prevalece? | [ATENCAO]   | Validar com PO qual e a regra correta                             |
| A03 | fn_valida_coligada_baixa chamada com V_PROPOSTA_MAE=NULL -- codigo incompleto?                     | [ATENCAO]   | Verificar com desenvolvedor responsavel                           |
| A04 | Data hardcode `01/11/2012` como corte historico -- pode ser removida?                             | [ATENCAO]   | Validar com PO se todas as empresas pos-nov/2012 ja foram tratadas|
| A05 | Contrato de retorno de pr_cadastramento_empresa_prov via string fragil                             | [CRITICO]   | Refatorar contrato (ver proposta-novo-contrato-retorno.md)        |
| A06 | Logica de exclusao de ex-cliente acoplada ao flag HABILITA_65ANOS                                  | [ATENCAO]   | Validar se e intencional ou acidente de evolucao                  |
| A07 | Limite de 59 vs 65 anos: qual e o correto para o produto atual?                                    | [ANS]       | Confirmar com area regulatoria e produto                          |
| A08 | cd_pendencia=499 hardcoded em RN27 -- qual o significado?                                          | [ATENCAO]   | Verificar em tb_pendencia / com analista de negocio               |
| A09 | SINONIMO PUBLICO PR_EFETIVA_INTERNET esta INVALID (09/04/2026) -- objeto HUMASTER sem grant visivel | [CRITICO]   | Verificar com DBA se objeto existe e foi dropado/recriado recentemente |
| A11 | MOVIMENTACAO_PIM_AUTOMATICO='NAO' em producao -- bloco PIM desligado. Temporario ou permanente?    | [ATENCAO]   | Confirmar com equipe operacional quando/se sera reativado         |
| A10 | Data hardcode `16/05/2017` para odonto puro -- pode ser removida?                                  | [ATENCAO]   | Validar com PO                                                    |

**Aprovacao:**
- [ ] Aprovado -- seguir com as regras extraidas
- [ ] Aprovado com ressalvas: [detalhar]
- [ ] Reprovado -- redesenhar antes de continuar

---

[HANDOFF-DDD]
Eng. reversa concluida. Artefato pronto para consumo pelo Agente DDD.
Leitura obrigatoria antes de iniciar DDD:
- Este arquivo: `rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/01-engenharia-reversa/reversa-pr-efetiva-internet.md`
- `rotinas/pr_efetiva_internet/02-ddd/ddd-modelagem-dominio.md` (ja existente)
- `_shared/base-conhecimento/catalogo-tabelas.md`
- `_shared/dicionario-dominio.md`
