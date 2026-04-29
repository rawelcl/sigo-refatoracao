# Pendencias Abertas

> Atualizado em: 24/04/2026

---

## [CRITICO] Analise Comparativa EI x VJ -- Conflitos de Design Bloqueantes (A1..A7)

> Referencia: `_shared/analise-comparativa-ddd-ei-vj.md`
> Data: 24/04/2026

### [ADR-DESEJAVEL] A1 -- Modelo Canonico de Agregados (reavaliada 24/04/2026)

| Campo    | Valor |
|----------|-------|
| Escopo   | PR_EFETIVA_INTERNET + PK_VENDA_JSON |
| Data     | 24/04/2026 (reavaliado 24/04/2026) |
| Descricao| [REBAIXADA de ADR-AUSENTE bloqueante para ADR-DESEJAVEL] Originalmente registrada como bloqueante da migracao sob o pressuposto de servico canonico unico. Apos decisoes de 24/04/2026 (EI=PIM exclusivo, VJ=BITIX exclusivo, TB_PROPOSTA_VENDA removida do EI, desacoplamento total), os dois modelos DDD sao validos em paralelo para migracao canal-a-canal -- escrita disjunta nas tabelas fisicas via particionamento por `cd_operados`. ADR A1 passa a ser pre-requisito SOMENTE se/quando for tomada a decisao de consolidar EfetivacaoService compartilhado entre canais (cenario ja sinalizado na secao 1.4 do DDD VJ). |
| Acao     | Monitorar. Criar ADR apenas no momento em que a consolidacao do EfetivacaoService compartilhado for priorizada. Candidato base: modelo do EI (8 ARs bem definidos). |

### [BAIXA] A2 -- fl_status='17' tem dois produtores disjuntos por origem

| Campo    | Valor |
|----------|-------|
| Escopo   | PR_EFETIVA_INTERNET (consome '17') + Portal do Corretor Super Simples (produz '17' para WEBHAP) + PK_VENDA_JSON (produz '17' para BITIX) |
| Data     | 24/04/2026 |
| Descricao| [REBAIXADA de CRITICO para BAIXA em 24/04/2026] Esclarecido pelo PO: existem **dois produtores disjuntos** do estado 17, um por origem, sem interferencia mutua. (1) Propostas WEBHAP recebem '17' diretamente da ferramenta Portal do Corretor Super Simples -- *antes* e *fora* do EI. (2) Propostas BITIX recebem '17' via PR_VE_DIVERGENCIA_NEOWAY chamada pelo VJ (RN14). Os dois caminhos atuam sobre particoes disjuntas (`cd_operados`) -- nao ha fluxo cruzado entre contextos. O que resta e clarificacao documental. |
| Acao     | Adicionar nota em BC-EI-07 do EI listando os dois produtores e deixando claro que no to-be do EI (exclusivo WEBHAP/TAFFIX) apenas o produtor externo Portal Super Simples e relevante. Adicionar nota em VJ RN14 deixando explicito que atua apenas sobre `cd_operados='BITIX'`. [REF Conflito 2 -- _shared/analise-comparativa-ddd-ei-vj.md] |

### [CRITICO] A3 -- CD_PENDENCIA=12 inserido por dois caminhos sem documentacao cruzada

| Campo    | Valor |
|----------|-------|
| Escopo   | PR_EFETIVA_INTERNET (SP11 via fn_checa_divergencia) + PK_VENDA_JSON (fn_get_criticas_pendencias modo 'E') |
| Data     | 24/04/2026 |
| Descricao| TB_PENDENCIA_EMPRESA_INTERNET.CD_PENDENCIA=12 e inserido por mecanismos distintos por canal. O EI isenta BITIX de fn_checa_divergencia mas nao documenta que o BITIX tem mecanismo proprio. |
| Acao     | Adicionar nota em SP11 do EI: "[REF] BITIX usa mecanismo diferente via VJ RN14". Adicionar referencia simetrica no VJ. |

### [ALTA] A4 -- Domain Events do VJ violam ADR-18

