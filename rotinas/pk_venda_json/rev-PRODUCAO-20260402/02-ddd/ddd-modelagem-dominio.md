# Modelagem DDD: PK_VENDA_JSON

**Baseado em:** reversa-pk-venda-json.md (rev-PRODUCAO-20260402)
**Data:** 17/04/2026
**Agente:** Agente DDD (GitHub Copilot)
**Revisao Estrutural:** 24/04/2026 -- Padronizacao conforme Conflito 9 da analise comparativa (Secao 0 ADRs, IDs em building blocks, Secao 13 Migracao)

---

## 0. ADRs Consultadas

> [REF Conflito 9 -- _shared/analise-comparativa-ddd-ei-vj.md] Secao criada em 24/04/2026 para paridade com a Secao 0 do DDD PR_EFETIVA_INTERNET.
> Revisao realizada antes de qualquer decisao de design [REF CLAUDE.md -- Principios Universais].

| ADR | Titulo | Aplicabilidade ao Dominio | Status Alinhamento |
|-----|--------|---------------------------|--------------------|
| ADR-01 | Building Blocks | [MIGRACAO] Componentes reutilizaveis C#/.NET8 para futura implementacao do microsservico BITIX | Lacuna futura |
| ADR-02 | Arquitetura Orientada a Eventos (EDA) | [OK] Dominio orientado a eventos: DE-VJ-01..14 definidos na Secao 5, com topicos `hap-ins-bitix-*` | Alinhado |
| ADR-03 | CQRS | [ATENCAO] Motivou DD04 (separar MotorCriticasQuery x AplicarStatusErroCommand). Repositorios R-VJ-XX ainda misturam leitura/escrita -- ver Secao 6 | Divergencia parcial |
| ADR-05 | Padrao da Camada Anticorrupcao (ACL) | [OK] ACL-VJ-01 (BITIXAdapterService) canonico BITIX->SIGO definido na Secao 8 | Alinhado |
| ADR-16 | Estrutura e Design dos Projetos | [MIGRACAO] Naming futuro: `Hapvida.Insurance.IntegracaoBitix.{Tipo}` | Lacuna futura |
| ADR-18 | Padroes de Mensageria (pub/sub) | [OK 24/04/2026] DE-VJ-01..14 com topicos kebab-case EN e brokers definidos (Service Bus para criticos, RabbitMQ para auxiliares) -- Secao 5 reprojetada no Conflito 4 | Alinhado |
| ADR-21 | Linguagem Onipresente | [OK] Glossario Secao 2 em portugues correto; termos canonicos consolidados em _shared/dicionario-dominio.md (Conflito 7) | Alinhado |
| ADR-22 | Padrao Repositorio | [ATENCAO] 1 AR = 1 Repository aplicado em R-VJ-01 (consolidacao Conflito 6). Repositorios de `BeneficiarioBitix` (R-VJ-06..10) ainda fragmentados -- evolucao TO-BE prevista | Divergencia parcial |
| ADR-74 | Domain-Driven Design (DDD) | [OK] Todos os building blocks presentes: Agregados (AG-VJ), Entidades, VOs, Repositorios (R-VJ), DS (DS-VJ), DE (DE-VJ), Specs (SP-VJ), ACLs (ACL-VJ), Factories (F-VJ) | Alinhado |

---

## Sumario

