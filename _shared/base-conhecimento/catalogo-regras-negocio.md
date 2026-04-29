# Catalogo de Regras de Negocio -- Transversais

> Atualizado em: 24/04/2026
> Fonte: Agentes DDD -- PR_EFETIVA_INTERNET + PK_VENDA_JSON + PR_CADASTRAMENTO_EMPRESA_PROV

Regras que aparecem em mais de uma rotina ou que sao candidatas a servicos compartilhados.
Regras exclusivas de uma rotina permanecem no artefato de engenharia reversa da mesma.

---

## RN-T00 -- Taxonomia de Proposta: TIPO vs ORIGEM (Regra Fundamental)

> Adicionada em: 24/04/2026 | Fonte: esclarecimento de negocio com PO | [REF DD-11]

**Rotinas afetadas:** PR_EFETIVA_INTERNET, PK_VENDA_JSON, PR_CADASTRAMENTO_EMPRESA_PROV (e todo artefato futuro)
**Descricao:** Toda proposta tem duas dimensoes ortogonais:
- **TIPO/PRODUTO** (PIM=SS, PME, Individual, Odonto): define porte, fluxo de negocio e precificacao. Derivado de `nu_total_empregado` e modelo de negocio.
- **ORIGEM/FERRAMENTA** (BITIX, WEBHAP, TAFFIX): define onde a proposta foi digitada. Campo tecnico: `cd_operados` com valores 'BITIX', 'WEBHAP', 'PONTO' respectivamente.

A rotina de efetivacao e escolhida pela ORIGEM, nunca pelo TIPO:
- `cd_operados='BITIX'` -> PK_VENDA_JSON
- `cd_operados IN ('WEBHAP','PONTO',...)` -> PR_EFETIVA_INTERNET

Propostas do mesmo tipo podem vir de diferentes origens e vice-versa.
**Evidencia:** _shared/dicionario-siglas.md secao 2, _shared/dicionario-dominio.md, decisoes-design.md DD-11, pendencias-abertas.md A10/A11.

---

## RN-T08 -- Dois produtores disjuntos de `fl_status_processamento='17'` por origem

> Adicionada em: 24/04/2026 | Fonte: esclarecimento de negocio (conflito 2 da analise comparativa reavaliado)

**Rotinas afetadas:** PR_EFETIVA_INTERNET (consumidor) + PK_VENDA_JSON (produtor BITIX) + Portal do Corretor Super Simples (produtor WEBHAP, externo ao escopo de refatoracao)
**Descricao:** O estado `fl_status_processamento='17'` ("beneficiario com divergencia Neoway") tem dois produtores disjuntos por origem, sem interferencia mutua:
- **Origem WEBHAP (`cd_operados='WEBHAP'`):** atribuido pelo Portal do Corretor Super Simples, ferramenta externa de digitacao. A atribuicao ocorre *antes* e *fora* do EI.
- **Origem BITIX (`cd_operados='BITIX'`):** atribuido por PR_VE_DIVERGENCIA_NEOWAY, chamada pelo VJ apenas na reintegracao de proposta com FL_STATUS=1 e parametro PK_VENDA_JSON_EXECUTA_NEOWAY='S' (RN-T07 / RN14).

Os dois caminhos atuam sobre particoes disjuntas (`cd_operados`). Nao ha fluxo cruzado entre contextos. No EI to-be (exclusivo WEBHAP/TAFFIX), apenas o primeiro produtor e relevante -- o EI continua consumindo o estado 17 como input externo.
**[ATENCAO]** Quem ler apenas o DDD do VJ pode concluir erroneamente que todo '17' vem de PR_VE_DIVERGENCIA_NEOWAY. Adicionar nota em BC-EI-07 e VJ RN14 explicitando a disjuncao por origem.
**Evidencia:** _shared/analise-comparativa-ddd-ei-vj.md Conflito 2; pendencias-abertas.md A2 (rebaixada para BAIXA); ddd-modelagem-dominio EI BC-EI-07.

---

## RN-T09 -- Particionamento logico de tabelas de staging por `cd_operados`

> Adicionada em: 24/04/2026 | Fonte: reavaliacao do Conflito 1 da analise comparativa

