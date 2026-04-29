# Catalogo de Tabelas

> Atualizado em: 17/04/2026
> Fonte: MCP Oracle 19c -- Hapvida Producao (all_tab_columns + all_tables)

---

## TB_EMPRESA_INTERNET

**Schema:** HUMASTER | **Volumes:** 793.730 linhas (11/04/2026)
**Descricao:** Propostas de empresa digitadas no PIM aguardando efetivacao

| Coluna                  | Tipo        | Nulo | Descricao                                        |
|-------------------------|-------------|------|--------------------------------------------------|
| NU_CONTROLE             | NUMBER      | N    | PK -- numero de controle da proposta             |
| TP_OPERACAO             | VARCHAR2(1) | N    | Tipo: '1'=nova empresa                           |
| CD_EMPRESA              | VARCHAR2(5) | S    | Codigo da empresa definitiva (apos efetivacao)   |
| NU_CGC_CPF              | NUMBER      | S    | CNPJ/CPF da empresa                             |
| NM_PESSOA_RAZAO_SOCIAL  | VARCHAR2(45)| S    | Razao social                                     |
| NM_FANTASIA             | VARCHAR2(20)| S    | Nome fantasia                                    |
| NM_CIDADE_ENDERECO      | VARCHAR2(60)| S    | Cidade do endereco                               |
| NU_TOTAL_EMPREGADO      | NUMBER(4)   | S    | Total de funcionarios (define canal: 1-29/30-99) |
| FL_STATUS_PROCESSAMENTO | VARCHAR2(1) | S    | 0=digitado, 1=pendente, 8=autorizado, 9=processado|
| DT_STATUS_PROCESSAMENTO | DATE        | N    | Data da ultima mudanca de status                 |
| DT_CADASTRAMENTO        | DATE        | N    | Data de digitacao da proposta                    |
| FL_SINALIZA_VIDAS_OK    | VARCHAR2(1) | S    | 'S'=digitacao concluida (liberada para efetivacao)|
| CD_VENDEDOR_PLANO       | NUMBER      | N    | Vendedor responsavel                             |
| FL_NATUREZA_EMPRESA     | VARCHAR2(1) | S    | Natureza juridica                                |
| CD_MODELO_NEGOCIO       | NUMBER      | S    | Modelo de negocio do contrato                    |
| CD_FILIAL_CONTRATO      | VARCHAR2(3) | S    | Filial do contrato                               |
| CD_OPERADOS             | VARCHAR2(30)| S    | [ORIGEM] Ferramenta de venda que digitou a proposta. Valores conhecidos: 'BITIX' (origem BITIX/NDI), 'WEBHAP' (Portal do Corretor), 'PONTO' (TAFFIX/Administradoras de Beneficios). Campo de particionamento logico EI vs VJ. [REF DD-11] |
| OBSERVACAO              | VARCHAR2(2000)| S  | Observacoes gerais                               |

---

## TB_EMPRESA_CONVENIADA

**Schema:** HUMASTER | **Volumes:** 2.328.755 linhas (11/04/2026)
**Descricao:** Empresas conveniadas definitivas no sistema

Colunas relevantes para PR_EFETIVA_INTERNET:
- `CD_EMPRESA_CONVENIADA` -- PK
- `FL_STATUS` -- 1=pendente, 2=ativo
- `FL_EMPRESA_NOVA` -- 'S' quando recem-criada via PIM
- `CD_TIPO_INTERNET` -- 0=operador, 1=completo, 2=somente inclusao, 3=PME digital
- `DS_OBSERVACAO` -- observacoes de status
- `FL_TIPO_CONTRATO` -- 2=ex-cliente (usado em RN06)

---

## TB_ODON_EMPRESA_INTERNET

**Schema:** HUMASTER | **Volumes:** 382.366 linhas (11/04/2026)
**Descricao:** Propostas de empresa odonto temporarias vinculadas a propostas saude