| Campo    | Valor |
|----------|-------|
| Escopo   | PK_VENDA_JSON -- Secao 5 Domain Events |
| Data     | 24/04/2026 |
| Descricao| Eventos sem IDs, sem topicos ADR-18, sem payload EN, sem publisher, sem broker. Incompativel com padrao do EI para publicacao no Service Bus. |
| Acao     | Reprojetar Secao 5 do VJ. Contexto sugerido: hap-ins-bitix-{evento}. |

### [ALTA] A5 -- Solucao pr_cadastramento_empresa_prov duplicada sem cross-reference

| Campo    | Valor |
|----------|-------|
| Escopo   | PK_VENDA_JSON Decisao de Design + proposta-novo-contrato-retorno.md (EI) |
| Data     | 24/04/2026 |
| Descricao| Dois documentos propondo solucao TO-BE para o mesmo problema na mesma sub-rotina sem se referenciar. Risco de implementacoes incompativeis. |
| Acao     | VJ Decisao de Design deve referenciar proposta-novo-contrato-retorno.md. Garantir solucao unica. |

### [OK] A6 -- Hierarquia TB_EMPRESA_COLIGADA x TB_EMPRESA_COLIGADA_BITX [RESOLVIDO 24/04/2026]

| Campo    | Valor |
|----------|-------|
| Escopo   | PR_EFETIVA_INTERNET + PK_VENDA_JSON |
| Data     | 24/04/2026 |
| Descricao| Duas tabelas de coligada (SIGO nativa e BITIX) sem documentacao sobre relacao entre elas. O VJ nao menciona TB_EMPRESA_COLIGADA. EI menciona PR_COLIGA_EMPRESA_BITIX sem explicar a hierarquia. |
| Resolucao| Esclarecimento do PO (24/04/2026): `TB_EMPRESA_COLIGADA` e tabela canonica unica. `TB_EMPRESA_COLIGADA_BITX` e staging da origem BITIX. `PR_COLIGA_EMPRESA_BITIX` transfere os registros de staging para a canonica -- toda coligada (inclusive BITIX) termina em TB_EMPRESA_COLIGADA. Nao sao hierarquias paralelas. Consolidado como RN-T10 em catalogo-regras-negocio.md; dicionario-dominio.md, DDDs EI/VJ e catalogo-objetos-plsql.md atualizados. [REF RN-T10] [REF Conflito 8 -- _shared/analise-comparativa-ddd-ei-vj.md] |

### [ALTA] A7 -- Padronizacao incremental do DDD do VJ

| Campo    | Valor |
|----------|-------|
| Escopo   | PK_VENDA_JSON -- estrutura do documento |
| Data     | 24/04/2026 |
| Descricao| VJ nao tem Secao 0 (ADRs), IDs nos building blocks, Secao 13 (migracao), notas ADR por DS e Decisoes de Design. |
| Acao     | Padronizar incrementalmente. Prioridade: Secao 0 e IDs primeiro. |

### [CRITICO] A9 -- Criar scheduler PK_VENDA_JSON.pr_efetiva ANTES do deploy do EI refatorado

| Campo    | Valor |
|----------|-------|
| Escopo   | PK_VENDA_JSON + PR_EFETIVA_INTERNET |
| Data     | 24/04/2026 |
| Descricao| PRE-REQUISITO OPERACIONAL. O EI refatorado remove o bloco COLIGADA_EMPRESA_BITIX (unico acionador atual do VJ em producao). Se o EI for deploiado sem que o scheduler do VJ esteja criado e ativo, PK_VENDA_JSON.pr_efetiva para de executar em producao. A criacao do scheduler deve ser deployada ANTES ou JUNTO com o EI refatorado -- nunca depois. |
| Acao     | Sprint EI: incluir task de criacao de DBMS_JOB ou DBMS_SCHEDULER para PK_VENDA_JSON.pr_efetiva como pre-requisito do merge/deploy da refatoracao de PR_EFETIVA_INTERNET. Validar que o job esta ativo antes de remover o bloco COLIGADA_EMPRESA_BITIX do EI. |
| Inventario | Logica BITIX a migrar do EI para VJ/scheduler (ver MIG-16 e A-TO-BE-02 no DDD EI): (1) bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 CVS) + chamada PK_VENDA_JSON.pr_efetiva; (2) PR_COLIGA_EMPRESA_BITIX -- avaliar incorporacao no VJ; (3) fn_registro_sistema('COLIGADA_EMPRESA_BITIX') -- flag passa a ser do VJ; (4) VO OrigemProposta (isencao Neoway BITIX) -- confirmar cobertura no VJ; (5) RN30 (processamento BITIX/JSON); (6) SP11/RN18: clausula 'exceto BITIX' removida do EI. |
| Dependencias| Bloqueia o deploy de PR_EFETIVA_INTERNET refatorado. Independente da sprint de refatoracao do VJ. [REF DD-05 -- decisoes-design.md] |