**Rotinas afetadas:** PR_EFETIVA_INTERNET + PK_VENDA_JSON
**Tabelas:** TB_EMPRESA_INTERNET, TB_ODON_EMPRESA_INTERNET, TB_PENDENCIA_EMPRESA_INTERNET, TB_USUARIO_CRITICA_INTERNET, TB_USUARIO_TITULAR_INTERNET, TB_USUARIO_DEPENDENTE_INTERNET
**Descricao:** As tabelas de staging sao fisicamente compartilhadas entre EI e VJ, mas logicamente particionadas por `cd_operados`: EI grava/atualiza linhas com `cd_operados IN ('WEBHAP','PONTO',...)` e VJ grava/atualiza linhas com `cd_operados='BITIX'`. Nao ha transacao compartilhada. E legitimo que cada Bounded Context modele essas tabelas de forma diferente (ARs distintos, invariantes distintas) -- esse e padrao esperado em DDD quando ha particionamento disjunto.
**Implicacao:** `TB_PROPOSTA_VENDA` e caso especial -- populada exclusivamente pela origem BITIX (EI tera as 2 operacoes residuais removidas no to-be; AG07/R12 removidos do DDD EI). [REF DD-05, A-TO-BE-02]

---

## RN-T10 -- Unificacao de coligadas em `TB_EMPRESA_COLIGADA` (SIGO + BITIX)

> Adicionada em: 24/04/2026 | Fonte: esclarecimento de negocio do PO (Conflito 8 da analise comparativa)

**Rotinas afetadas:** PR_EFETIVA_INTERNET (chama) + PK_VENDA_JSON (popula TB_EMPRESA_COLIGADA_BITX) + PR_COLIGA_EMPRESA_BITIX (unificador)
**Tabelas:** TB_EMPRESA_COLIGADA (canonica), TB_EMPRESA_COLIGADA_BITX (staging BITIX)

**Descricao:** `TB_EMPRESA_COLIGADA` e a **tabela canonica unica** de coligadas do SIGO -- independentemente da origem da proposta (WEBHAP, TAFFIX/PONTO ou BITIX), toda empresa que faz parte de um grupo empresarial e registrada em TB_EMPRESA_COLIGADA. A tabela `TB_EMPRESA_COLIGADA_BITX` e apenas o **staging de coligadas da origem BITIX**, populada pelo VJ durante a integracao JSON. A procedure `PR_COLIGA_EMPRESA_BITIX` e responsavel por **transferir** as coligadas BITIX do staging `TB_EMPRESA_COLIGADA_BITX` para a tabela canonica `TB_EMPRESA_COLIGADA`, eliminando a dualidade estrutural.

**Fluxo de dados:**
1. VJ integra proposta BITIX e grava grupo empresarial em `TB_EMPRESA_COLIGADA_BITX` (staging).
2. `PR_COLIGA_EMPRESA_BITIX` le `TB_EMPRESA_COLIGADA_BITX` e registra as empresas correspondentes em `TB_EMPRESA_COLIGADA` (canonica).
3. Downstream (ex.: pr_processa_empresa_coligada, validacoes de grupo) opera sempre sobre `TB_EMPRESA_COLIGADA`.

**Implicacoes:**
- Nao existe coligada BITIX "fora" de `TB_EMPRESA_COLIGADA` apos execucao de PR_COLIGA_EMPRESA_BITIX -- as duas tabelas nao sao hierarquias paralelas.
- `TB_EMPRESA_COLIGADA_BITX` e **staging descartavel/auxiliar**, nao estrutura de negocio de longo prazo.
- Agregado canonico de grupo empresarial e modelado sobre `TB_EMPRESA_COLIGADA`, tanto no EI quanto em futura migracao.
- No TO-BE EI (sem BITIX), a refatoracao do EI continua operando **apenas** sobre `TB_EMPRESA_COLIGADA`. A chamada a `PR_COLIGA_EMPRESA_BITIX` migra para o scheduler do VJ (ja previsto em MIG-16/A-TO-BE-02), mas o resultado da migracao continua sendo linhas em `TB_EMPRESA_COLIGADA`.
**[MIGRACAO]** No microsservico, a transferencia staging->canonica sera implementada como Domain Event (`hap-ins-bitix-affiliated-group-unified`) consumido pelo servico de Coligadas -- eliminando a procedure intermediaria.