Colunas chave:
- `NU_CONTROLE` -- PK
- `NU_CONTROLE_SAUDE` -- FK para TB_EMPRESA_INTERNET.NU_CONTROLE
- `CD_EMPRESA` -- codigo empresa odonto definitiva
- `FL_STATUS_PROCESSAMENTO` -- mesmo dominio de TB_EMPRESA_INTERNET
- `FL_SINALIZA_VIDAS_OK` -- 'S'=liberada para efetivacao
- `NU_CGC_CPF` -- CNPJ (usado para validar vinculo com saude em RN21)

---

## TB_USUARIO_TITULAR_INTERNET

**Schema:** HUMASTER | **Volumes:** 53.937.043 linhas (11/04/2026)
**Descricao:** Titulares (beneficiarios responsaveis) digitados no PIM

Colunas chave:
- `NU_CONTROLE` -- PK
- `CD_EMPRESA` -- codigo empresa (provisorio='T'||nu_controle_empresa, definitivo=cd_empresa)
- `FL_STATUS_PROCESSAMENTO` -- 0=digitado, 1=pendente, 2=cancelado, 8=autorizado, 9=processado, 17=divergencia Neoway
- `TP_OPERACAO` -- '1'=inclusao
- `DT_DIGITACAO` -- data de digitacao
- `DT_NASCIMENTO` -- data de nascimento (usada em validacoes de idade)
- `NU_CPF` -- CPF do titular
- `CD_USUARIO` -- FK para TB_USUARIO (apos efetivacao)
- `CD_PENDENCIA` -- codigo de pendencia atual
- `DS_OBERVACAO` -- [ATENCAO] typo intencional no nome da coluna
- `CD_VENDEDOR_PLANO` -- vendedor responsavel

---

## TB_USUARIO_DEPENDENTE_INTERNET

**Schema:** HUMASTER | **Volumes:** 16.810.568 linhas (11/04/2026)
**Descricao:** Dependentes digitados no PIM

Colunas chave:
- `NU_CONTROLE` -- FK para titular
- `NU_CONTROLE_DEP` -- identificador do dependente
- `CD_EMPRESA` -- codigo empresa (mesmo dominio do titular)
- `FL_STATUS_PROCESSAMENTO` -- mesmo dominio do titular
- `CD_TIPO_DEPENDENTE` -- tipo: 1=conjuge, 14=sobrinho, etc.
- `DT_NASCIMENTO` -- data de nascimento (validacoes de idade)
- `NU_CPF` -- CPF do dependente
- `DS_OBERVACAO` -- [ATENCAO] typo intencional

---

## TB_PENDENCIA_EMPRESA_INTERNET

**Schema:** HUMASTER | **Volumes:** 305.214 linhas (04/04/2026)
**Descricao:** Pendencias de empresas no processo PIM

| Coluna               | Tipo         | Nulo | Descricao                         |
|----------------------|--------------|------|-----------------------------------|
| CD_PENDENCIA         | NUMBER       | N    | Tipo de pendencia (1-13)          |
| NU_CONTROLE          | NUMBER       | N    | FK para empresa (internet/odonto) |
| DT_STATUS            | DATE         | N    | DEFAULT SYSDATE                   |
| NU_CONTROLE_PENDENCIA| NUMBER       | N    | PK (gerada via SQ_CONTROLE_PENDENCIA ou similar)|
| DS_OBSERVACAO        | VARCHAR2     | S    | Descricao do erro                 |
| CD_OPERADOR          | VARCHAR2     | N    | DEFAULT USER                      |

**Tipos de pendencia em producao (tb_tp_pend_empresa_internet):**