### [OK] A8 -- Mecanismo de trigger BITIX no TO-BE -- RESOLVIDO

| Campo    | Valor |
|----------|-------|
| Escopo   | PR_EFETIVA_INTERNET + PK_VENDA_JSON |
| Data     | 24/04/2026 |
| Descricao| RESOLVIDO. VJ totalmente desacoplado de EI. VJ tera scheduler proprio (DBMS_JOB/DBMS_SCHEDULER no PL/SQL to-be; Azure Function Timer no microsservico). Opcao (a) chamada direta -- DESCARTADA. Opcao (c) evento ADR-02 -- DESCARTADA (VJ nao precisa de evento para disparar). Bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 do CVS EI) deve ser removido na refatoracao de PR_EFETIVA_INTERNET. |
| Acao     | [OK] Registrado em DD-05 -- decisoes-design.md. Implementar na sprint de refatoracao do EI. |

### [OK] A10 -- Taxonomia Tipo vs Origem de Proposta -- RESOLVIDO

| Campo    | Valor |
|----------|-------|
| Escopo   | Projeto inteiro (dicionario-dominio, dicionario-siglas, DDDs, C4, analise-comparativa) |
| Data     | 24/04/2026 |
| Descricao| RESOLVIDO. Identificado e corrigido erro terminologico. Estabelecidas duas dimensoes ortogonais: (1) TIPO/PRODUTO da proposta = PIM (=SS Super Simples), PME, Individual, Odonto -- define fluxo de negocio; (2) ORIGEM/FERRAMENTA de venda = BITIX, WEBHAP, TAFFIX (PONTO) -- define `cd_operados` e qual rotina efetiva. Valores confirmados de `cd_operados`: BITIX='BITIX', WEBHAP='WEBHAP', TAFFIX='PONTO'. TAFFIX nao e o mesmo que WEBHAP: TAFFIX e ferramenta de Administradoras de Beneficios que gera contratos por adesao, identificada por `cd_operados='PONTO'`. Expressao "canal PIM" era incorreta -- substituida por "origens WEBHAP/TAFFIX". |
| Acao     | [OK] Atualizados: `_shared/dicionario-siglas.md` (nova secao 2), `_shared/dicionario-dominio.md` (bloco [CONCEITO]), `_shared/analise-comparativa-ddd-ei-vj.md`, DDDs EI e VJ, `_shared/c4-model/src/c4-1-system-context.puml`, `catalogo-objetos-plsql.md`, `decisoes-design.md`. |

### [-] A11 -- Inventariar demais origens e valores de cd_operados

| Campo    | Valor |
|----------|-------|
| Escopo   | Projeto inteiro |
| Data     | 24/04/2026 |
| Descricao| Identificados 3 valores de `cd_operados`: 'BITIX' (origem BITIX), 'WEBHAP' (origem WEBHAP/Portal do Corretor), 'PONTO' (origem TAFFIX/Administradoras de Beneficios). Existem outras origens em producao? Ex: canal Agente, canal Corretor interno, etc. Confirmar inventario completo antes da refatoracao para evitar esquecer fluxos. |
| Acao     | Consultar `SELECT DISTINCT cd_operados, COUNT(*) FROM tb_empresa_internet GROUP BY cd_operados` em producao. Atualizar `dicionario-siglas.md` secao "Origens" com os valores encontrados. |

---



