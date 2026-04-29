# Dicionario de Dominio -- SIGO Refatoracao

> Atualizado em: 21/04/2026
> Fonte: Agentes DDD -- PR_EFETIVA_INTERNET + PK_VENDA_JSON + PR_CADASTRAMENTO_EMPRESA_PROV

Termos compartilhados entre rotinas. Ao referenciar um termo ja aqui listado,
usar [REF] e nao redocumentar.

---

## Termos do Contexto: Implantacao / Efetivacao PIM

| Termo                   | Definicao de Negocio                                                          | Equivalente Tecnico                            | Contexto  |
|-------------------------|--------------------------------------------------------------------------------|------------------------------------------------|-----------|
| PIM                     | Portal Internet de Movimentacao -- canal digital de vendas PME (<=29 vidas)   | Conceito de negocio (sem tabela propria)       | BC-EI-01  |
| Proposta Internet       | Registro da empresa candidata a contrato, com dados em staging                | TB_EMPRESA_INTERNET (nu_controle)              | BC-EI-01  |
| Proposta Odonto         | Registro espelho da proposta saude para operadora odonto                       | TB_ODON_EMPRESA_INTERNET                       | BC-EI-05  |
| Numero de Controle      | Identificador unico da proposta no staging                                     | TB_EMPRESA_INTERNET.NU_CONTROLE                | BC-EI-01  |
| Empresa Conveniada      | Entidade definitiva criada apos efetivacao da proposta                        | TB_EMPRESA_CONVENIADA                          | BC-EI-04  |
| Codigo Provisorio       | Codigo temporario 'T'+nu_controle, usado antes da efetivacao                  | TB_USUARIO_TITULAR_INTERNET.CD_EMPRESA         | BC-EI-06  |
| Codigo Definitivo       | Codigo final da empresa conveniada (5 chars, lpad '0')                        | TB_EMPRESA_CONVENIADA.CD_EMPRESA_CONVENIADA    | BC-EI-04  |
| Baixa Automatica        | Processo automatizado que efetiva propostas PIM sem intervencao manual        | Logica de negocio central                      | BC-EI-01  |
| Titular Internet        | Beneficiario titular cadastrado via PIM                                        | TB_USUARIO_TITULAR_INTERNET                    | BC-EI-06  |
| Dependente Internet     | Dependente de titular cadastrado via PIM                                       | TB_USUARIO_DEPENDENTE_INTERNET                 | BC-EI-06  |
| Pendencia               | Restricao que impede a efetivacao automatica da proposta                       | TB_PENDENCIA_EMPRESA_INTERNET (cd_pendencia)   | BC-EI-02  |
| Critica                 | Validacao de dados do beneficiario que pode bloquear a baixa                  | TB_USUARIO_CRITICA_INTERNET                    | BC-EI-03  |
| Canal de Venda          | Classificacao: 1 (1-29 vidas PME), 2 (30-99 vidas Middle)                    | Derivado de NU_TOTAL_EMPREGADO                 | BC-EI-01  |
| Localidade Limitrofe    | Cidade na area de abrangencia que requer aprovacao manual                      | TB_LOCALIDADE_LIMITROFE                        | BC-EI-02  |
| Vendedor Nacional       | Vendedor com area de venda configurada como nacional                           | TB_AREA_VENDA_CFG.FL_VENDEDOR_NACIONAL         | BC-EI-02  |
| Ex-Cliente              | Empresa que ja teve contrato e esta sendo reativada (fl_tipo_contrato=2)      | TB_EMPRESA_CONVENIADA                          | BC-EI-04  |
| Coligada SIGO           | Grupo empresarial vinculado -- soma de empregados determina modelo de negocio. **Tabela canonica unica de coligadas, independentemente da origem.** Para coligadas de propostas BITIX, os registros chegam aqui via PR_COLIGA_EMPRESA_BITIX (staging TB_EMPRESA_COLIGADA_BITX -> TB_EMPRESA_COLIGADA). [REF RN-T10] | TB_EMPRESA_COLIGADA                            | BC-EI-14  |
| Divergencia Neoway      | Inconsistencia detectada pelo servico externo Neoway (validacao cadastral)    | fn_checa_divergencia                           | BC-EI-10  |