| cd_pendencia | ds_pendencia                                        | fl_status |
|--------------|-----------------------------------------------------|-----------|
| 1            | VENDA PARA ASSOC, COND, INSTITUICAO E SINDICATOS    | 1 (ativo) |
| 2            | ENDERECO DA EMPRESA NAO ESTA EM AREA LIMITROFE      | 0 (inativo)|
| 3            | VENDEDOR NAO PERTENCE A FILIAL DA EMPRESA           | 1 (ativo) |
| 4            | EMPRESA CONTEM DEPENDENTE > 43 ANOS                 | 0 (inativo)|
| 5            | EMPRESA CONTEM DEPENDENTE SOBRINHO > 18 ANOS        | 1 (ativo) |
| 6            | EMPRESA COM INCLUSAO PENDENTE US >= 59 ANOS         | 0 (inativo)|
| 7            | EMPRESA COM USUARIO COM CPF INVALIDO                | 1 (ativo) |
| 8            | EMPRESA SEM ESTA NA FAIXA DE VIDAS DE 2 A 29        | 1 (ativo) |
| 9            | ERRO NA BAIXA AUTOMATICA DA EMPRESA                 | 1 (ativo) |
| 10           | EMPRESA CONTEM CONTRATO(S) COM MAIS DE 6 DIAS DE DIGITACAO | 0 (inativo)|
| 11           | EMPRESA COM INCLUSAO DE AGREGADO FORA DA REGRA      | 1 (ativo) |
| 12           | EMPRESA COM CONTROLE EM DIVERGENCIA COM A NEOWAY    | 1 (ativo) |
| 13           | EMPRESA COM INCLUSAO PENDENTE US >= 65 ANOS         | 1 (ativo) |

[ATENCAO] Pendencias 2, 4, 6 e 10 estao INATIVAS (fl_status=0) em producao. Os loops stp2, stp4, stp6, stp9 nunca inserem pendencia.

---

## TB_REGISTRO_SISTEMA

**Schema:** HUMASTER | **Volumes:** 2.060 linhas (11/04/2026)
**Descricao:** Parametros e flags de configuracao do sistema

**Parametros relevantes para PR_EFETIVA_INTERNET (valores em producao 17/04/2026):**

| cd_chave                       | vl_chave | Efeito                                           |
|-------------------------------|----------|--------------------------------------------------|
| FL_CRITICA_SAUDE_ODONTO       | S        | Validacao de criticas ativa antes de cadastrar empresa |
| FL_LOG_BAIXA_CONTROLE         | S        | Log detalhado de baixa ativo                     |
| CD_EMPRESA_INDIVIDUAL_ODONTO_PURO | 50700 | Empresa padrao para odonto puro individual       |
| CHECA_VENDA_OD_PURO_FINALIZADA| 1        | Verifica venda odonto puro antes de efetivar     |
| HABILITA_65ANOS               | 1        | Limite de idade = 65 anos (nao 59); pendencia 13 (nao 6) |
| MOVIMENTACAO_PIM_AUTOMATICO   | NAO      | [CRITICO] Bloco PIM principal DESLIGADO          |
| PENDENCIA_NEOWAY_PIM          | S        | Validacao Neoway ativa                           |
| COLIGADA_EMPRESA_BITIX        | 1        | Processamento BITIX ativo                        |
| COLIGADA_EMPRESA              | 1        | Processamento coligadas SIGO ativo               |

---

## TB_LOG_BAIXA_CONTROLE

**Schema:** HUMASTER | **Volumes:** 234.164 linhas (21/03/2026)
**Descricao:** Log de tentativas de baixa automatica PIM

| Coluna       | Tipo         | Nulo | Descricao                                     |
|--------------|--------------|------|-----------------------------------------------|
| CD_LOG       | NUMBER       | N    | PK (gerado via max+1 -- nao usa sequence)     |
| NU_CONTROLE  | NUMBER       | S    | Nu_controle da empresa                        |
| NU_CONTROLE_T| NUMBER       | S    | Nu_controle do titular com critica            |
| NU_CONTROLE_D| NUMBER       | S    | Nu_controle do dependente com critica         |
| CD_EMPRESA   | VARCHAR2(5)  | S    | Codigo empresa definitiva                     |
| FL_STATUS    | VARCHAR2(2)  | S    | '0'=inicio, '5'=critica encontrada, '10'=fim  |
| DS_OBSERVACAO| VARCHAR2(1024)| S   | Descricao do evento                           |
| CD_OPERADOR  | VARCHAR2(70) | S    | Operador/contexto                             |
| DT_CADASTRO  | DATE         | S    | Data do log                                   |