**Evidencia:** Esclarecimento do PO em 24/04/2026; catalogo-objetos-plsql.md (PR_COLIGA_EMPRESA_BITIX); DDD EI BC-EI-14 e DS13a; DDD VJ dependencias externas.
**Evidencia:** analise-comparativa-ddd-ei-vj.md secao 3 (Conflito 1 rebaixado para MEDIA); catalogo-tabelas.md TB_PROPOSTA_VENDA.

---

## RN-T01 -- Contrato de retorno fragil: parsing de string de pr_cadastramento_empresa_prov

**Rotinas afetadas:** PR_EFETIVA_INTERNET (S11), PK_VENDA_JSON (S03 / RN05)
**Descricao:** Ambas as rotinas extraem o cd_empresa definitivo fazendo `substr(w_erro, instr(w_erro,',')+1)`.
Se a string retornada por pr_cadastramento_empresa_prov nao contiver virgula, l_emp = NULL e a
efetivacao falha silenciosamente sem nenhuma notificacao.
**Risco:** Critico -- empresa nao efetivada sem aviso.
**Solucao TO-BE:** Contrato tipado com parametros OUT separados: p_cd_empresa OUT VARCHAR2, p_status OUT NUMBER.
**Evidencia:** reversa-pk-venda-json.md RN05, reversa-pr-efetiva-internet.md S11.

---

## RN-T02 -- Motor de criticas com efeito colateral de escrita

**Rotina afetada:** PK_VENDA_JSON.fn_get_criticas_pendencias (S12 / RN04)
**Descricao:** A funcao fn_get_criticas_pendencias, quando chamada com p_valida_nao_coligada='S',
executa UPDATE TB_PROPOSTA_VENDA fl_status=9 como efeito colateral. Uma funcao de leitura nao
deve ter efeito colateral de escrita -- viola CQS (Command-Query Separation).
**Risco:** Alto -- updates nao intencionais quando a funcao e chamada apenas para leitura.
**Solucao TO-BE:** Separar em MotorCriticasQuery (funcao: apenas retorna count) + AplicarStatusErroCommand (procedure: aplica o UPDATE).
**Evidencia:** reversa-pk-venda-json.md S12, RN04.

---

## RN-T03 -- Logica de status final duplicada (PRE vs POS)

**Rotinas afetadas:** PK_VENDA_JSON -- pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp (S02/S07)
**Descricao:** A decisao de atribuir FL_STATUS=7 (PRE ou POS com ressalva) ou FL_STATUS=10 (POS caminho feliz)
e replicada identicamente nas tres rotinas de efetivacao do package. Qualquer correcao ou alteracao
de regra precisa ser aplicada em tres lugares.
**Logica:** fn_get_confopera_emp=0 -> status=7. fn_get_confopera_emp=1 E sem fluxos 7/17/99 -> status=10.
**Solucao TO-BE:** Extrair para StatusFinalService.decidir(nu_controle, origem) como servico privado central.
**Evidencia:** reversa-pk-venda-json.md S02, S07, RN07.

---

## RN-T04 -- Excecoes silenciosas (WHEN OTHERS THEN NULL)

**Rotinas afetadas:** PR_EFETIVA_INTERNET (50+ ocorrencias), PK_VENDA_JSON (pr_pim_pendencia, fn_get_criticas_pendencias)
**Descricao:** Excecoes engoliadas sem log impossibilitam diagnostico de falha em producao.
Caso critico em PK_VENDA_JSON: fn_get_criticas_pendencias com WHEN OTHERS -> v_retorno:=0 pode
efetivar empresa com beneficiarios que nao passaram pelas validacoes ANS.
**Risco:** [ANS] Critico -- empresa efetivada sem validacoes obrigatorias mascaradas por excecao silenciosa.
**Solucao TO-BE:** Log estruturado obrigatorio; reraise seletivo para excecoes criticas.
**Evidencia:** reversa-pk-venda-json.md S01, A09. reversa-pr-efetiva-internet.md PADRAO-01.

---

## RN-T05 -- Estado global de package (variaveis de package mutaveis)