### [BLOQUEADO] P01 -- Confirmacao da SEQUENCE para cd_empresa

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| Verificar se ja existe SEQUENCE para cd_empresa em HUMASTER ou se precisa ser criada. DD-CAD-08 depende deste dado. |
| Acao     | DBA: SELECT sequence_name FROM dba_sequences WHERE sequence_name LIKE '%EMPRESA%' AND sequence_owner = 'HUMASTER' |

---

### [BLOQUEADO] P02 -- Regra de negocio para fl_modelo_reajuste

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| O flag fl_modelo_reajuste (tb_empresa_conveniada) e atribuido com valor hardcoded sem logica documentada. A regra de negocio que define qual modelo aplicar nao foi encontrada no CVS ou na documentacao ANS. |
| Acao     | Produto confirmar regra de negocio do modelo de reajuste antes de refatorar BC-CAD-07. |

---

### [BLOQUEADO] P03 -- Parametro 225 (repasse odonto automatico) -- condicao completa

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| Repasse automatico para Odonto via parametro 225 tem condicao parcialmente documentada. Nao e claro se aplica apenas para empresas sem plano odonto ou tambem para empresas com plano odonto em certas operadoras. |
| Acao     | Produto confirmar regra completa do parametro 225 para BC-CAD-12. |

---

### [BLOQUEADO] P04 -- Canal de entrega da nova senha de acesso

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| DD-CAD-05/06 removem senha do email de boas-vindas. Produto deve definir: (a) canal alternativo (SMS, portal seguro, WhatsApp?); (b) TTL do link de primeiro acesso; (c) politica de reenvio. |
| Acao     | Produto definir canal de entrega de credenciais antes de implementar pk_notificacao. |

---

### [BLOQUEADO] P05 -- Criterio de uso da tabela Modelo Atacado vs tabela AFFIX

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| Logica de selecao entre tabela do Modelo Atacado (wfl_tabela_geral='S') e tabela AFFIX (proposta internet) tem ramificacoes condicionais por operadora e canal de venda que precisam de validacao com produto. |
| Acao     | Produto validar fluxograma TO-BE secao BC-CAD-05 antes de implementar pk_cad_precificacao. |

---

### [-] P06 -- Validar regras RN279 atualizadas pela ANS

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| Tabela de inativos RN279/309 e calculada com regras que podem ter sido atualizadas pela ANS. Verificar se a logica atual (percentuais por faixa etaria) esta alinhada com a normativa vigente. |
| Acao     | Compliance/Produto verificar aderencia com RN279 vigente para BC-CAD-06. |

---

### [-] P07 -- Logica de Coligadas (PR_BAIXA_EMPRESA_COLIGADA e similares)

| Campo    | Valor |
|----------|-------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV |
| Data     | 21/04/2026 |
| Descricao| As rotinas de coligada (PR_BAIXA_EMPRESA_COLIGADA, PR_BAIXA_EMP_COLIGADA_SAUDE, PR_EFETIVA_BAIXA_COLIGADA) chamam PR_CADASTRAMENTO_EMPRESA_PROV mas com logica especifica de coligada nao totalmente mapeada nesta eng. reversa. |
| Acao     | Realizar eng. reversa das rotinas de coligada antes da implementacao de BC-CAD-03 (ConsolidacaoVidasColigadaService). |

---

## [CRITICO] PK_VENDA_JSON_PR_EFETIVA_01 -- valor em producao desconhecido

| Campo    | Valor                                                                                         |
|----------|-----------------------------------------------------------------------------------------------|
| Rotina   | PK_VENDA_JSON                                                                                 |
| Data     | 17/04/2026                                                                                    |
| Descricao| O parametro fn_registro_sistema('PK_VENDA_JSON_PR_EFETIVA_01') controla qual dos dois fluxos de batch e executado (Fluxo CTE avancado vs Fluxo Legado dois loops). O valor atual em producao nao foi verificado via MCP. |
| Impacto  | Sem saber o valor ativo, nao e possivel determinar o caminho efetivamente executado pelo JOB   |
| Acao     | DBA verificar: SELECT VALUE FROM TB_REGISTRO_SISTEMA WHERE CHAVE = 'PK_VENDA_JSON_PR_EFETIVA_01' |

---

## [CRITICO] fn_get_criticas_pendencias mascarando excecao como 'sem criticas'