[ATENCAO] CD_LOG e gerado via `SELECT MAX(CD_LOG)+1` -- sem sequence, sujeito a race condition em execucoes paralelas.

---

## TB_USUARIO_CRITICA_INTERNET

**Schema:** HUMASTER | **Volumes:** 11.258.400 linhas (11/04/2026)
**Descricao:** Criticas de validacao de beneficiarios PIM

---

## TB_EMPRESA_DIGITADA

**Schema:** HUMASTER | **Volumes:** 6.714 linhas (28/03/2026)
**Descricao:** Empresas PME digitadas para baixa automatica por modelo

---

## TB_TP_PEND_EMPRESA_INTERNET

**Schema:** HUMASTER | **Volumes:** 13 linhas (18/11/2024)
**Descricao:** Tipos de pendencia configurados para o PIM (ver detalhe em TB_PENDENCIA_EMPRESA_INTERNET acima)

---

## TB_ODON_PARAM_VENDEDOR_PIM

**Schema:** HUMASTER | **Volumes:** 17 linhas (23/06/2024)
**Descricao:** Parametros de vendedores autorizados para efetivacao de odonto puro no PIM

---

## TB_EMPRESA_COLIGADA

**Schema:** HUMASTER | **Volumes:** 4.643 linhas (11/04/2026)
**Descricao:** Contratos coligados (mae/filha) para processamento em lote

---

## TB_PROPOSTA_VENDA

**Schema:** HUMASTER | **Volumes:** 84.763 linhas (11/04/2026)
**Descricao:** Propostas de venda vinculadas a contratos.
**[EXCLUSIVA ORIGEM BITIX]** (confirmado 24/04/2026 via CVS): populada e atualizada exclusivamente por PK_VENDA_JSON. PR_EFETIVA_INTERNET possui duas operacoes residuais (SELECT COUNT linha 1188 e UPDATE fl_status=9 linha 1198) que so disparam para propostas BITIX -- codigo morto no EI to-be. AG07 e R12 removidos do DDD EI. [REF DD-05] [REF A-TO-BE-02 no DDD EI]

---

## TB_LOCALIDADE_LIMITROFE

**Schema:** HUMASTER | **Volumes:** 656 linhas (23/09/2024)
**Descricao:** Localidades em areas de fronteira que requerem validacao especial de filial

---

> [REVISAO] Tabelas abaixo identificadas durante modelagem DDD do PK_VENDA_JSON (24/04/2026). Ausentes no catalogo original. Adicionadas como retroalimentacao.

## TB_USUARIO_VENDA_ADM

**Schema:** HUMASTER
**Descricao:** Registra o vinculo entre uma proposta de Venda Administrativa (ADM) e o contrato anterior da empresa/beneficiarios. Central para recuperacao de carencia e rastreabilidade do fluxo ADM.
**Rotinas que acessam:** PK_VENDA_JSON (pr_pim_insere_cnpj, pr_set_usuario_internet)
**Operacoes:** DELETE (reprocessamento), INSERT (nivel empresa e nivel beneficiario)
**Colunas relevantes:**
- `CD_EMP_ANTERIOR` -- FK para empresa anterior (contrato sendo renegociado)
- `CD_USU_ANT_TITULAR` -- Codigo do usuario titular anterior (NULL no registro de nivel empresa)
- `CD_USU_ANT_DEPENTENTE` -- Codigo do usuario dependente anterior (NULL no registro de nivel empresa)
- `TPROVISORIO` -- Controle provisorio da proposta atual (FK staging)
- `DT_INCLUSAO` -- Data de inclusao do registro
- `NU_CONTROLE_TITULAR` -- Controle do titular na proposta atual
- `NU_CONTROLE_DEP` -- Controle do dependente na proposta atual
**Observacao:** Possui dois tipos de registro: (1) nivel empresa (CD_USU_ANT_TITULAR=NULL), inserido em pr_pim_insere_cnpj; (2) nivel beneficiario (com codigos), inserido em pr_set_usuario_internet para cada beneficiario com historico.
**Regras associadas:** RN17, RN19, RN21, RN22 (reversa-pk-venda-json.md)