---

## Termos do Contexto: Integracao BITIX

> **[CONCEITO -- Tipos vs Origens]** Propostas tem duas dimensoes ortogonais:
> - **Tipo/Produto**: PIM (=SS, Super Simples), PME, Individual, Odonto -- define fluxo de negocio (porte, carencias, precificacao).
> - **Origem/Ferramenta de venda**: BITIX, WEBHAP, TAFFIX (PONTO) -- define onde a proposta foi digitada (`cd_operados`).
> A rotina de efetivacao e escolhida pela ORIGEM, nao pelo TIPO. Propostas PIM/PME podem vir de qualquer origem.

| Termo                     | Definicao de Negocio                                                                    | Equivalente Tecnico                           | Contexto  |
|---------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------|-----------|
| Origem BITIX              | [ORIGEM] Ferramenta de venda digital externa (NDI Minas) que envia propostas PIM/PME via API JSON. Nao e restrita a um tipo de proposta -- digita tanto PIM/SS quanto PME. | `cd_operados = 'BITIX'` / `p_origem = 'BITIX'` | BC-VJ-01  |
| Origem WEBHAP             | [ORIGEM] Portal do Corretor Hapvida (nome legado: "Portal PIM"). Ferramenta em que corretores digitam propostas PIM/SS e PME. | `cd_operados = 'WEBHAP'`                      | BC-EI-01  |
| Origem TAFFIX (PONTO)     | [ORIGEM] Ferramenta usada por Administradoras de Beneficios para implantar empresas. Usa as mesmas estruturas de staging, mas gera contratos por adesao. | `cd_operados = 'PONTO'`                        | BC-EI-01  |
| Tipo PIM / SS             | [TIPO] Proposta de empresa PJ de pequeno porte (tipicamente ate 29 vidas). PIM e o nome legado; SS (Super Simples) e o nome atual. Pode vir de WEBHAP ou BITIX. | Derivado de `nu_total_empregado` ate 29        | BC-EI-01  |
| Tipo PME                  | [TIPO] Pequena e Media Empresa -- tipicamente 30 a 99 empregados. Fluxo PME distinto do PIM. Tambem pode vir de WEBHAP ou BITIX. | `nu_total_empregado BETWEEN 30 AND 99` (Canal2 Middle) | BC-EI-01 |
| POSBAIXA (POS)            | Modalidade de proposta em que a conferencia de documentacao ocorre APOS a efetivacao, invertendo a cronologia do ciclo de vida padrao. NAO e um canal de venda presencial -- e uma excecao ao fluxo de conferencia. No fluxo PRE (padrao), a conferencia ocorre ANTES da efetivacao. No fluxo POSBAIXA, a proposta e efetivada primeiro e entra em analise cadastral somente depois. | fn_get_confopera_emp retorna 1 | BC-VJ-05  |
| Proposta BITIX            | Proposta (PIM ou PME) digitada na ferramenta BITIX; recebida via JSON                   | TB_PROPOSTA_VENDA com CD_OPERADOS='BITIX'     | BC-VJ-01  |
| Numero de Controle Odonto | Identificador de controle da proposta odonto correspondente a proposta saude             | TB_PROPOSTA_VENDA.NU_CONTROLE_OD              | BC-VJ-07  |
| Auto-baixa POSBAIXA       | Efetivacao automatica acionada no mesmo ato da integracao JSON quando proposta POSBAIXA esta limpa (sem criticas, sem blocklist, sem Neoway) | pr_efetiva_baixa_manual(pnu_controle,'E','BAIXAPOS') | BC-VJ-08 |
| Fluxo POSBAIXA            | Codigo de rastreamento do estado de uma proposta POSBAIXA durante a conferencia pos-efetivacao (7=coligada, 10=base, 17=Neoway, 99=blocklist) | TB_PIM_FLUXO_POS / pr_set_emp_fluxo_pos | BC-VJ-05  |
| Staging Saude             | Registros temporarios de empresa e beneficiarios saude antes da efetivacao              | TB_EMPRESA_INTERNET + TB_USUARIO_TITULAR/DEPENDENTE_INTERNET | BC-VJ-01 |
| Staging Odonto            | Registros temporarios de empresa e beneficiarios odonto antes da efetivacao             | TB_ODON_EMPRESA_INTERNET                      | BC-VJ-10  |
| Mapeamento Controle       | Registro 1:1 que vincula o controle saude ao controle odonto de cada beneficiario       | TB_PIM_CONTROLE_CPF                           | BC-VJ-07  |
| Empresa Middle            | Empresa com 30 a 99 empregados -- segmento de cobranca diferenciado                    | NU_TOTAL_EMPREGADO BETWEEN 30 AND 99          | BC-VJ-03  |
| Conta Conjunta Odonto     | Modalidade em que saude e odonto compartilham a mesma fatura de cobranca                | FL_CONTA_CONJUNTA_ODONTO = 'S'                | BC-VJ-03  |
| Blocklist BITIX           | Lista de documentos de beneficiarios sinalizados que impedem auto-baixa POSBAIXA        | TB_FILE_DOCUMENTO_BITIX.FL_DOC_BLOCKLIST = 1  | BC-VJ-02  |
| Divergencia Neoway BITIX  | Beneficiario de proposta BITIX cujos dados cadastrais nao conferem com a base Neoway; sinalizado por fl_status_processamento='17'. Detectado pela rotina externa PR_VE_DIVERGENCIA_NEOWAY, acionada somente na reintegracao de proposta com FL_STATUS=1. Mecanismo distinto da Divergencia Neoway do fluxo PIM (fn_checa_divergencia). [REF BC-VJ-02] | fl_status_processamento = '17' em TB_USUARIO_TITULAR_INTERNET ou TB_USUARIO_DEPENDENTE_INTERNET | BC-VJ-02  |
| Pendencia Neoway BITIX    | Estado de uma proposta BITIX POSBAIXA cujo grupo de beneficiarios contem ao menos um com Divergencia Neoway BITIX. Detectada por fn_get_pend_neoway=1. Impede auto-baixa POSBAIXA e forca status final 7 (em vez de 10). | fn_get_pend_neoway(nu_controle) = 1 | BC-VJ-02, BC-VJ-05  |
| Fluxo 17 (Neoway BITIX)   | Codigo de rastreamento POSBAIXA que indica que a proposta teve ao menos um beneficiario com Divergencia Neoway. Registrado em TB_PIM_FLUXO_POS via pr_set_emp_fluxo_pos. Impede o status final 10 (caminho feliz POSBAIXA). | pr_set_emp_fluxo_pos(nu_controle, '', 17) | BC-VJ-05  |
| PK_VJ_EXECUTA_NEOWAY      | Parametro de sistema que habilita (='S') ou desabilita a validacao Neoway no fluxo BITIX. Quando desabilitado, PR_VE_DIVERGENCIA_NEOWAY nao e chamada. | fn_registro_sistema('PK_VENDA_JSON_EXECUTA_NEOWAY') | BC-VJ-09  |
| Proposta Coligada BITIX   | Proposta que pertence a um grupo empresarial via BITIX; todas devem estar prontas. **Staging** da origem BITIX -- PR_COLIGA_EMPRESA_BITIX transfere os registros para TB_EMPRESA_COLIGADA (canonica). Nao e hierarquia paralela a Coligada SIGO. [REF RN-T10] | TB_EMPRESA_COLIGADA_BITX.CD_PROPOSTA_MAE      | BC-VJ-06  |
| Contagem de Beneficiarios | Verificacao de consistencia entre quantidade declarada no JSON e quantidade processada  | G_TOTAL_BENEFICIARIO vs G_COUNT_BENEFIIFIM    | BC-VJ-01  |
| Origem de Efetivacao      | Identificador do canal que acionou a efetivacao (T229B, JOB, BITIX, BAIXAPOS, BPR)    | p_origem em pr_efetiva_baixa_manual           | BC-VJ-03  |