| Campo    | Valor                                                                                         |
|----------|-----------------------------------------------------------------------------------------------|
| Rotina   | PK_VENDA_JSON                                                                                 |
| Regra    | A09 / RN-T02                                                                                  |
| Data     | 17/04/2026                                                                                    |
| Descricao| WHEN OTHERS -> v_retorno:=0 na fn_get_criticas_pendencias pode efetivar empresa com beneficiarios que nao passaram pelas validacoes ANS de pr_critica_internet. |
| Impacto  | [ANS] Critico -- empresa efetivada sem validacoes obrigatorias mascaradas por excecao silenciosa |
| Acao     | Prioridade maxima: adicionar log estruturado e reraise; nunca retornar 0 mascarando erro        |

---

## [CRITICO] SINONIMO PUBLIC.PR_EFETIVA_INTERNET INVALID

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Data     | 09/04/2026 (last_ddl_time do sinonimo)                                    |
| Descricao| Sinonimo publico `PR_EFETIVA_INTERNET` esta INVALID. Aponta para `HUMASTER.PR_EFETIVA_INTERNET`. Objeto real nao localizavel via `all_objects` pelo usuario C_RAWEL. |
| Impacto  | Se o sinonimo e o mecanismo de chamada do JOB, a procedure pode estar nao executando desde 09/04/2026 |
| Acao     | Verificar com DBA: (1) se o objeto existe em HUMASTER; (2) motivo do INVALID; (3) se JOB esta em execucao |

---

## [CRITICO] MOVIMENTACAO_PIM_AUTOMATICO = 'NAO' em Producao

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Data     | 17/04/2026 (verificado via MCP)                                           |
| Descricao| Parametro `MOVIMENTACAO_PIM_AUTOMATICO = 'NAO'` desliga o bloco principal PIM (~80% do codigo, linhas 179-1858). Nenhuma empresa PIM esta sendo efetivada automaticamente. |
| Impacto  | Critico para operacoes -- propostas PIM nao sao efetivadas automaticamente |
| Acao     | Confirmar com equipe operacional: e temporario (manutencao)? Permanente? Quando sera reativado? |

---

## [ATENCAO] Dupla Consulta de fl_baixa_automatica

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN02                                                                      |
| Descricao| Na Fase 1 (PME por modelo), o codigo consulta `fl_baixa_automatica` em `tb_modelo_empresa` e em seguida consulta novamente em `tb_area_venda`, sobrescrevendo o valor. A logica depende apenas do segundo valor (area_venda). |
| Acao     | Validar com PO qual e a regra correta: modelo ou area de venda prevalece? |

---

## [ATENCAO] fn_valida_coligada_baixa Chamada com NULL

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN04                                                                      |
| Descricao| `fn_valida_coligada_baixa(V_PROPOSTA_MAE)` e chamada com `V_PROPOSTA_MAE = NULL`. O resultado `v_result` nao e usado. Parece codigo incompleto ou placeholder. |
| Acao     | Verificar com desenvolvedor responsavel a intencao original do bloco       |

---

## [ATENCAO] Data Hardcode '01/11/2012'

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN05                                                                      |
| Descricao| Empresas com `dt_cadastramento <= '01/11/2012'` nunca sao processadas pelo bloco PIM principal |
| Acao     | Validar com PO se esta data ainda e relevante ou pode ser removida         |

---

## [ATENCAO] Data Hardcode '16/05/2017' (Odonto Puro)

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN25                                                                      |
| Descricao| Registros odonto com `dt_digitacao < '16/05/2017'` nao sao processados no loop de odonto puro |
| Acao     | Validar com PO se esta data ainda e relevante ou pode ser removida         |

---

## [ATENCAO] Inconsistencia na Descricao de Pendencia 5

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN12                                                                      |
| Descricao| Codigo usa `> 23 anos` para sobrinho. tb_tp_pend_empresa_internet diz `> 18 ANOS`. |
| Acao     | Confirmar qual e o limite correto: 18 ou 23 anos para sobrinho como dependente |

---