**Rotina afetada:** PK_VENDA_JSON (S04 / 15 variaveis globais na spec)
**Descricao:** G_PROVISORIO, G_PROPOSTA, G_STATUS_PROPOSTA, G_COD_TITULAR e outras 11 variaveis
sao declaradas na spec do package, compartilhadas entre chamadas distintas. Em execucao concorrente
(JOB + chamada BITIX simultanea), o estado pode ser corrompido entre sessoes Oracle distintas.
**Risco:** Critico -- corrupcao de dados em ambiente de alta concorrencia.
**Solucao TO-BE:** Converter todas para variaveis locais das procedures que as usam; passar por parametro quando necessario entre rotinas privadas.
**Evidencia:** reversa-pk-venda-json.md S04.

---

## RN-T06 -- Fluxo Venda Administrativa (ADM): identificacao, carencia e alto risco

> Adicionado em: 24/04/2026 | Fonte: Modelagem DDD PK_VENDA_JSON (adendo ADM)

**Rotina afetada:** PK_VENDA_JSON -- pr_pim_insere_cnpj + pr_set_usuario_internet
**Descricao:** Propostas de venda ADM sao identificadas pelo campo JSON "CD_EMP_ANTERIOR". Quando presente, o fluxo de staging diverge:
- Beneficiarios com historico (V_CD_USU_ANT_TITULAR IS NOT NULL) recebem CD_CONVENIO=542 (recuperacao de carencia) e DT_ULTIMO_BOLETO_CONVENIO e ajustada.
- Beneficiarios marcados como Devolucao ADM (DEVOLUCAO_TIT_ADM='S') sem deliberacao (FL_DELIBERACAO=0) bloqueiam a proposta em FL_STATUS=3 (AGUARDANDO_ADM).
- A logica esta inteiramente inline em pr_set_usuario_internet, sem isolamento como servico.
**[ANS]** Recuperacao de carencia sem nova declaracao de saude pode violar RN195/2009. Deliberacao de alto risco sem rastro auditavel e risco regulatorio.
**Solucao TO-BE:** Extrair VendaAdmService como Domain Service isolado. Substituir CD_CONVENIO=542 por constante nomeada. Criar log auditavel de deliberacao de alto risco ADM.
**Evidencia:** ddd-modelagem-dominio.md (PK_VENDA_JSON) Secao 13 -- RN17, RN18, RN19, RN20, RN21, RN22.

---

## RN-T07 -- Validacao Neoway BITIX: divergencia cadastral pos-devolucao e desvio de fluxo POSBAIXA

> Adicionado em: 29/04/2026 | Fonte: Eng. Reversa PK_VENDA_JSON (RN14, RN14b)

**Rotina afetada:** PK_VENDA_JSON -- pr_pim_insere_cnpj + fn_get_pend_neoway + fn_get_criticas_pendencias
**Descricao:** Propostas BITIX reintegradas (FL_STATUS=1) com o parametro PK_VENDA_JSON_EXECUTA_NEOWAY='S' passam por validacao Neoway. A rotina externa PR_VE_DIVERGENCIA_NEOWAY seta fl_status_processamento='17' nos beneficiarios com divergencia cadastral. Quando detectada:
- A auto-baixa POSBAIXA e bloqueada (fn_get_pend_neoway=1).
- O fluxo 17 e registrado em TB_PIM_FLUXO_POS.
- O status final da proposta POSBAIXA e forcado para 7 (com ressalva) em vez de 10 (caminho feliz).
- CD_PENDENCIA=12 ("EMPRESA COM CONTROLE EM DIVERGENCIA COM A NEOWAY") e contabilizado no motor de criticas modo 'E'.
**[CRITICO] Falha silenciosa:** A chamada a PR_VE_DIVERGENCIA_NEOWAY tem WHEN OTHERS THEN NULL. Se a procedure falhar, a proposta prossegue sem validacao Neoway sem nenhum aviso.
**[ATENCAO]** PR_VE_DIVERGENCIA_NEOWAY NAO e chamada na integracao inicial -- somente em reintegracao de FL_STATUS=1. Propostas novas NAO passam por Neoway na primeira tentativa.
**Solucao TO-BE:** Extrair NeowayValidacaoService como Domain Service isolado. Substituir WHEN OTHERS THEN NULL por log estruturado + reraise seletivo. Documentar e catalogar PR_VE_DIVERGENCIA_NEOWAY como rotina de eng. reversa propria.
**Evidencia:** reversa-pk-venda-json.md RN14, RN14b; ddd-modelagem-dominio.md Secao 4 (NeowayValidacaoService), Secao 5 (BeneficiarioComDivergenciaNeoway, PropostaBloqueadaNeoway).