---

## Maquina de Estados -- FL_STATUS (TB_PROPOSTA_VENDA)

| Status | Nome de Negocio           | Condicao de Transicao                                  |
|--------|---------------------------|--------------------------------------------------------|
| 0      | Digitada                  | Estado inicial apos digitacao no PIM                   |
| 1      | Devolvida                 | Criticas impedem efetivacao; devolver para correcao    |
| 2      | Em Analise                | Aguardando conferencia manual                          |
| 3      | Pendente                  | Pendencias de empresa bloqueando                       |
| 4      | Devolvida Empresa         | Empresa devolvida para correcao                        |
| 6      | Aguardando Baixa          | Pronta para efetivacao -- selecionada pelo JOB         |
| 7      | Efetivada                 | Empresa e beneficiarios cadastrados definitivamente (PRE ou POS com ressalva) |
| 8      | Cancelada                 | Proposta cancelada                                     |
| 9      | Com Erro                  | Falha tecnica ou critica no processamento              |
| 10     | Implantada em Analise     | Efetivada pelo fluxo POSBAIXA (limpo) -- conferencia documental ocorre APOS a efetivacao |

---

## Termos do Contexto: Cadastramento de Empresa Conveniada (BC-CAD)

| Termo                     | Definicao de Negocio                                                                     | Equivalente Tecnico                                  | Contexto   |
|---------------------------|------------------------------------------------------------------------------------------|------------------------------------------------------|------------|
| Modelo Atacado            | Tabela de precos corporativa aplicada ao conjunto de empresas (vs tabela individual AFFIX) | wfl_tabela_geral = 'S'                              | BC-CAD-05  |
| AFFIX                     | Sistema de cotacao e gestao de propostas PIM/PME (fonte da tabela de precos proposta)    | tb_empresa_internet.cd_tabela                       | BC-CAD-05  |
| Tabela Exclusiva          | Tabela de precos criada exclusivamente para esta empresa (vs tabela compartilhada)       | INSERT tb_preco_plano com cd_empresa exclusivo       | BC-CAD-05  |
| Tabela Compartilhada      | Tabela de precos compartilhada com outras empresas (modelo atacado / geral)              | COPY de tabela existente para cd_empresa novo        | BC-CAD-05  |
| Coligada SIGO             | Empresa pertencente a grupo economico com contrato centralizado em SIGO. Tabela canonica unica de coligadas (inclusive BITIX apos PR_COLIGA_EMPRESA_BITIX). [REF RN-T10] | tb_empresa_coligada                                 | BC-CAD-03  |
| Coligada BITIX            | Registro de **staging** de coligada vinda da origem BITIX. Transferido para tb_empresa_coligada por PR_COLIGA_EMPRESA_BITIX. Nao e hierarquia paralela. [REF RN-T10] | tb_empresa_coligada_bitx                            | BC-CAD-03  |
| Fidelizacao Contratual    | Periodo minimo de permanencia contratual definido em meses na negociacao                 | tb_empresa_conveniada.nu_carencia_grupo_fid          | BC-CAD-08  |
| Minimo Contratual         | Quantidade minima de vidas exigida para manter o contrato ativo                          | tb_empresa_conveniada.nu_minimo_contratual           | BC-CAD-08  |
| Tabela de Inativos RN279  | Tabela de precos especifica para ex-empregados (inativos) conforme RN279/309 da ANS     | pr_tabela_inativos_rn279                            | BC-CAD-06  |
| Flag Faixa Etaria ANS     | Indicador se o plano aplica reajuste por faixa etaria (RN195) -- impacta precificacao   | v_fl_faixa_ans (CHAR 'S'/'N')                       | BC-CAD-06  |
| Acesso ADM Empresa        | Credenciais de acesso do administrador da empresa ao portal internet                    | tb_acesso_internet                                   | BC-CAD-10  |
| Email de Boas-Vindas      | Notificacao enviada ao responsavel da empresa apos cadastramento definitivo              | pr_send_mail / pr_send_mail_html_rn                  | BC-CAD-11  |
| Contrato AFFIX            | Numero do contrato no sistema AFFIX vinculado ao contrato SIGO                          | tb_empresa_conveniada.cd_contrato_affix              | BC-CAD-07  |
| Data de Efetivacao Ajustada | Data de inicio do contrato ajustada por regra de negocio (proximo dia util, primeiro do mes) | CalculoVigenciaContratoService                  | BC-CAD-07  |
| Efetivacao Definitiva     | Estado final de sucesso: empresa, pessoa, contrato, tabelas e acessos criados            | fl_status_processamento = 1 em tb_empresa_internet  | BC-CAD-01  |
| Canal PME                 | Canal de venda para empresas com 1 a 29 vidas (Pequena e Media Empresa)                 | wcd_canal_venda = 1                                 | BC-CAD-03  |
| Canal Middle              | Canal de venda para empresas com 30 a 99 vidas                                          | wcd_canal_venda = 2                                 | BC-CAD-03  |