---

## TB_USUARIO_ALT_RISCO

**Schema:** HUMASTER
**Descricao:** Registra beneficiarios classificados como alto risco em propostas ADM que aguardam deliberacao administrativa antes de poderem ser efetivados.
**Rotinas que acessam:** PK_VENDA_JSON (pr_pim_insere_cnpj DELETE, pr_set_usuario_internet SELECT+INSERT)
**Operacoes:** DELETE (reprocessamento em pr_pim_insere_cnpj), SELECT+INSERT (avaliacao de risco em pr_set_usuario_internet)
**Colunas relevantes:**
- `TPROVISORIO` -- Controle provisorio da proposta
- `NU_CONTROLE_DEP` -- 0 para titular, numero para dependente
- `NU_CONTROLE_TITULAR` -- Controle do titular ao qual este registro pertence
- `FL_ALTO_RISCO` -- 1 = alto risco identificado
- `FL_TITULAR_DEP` -- 1 = titular; 2 = dependente
- `FL_DELIBERACAO` -- 0 = aguardando; 2 = deliberado/aprovado
- `DT_CADASTRO` -- Data do registro
**[ANS]** Beneficiario sem deliberacao (FL_DELIBERACAO=0) bloqueia toda a proposta em FL_STATUS=3. Risco de selecao adversa sem rastro auditavel de deliberacao.
**Regras associadas:** RN18, RN22 (reversa-pk-venda-json.md)

---

## TB_DECLARACAO_SAUDE_INTERNET

**Schema:** HUMASTER
**Descricao:** Declaracao de saude dos beneficiarios no staging de proposta PIM/BITIX. Em propostas ADM, os dados sao importados do contrato anterior em vez de inserir um registro em branco.
**Rotinas que acessam:** PK_VENDA_JSON (pr_set_usuario_internet -- INSERT)
**Operacoes:** INSERT
**Observacao ADM:** INSERT com dados do contrato anterior quando V_CD_USU_ANT_TITULAR IS NOT NULL, via join com TB_DECLARACAO_SAUDE_GRUPO_CID do usuario anterior.
**[ANS]** Declaracao de saude de contrato anterior pode estar desatualizada -- avaliar obrigatoriedade de nova declaracao conforme RN 195/2009 ANS.
**Regras associadas:** RN20 (reversa-pk-venda-json.md)

---

## TB_VI_DEC_SAUDE_INT_GRUPO_CID

**Schema:** HUMASTER
**Descricao:** CIDs (Classificacao Internacional de Doencas) vinculados a declaracao de saude de staging. Em propostas ADM, os CIDs sao importados do contrato anterior.
**Rotinas que acessam:** PK_VENDA_JSON (pr_set_usuario_internet -- INSERT)
**Operacoes:** INSERT
**Observacao ADM:** INSERT com dados de TB_DECLARACAO_SAUDE_GRUPO_CID do usuario anterior quando V_CD_USU_ANT_TITULAR IS NOT NULL.
**[ANS]** Mesmo risco de TB_DECLARACAO_SAUDE_INTERNET: dados do contrato anterior potencialmente desatualizados.
**Regras associadas:** RN20 (reversa-pk-venda-json.md)