---

## PR_CADASTRAMENTO_EMPRESA_PROV -- Regras de Negocio Criticas (BC-CAD)

### RN-CAD-01 -- Validacao de Vendedor Ativo e Lista Negra
**BC:** BC-CAD-02 (ValidacaoPropostaService)
**Descricao:** O vendedor (cd_vendedor da proposta) deve estar ATIVO e nao constar na lista negra (fn_lista_negra). Se inativo ou restrito, a proposta e rejeitada com mensagem especifica.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-02, RN01.

### RN-CAD-02 -- Validacao de Documento Fiscal (CNPJ/CPF/CAEPF)
**BC:** BC-CAD-02
**Descricao:** O documento fiscal da empresa deve ser valido via algoritmo de verificacao (fn_verifica_cnpj ou equivalente). Aceita CNPJ (14 digitos), CPF (11 digitos) e CAEPF. Documento invalido bloqueia o cadastramento.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-02, RN04.

### RN-CAD-03 -- Resolucao de Filial (Hierarquia de 3 Niveis)
**BC:** BC-CAD-03 (IdentificacaoContratualService)
**Descricao:** A filial responsavel pelo contrato e resolvida pela hierarquia: cd_filial_proposta -> cd_filial_operadora -> filial default da operadora. Tres tentativas em cascata.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-03, RN05.

### RN-CAD-04 -- Calculo de Flag Faixa Etaria ANS (RN195)
**BC:** BC-CAD-06 (RegulatoryANSService)
**Descricao:** v_fl_faixa_ans = 'S' se o plano contratado aplica faixas etarias conforme RN195 da ANS. Calculado via fn_faixa_etaria_ans. Impacta a tabela de precos selecionada.
**[ANS]** Regra regulatoria critica -- erro impacta precificacao e compliance ANS.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-06, RN14.

### RN-CAD-05 -- Tabela de Inativos RN279/309
**BC:** BC-CAD-06
**Descricao:** Para planos com cobertura de inativos (RN279/RN309), uma tabela de precos especifica de inativos e criada/vinculada ao contrato. Percentuais por faixa etaria definidos pela normativa ANS.
**[ANS]** Regra regulatoria critica.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-06, RN13.

### RN-CAD-06 -- Geracao de Acesso Internet com Senha Segura
**BC:** BC-CAD-10 (AcessoInternetService)
**Descricao:** Acesso ao portal da empresa e criado em tb_acesso_internet com senha gerada aleatoriamente (TO-BE). Servicos de controle 7, 12, 14, 16 sao vinculados ao acesso. Titulares e dependentes sao vinculados ao acesso da empresa.
**[CRITICO] AS-IS:** Senha derivada deterministicamente de lcd_pessoa -- vulnerabilidade de seguranca.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-10, DD-CAD-05.

### RN-CAD-07 -- Email de Boas-Vindas sem Dados Sensiveis (TO-BE)
**BC:** BC-CAD-11 (NotificacaoService)
**Descricao:** Email de boas-vindas enviado apos sucesso do cadastramento. TO-BE: sem CNPJ ou senha no corpo. Link de primeiro acesso com token de uso unico (TTL 24h).
**[CRITICO] AS-IS:** CNPJ + senha em plaintext no corpo do email -- violacao de seguranca e privacidade.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-11, DD-CAD-06.

### RN-CAD-08 -- Integracao Odonto Super Simples (RN condicional)
**BC:** BC-CAD-12 (OdontoImplantacaoService)
**Descricao:** Se empresa nao possui plano odonto contratado E parametro 225 esta ativo, o sistema chama pr_vcc_empresa_super_simples para replicar o contrato no modulo odonto automaticamente.
**Evidencia:** ddd-modelagem-dominio.md BC-CAD-12, RN23.