---

## Padronizacao de Building Blocks DDD (canonico entre EI e VJ)

> Consolidado em 24/04/2026 -- resolucao do Conflito 7 (nomenclatura divergente EI x VJ).
> [REF ADR-21 -- Linguagem Onipresente]
> [REF _shared/analise-comparativa-ddd-ei-vj.md Secao 9]

| Conceito de Negocio                                | Nome Canonico                       | Observacao                                                                                                         |
|----------------------------------------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Codigo 'T'+nu_controle antes da efetivacao         | **`CodigoProvisorio`** (VO)         | Nome do EI adotado como canonico. VJ renomeou de `CodigoProvisorioEmpresa`.                                        |
| Grupo empresarial nativo SIGO                      | **`Coligada SIGO`** / `TB_EMPRESA_COLIGADA` | Termo do EI. Convive com Coligada BITIX (estruturas distintas -- ver Conflito 8).                              |
| Grupo empresarial BITIX                            | **`Coligada BITIX`** / `TB_EMPRESA_COLIGADA_BITX` | Termo do VJ. Aplicavel apenas a propostas com `cd_operados='BITIX'`.                                       |
| Validacao de dados do beneficiario                 | **`Critica`** -> `TB_USUARIO_CRITICA_INTERNET` | Termo canonico: atua sobre BENEFICIARIO. Nao confundir com Pendencia.                                       |
| Restricao de efetivacao no nivel da empresa        | **`Pendencia`** -> `TB_PENDENCIA_EMPRESA_INTERNET` | Termo canonico: atua sobre EMPRESA (cd_pendencia 1..13).                                                |
| Motor de avaliacao de criticas **+** pendencias no VJ | **`MotorCriticasService`** (VJ)   | [ATENCAO] No VJ, "Motor de Criticas" abrange Criticas (beneficiario) E Pendencias (empresa). No EI esses dois dominios tem services separados: `CriticaService` (beneficiario) e `AvaliacaoPendenciasService` / DS01 (empresa). Migracao futura deve manter essa distincao. |
| Motor de avaliacao de pendencias (EI)              | **`AvaliacaoPendenciasService`** (DS01) | Motor do EI limitado a pendencias de empresa. Nao valida criticas de beneficiario (responsabilidade de `CriticaService`). |
| Spec que detecta divergencia Neoway                | **`DivergenciaNeowaySpec`** (Spec)  | Convencao canonica: nomear a FALHA (nao o sucesso). VJ renomeou de `SemDivergenciaNeowaySpec`. Semantica: `true` indica PRESENCA de divergencia em ao menos um beneficiario. |
| Value Object: estado de processamento do beneficiario | **`StatusProcessamentoBenef`**    | Dominio {0,1,2,8,9,17}. 17 = divergencia Neoway (dois produtores disjuntos por origem -- ver Conflito 2).         |

**Regras de uso:**
- Ao criar novo artefato DDD, usar exclusivamente os nomes canonicos acima.
- Se um termo ja existente divergir, renomear e registrar a mudanca com `[REF Conflito 7]`.
- Evitar Specs que nomeiam o sucesso (prefixo `Sem`/`Nao`). Nomear sempre a condicao que interessa detectar (a falha).