0. [ADRs Consultadas](#0-adrs-consultadas)
1. [Bounded Context](#1-bounded-context)
2. [Novos Termos -- Linguagem Ubiqua](#2-novos-termos--linguagem-ubiqua)
3. [Agregados](#3-agregados)
4. [Domain Services](#4-domain-services)
5. [Domain Events](#5-domain-events)
6. [Repositorios](#6-repositorios)
7. [Specifications (Regras de Validacao)](#7-specifications-regras-de-validacao)
8. [Anti-Corruption Layer](#8-anti-corruption-layer)
9. [Factories](#9-factories)
10. [Mapa RN -> DDD](#10-mapa-rn---ddd)
11. [Decisoes de Design](#11-decisoes-de-design)
12. [Pendencias com o PO](#12-pendencias-com-o-po)
13. [Pontos de Atencao para Migracao Futura](#13-pontos-de-atencao-para-migracao-futura)
14. [Adendo Historico -- Regras de Negocio do Fluxo ADM (RN17-RN22)](#14-adendo-historico----regras-de-negocio-do-fluxo-adm-rn17-rn22)

---

## 1. Bounded Context

**Contexto principal:** Integracao BITIX + Efetivacao PIM-BITIX
**Schema legado:** HUMASTER
**Descricao:** PK_VENDA_JSON atua em dois subdominios distintos que coexistem artificialmente em um unico package PL/SQL: (1) Anti-Corruption Layer entre o sistema externo BITIX e o dominio de staging SIGO, responsavel por receber, desserializar e validar propostas JSON; (2) Orquestrador de Efetivacao especifico para propostas originadas da ferramenta de venda BITIX (`cd_operados='BITIX'`), executando a transicao de staging para contratos definitivos no SIGO. BITIX e a ORIGEM (ferramenta de venda), nao um tipo de proposta -- digita tanto PIM/SS quanto PME.

### 1.1 Subdominio e Tipo

| Tipo    | Subdominio                    | Descricao                                                                                   |
|---------|-------------------------------|---------------------------------------------------------------------------------------------|
| Core    | Integracao BITIX              | Receber proposta JSON, desserializar, persistir staging saude+odonto, retornar criticas      |
| Core    | Efetivacao Batch BITIX        | Loop JOB sobre propostas FL_STATUS=6, efetivar empresa+beneficiarios, atribuir status final  |
| Core    | Efetivacao Manual/Auto-baixa  | Efetivar proposta especifica (T229B manual, BAIXAPOS auto, BPR)                              |
| Support | Motor de Criticas             | fn_get_criticas_pendencias: contagem de criticas/pendencias em 3 modos                      |
| Support | Gestao de Grupo Coligado      | TB_EMPRESA_COLIGADA_BITX: bloquear grupo ate que todas as coligadas estejam status 6        |
| Support | Mapeamento Saude-Odonto       | TB_PIM_CONTROLE_CPF: vincular controle saude e odonto de cada beneficiario                  |
| Core    | Venda Administrativa (ADM)          | Processar proposta de renegociacao de contrato existente: identificar empresa anterior, registrar TB_USUARIO_VENDA_ADM, recuperacao de carencia, tratar beneficiario Devolucao ADM e alto risco |
| Support | Gestao de Fluxo POSBAIXA      | pr_set_emp_fluxo_pos / fn_get_emp_fluxo_pos: rastrear status de conferencia pos-efetivacao |
| Generic | Validacao Blocklist           | fn_get_blocklist_emp: verificar documentos blocklist antes de auto-baixa                     |
| Generic | Validacao Neoway              | fn_get_pend_neoway: verificar pendencias Neoway (status 17) antes de auto-baixa              |
| Generic | Configuracao de Sistema       | fn_registro_sistema: flags PK_VENDA_JSON_PR_EFETIVA_01, PK_VENDA_JSON_RESPOSTA_BITIX_01     |
| Generic | Pendencia de Beneficiario     | pr_pim_pendencia: atualizar TB_PENDENCIA_USUARIO apos efetivacao                            |

### 1.2 Bounded Contexts Identificados

| BC        | Nome                           | Tipo    | Responsabilidade                                                                    |
|-----------|--------------------------------|---------|-------------------------------------------------------------------------------------|
| BC-VJ-01  | Recepcao de Proposta BITIX     | Core    | Desserializar JSON, idempotencia, gerar controles, persistir staging                |
| BC-VJ-02  | Validacao e Critica BITIX      | Support | Motor de criticas (fn_get_criticas_pendencias), blocklist, Neoway                   |
| BC-VJ-03  | Efetivacao Empresa BITIX       | Core    | Chamar pr_cadastramento_empresa_prov, extrair cd_empresa, atualizar staging          |
| BC-VJ-04  | Efetivacao Beneficiarios BITIX | Core    | Loop titulares: pr_critica_internet + pr_cadastramento_internet2 + pr_pim_pendencia |
| BC-VJ-05  | Gestao de Status Final         | Support | Decidir status 7 (PRE/POS com ressalva) ou 10 (POS caminho feliz)                  |
| BC-VJ-06  | Grupo Coligado BITIX           | Support | TB_EMPRESA_COLIGADA_BITX: completude do grupo antes de efetivar                    |
| BC-VJ-07  | Mapeamento Saude-Odonto        | Support | TB_PIM_CONTROLE_CPF: 1:1 controle saude-odonto por beneficiario                    |
| BC-VJ-08  | Auto-baixa POSBAIXA            | Core    | Efetivar automaticamente proposta POSBAIXA limpa no ato da integracao                   |
| BC-VJ-09  | Configuracao de Sistema        | Generic | fn_registro_sistema: flags de fluxo                                                 |
| BC-VJ-10  | Integracao Odonto              | Support | pr_odon_cad_empresa_prov, pr_set_usuario_od, TB_ODON_EMPRESA_INTERNET               |
| BC-VJ-11  | Venda Administrativa (ADM)     | Core    | Identificar proposta ADM via JSON "CD_EMP_ANTERIOR", registrar TB_USUARIO_VENDA_ADM, aplicar recuperacao de carencia (CD_CONVENIO=542), tratar Devolucao ADM (alto risco + FL_STATUS=3) |

### 1.3 Relacionamentos entre Bounded Contexts

| BC Origem    | BC Destino            | Tipo de Relacao  | Descricao                                                               |
|--------------|-----------------------|------------------|-------------------------------------------------------------------------|
| BC-VJ-01     | BC-VJ-02              | Customer-Supplier| BC-VJ-01 aciona validacoes apos staging; consome resultado de criticas  |
| BC-VJ-01     | BC-VJ-06              | Customer-Supplier| BC-VJ-01 verifica/atualiza grupo coligado ao integrar nova proposta     |
| BC-VJ-01     | BC-VJ-07              | Customer-Supplier| BC-VJ-01 cria/consulta mapeamento saude-odonto via BC-VJ-07             |
| BC-VJ-01     | BC-VJ-10              | Customer-Supplier| BC-VJ-01 aciona integracao odonto ao persistir empresa saude            |
| BC-VJ-03     | BC-VJ-04              | Customer-Supplier| BC-VJ-03 ha empresa criada: aciona efetivacao de beneficiarios          |
| BC-VJ-03     | BC-VJ-05              | Customer-Supplier| BC-VJ-03 apos efetivar: BC-VJ-05 decide o status final da proposta      |
| BC-VJ-08     | BC-VJ-02              | Customer-Supplier| BC-VJ-08 depende de BC-VJ-02 para garantir ausencia de criticas/Neoway |
| BC-VJ-08     | BC-VJ-03/04           | Customer-Supplier| BC-VJ-08 chama pr_efetiva_baixa_manual que executa BC-VJ-03+04          |
| BC-VJ-09     | BC-VJ-01, BC-VJ-03    | Conformist       | Todos consomem fn_registro_sistema sem transformacao                    |
| ~~BC-EI-14*~~ | ~~BC-VJ-01~~ | ~~ACL~~ | AS-IS: PR_EFETIVA_INTERNET chamava PK_VENDA_JSON.pr_efetiva via bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 do CVS EI). [REMOVER-NO-TO-BE EI] Esta relacao e eliminada na refatoracao do EI. VJ passa a ter scheduler proprio (DBMS_JOB/DBMS_SCHEDULER). **Logica de PR_COLIGA_EMPRESA_BITIX deve ser absorvida pelo VJ [REF RN-T10]: a procedure transfere coligadas BITIX do staging TB_EMPRESA_COLIGADA_BITX para a tabela canonica TB_EMPRESA_COLIGADA. Nao sao hierarquias paralelas -- TB_EMPRESA_COLIGADA e a tabela unica de coligadas, e toda coligada (inclusive BITIX) termina nela.** [REF DD-05 -- decisoes-design.md] [REF A9 -- pendencias-abertas.md] [REF Conflito 8 -- _shared/analise-comparativa-ddd-ei-vj.md] |
| BC-VJ-11     | BC-VJ-01              | Customer-Supplier| BC-VJ-11 e acionado dentro de BC-VJ-01 (pr_pim_insere_cnpj): identificacao de CD_EMP_ANTERIOR determina fluxo ADM vs fluxo normal |
| BC-VJ-11     | BC-VJ-04              | Customer-Supplier| BC-VJ-11 enriquece pr_set_usuario_internet com logica de recuperacao de carencia, devolucao ADM e alto risco por beneficiario |

[REF] BC-EI-14 definido em ddd-modelagem-dominio.md da rotina PR_EFETIVA_INTERNET.

### 1.4 Posicao no Mapa de Dominios

PK_VENDA_JSON e um **Anti-Corruption Layer (ACL)** entre o sistema externo BITIX e o dominio interno SIGO. Traduz o contrato JSON do BITIX para as entidades de staging do SIGO, executando tanto a integracao quanto a efetivacao das propostas de origem BITIX (`cd_operados='BITIX'`).

No TO-BE: o ACL (recepcao + traducao JSON) deve ser separado do Dominio de Efetivacao.
A logica de efetivacao de BC-VJ-03 e BC-VJ-04 e identica a PR_EFETIVA_INTERNET e deve ser
consolidada em um servico compartilhado -- nao replicada por canal.

[ATENCAO] Logica BITIX a absorver do EI na elaboracao do scheduler:
Com a refatoracao de PR_EFETIVA_INTERNET, os seguintes elementos BITIX que hoje residem no EI
devem ser absorvidos pelo VJ ou pelo seu scheduler:
- PR_COLIGA_EMPRESA_BITIX: procedure chamada pelo EI (AS-IS) antes de acionar PK_VENDA_JSON.pr_efetiva. **Responsabilidade: transferir coligadas BITIX do staging TB_EMPRESA_COLIGADA_BITX para a tabela canonica TB_EMPRESA_COLIGADA.** [REF RN-T10] No TO-BE, esta procedure migra para o proprio VJ (nao e sub-rotina independente).
  Avaliar se deve ser incorporada ao VJ.pr_efetiva ou permanecer como sub-rotina independente.
- fn_registro_sistema('COLIGADA_EMPRESA_BITIX'): flag de ativacao do processamento BITIX.
  Passa a ser configuracao exclusiva do VJ/scheduler.
- Isencao de validacao Neoway para propostas BITIX (VO OrigemProposta do EI, RN18): logica
  permanece no VJ -- confirmar que o VJ ja cobre esta isencao ou incorporar.
[REF DD-05 -- decisoes-design.md] [REF MIG-16 -- ddd-modelagem-dominio.md (EI)] [REF A-TO-BE-02 -- ddd-modelagem-dominio.md (EI)]

---

## 2. Novos Termos -- Linguagem Ubiqua

| Termo                     | Definicao de Negocio                                                                    | Equivalente Tecnico                           | Contexto  |
|---------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------|-----------|
| Origem BITIX              | [ORIGEM] Ferramenta de venda digital externa (NDI Minas) que envia propostas PIM/PME via API JSON | p_origem = 'BITIX' / CD_OPERADOS = 'BITIX'    | BC-VJ-01  |
| POSBAIXA (POS)            | Modalidade de proposta em que a conferencia documental ocorre APOS a efetivacao (excecao ao fluxo padrao PRE, em que a conferencia e feita ANTES). NAO e um canal de venda presencial. fn_get_confopera_emp = 1 identifica esta modalidade. | fn_get_confopera_emp retorna 1 | BC-VJ-05  |
| Proposta BITIX            | Proposta de empresa PME recebida via JSON do sistema BITIX                              | TB_PROPOSTA_VENDA com CD_OPERADOS='BITIX'     | BC-VJ-01  |
| Numero de Controle Odonto | Identificador de controle da proposta odonto correspondente a proposta saude             | TB_PROPOSTA_VENDA.NU_CONTROLE_OD              | BC-VJ-07  |
| Auto-baixa POSBAIXA       | Efetivacao automatica acionada no mesmo ato da integracao JSON quando proposta POSBAIXA esta limpa (sem criticas, blocklist ou Neoway) | pr_efetiva_baixa_manual(pnu_controle,'E','BAIXAPOS') | BC-VJ-08 |
| Fluxo POSBAIXA            | Codigo de rastreamento do estado de uma proposta POSBAIXA (7=coligada, 10=base, 17=Neoway, 99=blocklist) | TB_PIM_FLUXO_POS / pr_set_emp_fluxo_pos | BC-VJ-05  |
| Staging Saude             | Registros temporarios de empresa e beneficiarios saude antes da efetivacao              | TB_EMPRESA_INTERNET + TB_USUARIO_TITULAR/DEPENDENTE_INTERNET | BC-VJ-01 |
| Staging Odonto            | Registros temporarios de empresa e beneficiarios odonto antes da efetivacao             | TB_ODON_EMPRESA_INTERNET                      | BC-VJ-10  |
| Mapeamento Controle       | Registro 1:1 que vincula o controle saude ao controle odonto de cada beneficiario       | TB_PIM_CONTROLE_CPF                           | BC-VJ-07  |
| Empresa Middle            | Empresa com 30 a 99 empregados -- segmento de cobranca diferenciado                    | NU_TOTAL_EMPREGADO BETWEEN 30 AND 99          | BC-VJ-03  |
| Conta Conjunta Odonto     | Modalidade em que saude e odonto compartilham a mesma fatura de cobranca                | FL_CONTA_CONJUNTA_ODONTO = 'S'                | BC-VJ-03  |
| Divergencia Neoway          | Beneficiario da proposta cujos dados cadastrais nao conferem com a base Neoway; sinalizado internamente por fl_status_processamento='17'. Detectado somente na REintegracao de proposta com FL_STATUS=1 quando o parametro de sistema PK_VJ_EXECUTA_NEOWAY esta ativo. | fl_status_processamento = '17' em TB_USUARIO_TITULAR_INTERNET ou TB_USUARIO_DEPENDENTE_INTERNET | BC-VJ-02  |
| Pendencia Neoway            | Estado de uma proposta empresarial POSBAIXA cujo grupo de beneficiarios contem ao menos um beneficiario com Divergencia Neoway (fl_status_processamento='17'). Detectada por fn_get_pend_neoway=1. Impede auto-baixa e forca status final 7 em vez de 10. | fn_get_pend_neoway(nu_controle) = 1 | BC-VJ-02, BC-VJ-05  |
| Fluxo 17 (Neoway)           | Codigo de rastreamento POSBAIXA que indica que a proposta teve ao menos um beneficiario com Divergencia Neoway. Registrado em TB_PIM_FLUXO_POS via pr_set_emp_fluxo_pos. O fluxo 17 e o determinante que impede o status final 10 (caminho feliz POSBAIXA). | pr_set_emp_fluxo_pos(nu_controle, '', 17) | BC-VJ-05  |
| Parametro Neoway (PK_VJ_EXECUTA_NEOWAY) | Flag de sistema que habilita ou desabilita a validacao Neoway. Quando desabilitado, PR_VE_DIVERGENCIA_NEOWAY nao e chamada e nenhum beneficiario recebe fl_status_processamento='17' por esta rotina. | fn_registro_sistema('PK_VENDA_JSON_EXECUTA_NEOWAY') = 'S' | BC-VJ-09  |
| Blocklist BITIX           | Lista de documentos de beneficiarios sinalizados que impedem auto-baixa POSBAIXA        | TB_FILE_DOCUMENTO_BITIX.FL_DOC_BLOCKLIST = 1  | BC-VJ-02  |
| Proposta Coligada BITIX   | Proposta que pertence a um grupo empresarial; todas as coligadas devem estar prontas    | TB_EMPRESA_COLIGADA_BITX.CD_PROPOSTA_MAE      | BC-VJ-06  |
| Contagem de Beneficiarios | Verificacao de consistencia entre quantidade declarada no JSON e quantidade processada  | G_TOTAL_BENEFICIARIO vs G_COUNT_BENEFIIFIM    | BC-VJ-01  |
| Origem de Efetivacao      | Identificador do canal que acionou a efetivacao (T229B, JOB, BITIX, BAIXAPOS, BPR)    | p_origem em pr_efetiva_baixa_manual           | BC-VJ-03  |
| Proposta ADM              | Proposta comercializada como venda administrativa: cliente/empresa/beneficiario ja existem em contrato ativo e sao renegociados em novo contrato. Identificada pela presenca do campo JSON "CD_EMP_ANTERIOR" | G_CD_EMP_ANTERIOR IS NOT NULL | BC-VJ-11  |
| Empresa Anterior          | Empresa conveniada de origem, da qual os beneficiarios estao migrando para o novo contrato ADM | G_CD_EMP_ANTERIOR (campo JSON "CD_EMP_ANTERIOR") | BC-VJ-11 |
| Usuario Anterior Titular  | Codigo do usuario (beneficiario titular) no contrato anterior, vinculado a proposta ADM | V_CD_USU_ANT_TITULAR (campo JSON "CD_USU_ANT_TITULAR") | BC-VJ-11 |
| Devolucao ADM             | Beneficiario marcado como "devolvido" administrativamente: apresenta condicao de alto risco para o novo contrato; sinalizado por campo JSON "DEVOLUCAO_TIT_ADM" ou "DEVOLUCAO_DEP_ADM" = 'S' | DEVOLUCAO_TIT_ADM / DEVOLUCAO_DEP_ADM = 'S' | BC-VJ-11 |
| Recuperacao de Carencia   | Beneficiario ADM com historico de contrato anterior tem carencia aproveitada; recebe CD_CONVENIO = 542 na TB_USUARIO_TITULAR_INTERNET | UPDATE SET CD_CONVENIO = 542 | BC-VJ-11 |
| Deliberacao ADM           | Status de aprovacao medica do beneficiario em venda ADM: 0=sem deliberacao (bloqueia proposta em status 3), 2=deliberado com historico | V_FL_DELIBERACAO_TIT (campo JSON "FL_DELIBERACAO") | BC-VJ-11 |
| Beneficiario Alto Risco ADM | Beneficiario Devolucao ADM sem deliberacao pendente (FL_DELIBERACAO=0 ou 1), registrado em TB_USUARIO_ALT_RISCO, que pode bloquear proposta em status 3 ate deliberacao administrativa | TB_USUARIO_ALT_RISCO.FL_DELIBERACAO | BC-VJ-11 |
| Aguardando ADM            | Status 3 da proposta (FL_STATUS=3): proposta bloqueada aguardando deliberacao administrativa de beneficiario alto risco | TB_PROPOSTA_VENDA.FL_STATUS=3 | BC-VJ-11 |
| Declaracao de Saude ADM   | Declaracao de saude importada do contrato anterior quando beneficiario ADM tem historico (V_CD_USU_ANT_TITULAR IS NOT NULL), em vez de usar "NADA CONSTA" padrao | TB_DECLARACAO_SAUDE_INTERNET / TB_VI_DEC_SAUDE_INT_GRUPO_CID | BC-VJ-11 |

[REF] Termos compartilhados com PR_EFETIVA_INTERNET (Proposta Internet, Empresa Conveniada, Critica, Pendencia, etc.) registrados em ddd-modelagem-dominio.md da rotina PR_EFETIVA_INTERNET.

---

## 3. Agregados

### AG-VJ-01 -- Agregado: PropostaEmpresaBitix

**Aggregate Root:** PropostaEmpresaBitix (identidade: NU_CONTROLE)
**Tabela principal:** TB_PROPOSTA_VENDA + TB_EMPRESA_INTERNET

**Invariantes:**
- [RN02] Apenas propostas com FL_STATUS = 6 sao elegiveis para efetivacao automatica
- [RN03] Um grupo de coligadas so pode ser efetivado quando todas as empresas do grupo estiverem em status 6, 7 ou 10 (grupo completo)
- [RN09] Uma proposta ja integrada (status 1,2,3,6,7,9,10 no flag RESPOSTA_BITIX_01='S') nao pode ser reintegrada -- idempotencia parcial
- [RN16] A contagem de beneficiarios processados deve coincidir com G_TOTAL_BENEFICIARIO informado no JSON
- [RN17] Uma proposta ADM (G_CD_EMP_ANTERIOR IS NOT NULL) deve ter seus beneficiarios vinculados a empresa anterior via TB_USUARIO_VENDA_ADM antes da finalizacao do staging
- [RN18] Um beneficiario Devolucao ADM (DEVOLUCAO_TIT_ADM='S') sem deliberacao (V_FL_DELIBERACAO=0) bloqueia a proposta inteira em status 3 (AGUARDANDO_ADM); nenhum outro beneficiario da mesma proposta pode ser efetivado enquanto houver alto risco pendente

**Entidades:**
| Entidade              | Identidade          | Atributos Principais                                               | Tabela Oracle             |
|-----------------------|---------------------|--------------------------------------------------------------------|---------------------------|
| EmpresaInternet       | NU_CONTROLE         | fl_status_processamento, cd_empresa, nu_cgc_cpf, nu_total_empregado| TB_EMPRESA_INTERNET       |
| OdonEmpresaInternet   | NU_CONTROLE (odonto)| nu_controle_saude, cd_empresa, fl_status_processamento             | TB_ODON_EMPRESA_INTERNET  |
| PendenciaEmpresaBitix | NU_CONTROLE_PENDENCIA| cd_pendencia, ds_observacao                                       | TB_PENDENCIA_EMPRESA_INTERNET |
| StatusCadastroBitix   | (composta)          | nu_provisorio, ds_status, dt_status                               | TB_STATUS_PROPOSTA_CADASTRO|
| VendaAdmRelacionamento | CD_EMP_ANTERIOR + TPROVISORIO | cd_emp_anterior, cd_usu_ant_titular, cd_usu_ant_dependente, nu_controle_titular, nu_controle_dep, dt_inclusao | TB_USUARIO_VENDA_ADM |
| AltaRiscoAdmRegistro  | TPROVISORIO + NU_CONTROLE_TITULAR | fl_alto_risco, fl_titular_dep, fl_deliberacao, dt_cadastro | TB_USUARIO_ALT_RISCO |

**Value Objects:**
| Value Object           | Atributos                                         | Regra de Validacao                                                          |
|------------------------|---------------------------------------------------|-----------------------------------------------------------------------------|
| ControleProvisorio     | nu_controle (NUMBER)                              | Gerado por SQ_EMPRESA_INTERNET.nextval; imutavel apos criacao               |
| ControleProvOdonto     | nu_controle_od (NUMBER)                           | Gerado por SQ_EMPRESA_INTERNET.nextval; pode ser NULL se sem odonto         |
| StatusProposta         | fl_status (0,1,2,3,4,6,7,8,9,10)                 | Maquina de estados: transicoes validas definidas por RN02, RN07, RN09       |
| GrupoColigada          | cd_proposta_mae, tprovisorio                      | Valida completude: COUNT(status NOT IN (6,7,10)) = 0 para liberar           |
| FluxoPOSRastreamento   | fluxo (7=coligada, 10=base, 17=Neoway, 99=blocklist)| Cada fluxo e um codigo registrado em TB_PIM_FLUXO_POS                    |
| OrigemEfetivacao       | valor: 'T229B','JOB','BITIX','BAIXAPOS','BPR'    | Conjunto fechado -- [ATENCAO] A06: sem constantes no codigo legado          |
| ConfiguracaoCobrancaMiddle | l_empresa_conveniada_saude_pai, l_empresa_cobranca | Middle sem conta conjunta: pai='-999', cobranca=NULL [ATENCAO] A08  |
| EmpresaAnteriorAdm    | cd_emp_anterior (VARCHAR2)                        | Presente no JSON: identifica a proposta como ADM; NULL = proposta nova (nao-ADM). [RN17] |
| DeliberacaoAdm        | valor: 0=sem_deliberacao, 1=alto_risco, 2=deliberado | 0: bloqueia proposta em status 3; 2: permite continuidade com historico. [RN18] |
| StatusAguardandoAdm   | fl_status = 3                                     | Proposta bloqueada por alto risco ADM pendente; diferente de status 6 (apto para efetivacao) |

---

### AG-VJ-02 -- Agregado: BeneficiarioBitix

**Aggregate Root:** BeneficiarioBitix (identidade: NU_CONTROLE do beneficiario)
**Tabelas:** TB_USUARIO_TITULAR_INTERNET + TB_USUARIO_DEPENDENTE_INTERNET

**Invariantes:**
- [RN06] Um beneficiario so pode ser efetivado via pr_cadastramento_internet2 se COUNT(criticas) = 0
- [RN14] Beneficiario com fl_status_processamento = '17' (Divergencia Neoway) impede auto-baixa POSBAIXA de toda a empresa. ATENCAO: o status '17' e setado pela rotina externa PR_VE_DIVERGENCIA_NEOWAY, chamada SOMENTE na reintegracao de proposta com FL_STATUS=1 e parametro PK_VENDA_JSON_EXECUTA_NEOWAY='S'. Na integracao inicial, este status nunca sera setado por esta package. [REF] Este caminho atua EXCLUSIVAMENTE sobre beneficiarios com cd_operados='BITIX'. Propostas de origem WEBHAP/TAFFIX recebem fl_status_processamento='17' por outro caminho totalmente disjunto (Portal do Corretor Super Simples, fora do VJ e fora do EI), consumido pelo EI em BC-EI-07. Os dois produtores nao interferem entre si -- particionamento por cd_operados. [REF Conflito 2 -- _shared/analise-comparativa-ddd-ei-vj.md] [REF BC-EI-07 do DDD PR_EFETIVA_INTERNET]
- [RN19] Beneficiario ADM com historico (G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL) recebe CD_CONVENIO = 542 (recuperacao de carencia) e tem DT_ULTIMO_BOLETO_CONVENIO substituida pela DT_INICIO da empresa
- [RN20] Beneficiario ADM com historico (V_CD_USU_ANT_TITULAR IS NOT NULL) e declaracao de saude preenchida no JSON tem a declaracao de saude importada do contrato anterior, em vez de receber "NADA CONSTA"
- [RN21] Beneficiario Devolucao ADM (DEVOLUCAO_TIT_ADM='S') sem deliberacao (V_FL_DELIBERACAO=0) e registrado em TB_USUARIO_ALT_RISCO com FL_ALTO_RISCO=1 e aciona UPDATE FL_STATUS=3 na proposta

**Entidades:**
| Entidade                 | Identidade    | Atributos Principais                                              | Tabela Oracle                    |
|--------------------------|---------------|-------------------------------------------------------------------|----------------------------------|
| TitularInternet          | NU_CONTROLE   | fl_status_processamento, cd_empresa, nu_cpf, cd_usuario          | TB_USUARIO_TITULAR_INTERNET      |
| DependenteInternet       | NU_CONTROLE   | fl_status_processamento, cd_empresa, nu_cpf_titular              | TB_USUARIO_DEPENDENTE_INTERNET   |
| CriticaBeneficiario      | NU_CONTROLE   | cd_critica, ds_critica                                            | TB_USUARIO_CRITICA_INTERNET      |
| MapeamentoSaudeOdonto    | NU_CONTROLE_TIT + NU_CONTROLE (empresa) | nu_controle_tit_od               | TB_PIM_CONTROLE_CPF             |

**Value Objects:**
| Value Object            | Atributos                                        | Regra de Validacao                                                    |
|-------------------------|--------------------------------------------------|-----------------------------------------------------------------------|
| CodigoProvisorio        | 'T' || nu_controle_empresa                       | Convencao fragil [S09]: concatenacao de prefixo literal com numero. [REF Conflito 7] Renomeado 24/04/2026 de `CodigoProvisorioEmpresa` para alinhar com o VO canonico do EI (dicionario-dominio.md). |
| StatusProcessamentoBenef| '0','1','2','8','9','17'                         | 17 = divergencia Neoway -- bloqueante para auto-baixa POSBAIXA        |
| ControleOdontoTitular   | nu_controle_tit_od                               | Gerado por SQ_CONTROLE_INTERNET.nextval ou reutilizado de TB_PIM_CONTROLE_CPF [RN10] |
| DevolvaoAdmBeneficiario | devolucao_tit_adm / devolucao_dep_adm: 'S'/'N'  | Campo JSON por beneficiario. 'S': beneficiario e devolucao ADM -- alto risco candidato a TB_USUARIO_ALT_RISCO [RN21] |
| ConvenioBeneficiario    | cd_convenio: NUMBER                              | 542 = recuperacao de carencia ADM; atribuido quando G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL [RN19] |

---

## 4. Domain Services

| ID        | Service                        | Responsabilidade                                                                                                   | Entidades Envolvidas                    | Procedure / Function Legada                          |
|-----------|--------------------------------|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------|------------------------------------------------------|
| DS-VJ-01  | IntegracaoBitixService         | Receber JSON BITIX, desserializar, verificar idempotencia, gerar controles, persistir staging saude+odonto         | PropostaEmpresaBitix, BeneficiarioBitix | pr_pim_insere_cnpj                                   |
| DS-VJ-02  | EfetivacaoBatchService         | Processar em loop todas as propostas FL_STATUS=6, orchestrando validacao de grupo, criticas e efetivacao           | PropostaEmpresaBitix                    | pr_efetiva                                           |
| DS-VJ-03  | EfetivacaoEspecificaService    | Efetivar proposta individual (manual T229B, auto-baixa BAIXAPOS, batch BPR)                                        | PropostaEmpresaBitix, BeneficiarioBitix | pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp |
| DS-VJ-04  | MotorCriticasService           | Contar criticas/pendencias em 3 modos (N=so criticas, E=excecao, S=todas); [CRITICO] tem efeito colateral de UPDATE. [REF Conflito 7] ESCOPO SEMANTICO: no VJ, "criticas" abrange tanto criticas de beneficiario (TB_USUARIO_CRITICA_INTERNET, equivalente ao `Critica` do EI) quanto pendencias de empresa (TB_PENDENCIA_EMPRESA_INTERNET, equivalente ao `Pendencia`/`AvaliacaoPendenciasService` do EI). Um leitor vindo do EI deve ler "MotorCriticas" como "MotorCriticas+Pendencias". Ver dicionario-dominio.md -- `Critica` e `Pendencia` sao termos canonicos distintos.| PropostaEmpresaBitix                    | fn_get_criticas_pendencias                           |
| DS-VJ-05  | GrupoColigadoService           | Verificar completude de grupo coligado antes de liberar para efetivacao                                            | PropostaEmpresaBitix (GrupoColigada VO) | Bloco inline em pr_efetiva via TB_EMPRESA_COLIGADA_BITX|
| DS-VJ-06  | AutoBaixaPOSBAIXAService       | Verificar condicoes POSBAIXA (sem criticas, sem blocklist, sem Neoway) e acionar efetivacao automatica             | PropostaEmpresaBitix, BeneficiarioBitix | Bloco inline em pr_pim_insere_cnpj (linhas ~5979)    |
| DS-VJ-07  | MapeamentoSaudeOdontoService   | Criar/consultar vinculo 1:1 entre controle saude e odonto por beneficiario                                         | BeneficiarioBitix (MapeamentoSaudeOdonto)| pr_control_internet, pr_set_usuario_od              |
| DS-VJ-08  | StatusFinalService             | Decidir status final da proposta (7 ou 10) com base no canal POS, fluxos registrados e presenca de blocklist/Neoway| PropostaEmpresaBitix                    | Logica inline replicada em pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp [S07] |
| DS-VJ-09  | PendenciaUsuarioService        | Atualizar TB_PENDENCIA_USUARIO apos efetivacao de beneficiario                                                    | BeneficiarioBitix                       | pr_pim_pendencia                                     |
| DS-VJ-10  | NeowayValidacaoService         | Orquestrar o ciclo de validacao Neoway: (1) verificar parametro PK_VENDA_JSON_EXECUTA_NEOWAY; (2) verificar FL_STATUS=1 na proposta; (3) chamar PR_VE_DIVERGENCIA_NEOWAY para marcar beneficiarios divergentes (fl_status_processamento='17'); (4) detectar via fn_get_pend_neoway se ha divergencia; (5) registrar fluxo 17 via pr_set_emp_fluxo_pos quando POSBAIXA. [ATENCAO] A chamada a PR_VE_DIVERGENCIA_NEOWAY tem WHEN OTHERS THEN NULL -- falha silenciosa critica [S01] | PropostaEmpresaBitix, BeneficiarioBitix | PR_VE_DIVERGENCIA_NEOWAY (externa), fn_get_pend_neoway, pr_set_emp_fluxo_pos |
| DS-VJ-11  | VendaAdmService                | Processar logica de venda administrativa: identificar proposta ADM via CD_EMP_ANTERIOR, registrar TB_USUARIO_VENDA_ADM (empresa + beneficiario), aplicar recuperacao de carencia (CD_CONVENIO=542), ajustar DT_ULTIMO_BOLETO_CONVENIO, tratar Devolucao ADM (alto risco + status 3), importar declaracao de saude do contrato anterior | PropostaEmpresaBitix, BeneficiarioBitix | Blocos inline em pr_set_usuario_internet (linhas ~3024, ~3095, ~3125, ~3604) e pr_pim_insere_cnpj (linhas ~5486) [MIGRACAO] |

[CRITICO] MotorCriticasService (fn_get_criticas_pendencias): mistura responsabilidade de leitura (contar criticas) com escrita (UPDATE fl_status=9 quando p_valida_nao_coligada='S'). No TO-BE: separar em MotorCriticasQuery (leitura) + AplicarStatusErroCommand (escrita).

---

## 5. Domain Events

> [ATENCAO] ADR-18 -- Idioma: Os nomes de evento em portugues sao mantidos apenas como rotulos de documentacao. A ADR-18 exige topico e payload em INGLES, kebab-case, tempo passado, prefixo `hap-{context}-`. Para o canal BITIX o contexto e `hap-ins-bitix-{evento}`. Os topicos ADR-18 compliant estao na coluna "Topico (ADR-18)". Estrutura alinhada com a Secao 5 do DDD PR_EFETIVA_INTERNET (IDs, topicos, publisher/subscribers, payload camelCase EN).
>
> [ATENCAO] ADR-18 -- Broker: Eventos de efetivacao e de estado final (DE-VJ-03, DE-VJ-04, DE-VJ-05, DE-VJ-08, DE-VJ-13) representam mudancas de estado criticas da empresa/beneficiario BITIX -- broker recomendado: **Azure Service Bus** (entrega garantida, nao podem ser perdidos). Eventos de sinalizacao/auxiliares (DE-VJ-07, DE-VJ-09, DE-VJ-10) podem usar RabbitMQ. Eventos de validacao Neoway (DE-VJ-01, DE-VJ-02) sao **Service Bus** por impactarem decisao de auto-baixa e status final.
>
> [REF Conflito 4 -- _shared/analise-comparativa-ddd-ei-vj.md] Secao reprojetada em 24/04/2026 para alinhamento com ADR-18 e paridade com a Secao 5 do DDD EI.

| ID        | Evento (PT)                        | Topico ADR-18 (EN)                                    | Publisher | Subscribers               | Payload (camelCase EN)                                                        |
|-----------|------------------------------------|-------------------------------------------------------|-----------|---------------------------|-------------------------------------------------------------------------------|
| DE-VJ-01  | BeneficiarioComDivergenciaNeoway   | `hap-ins-bitix-beneficiary-neoway-diverged`           | BC-VJ-02  | BC-VJ-08                  | {nuControle, nuCpfBeneficiario, flStatusProcessamento: '17'}                  |
| DE-VJ-02  | PropostaBloqueadaNeoway            | `hap-ins-bitix-proposal-neoway-blocked`               | BC-VJ-02  | BC-VJ-05, BC-VJ-08        | {nuControle, motivo: 'NEOWAY'}                                                |
| DE-VJ-03  | PropostaIntegradaBitix             | `hap-ins-bitix-proposal-integrated`                   | BC-VJ-01  | BC-VJ-02, BC-VJ-06, BC-VJ-08 | {nuControle, nuControleOd, tpOperacao}                                       |
| DE-VJ-04  | AutoBaixaAcionada                  | `hap-ins-bitix-auto-effection-triggered`              | BC-VJ-08  | BC-VJ-03, BC-VJ-04        | {nuControle, origem: 'BAIXAPOS'}                                              |
| DE-VJ-05  | PropostaEfetivada                  | `hap-ins-bitix-proposal-effected`                     | BC-VJ-03  | BC-VJ-05                  | {nuControle, cdEmpresa, flStatusFinal: 7 \| 10}                                |
| DE-VJ-06  | EmpresaComCritica                  | `hap-ins-bitix-company-has-critiques`                 | BC-VJ-02  | BC-VJ-05                  | {nuControle, countCriticas, flStatus: 9}                                      |
| DE-VJ-07  | GrupoColigadoIncompleto            | `hap-ins-bitix-affiliated-group-incomplete`           | BC-VJ-06  | --                        | {cdPropostaMae, coligadasPendentes}                                           |
| DE-VJ-08  | ColigadaRegistradaComFluxoPOS      | `hap-ins-bitix-affiliated-pos-flow-registered`        | BC-VJ-06  | BC-VJ-05                  | {nuControle, fluxo: 7}                                                        |
| DE-VJ-09  | PropostaDevolvida                  | `hap-ins-bitix-proposal-returned`                     | BC-VJ-02  | --                        | {nuControle, flStatus: 1 \| 9}                                                 |
| DE-VJ-10  | DivergenciaContadorBeneficiario    | `hap-ins-bitix-beneficiary-count-mismatch`            | BC-VJ-01  | --                        | {nuControle, vAux, gCountBenefiifim, cdPendencia: 9}                          |
| DE-VJ-11  | PropostaAdmIdentificada            | `hap-ins-bitix-adm-proposal-identified`               | BC-VJ-01  | BC-VJ-11                  | {nuControle, cdEmpAnterior}                                                   |
| DE-VJ-12  | BeneficiarioAdmVinculado           | `hap-ins-bitix-adm-beneficiary-linked`                | BC-VJ-11  | BC-VJ-04                  | {nuControle, nuControleTit, cdUsuAntTitular}                                  |
| DE-VJ-13  | BeneficiarioAltaRiscoAdmRegistrado | `hap-ins-bitix-adm-high-risk-registered`              | BC-VJ-11  | BC-VJ-05                  | {nuControle, nuControleTitular, flDeliberacao}                                |
| DE-VJ-14  | PropostaBloqueadaAguardandoAdm     | `hap-ins-bitix-proposal-awaiting-adm`                 | BC-VJ-11  | --                        | {nuControle, flStatus: 3}                                                     |

---

## 6. Repositorios

> [ATENCAO ADR-22 -- Padrao Repositorio] Os repositorios abaixo representam as INTERFACES de dominio. A ADR-22 exige um repositorio por Aggregate Root e que a implementacao fique fora da camada de dominio (camada de infraestrutura). Em PL/SQL to-be: o BODY do package implementa a interface. Na migracao: implementacao usa EF Core / Dapper, sem logica de negocio no repositorio.
>
> [ADR-AUSENTE -- CQRS ADR-03] As operacoes de leitura (`find*`, `buscar*`, `count*`) e escrita (`insert`, `update`, `delete`) estao misturadas nos repositorios. A ADR-03 exige segregacao Command/Query. Para o microsservico futuro: separar em **ReadRepository** (QueryService, retorna projecoes/DTOs) e **WriteRepository** (persiste apenas agregados). Sinalizar a criacao de ADR especifica para contratos de repositorio PL/SQL antes de implementar.
>
> [REF Conflito 6 -- _shared/analise-comparativa-ddd-ei-vj.md] Secao reestruturada em 24/04/2026: `PropostaVendaRepository` e `EmpresaInternetRepository` (ambos apontavam para o mesmo AR `PropostaEmpresaBitix`) foram consolidados em um unico `PropostaEmpresaBitixRepository`, cumprindo o contrato "1 AR = 1 Repository" da ADR-22. IDs R-VJ-XX adicionados para paridade com a Secao 6 do DDD PR_EFETIVA_INTERNET.

| ID       | Repositorio                     | Aggregate Root           | Operacoes Principais                                                          | Tabelas Oracle                                                     |
|----------|---------------------------------|--------------------------|-------------------------------------------------------------------------------|--------------------------------------------------------------------|
| R-VJ-01  | PropostaEmpresaBitixRepository  | PropostaEmpresaBitix     | findByStatus(6), insert, update, selectByControle, updateStatus, updateCdEmpresa | TB_PROPOSTA_VENDA, TB_EMPRESA_INTERNET, TB_ODON_EMPRESA_INTERNET   |
| R-VJ-02  | ColigadaBitixRepository         | PropostaEmpresaBitix     | findByMae, countNaoApta, insert, delete                                       | TB_EMPRESA_COLIGADA_BITX                                           |
| R-VJ-03  | FluxoPOSRepository              | PropostaEmpresaBitix     | setFluxo, getFluxo                                                            | (pr_set_emp_fluxo_pos / fn_get_emp_fluxo_pos)                      |
| R-VJ-04  | StatusCadastroRepository        | PropostaEmpresaBitix     | insert (log de status)                                                        | TB_STATUS_PROPOSTA_CADASTRO                                        |
| R-VJ-05  | PendenciaEmpresaRepository      | PropostaEmpresaBitix     | insert (pendencia), selectByControle                                          | TB_PENDENCIA_EMPRESA_INTERNET                                      |
| R-VJ-06  | BeneficiarioInternetRepository  | BeneficiarioBitix        | findByEmpresa, updateStatus, selectCriticas                                   | TB_USUARIO_TITULAR_INTERNET, TB_USUARIO_DEPENDENTE_INTERNET        |
| R-VJ-07  | CriticaBeneficiarioRepository   | BeneficiarioBitix        | countByControle, selectByControle                                             | TB_USUARIO_CRITICA_INTERNET                                        |
| R-VJ-08  | MapeamentoControleRepository    | BeneficiarioBitix        | findByControleTit, insert, update                                             | TB_PIM_CONTROLE_CPF                                                |
| R-VJ-09  | BlocklistRepository             | BeneficiarioBitix        | countBlocklistByControle                                                      | TB_FILE_DOCUMENTO_BITIX                                            |
| R-VJ-10  | PendenciaUsuarioRepository      | BeneficiarioBitix        | deleteByUsuario, insertByUsuario                                              | TB_PENDENCIA_USUARIO                                               |

> [ATENCAO] R-VJ-06 a R-VJ-10 apontam todos para o AR `BeneficiarioBitix`. Em estrito cumprimento de ADR-22 ("1 AR = 1 Repository"), a evolucao TO-BE deve consolidar essas cinco interfaces em um unico `BeneficiarioBitixRepository`, mantendo as tabelas como detalhe de infraestrutura. Manteve-se a separacao aqui apenas para preservar a granularidade observada na AS-IS durante a migracao incremental. [REF Conflito 6]

---

## 7. Specifications (Regras de Validacao)

| ID        | Specification                   | Regra                                                                                 | Origem       |
|-----------|---------------------------------|---------------------------------------------------------------------------------------|--------------|
| SP-VJ-01  | PropostaElegivelSpec            | FL_STATUS = 6 para efetivacao automatica                                              | RN02         |
| SP-VJ-02  | GrupoColigadoCompletoSpec       | COUNT(coligadas com status NOT IN (6,7,10)) = 0 para liberar grupo                    | RN03         |
| SP-VJ-03  | PropostaSemCriticasSpec         | fn_get_criticas_pendencias(nu_controle, modo) = 0                                     | RN04         |
| SP-VJ-04  | IdempotenciaIntegracaoSpec      | Proposta ja integrada com status valido nao deve ser reprocessada                     | RN09         |
| SP-VJ-05  | SemBlocklistSpec                | fn_get_blocklist_emp(nu_controle) = 0                                                 | RN13         |
| SP-VJ-06  | DivergenciaNeowaySpec           | fn_get_pend_neoway(nu_controle) = 1 (ao menos um beneficiario com fl_status_processamento='17'). Avaliada na auto-baixa POSBAIXA e no motor de criticas modo 'E'. Sempre retorna FALSO para propostas ainda NAO reintegradas (PR_VE_DIVERGENCIA_NEOWAY nao foi chamada). [REF Conflito 7] Renomeada 24/04/2026 de `SemDivergenciaNeowaySpec` para alinhar com a convencao do EI (SP11) -- nomear a falha em vez do sucesso. Semantica invertida: `true` agora indica presenca de divergencia. | RN14 |
| SP-VJ-07  | ContadorBeneficiariosOkSpec     | COUNT(beneficiarios staging) = G_TOTAL_BENEFICIARIO                                   | RN16         |
| SP-VJ-08  | AutoBaixaPOSElegivelSpec        | fn_get_confopera_emp=1 AND FL_COMMIT='S' AND V_COLIGADA='N' AND sem criticas/blocklist/Neoway | RN08 |
| SP-VJ-09  | EmpresaAnteriorAdmSpec          | G_CD_EMP_ANTERIOR IS NOT NULL (campo JSON "CD_EMP_ANTERIOR" presente)                 | RN17         |
| SP-VJ-10  | BeneficiarioComHistoricoAdmSpec | G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL                    | RN19         |
| SP-VJ-11  | BeneficiarioDevolvidoAdmSpec    | DEVOLUCAO_TIT_ADM = 'S' (campo JSON por beneficiario)                                 | RN21         |
| SP-VJ-12  | AltaRiscoPendenteAdmSpec        | BeneficiarioDevolvidoAdmSpec AND V_FL_DELIBERACAO <> '2' (sem deliberacao medica)     | RN21         |
| SP-VJ-13  | PropostaBloqueadaAdmSpec        | AltaRiscoPendenteAdmSpec AND V_FL_DELIBERACAO = 0 -- aciona FL_STATUS=3               | RN18         |

---

## 8. Anti-Corruption Layer

### ACL-VJ-01 -- BITIXAdapterService (AS-IS: PK_VENDA_JSON.pr_pim_insere_cnpj)

PK_VENDA_JSON.pr_pim_insere_cnpj e o **ACL canônico** entre o sistema BITIX e o dominio SIGO.

**Traducoes realizadas pelo ACL:**

| Conceito BITIX (JSON externo)        | Traducao para SIGO                                       | Localizacao                           |
|--------------------------------------|----------------------------------------------------------|---------------------------------------|
| Campo JSON "FL_COMMIT"               | Flag de staging vs efetivacao imediata                   | JSON_VALUE(to_clob(json), '$.FL_COMMIT') |
| Campo JSON "COD_OPERADORA"           | Ignorado -- hardcode para 'BITIX' [ATENCAO] A06          | V_COD_OPERADORA := 'BITIX'            |
| Estrutura JSON de empresa            | TB_EMPRESA_INTERNET%ROWTYPE via fn_set_empresa_internet  | fn_set_empresa_internet               |
| Estrutura JSON de beneficiarios      | TB_USUARIO_TITULAR_INTERNET / TB_USUARIO_DEPENDENTE_INTERNET | pr_set_usuario_internet           |
| Estrutura JSON odonto                | TB_ODON_EMPRESA_INTERNET via replicacao                  | pr_set_usuario_od + RN15             |
| Status de resposta ao BITIX          | JSON de retorno: {TPROVISORIO, INTEGRACAO, MENSAGEM, MOTIVOS} | Montagem de R_JSON no retorno     |
| Campo JSON "CD_EMP_ANTERIOR"         | EmpresaAnteriorAdm VO: identifica proposta como ADM e vincula empresa do contrato anterior | G_CD_EMP_ANTERIOR := pk_json_ext.get_string(V_EMPRESA, 'CD_EMP_ANTERIOR') |
| Campo JSON "CD_USU_ANT_TITULAR"      | UsuarioAnteriorTitular: codigo do beneficiario no contrato anterior para recuperacao de carencia | V_CD_USU_ANT_TITULAR por beneficiario em pr_set_usuario_internet |
| Campo JSON "DEVOLUCAO_TIT_ADM"       | DevolvaoAdmBeneficiario VO: sinaliza beneficiario como devolvido ADM (alto risco) | DEVOLUCAO_TIT_ADM := pk_json_ext.get_string(TP_JSON(V_BENEF.GET(I)), 'DEVOLUCAO_TIT_ADM') |
| Campo JSON "FL_DELIBERACAO"          | DeliberacaoAdm VO: 0=sem deliberacao (bloqueia), 2=deliberado (com historico) | V_FL_DELIBERACAO_TIT por beneficiario em pr_set_usuario_internet |

**No TO-BE:** o ACL deve ser extraido para um servico dedicado (ex: BITIXAdapterService), separado da logica de efetivacao. O contrato de retorno deve ser tipado em vez de JSON livre.

---

## 9. Factories

| ID       | Factory                        | O Que Cria                                               | Como                                                       | Origem     |
|----------|--------------------------------|----------------------------------------------------------|------------------------------------------------------------|------------|
| F-VJ-01  | PropostaEmpresaFactory         | NU_CONTROLE (saude) e NU_CONTROLE_OD (odonto)            | SQ_EMPRESA_INTERNET.nextval (dois chamados)                | pr_pim_insere_cnpj L~4700 |
| F-VJ-02  | EmpresaInternetFactory         | TB_EMPRESA_INTERNET%ROWTYPE + replica odonto             | fn_set_empresa_internet desserializa JSON para struct      | fn_set_empresa_internet   |
| F-VJ-03  | ControleOdontoTitularFactory   | NU_CONTROLE_TIT_OD para mapeamento saude-odonto          | Reutiliza de TB_PIM_CONTROLE_CPF ou gera por SQ_CONTROLE_INTERNET.nextval | RN10 |

---

## 10. Mapa RN -> DDD

| ID RN | Descricao Resumida                                  | Tipo DDD                       | Onde Vive (TO-BE)                                     |
|-------|-----------------------------------------------------|-------------------------------|-------------------------------------------------------|
| RN01  | fn_registro_sistema controla caminho de efetivacao   | Policy / Strategy              | EfetivacaoBatchService (configuravel via parametro)   |
| RN02  | FL_STATUS = 6 para elegibilidade                    | Specification                  | PropostaElegivelSpec                                  |
| RN03  | Grupo coligado completo antes de efetivar            | Invariante de Agregado / Spec  | GrupoColigadoCompletoSpec + GrupoColigada VO          |
| RN04  | Motor de criticas 3 modos (N/E/S)                   | Domain Service                 | MotorCriticasQuery (leitura) -- separado de escrita   |
| RN05  | Retorno fragil de pr_cadastramento_empresa_prov       | Factory / Domain Service       | EmpresaConveniadaFactory -- contrato tipado no TO-BE  |
| RN06  | Loop titular: critica + efetivacao individual        | Domain Service                 | EfetivacaoBeneficiariosService (sem N+1)              |
| RN07  | Status final 7 (PRE/POS ressalva) ou 10 (POS limpo) | Policy / Domain Service        | StatusFinalService -- extraido das 3 rotinas [S07]    |
| RN08  | Auto-baixa POSBAIXA no ato da integracao             | Domain Service                 | AutoBaixaPOSBAIXAService (condicional: todos specs = true) |
| RN09  | Idempotencia de integracao por status                | Specification                  | IdempotenciaIntegracaoSpec                            |
| RN10  | Mapeamento 1:1 controle saude-odonto por beneficiario| Domain Service / Repository    | MapeamentoSaudeOdontoService + MapeamentoControleRepo |
| RN11  | Middle 30-99 sem conta conjunta: cobranca separada   | Value Object / Policy          | ConfiguracaoCobrancaMiddle VO -- eliminar '-999'       |
| RN12  | Coligada POSBAIXA registra fluxo 7 para impedir status 10 | Domain Event / Service    | ColigadaRegistradaComFluxoPOS event -> FluxoPOSRepo   |
| RN13  | Blocklist BITIX impede auto-baixa                    | Specification                  | SemBlocklistSpec                                      |
| RN14  | Pendencia Neoway (fl_status_processamento='17') impede auto-baixa e forca status 7. Atua EXCLUSIVAMENTE sobre cd_operados='BITIX' -- produtor disjunto do caminho WEBHAP (Portal do Corretor Super Simples). [REF] CD_PENDENCIA=12 contabilizado pelo motor de criticas modo 'E' neste caminho BITIX e o equivalente funcional da Pendencia 12 (SP11 DivergenciaNeowaySpec) do EI para origens WEBHAP/TAFFIX, produzida via fn_checa_divergencia. Os dois caminhos sao disjuntos por cd_operados. [REF Conflito 2, Conflito 3 -- _shared/analise-comparativa-ddd-ei-vj.md] [REF RN-T07 base] | Specification + Domain Service         | DivergenciaNeowaySpec + NeowayValidacaoService     |
| RN14b | Parametro PK_VJ_EXECUTA_NEOWAY controla ativacao de PR_VE_DIVERGENCIA_NEOWAY      | Policy / Strategy                      | NeowayValidacaoService (verificar parametro antes de chamar PR_VE_DIVERGENCIA_NEOWAY) |
| RN15  | Replicacao automatica staging saude -> odonto        | Factory / Domain Service        | EmpresaInternetFactory (criacao atomica saude+odonto) |
| RN16  | Contagem de beneficiarios vs JSON deve coincidir     | Specification / Domain Event    | ContadorBeneficiariosOkSpec + DivergenciaContadorBeneficiario event |
| RN17  | Identificacao de proposta ADM via CD_EMP_ANTERIOR    | Value Object / Specification    | EmpresaAnteriorAdm VO + EmpresaAnteriorAdmSpec |
| RN18  | Alto risco ADM sem deliberacao bloqueia proposta em status 3 | Invariante de Agregado / Policy | PropostaEmpresaBitix.invariante + VendaAdmService |
| RN19  | Recuperacao de carencia ADM: CD_CONVENIO=542 + ajuste DT_ULTIMO_BOLETO | Domain Service + Value Object | VendaAdmService + ConvenioBeneficiario VO |
| RN20  | Declaracao de saude ADM importada do contrato anterior | Domain Service               | VendaAdmService (bloco IF V_CD_USU_ANT_TITULAR IS NOT NULL) |
| RN21  | Devolucao ADM registra alto risco em TB_USUARIO_ALT_RISCO | Domain Service + Domain Event | VendaAdmService + BeneficiarioAltaRiscoAdmRegistrado event |
| RN22  | Status 3 e exclusivo de ADM: proposta volta a processar em status 0 ou 5 | Value Object / Specification | StatusAguardandoAdm VO; IdempotenciaIntegracaoSpec deve excluir status 3 do bloqueio quando RESPOSTA_BITIX_01='N' [ATENCAO] A10 |

---

## 11. Decisoes de Design

| Decisao                                                   | Opcoes                                                                  | Escolha TO-BE                                                      | Justificativa                                                                                      |
|-----------------------------------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Separar ACL de efetivacao                                  | Manter no mesmo package / Separar em servicos distintos                | Separar: BITIXAdapterService (ACL) + EfetivacaoService (dominio)  | Single Responsibility; o ACL traduz JSON, o servico de dominio efetiva -- logicas independentes    |
| Resolver parsing fragil de pr_cadastramento_empresa_prov   | Manter substr/instr / OUT params tipados / **Hibrido (Adapter + RECORD canonico)** | **Hibrido (Opcao D canonica)**: Fase 1-2 o VJ mantem o parsing atual (substr/instr sobre `w_erro`); **Fase 3** a procedure expoe nova assinatura `(p_nu_controle IN, p_resultado OUT pk_efetivacao_types.t_resultado_efetivacao)` e a procedure antiga permanece como Adapter/Facade. VJ migra para o RECORD quando Fase 3 entrar em producao. [REF DD-01 -- _shared/base-conhecimento/decisoes-design.md] [REF Conflito 5 RESOLVIDO -- _shared/analise-comparativa-ddd-ei-vj.md] | Elimina S03 / A05 no to-be sem quebrar os 3 call sites do VJ (pr_efetiva, pr_efetiva_pme, pr_efetiva_coligada). Contrato canonico definido pela modelagem em execucao de pr_cadastramento_empresa_prov. |
| Eliminar estado global de package (15 variaveis)           | Manter globais / Converter para variaveis locais                       | Variaveis locais passadas por parametro entre rotinas privadas     | Critico S04: risco de corrupcao em execucao concorrente (JOB + BITIX simultaneo)                  |
| Separar fn_get_criticas_pendencias (efeito colateral)      | Manter funcao com side effect / Separar em query + command             | MotorCriticasQuery (retorna count) + AplicarStatusErroCommand (UPDATE) | Critico S12: funcao de leitura nao deve ter efeito colateral de escrita                         |
| Consolidar codigo triplicado das 3 rotinas de efetivacao   | Manter 3 cópias / Extrair rotina privada central                       | Extrair pr_efetiva_baixa_core(p_nu_controle, p_origem, p_modo) privada | S02/S07: ~85% do codigo e identico; qualquer bug precisa de 3 correcoes hoje                  |
| Resolver hardcode 'BITIX' em V_COD_OPERADORA              | Manter hardcode / Usar campo COD_OPERADORA do JSON                     | Usar campo do JSON; definir constante PKG_CONST.COD_OPERADORA_BITIX| S08 + A06: outros operadores futuros nao funcionariam sem alteracao de codigo                     |
| Resolver valor magico '-999' (Middle sem conta conjunta)   | Manter '-999' / Definir constante ou tipo                              | Constante PKG_CONST.COD_EMPRESA_PAI_MIDDLE_SEM_CONTA = '-999'     | A08: valor magico sem documentacao; encapsular para facilitar busca e modificacao                  |
| Tratar excecoes silenciosas (WHEN OTHERS THEN NULL)        | Manter nulls / Implementar log estruturado                             | Log estruturado; reraise seletivo onde critico                     | S01 + A09: pr_pim_pendencia com null silencioso; fn_get_criticas_pendencias retorna 0 mascarando erro |

---

## 12. Pendencias com o PO

- [ ] A04: Qual o valor atual de PK_VENDA_JSON_PR_EFETIVA_01 em producao? (define qual dos dois fluxos de batch e efetivamente executado)
- [ ] A06: Ha outros canais/operadores alem do BITIX que usam pr_pim_insere_cnpj? (impacta decisao do hardcode V_COD_OPERADORA)
- [ ] A05: Qual a diferenca de uso entre pr_efetiva_baixa_manual e pr_efetiva_baixa_manual_emp? Quais canais chamam cada uma?
- [ ] A08: O valor '-999' em l_empresa_conveniada_saude_pai para Middle sem conta conjunta tem documentacao oficial? Qual a semantica completa?
- [ ] A09: fn_get_criticas_pendencias retorna 0 quando ocorre excecao interna. Isso pode efetuar empresas sem validacao ANS. Confirmar severidade e prioridade de correcao.
- [ ] A10: [ATENCAO ADM] Status 3 (DEVOLVIDA ADM) e tratado de forma DIFERENTE conforme flag PK_VENDA_JSON_RESPOSTA_BITIX_01: quando 'S' bloqueia reintegracao (trata como "ja integrado"); quando 'N' permite reprocessar. Confirmar com PO qual e o comportamento esperado em producao e documentar como regra definitiva.
- [ ] A11: [ATENCAO ADM] A logica de Devolucao ADM (DEVOLUCAO_TIT_ADM='S') esta inteiramente embutida em pr_set_usuario_internet sem isolamento como Domain Service. Confirmar se VendaAdmService deve ser extraido como rotina privada independente ou permanece inline no refactoring PL/SQL.
- [ ] A12: [ATENCAO ADM] CD_CONVENIO = 542 e um valor magico para "recuperacao de carencia". Confirmar se ha documentacao oficial do codigo 542 e criar constante PKG_CONST.CD_CONVENIO_RECUPERACAO_CARENCIA_ADM.
- [ ] A13: [ATENCAO NEOWAY] PR_VE_DIVERGENCIA_NEOWAY nao esta catalogada neste workspace -- e uma rotina externa ao PK_VENDA_JSON. Confirmar com o PO: (a) quando exatamente ela e chamada no ciclo de vida de producao; (b) se ela pode ser chamada independentemente ou apenas via reintegracao por PK_VENDA_JSON; (c) o que acontece quando Neoway e desabilitado (PK_VENDA_JSON_EXECUTA_NEOWAY != 'S') -- propostas com divergencia real passam sem deteccao?
- [ ] A14: [ATENCAO NEOWAY] A chamada a PR_VE_DIVERGENCIA_NEOWAY tem WHEN OTHERS THEN NULL (falha silenciosa). Se a procedure lançar excecao, a proposta continua sem validacao Neoway sem nenhum aviso. Confirmar prioridade de correcao.
- [ ] A15: [ATENCAO NEOWAY] PR_VE_DIVERGENCIA_NEOWAY e chamada SOMENTE em reintegracao de proposta com FL_STATUS=1 (devolvida). Propostas novas (integracao inicial) NAO passam por validacao Neoway. Confirmar com PO se este e o comportamento intencional ou uma limitacao a ser corrigida.

---

## 13. Pontos de Atencao para Migracao Futura

> [REF Conflito 9 -- _shared/analise-comparativa-ddd-ei-vj.md] Secao criada em 24/04/2026 para paridade com a Secao 13 do DDD PR_EFETIVA_INTERNET.
> Consolida pontos de ruptura conhecidos que exigirao atencao especial em uma futura migracao do PK_VENDA_JSON para microsservico. Cada item e sinalizado com `[MIGRACAO]` nos building blocks ao longo do documento.

| ID         | Ponto de Atencao                                                                   | AS-IS (PL/SQL)                                                                                       | TO-BE (Microsservico)                                                                                     | ADR                     |
|------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|-------------------------|
| MIG-VJ-01  | ACL canonico BITIX->SIGO embutido no orquestrador (pr_pim_insere_cnpj)             | Desserializacao JSON, validacao, persistencia staging e orquestracao de efetivacao no mesmo package  | Extrair BITIXAdapterService (ACL-VJ-01) independente do EfetivacaoService. Contrato tipado in/out.         | ADR-05                  |
| MIG-VJ-02  | Estado global de package (15 variaveis G_*)                                        | Variaveis de spec/package compartilhadas entre rotinas (risco em execucao concorrente JOB+BITIX)    | Eliminar estado global. Usar TYPE RECORD de contexto IN OUT entre rotinas privadas.                        | [ADR-AUSENTE]           |
| MIG-VJ-03  | Motor de criticas com efeito colateral (CQS)                                        | `fn_get_criticas_pendencias` mistura leitura (count) com escrita (UPDATE fl_status=9) [S12/A09]      | Separar em `MotorCriticasQuery` (read-only) + `AplicarStatusErroCommand` (write). Fail-fast em erro.       | ADR-03                  |
| MIG-VJ-04  | Codigo triplicado das 3 rotinas de efetivacao                                       | `pr_efetiva`, `pr_efetiva_baixa_manual`, `pr_efetiva_baixa_manual_emp` com ~85% identicos [S02/S07] | Extrair `EfetivacaoCoreService.executar(nuControle, origem, modo)` unico; as 3 rotinas viram thin wrappers.| ADR-74                  |
| MIG-VJ-05  | StatusFinalService replicado nas 3 rotinas                                          | Logica inline repetida em pr_efetiva/baixa_manual/baixa_manual_emp                                    | Servico unico `StatusFinalService` consumido pelas 3. State machine explicita (enum + transitions).       | ADR-74                  |
| MIG-VJ-06  | Hardcode 'BITIX' em V_COD_OPERADORA [S08/A06]                                       | `V_COD_OPERADORA := 'BITIX'` ignorando campo JSON COD_OPERADORA                                       | Usar campo do JSON + constante `PKG_CONST.COD_OPERADORA_BITIX`. Abre porta para outros operadores.         | ADR-21                  |
| MIG-VJ-07  | Valor magico '-999' (Middle sem conta conjunta) [A08]                               | Literal '-999' em l_empresa_conveniada_saude_pai                                                      | Constante `PKG_CONST.COD_EMPRESA_PAI_MIDDLE_SEM_CONTA`. Value Object `ConfiguracaoCobrancaMiddle`.         | ADR-21                  |
| MIG-VJ-08  | Valor magico CD_CONVENIO=542 (recuperacao de carencia ADM) [A12]                    | UPDATE TB_USUARIO_TITULAR_INTERNET SET CD_CONVENIO = 542 inline                                       | Constante `PKG_CONST.CD_CONVENIO_RECUPERACAO_CARENCIA_ADM`. Value Object `ConvenioBeneficiario`.          | ADR-21                  |
| MIG-VJ-09  | WHEN OTHERS THEN NULL -- falhas silenciosas [S01/A09/A14]                           | `pr_pim_pendencia` e chamada a `PR_VE_DIVERGENCIA_NEOWAY` com null silencioso                         | Log estruturado (structured logging) + reraise seletivo. Nunca engolir excecao em ponto critico.          | [ADR-AUSENTE]           |
| MIG-VJ-10  | Parsing fragil do retorno de `pr_cadastramento_empresa_prov` [RN05]                 | substr/instr sobre VARCHAR2 concatenada (`substr(w_erro, instr(w_erro, ',') + 1)` em pr_efetiva, pr_efetiva_pme, pr_efetiva_coligada) | **Fase 3 PL/SQL to-be (canonico):** VJ consome `pk_efetivacao_types.t_resultado_efetivacao` diretamente -- acesso por campo (cd_empresa, fl_status, ds_etapa_erro), sem parsing. Procedure antiga permanece como Adapter/Facade durante transicao. **Microsservico:** HttpClient + DTO tipado. [REF contrato canonico em rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/.../ESTRATEGIA-REFATORACAO-PLSQL.md] [REF DD-01] [REF Conflito 5 RESOLVIDO] | ADR-03 / ADR-05  |
| MIG-VJ-11  | Eventos nomeados em portugues na AS-IS (resolvido parcialmente 24/04/2026)          | Nomes PT e sem topico/broker                                                                          | Topicos `hap-ins-bitix-*` em kebab-case EN, tempo passado, payload camelCase EN, Service Bus/RabbitMQ.    | ADR-02 / ADR-18         |
| MIG-VJ-12  | Repositorios fragmentados por tabela em vez de por AR (resolvido parcialmente 24/04/2026) | R-VJ-01 ja consolidado; R-VJ-06..10 continuam fragmentados sobre AR BeneficiarioBitix           | Consolidar R-VJ-06..10 em `BeneficiarioBitixRepository` unico. Separar ReadRepository x WriteRepository.   | ADR-22 / ADR-03         |
| MIG-VJ-13  | Scheduler proprio do VJ -- substituir invocacao via EI                              | EI chamava PK_VENDA_JSON.pr_efetiva via bloco COLIGADA_EMPRESA_BITIX                                  | DBMS_SCHEDULER no to-be PL/SQL; **Azure Function Timer Trigger** no microsservico. [REF DD-05 / A9]        | ADR-74                  |
| MIG-VJ-14  | Absorver PR_COLIGA_EMPRESA_BITIX como parte do proprio VJ                           | Procedure externa transferindo staging TB_EMPRESA_COLIGADA_BITX -> TB_EMPRESA_COLIGADA [REF RN-T10]   | Incorporar ao BITIXAdapterService / EfetivacaoBitixService. Emissao de evento `hap-ins-bitix-affiliated-group-unified`. | ADR-02 / ADR-05 |
| MIG-VJ-15  | VendaAdmService inline em `pr_set_usuario_internet` [RN17-RN22]                     | Blocos inline nas linhas ~3024/3095/3125/3604/5486                                                    | Extrair como Domain Service dedicado. Log auditavel de deliberacao de alto risco ADM (obrigacao ANS).     | ADR-74                  |
| MIG-VJ-16  | NeowayValidacaoService acoplado a procedure externa com falha silenciosa            | `PR_VE_DIVERGENCIA_NEOWAY` chamada com WHEN OTHERS THEN NULL; somente em reintegracao FL_STATUS=1     | Encapsular como HttpClient + Polly (retry + circuit breaker) no microsservico. Reraise seletivo em PL/SQL.| ADR-05                  |

---

## 14. Adendo Historico -- Regras de Negocio do Fluxo ADM (RN17-RN22)

> [NOTA HISTORICA 24/04/2026] Este adendo foi produzido durante a modelagem DDD original (17/04/2026) ao constatar que a engenharia reversa nao cobria o fluxo ADM. As regras **RN17-RN22 ja foram retroalimentadas** na reversa-pk-venda-json.md e integradas ao catalogo de regras da base de conhecimento. Este conteudo permanece aqui apenas como **referencia historica** -- a fonte canonica das regras e o documento de engenharia reversa. [REF Conflito 9 -- _shared/analise-comparativa-ddd-ei-vj.md]

[ATENCAO] Estas regras foram identificadas durante a modelagem DDD ao constatar a lacuna do fluxo ADM. Sao complementares as regras da engenharia reversa (reversa-pk-venda-json.md). O documento de reversa deve ser atualizado para incluir estas RNs no catalogo oficial.

---

### RN17 -- Identificacao de proposta como Venda Administrativa (ADM)

**Categoria:** Identificacao / ACL
**Risco ANS:** N/A
**Gatilho:** Sempre que pr_pim_insere_cnpj recebe um JSON
**Comportamento:** O campo JSON "CD_EMP_ANTERIOR" e lido e armazenado em G_CD_EMP_ANTERIOR. Quando presente (IS NOT NULL), a proposta e classificada como Venda ADM. A partir dai, o fluxo de staging e processamento de beneficiarios segue caminhos distintos para recuperacao de carencia e devolucao ADM.
**Resultado:** G_CD_EMP_ANTERIOR IS NULL = proposta nova; IS NOT NULL = proposta ADM.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 4729/9399
G_CD_EMP_ANTERIOR := pk_json_ext.get_string(V_EMPRESA, 'CD_EMP_ANTERIOR');
```

---

### RN18 -- Proposta ADM com alto risco sem deliberacao retorna status 3 (AGUARDANDO_ADM)

**Categoria:** Validacao / Orquestracao
**Risco ANS:** [ANS] Beneficiarios em situacao de alto risco sem avaliacao medica nao podem ser efetivados sem deliberacao -- impacto na selecao adversa de risco.
**Gatilho:** Durante pr_set_usuario_internet, quando DEVOLUCAO_TIT_ADM='S' AND V_FL_DELIBERACAO_TIT = 0
**Comportamento:** A proposta inteira recebe FL_STATUS=3 (AGUARDANDO_ADM). O beneficiario e registrado em TB_USUARIO_ALT_RISCO com FL_ALTO_RISCO=1, FL_DELIBERACAO=0. A proposta fica bloqueada ate que o operador administrativo delibere.
Quando PK_VENDA_JSON_RESPOSTA_BITIX_01='N': status 3 cai no bloco de reprocessamento (status IN ('0','5','3')), permitindo que o BITIX reenvie a proposta apos deliberacao.
Quando PK_VENDA_JSON_RESPOSTA_BITIX_01='S': status 3 e tratado como "JA INTEGRADO" -- bloqueando a reintegracao. [ATENCAO] A10: comportamento divergente conforme parametro. Ver pendencia A10.
**Resultado:** FL_STATUS = 3 na TB_PROPOSTA_VENDA; proposta nao segue para status 6 (elegivel para efetivacao).

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3265 (6245 no offset do arquivo)
IF DEVOLUCAO_TIT_ADM = 'S' AND V_FL_DELIBERACAO_TIT <> '2' THEN
  INSERT INTO TB_USUARIO_ALT_RISCO (TPROVISORIO, NU_CONTROLE_DEP, NU_CONTROLE_TITULAR,
    FL_ALTO_RISCO, FL_TITULAR_DEP, FL_DELIBERACAO, DT_CADASTRO)
  VALUES (pnu_controle, 0, TT_TIT.NU_CONTROLE, 1, 1, V_FL_DELIBERACAO_TIT, SYSDATE);
  G_BENE_ALTO_RISCO := G_BENE_ALTO_RISCO + 1;
  IF V_FL_DELIBERACAO_TIT = 0 THEN
    UPDATE TB_PROPOSTA_VENDA RR SET RR.FL_STATUS = 3 WHERE RR.NU_CONTROLE = pnu_controle;
  END IF;
  COMMIT;
END IF;
```

---

### RN19 -- Recuperacao de carencia em venda ADM: CD_CONVENIO=542 e ajuste de DT_ULTIMO_BOLETO

**Categoria:** Persistencia / Regra de Negocio
**Risco ANS:** [ANS] Aproveitamento indevido de carencia pode violar RN 195/2009 da ANS (portabilidade de carencias). Validar com equipe juridica.
**Gatilho:** G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL na pr_set_usuario_internet
**Comportamento (parte 1 -- Data do boleto):** Se o beneficiario anterior estiver ativo (fl_status_usuario=2), DT_ULTIMO_BOLETO_CONVENIO e substituida pela DT_INICIO da empresa atual (TB_EMPRESA_INTERNET.DT_INICIO).
**Comportamento (parte 2 -- CD_CONVENIO):** UPDATE em TB_USUARIO_TITULAR_INTERNET SET CD_CONVENIO = 542. O codigo 542 representa "recuperacao de carencia" -- portabilidade do contrato anterior.
**Resultado:** Beneficiario ADM com historico aproveita carencia do contrato anterior. [ATENCAO] A12: codigo 542 e valor magico -- confirmar com PO.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3044-3137
IF G_CD_EMP_ANTERIOR IS NOT NULL AND V_CD_USU_ANT_TITULAR IS NOT NULL THEN
  -- Parte 1: Atualiza data do ultimo boleto
  SELECT COUNT(1) INTO v_count_ativo FROM tb_usuario oo
   WHERE oo.cd_usuario = V_CD_USU_ANT_TITULAR AND oo.fl_status_usuario = 2;
  IF v_count_ativo > 0 THEN
    SELECT e.dt_inicio INTO v_dt_inicio_empresa FROM tb_empresa_internet e
     WHERE e.nu_controle = G_PROVISORIO_CRITICA;
    TT_TIT.DT_ULTIMO_BOLETO_CONVENIO := v_dt_inicio_empresa;
  END IF;
  -- Parte 2: Registra venda ADM e aplica CD_CONVENIO 542
  INSERT INTO TB_USUARIO_VENDA_ADM (CD_EMP_ANTERIOR, CD_USU_ANT_TITULAR, ..., NU_CONTROLE_TITULAR)
  VALUES (G_CD_EMP_ANTERIOR, V_CD_USU_ANT_TITULAR, ..., G_NU_CONTROLE_TIT);
  UPDATE TB_USUARIO_TITULAR_INTERNET T SET T.CD_CONVENIO = 542
   WHERE T.CD_EMPRESA = 'T' || G_PROVISORIO_CRITICA AND T.NU_CONTROLE = G_NU_CONTROLE_TIT;
  COMMIT;
END IF;
```

---

### RN20 -- Declaracao de saude em venda ADM: importacao do contrato anterior

**Categoria:** Persistencia / Regra de Negocio
**Risco ANS:** [ANS] Declaracao de saude de contrato anterior pode nao refletir estado atual de saude do beneficiario. Avaliar obrigatoriedade de nova declaracao conforme RN 195/2009.
**Gatilho:** V_CD_USU_ANT_TITULAR IS NOT NULL AND V_DECLARACAO.COUNT > 0 na pr_set_usuario_internet
**Comportamento:** Em vez de inserir "NADA CONSTA" como declaracao padrao, importa os dados de declaracao de saude do usuario anterior (TB_USUARIO / TB_DECLARACAO_SAUDE_GRUPO_CID). Cria registros em TB_DECLARACAO_SAUDE_INTERNET e TB_VI_DEC_SAUDE_INT_GRUPO_CID com base no contrato anterior.
**Resultado:** Beneficiario ADM herda declaracao de saude historica do contrato anterior.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_set_usuario_internet, aprox. linha 3604
-- Proposta sem declaracao de Saude venda ADM
IF V_CD_USU_ANT_TITULAR IS NOT NULL AND V_DECLARACAO.COUNT > 0 THEN
  INSERT INTO TB_DECLARACAO_SAUDE_INTERNET
    SELECT TT_DEC.NU_CONTROLE, 0, A.CD_GRUPO, 'N', 'NADA CONSTA' FROM TB_GRUPO_DECLARACAO_SAUDE A;
  INSERT INTO TB_VI_DEC_SAUDE_INT_GRUPO_CID
    SELECT TT_DEC.NU_CONTROLE, 0, GC.CD_GRUPO, GC.CD_CID
      FROM TB_USUARIO U, TB_DECLARACAO_SAUDE_GRUPO_CID GC
     WHERE U.CD_USUARIO = V_CD_USU_ANT_TITULAR AND U.NU_USUARIO = GC.NU_USUARIO;
  COMMIT;
END IF;
```

---

### RN21 -- Registro de TB_USUARIO_VENDA_ADM em nivel de empresa

**Categoria:** Persistencia
**Risco ANS:** N/A
**Gatilho:** G_CD_EMP_ANTERIOR IS NOT NULL ao final da integracao da empresa em pr_pim_insere_cnpj
**Comportamento:** Verifica se ja existe registro ADM para a empresa anterior (SELECT COUNT INTO V_EXISTE_ADM). Se V_EXISTE_ADM=0: insere em TB_USUARIO_VENDA_ADM com CD_USU_ANT_TITULAR=NULL e CD_USU_ANT_DEPENDENTE=NULL (registro de nivel empresa, sem beneficiario ainda). Registros de nivel beneficiario sao adicionados posteriormente em pr_set_usuario_internet (RN19).
**Resultado:** TB_USUARIO_VENDA_ADM contem: (1) um registro nivel empresa (titulares/deps NULL), e (2) registros nivel beneficiario com os codigos dos usuarios anteriores.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 5486
IF G_CD_EMP_ANTERIOR IS NOT NULL THEN
  SELECT COUNT(*) INTO V_EXISTE_ADM FROM TB_USUARIO_VENDA_ADM A
   WHERE A.CD_EMP_ANTERIOR = G_CD_EMP_ANTERIOR;
  IF V_EXISTE_ADM = 0 THEN
    INSERT INTO TB_USUARIO_VENDA_ADM (CD_EMP_ANTERIOR, CD_USU_ANT_TITULAR, CD_USU_ANT_DEPENTENTE,
      TPROVISORIO, DT_INCLUSAO, NU_CONTROLE_TITULAR, NU_CONTROLE_DEP)
    VALUES (G_CD_EMP_ANTERIOR, NULL, NULL, T_EMPRESA_INTERNET.NU_CONTROLE, SYSDATE, NULL, NULL);
    COMMIT;
  END IF;
END IF;
```

---

### RN22 -- Limpeza de dados ADM no reprocessamento (FL_COMMIT='N' + status 0/5/3)

**Categoria:** Idempotencia / Persistencia
**Risco ANS:** N/A
**Gatilho:** Reintegracao de proposta (status IN ('0','5','3')) com FL_COMMIT='N'
**Comportamento:** DELETE em TB_USUARIO_VENDA_ADM WHERE TPROVISORIO=pnu_controle. Garante que dados ADM da integracao anterior sejam limpos antes do reprocessamento. O mesmo bloco limpa TB_USUARIO_ALT_RISCO, TB_FILE_DOCUMENTO_BITIX, TB_STATUS_PROPOSTA_CADASTRO, TB_NATUREZA_JURIDICA_EMP e TB_PENDENCIA_EMPRESA_INTERNET.
**Resultado:** Reprocessamento recomeça limpo, sem dados remanescentes de integracao anterior.

**Evidencia:**
```sql
-- Origem: pk_venda_json body, pr_pim_insere_cnpj, aprox. linha 4823 (9493 no offset do arquivo)
DELETE from TB_USUARIO_VENDA_ADM t WHERE t.tprovisorio = pnu_controle;
DELETE FROM TB_USUARIO_ALT_RISCO O WHERE O.TPROVISORIO = pnu_controle;
DELETE from tb_status_proposta_cadastro c WHERE c.nu_provisorio = pnu_controle;
DELETE FROM TB_FILE_DOCUMENTO_BITIX FI WHERE FI.TPROVISORIO = pnu_controle;
DELETE FROM TB_NATUREZA_JURIDICA_EMP P WHERE P.TPROVISORIO = pnu_controle;
DELETE FROM TB_PENDENCIA_EMPRESA_INTERNET TT WHERE TT.NU_CONTROLE = pnu_controle;
COMMIT;
```

---

[HANDOFF-BACKLOG]
DDD concluido. Diagramas C4 e fluxogramas gerados (ver etapas 3 e 4).
Leitura obrigatoria antes de iniciar backlog:
- Este arquivo: ddd-modelagem-dominio.md
- reversa-pk-venda-json.md (rev-PRODUCAO-20260402)
- ddd-modelagem-dominio.md de PR_EFETIVA_INTERNET (contexto upstream de BC-EI-14)
- _shared/base-conhecimento/catalogo-regras-negocio.md