## [ATENCAO] cd_pendencia = 499 Hardcoded

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_EFETIVA_INTERNET                                                       |
| Regra    | RN27                                                                      |
| Descricao| Usuarios que falham na baixa automatica apos processamento completo recebem `cd_pendencia = 499`. Este codigo nao existe em tb_tp_pend_empresa_internet. |
| Acao     | Verificar em tb_pendencia o significado do codigo 499. Documentar e parametrizar. |

---

## [ATENCAO] Typo em Coluna DS_OBERVACAO

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Tabelas  | TB_USUARIO_TITULAR_INTERNET, TB_USUARIO_DEPENDENTE_INTERNET               |
| Descricao| Coluna `DS_OBERVACAO` (faltando 'S') -- typo intencional preservado por compatibilidade |
| Acao     | Documentar para nao gerar confusao. Nao alterar sem avaliar impacto em todas as queries. |

---

## PR_CADASTRAMENTO_EMPRESA_PROV -- Pendencias

---

## [CRITICO] p_erro_controle := NULL no Handler de Erro

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A02 / RN23 / Smell S04                                        |
| Descricao| No handler WHEN OTHERS do bloco de inclusao, apos gravar pendencia e fazer ROLLBACK, a procedure executa `p_erro_controle := null`. Isso mascara completamente o erro para o chamador (PR_EFETIVA_INTERNET). O chamador pode interpretar o retorno NULL como sucesso. |
| Acao     | Revisar urgente com equipe tecnica. Definir codigo de retorno de erro distinto. |

---

## [CRITICO] Senha de Acesso Internet Derivada de cd_pessoa

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A05 / Smell S10                                               |
| Descricao| A senha de acesso internet da empresa e gerada como os ultimos 6 digitos do cd_pessoa. Se cd_pessoa for previsivel (gerado por sequence sem gap), a senha de qualquer empresa pode ser adivinhada. A senha tambem e enviada em email plaintext. |
| Acao     | Avaliar com equipe de seguranca; substituir por senha aleatoria criptograficamente segura |

---

## [ATENCAO] tp_operacao != '1' sem Tratamento

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A01 / RN02                                                    |
| Descricao| Toda a logica da procedure esta dentro de `IF tp_operacao = '1'`. Alteracao (='2') e exclusao (='3') resultam em execucao vazia sem erro ou aviso. |
| Acao     | Confirmar com PO se ha procedure separada para outros valores de tp_operacao |

---

## [ANS] fl_faixa_etaria_ans para Exatamente 100 Vidas

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A04 / ANS08 / RN15                                            |
| Descricao| Condicao `nu_total_empregado = 100` ativa fl_faixa_etaria_ans='S'. Empresas com 101+ vidas nao recebem o flag. Pode ser anomalia ou regra intencional. |
| Acao     | Confirmar com area regulatoria se criterio de 100 vidas e correto         |

---

## [ATENCAO] wfl_tabela_geral Ampliado por SACTI 449802

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A06 / RN12                                                    |
| Descricao| SACTI 449802 alterou a condicao de uso de tabela compartilhada de `cd_modelo_negocio = 2` para `cd_modelo_negocio != 1`, ampliando para todos os modelos nao-atacado. Pode afetar modelos que nao deveriam compartilhar tabela. |
| Acao     | Verificar todos os cd_modelo_negocio != 1 em producao e confirmar que devem todos compartilhar tabela |

---

## [ATENCAO] Valor Breakeven = 70 Hardcoded

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A07 / Smell S07                                               |
| Descricao| INSERT em tb_empresa_breakeven com valor fixo 70. Origem e significado do valor desconhecido. |
| Acao     | Confirmar com PO o significado operacional do breakeven = 70; parametrizar |

---

## [ATENCAO] dt_fim Fidelizacao = dt_inicio + 1000 Dias

| Campo    | Valor                                                                     |
|----------|---------------------------------------------------------------------------|
| Rotina   | PR_CADASTRAMENTO_EMPRESA_PROV                                             |
| Ref.     | Ambiguidade A08 / Smell S07                                               |
| Descricao| Data de fim de fidelizacao calculada como `dt_inicio + 1000` dias (hardcode). Regra de negocio ou placeholder? |
| Acao     | Confirmar com PO; substituir por parametro configuravel                   |
