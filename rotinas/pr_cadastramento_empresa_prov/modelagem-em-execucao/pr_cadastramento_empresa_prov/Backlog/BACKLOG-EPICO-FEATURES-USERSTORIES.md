# Backlog � Refatora��o DDD: pr_cadastramento_empresa_prov

> **Produto:** SIGO Health � Gest�o de Contratos Empresariais PJ  
> **�pico:** Refatora��o e Moderniza��o do Cadastramento de Empresa Conveniada  
> **Procedure legada:** `humaster.pr_cadastramento_empresa_prov` (~5.000 linhas PL/SQL)  
> **Estrat�gia:** Strangler Fig Pattern (4 fases incrementais)  
> **Data de cria��o:** 2026-02-23  
> **Refer�ncias:** `ddd-modelagem-dominio.md`, `README-refatoracao.md`, `FASE1..5_DETALHAMENTO_TECNICO.md`

---

## Sum�rio

1. [�pico](#epico)
2. [Feature 01 � Funda��o e Quick Wins PL/SQL](#feature-01)
3. [Feature 02 � Extra��o de Packages Supporting/Generic](#feature-02)
4. [Feature 03 � Extra��o de Packages Core Domain](#feature-03)
5. [Feature 04 � Orquestrador Limpo (Procedure Refatorada)](#feature-04)
6. [Feature 05 � Funda��o Cloud-Native (.NET 8 + React)](#feature-05)
7. [Feature 06 � API de Autentica��o e Acesso](#feature-06)
8. [Feature 07 � API de Propostas e Dashboard](#feature-07)
9. [Feature 08 � API de Efetiva��o (Baixa de Contrato PJ)](#feature-08)
10. [Feature 09 � Integra��es, Relat�rios e Observabilidade](#feature-09)
11. [Feature 10 � Homologa��o, UAT e Go-Live](#feature-10)
12. [Vis�o Geral do Backlog (Roadmap)](#roadmap)
13. [Crit�rios de Prioriza��o](#priorizacao)
14. [Definition of Ready / Definition of Done](#dor-dod)

---

<a id="epico"></a>
## ??? �PICO

### EP-01: Refatora��o e Moderniza��o do Cadastramento de Empresa Conveniada

| Campo | Valor |
|-------|-------|
| **T�tulo** | Refatorar e modernizar a procedure `pr_cadastramento_empresa_prov` utilizando DDD, decomposi��o em packages PL/SQL e posterior migra��o para microservi�os .NET 8 |
| **Objetivo de Neg�cio** | Reduzir o risco operacional, eliminar c�digo monol�tico de 5.000 linhas, melhorar a manutenibilidade e preparar o sistema para escalar na nuvem Azure |
| **Valor Entregue** | � Redu��o de 80% no tempo de manuten��o corretiva<br>� Elimina��o de ~360 linhas de boilerplate repetido<br>� Testabilidade unit�ria (0% ? 70% coverage no Domain)<br>� Rastreabilidade de erros (Application Insights)<br>� Deploys independentes por bounded context<br>� Autonomia da equipe para evoluir funcionalidades sem risco de regress�o |
| **KPIs** | � Tempo m�dio de corre��o de bug: de 3 dias ? 4h<br>� Incidentes em produ��o: reduzir 60%<br>� Coverage de testes no Domain: ? 70%<br>� Response time p95 da API: < 1s<br>� Disponibilidade: 99.5% |
| **Stakeholders** | PO Comercial, Tech Lead, Arquiteto, DBA, Equipe de Vendas (TAFFIX/BITIX) |
| **Bounded Contexts** | 18 (BC-01 a BC-18) |
| **Aggregates** | 9 |
| **Tabelas impactadas** | 47 (escrita) + 37 (leitura) |
| **Estrat�gia** | Strangler Fig Pattern � Fases incrementais sem big-bang |

**Hip�tese de valor:**  
> "Se decompormos a procedure monol�tica de 5.000 linhas em packages PL/SQL isolados por bounded context (Fase 1-3) e posteriormente em microservi�os .NET 8 (Fase 4-5), ent�o reduziremos o risco operacional, permitiremos deploys independentes e aumentaremos a velocidade de entrega de novas funcionalidades."

---

<a id="feature-01"></a>
## 🔧 FEATURE 01 � Funda��o e Quick Wins (PL/SQL)

> **Fase:** 1 � Quick Wins  
> **Prioridade:** P0 (Primeiras semanas)  
> **Risco:** 🟢 Baixo  
> **Impacto:** Elimina ~360 linhas de boilerplate, unifica cursors duplicados, cria base de testes

### US-01.01 � Extrair log gen�rico para package de auditoria

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor/DBA |
| **Quero** | que os 30+ blocos de log repetidos (12 linhas cada) sejam substitu�dos por uma chamada �nica a `pk_log_auditoria.pr_registra_erro` |
| **Para que** | eu elimine ~360 linhas de boilerplate e centralize a l�gica de auditoria em um �nico ponto, facilitando manuten��o e rastreabilidade |
| **BC** | BC-14 (Auditoria e Log) |
| **Package alvo** | `pk_log_auditoria` |
| **Crit�rios de aceite** | <ul><li>Package `pk_log_auditoria` criado com spec + body</li><li>Procedure `pr_registra_erro(p_nu_controle, p_nu_controle_odonto, p_mensagem)` funcional</li><li>Todos os 30+ blocos de log na procedure original substitu�dos pela chamada</li><li>Inser��o em `tb_log_baixa_controle` mant�m comportamento id�ntico</li><li>`raise_application_error` continua sendo disparado ap�s o log</li><li>Testes unit�rios cobrindo cen�rios: log com odonto, log sem odonto, sequ�ncia de `cd_log`</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | Nenhuma |

---

### US-01.02 � Unificar cursors duplicados (cr_empresa_neg / cr_empresa_neg_bitix)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que os cursors `cr_empresa_neg` e `cr_empresa_neg_bitix` (que s�o id�nticos) sejam unificados em um �nico cursor parametrizado |
| **Para que** | eu elimine duplica��o de c�digo e reduza a superf�cie de manuten��o quando a query de modelo de neg�cio precisar ser alterada |
| **BC** | BC-06 (Modelo de Neg�cio) |
| **Crit�rios de aceite** | <ul><li>Cursor �nico `cr_modelo_negocio(p_origem VARCHAR2)` criado</li><li>Par�metro `p_origem` diferencia SIGO vs BITIX quando necess�rio</li><li>Todos os pontos de uso substitu�dos</li><li>Teste de regress�o: resultado id�ntico para propostas SIGO e BITIX</li></ul> |
| **Estimativa** | 2 pts |
| **Depend�ncias** | Nenhuma |

---

### US-01.03 � Extrair valida��es para package pk_validacao_proposta

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que as ~30 valida��es inline (linhas 280-960 da procedure) sejam extra�das para fun��es booleanas puras em `pk_validacao_proposta` |
| **Para que** | cada valida��o seja test�vel isoladamente e novas valida��es possam ser adicionadas sem impactar o corpo principal da procedure |
| **BC** | BC-02 (Valida��o de Proposta) |
| **Package alvo** | `pk_validacao_proposta` |
| **Crit�rios de aceite** | <ul><li>Package `pk_validacao_proposta` criado (~300 linhas)</li><li>Fun��es booleanas para cada Specification (SP01..SP21): `fn_cnpj_valido`, `fn_vendedor_ativo`, `fn_cep_valido`, etc.</li><li>Procedure `pr_valida_proposta_completa` que orquestra todas as valida��es com fail-fast</li><li>Valida��o de CNPJ contra lista negra (`tb_pessoa_lista_negra`)</li><li>Valida��o de CAEPF via `fn_check_caepf`</li><li>Valida��o de natureza jur�dica com vig�ncia m�nima (6 meses)</li><li>Testes unit�rios para cada valida��o (~21 cen�rios)</li><li>Procedure original chama `pk_validacao_proposta.pr_valida_proposta_completa` no lugar do bloco inline</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-01.01 (usa `pk_log_auditoria` para log de erro) |

---

### US-01.04 � Criar estrutura de testes unit�rios PL/SQL

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que exista um framework de testes unit�rios PL/SQL (utPLSQL) configurado com scripts de setup/teardown |
| **Para que** | todos os packages extra�dos possam ter testes automatizados executados no pipeline CI |
| **Crit�rios de aceite** | <ul><li>utPLSQL instalado no schema de testes</li><li>Template de teste criado (`test_pk_<nome>.sql`)</li><li>Script de execu��o de testes no pipeline (`azure-pipelines.yaml`)</li><li>Dados de teste isolados (schema separado ou rollback)</li><li>Relat�rio de cobertura gerado</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | Nenhuma |

---

<a id="feature-02"></a>
## 📦 FEATURE 02 � Extra��o de Packages Supporting/Generic (BCs de Suporte)

> **Fase:** 2 � Extra��o (Prioridades P1 e P4)  
> **Risco:** ?? M�dio  
> **Impacto:** Isola dom�nios de suporte, reduz acoplamento

### US-02.01 � Extrair pk_filial_area_venda (BC-05)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de resolu��o de filial (vendedor ? �rea de venda ? filial, com overrides por `cd_filial_contrato` e TAFFIX `filial_modelo`) seja extra�da para `pk_filial_area_venda` |
| **Para que** | a determina��o de filial seja reutiliz�vel e test�vel independentemente |
| **BC** | BC-05 (Filial e �rea de Venda) |
| **Package alvo** | `pk_filial_area_venda` (~80 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_resolve_filial(p_st_e IN cursor_type, p_ctx IN OUT t_contexto)` funcional</li><li>Override por `cd_filial_contrato` (Sacti 1026849) implementado</li><li>Override por `filial_modelo` (tela TAFFIX) implementado</li><li>Recupera��o de `cd_empresa_plano` da filial</li><li>Testes para: vendedor com �rea v�lida, override filial_contrato, override TAFFIX</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | US-01.01 |

---

### US-02.02 � Extrair pk_pessoa_juridica (BC-03)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de cria��o/atualiza��o de pessoa jur�dica em `tb_pessoa` seja extra�da para `pk_pessoa_juridica` |
| **Para que** | o CRUD de PJ com valida��o de CNPJ, gera��o de `cd_pessoa` e resolu��o de `cd_empresa_plano` fique isolado |
| **BC** | BC-03 (Pessoa Jur�dica) |
| **Package alvo** | `pk_pessoa_juridica` (~100 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_cria_ou_atualiza(p_st_e, p_ctx)` funcional</li><li>INSERT quando pessoa n�o existe (CNPJ novo)</li><li>UPDATE quando pessoa j� existe</li><li>Gera��o de `cd_pessoa` via `sq_pessoa.nextval + fn_digito_out`</li><li>Determina��o de `fl_tipo_pessoa` via `fn_check_cic` (CPF=1, CNPJ=2)</li><li>Testes para: PJ nova, PJ existente (update), CNPJ com empresa_plano diferente</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | US-01.01, US-01.03 |

---

### US-02.03 � Extrair pk_endereco_comunicacao (BC-04)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de cadastro de endere�o, contatos e meios de comunica��o seja extra�da para `pk_endereco_comunicacao` |
| **Para que** | a cria��o de endere�o de correspond�ncia, vincula��o � empresa, cadastro de telefone/fax/celular/email fique isolada e reutiliz�vel |
| **BC** | BC-04 (Endere�o e Comunica��o) |
| **Package alvo** | `pk_endereco_comunicacao` (~200 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_cadastra(p_st_e, p_ctx)` funcional</li><li>Tratamento especial AFFIX (reutiliza endere�o existente)</li><li>Cadastro de meios de comunica��o por tipo (1=tel, 3=fax, 4=telex, 5,8=cel, 6=bip, 7=cx postal, 9=email)</li><li>Celular cria 2 registros (tipo 5 e tipo 8)</li><li>Valida��o de CEP contra `tb_cep_logradouro` e `tb_cep_localidade`</li><li>Testes para: endere�o completo, empresa AFFIX, todos os tipos de meio de comunica��o</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-02.02 |

---

### US-02.04 � Extrair pk_acesso_internet (BC-12)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de cria��o de acesso internet (login/senha para portal da empresa) seja extra�da para `pk_acesso_internet` |
| **Para que** | a cria��o de credenciais, controles de servi�o (7, 12, 14, 16) e limites de acesso fique isolada |
| **BC** | BC-12 (Acesso Internet / Portal) |
| **Package alvo** | `pk_acesso_internet` (~150 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>Gera��o de senha via `pk_administracao.fn_encripta(substr(cd_pessoa, -6))`</li><li>Cria��o de `tb_acesso_internet` com `cd_tipo_acesso = 5`</li><li>Cria��o de controles para servi�os 7, 12, 14, 16 em `tb_controle_internet`</li><li>Dia limite: pagamento dia 5 ? limite 10 para servi�o 7; sen�o 15</li><li>Tratamento AFFIX: copia limites de `tb_emp_limite_acesso_contra`</li><li>Testes para: acesso normal, acesso AFFIX, dia limite dia 5, dia limite outro</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-02.02 |

---

### US-02.05 � Extrair pk_fidelizacao (BC-11)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de fideliza��o contratual seja extra�da para `pk_fidelizacao` |
| **Para que** | a cria��o de registros de perman�ncia m�nima para canal Middle (30-99 vidas) fique isolada |
| **BC** | BC-11 (Fideliza��o Contratual) |
| **Package alvo** | `pk_fidelizacao` (~30 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>S� cria para `canal_venda = 2` (Middle)</li><li>Exclui `fl_atendimento = 4` (odontologia)</li><li>`dt_fim = dt_inicio + 1000` dias</li><li>Dados v�m de `tb_empresa_neg_fidelizacao`</li><li>Testes para: canal 2 (cria), canal 1 (n�o cria), canal null (n�o cria)</li></ul> |
| **Estimativa** | 2 pts |
| **Depend�ncias** | Nenhuma |

---

### US-02.06 � Extrair pk_reembolso (BC-15)

| Campo | Valor | 
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de configura��o de reembolso/livre escolha seja extra�da para `pk_reembolso` |
| **Para que** | a c�pia de parametriza��o de reembolso do plano para a empresa (4 sub-tabelas) fique isolada |
| **BC** | BC-15 (Reembolso / Livre Escolha) |
| **Package alvo** | `pk_reembolso` (~100 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>S� executa para planos com livre escolha (`fn_plano_livre_escolha = 'S'`)</li><li>DELETE + INSERT (idempotente) em 4 tabelas: `tb_reemb_empresa_prazo_pag`, `tb_reemb_empresa_prazo_pag_tip`, `tb_reemb_empresa_tabela`, `tb_reemb_empresa_composicao`</li><li>Dados originais de `tb_reemb_plano_*`</li><li>Testes para: plano com livre escolha, plano sem livre escolha, idempot�ncia</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | Nenhuma |

---

### US-02.07 � Extrair pk_minimo_contratual (BC-16)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de m�nimo contratual e breakeven seja extra�da para `pk_minimo_contratual` |
| **Para que** | a cria��o de m�nimo contratual (quando par�metro existe) e breakeven padr�o (70%) fique isolada |
| **BC** | BC-16 (M�nimo Contratual e Breakeven) |
| **Package alvo** | `pk_minimo_contratual` (~50 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>Busca em `tb_param_minimo_contratual` onde `cd_ativo = 'S'` e vig�ncia abrange `dt_inicio`</li><li>Se NO_DATA_FOUND: n�o cria (� opcional)</li><li>Breakeven padr�o 70% em `tb_empresa_breakeven`</li><li>Testes para: par�metro existente, par�metro inexistente, breakeven criado</li></ul> |
| **Estimativa** | 2 pts |
| **Depend�ncias** | Nenhuma |

---

### US-02.08 � Extrair pk_notificacao_email (BC-17)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de envio de e-mail de efetiva��o seja extra�da para `pk_notificacao_email` |
| **Para que** | o envio de notifica��o (diferenciando Hapvida vs RN Sa�de) fique isolado e substitu�vel por servi�o cloud no futuro |
| **BC** | BC-17 (Notifica��o) |
| **Package alvo** | `pk_notificacao_email` (~60 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_envia_efetivacao(p_ctx)` funcional</li><li>Diferencia Hapvida (`pr_send_mail`) vs RN Sa�de (`pr_send_mail_html_rn`)</li><li>Executa p�s-COMMIT (n�o bloqueia fluxo principal)</li><li>Falha de e-mail n�o causa rollback do contrato</li><li>Testes para: envio Hapvida, envio RN Sa�de, falha de envio (sem impacto)</li></ul> |
| **Estimativa** | 2 pts |
| **Depend�ncias** | Nenhuma |

---

### US-02.09 � Extrair pk_desconto_pim (BC-18)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de desconto PIM/ADM seja extra�da para `pk_desconto_pim` |
| **Para que** | a aplica��o de descontos administrativos (`FL_ATIVA_PIM_ADM = 'S'`) fique isolada |
| **BC** | BC-18 (Desconto e PIM) |
| **Package alvo** | `pk_desconto_pim` (~50 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_aplica_desconto(p_ctx)` funcional</li><li>S� executa quando `FL_ATIVA_PIM_ADM = 'S'`</li><li>Chama `pr_desconto_empresa` com par�metros corretos</li><li>Testes para: flag ativa, flag inativa</li></ul> |
| **Estimativa** | 2 pts |
| **Depend�ncias** | Nenhuma |

---

### US-02.10 � Extrair pk_integracao_odonto (BC-13)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de integra��o odontol�gica (espelhamento + super simples) seja extra�da para `pk_integracao_odonto` com Anti-Corruption Layer |
| **Para que** | as chamadas a procedures odonto (`pr_odon_param_esp_empresa`, `Pr_Vcc_Empresa_Super_Simples`) fiquem isoladas atr�s de uma ACL, protegendo o dom�nio de sa�de |
| **BC** | BC-13 (Integra��o Odontol�gica) |
| **Package alvo** | `pk_integracao_odonto` (~80 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_integra(p_ctx)` funcional</li><li>Espelhamento: executa quando par�metro 225 = 1 em `tb_odon_param_esp_operadora`</li><li>Super simples: executa para empresas sem controle odonto</li><li>Executa p�s-COMMIT</li><li>Falha de integra��o odonto n�o causa rollback do contrato de sa�de</li><li>ACL implementada: dom�nio sa�de n�o conhece estruturas internas do odonto</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | Nenhuma |

---

<a id="feature-03"></a>
## 🎯 FEATURE 03 � Extra��o de Packages Core Domain

> **Fase:** 2 � Extra��o (Prioridades P2 e P3)  
> **Risco:** 🔴 Alto  
> **Impacto:** Isola a l�gica de neg�cio mais cr�tica e complexa

### US-03.01 � Extrair pk_modelo_negocio (BC-06)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de resolu��o de modelo de neg�cio (par�metros comerciais por filial + natureza + faixa de empregados) seja extra�da para `pk_modelo_negocio` |
| **Para que** | a parametriza��o comercial com l�gica de coligada (soma de empregados do grupo) e Strategy SIGO/BITIX fique isolada e test�vel |
| **BC** | BC-06 (Modelo de Neg�cio) |
| **Package alvo** | `pk_modelo_negocio` (~150 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_resolve_parametros(p_st_e, p_ctx)` funcional</li><li>Cursor unificado (resultado de US-01.02) com Strategy para SIGO/BITIX</li><li>Resolu��o de coligada: soma empregados de todas as empresas do grupo</li><li>Carga de `tb_empresa_neg` com todas as 15 tabelas filhas (tabela, desconto, franquia, fator, controle, car�ncia, grupo, m�dulo, fideliza��o, isen��o, plano esp.)</li><li>Testes para: empresa individual, empresa coligada SIGO, empresa coligada BITIX, sem modelo encontrado</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-01.02, US-02.01 |

---

### US-03.02 � Extrair pk_precificacao (BC-07)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de cria��o de tabela de pre�o (geral + agregados, valores por plano/faixa et�ria, descontos e franquias) seja extra�da para `pk_precificacao` |
| **Para que** | a precifica��o � que impacta diretamente o faturamento � fique isolada com valida��es e testes rigorosos |
| **BC** | BC-07 (Precifica��o) |
| **Package alvo** | `pk_precificacao` (~250 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_cria_tabelas_preco(p_st_e, p_ctx)` funcional</li><li>Cria��o de `tb_preco_plano` geral e agregados (`fl_tipo_tabela = 2`)</li><li>C�pia de valores de `tb_empresa_neg_tabela` para `tb_valor_plano`</li><li>Normaliza��o de faixa et�ria por `tipo_faixa` p�s-insert</li><li>Aplica��o de descontos (`tb_desconto_preco_plano`)</li><li>Aplica��o de franquias (`tb_parametro_franquia`)</li><li>Filtro: `fl_status != 3` e `fl_coparticipacao != 'S'`</li><li>Testes para: tabela geral, tabela agregado, com descontos, com franquias, sem registros de neg�cio</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-03.01 |

---

### US-03.03 � Extrair pk_empresa_conveniada (BC-08)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de cria��o da empresa conveniada (aggregate root central, ~60 colunas, ~400 linhas) seja extra�da para `pk_empresa_conveniada` |
| **Para que** | o aggregate root mais importante do dom�nio � que representa o contrato efetivado � fique isolado com todas as suas invariantes de neg�cio |
| **BC** | BC-08 (Empresa Conveniada) |
| **Package alvo** | `pk_empresa_conveniada` (~400 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_cria_empresa(p_st_e, p_ctx)` funcional</li><li>Gera��o de `cd_empresa_conveniada` via `fn_empresa_conveniada()` (loop at� 10.001 tentativas)</li><li>INSERT em `tb_empresa_conveniada` (~60 colunas)</li><li>Cria��o de `UnidadeContratual` (unidade 1 padr�o) + `ParametrosUnidade`</li><li>Cria��o de `EmpresaConveniadaNatureza`, `FlagsConveniada`, `ModeloReajusteEmpresa`</li><li>Cria��o de `ImplantacaoEmpresa`, `Comiss�o`, `CnpjContratante` (AFFIX)</li><li>C�lculo de canal de venda: 1-29?1, 30-99?2, ?100?null</li><li>Variante BITIX: `dt_inicio <= sysdate` usa `trunc(sysdate)`</li><li>Hist�rico para naturezas 6/9 (PME/Simples) com assunto 130</li><li>Testes para: empresa normal, empresa AFFIX, empresa BITIX, canal 1/2/null, gera��o de c�digo</li></ul> |
| **Estimativa** | 13 pts |
| **Depend�ncias** | US-02.01, US-02.02, US-03.01, US-03.02 |

---

### US-03.04 � Extrair pk_coparticipacao (BC-09)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de configura��o de coparticipa��o (~200 linhas com 2 variantes AFFIX/normal, fatores, terapias, isen��es, interna��o PJ) seja extra�da para `pk_coparticipacao` |
| **Para que** | a parametriza��o regulamentada pela ANS � onde erros geram glosas e multas � fique isolada com valida��es rigorosas |
| **BC** | BC-09 (Coparticipa��o) |
| **Package alvo** | `pk_coparticipacao` (~200 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>Cria��o de `tb_controle_fator_empresa` (~20 campos)</li><li>Variante AFFIX vs normal</li><li>Loop de fatores por faixa et�ria/franquia (`tb_fator_empresa`)</li><li>Terapias especiais (`tb_terapias_espec_empresa`)</li><li>Isen��o de coparticipa��o (update flags)</li><li>Interna��o PJ (`tb_copart_internacao_param_pj`)</li><li>Tipo reembolso e tabela refer�ncia copart</li><li>`fl_cobra_internacao = 'S'` quando existem par�metros de interna��o</li><li>Testes para: empresa normal, empresa AFFIX, com isen��o, com interna��o PJ, sem fatores</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-03.01, US-03.03 |

---

### US-03.05 � Extrair pk_carencia (BC-10)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a l�gica de configura��o de car�ncia e compra de car�ncia (grupos, m�dulos, odonto) seja extra�da para `pk_carencia` |
| **Para que** | a cria��o de compras de car�ncia a partir do staging de negocia��o fique isolada |
| **BC** | BC-10 (Car�ncia e Compra de Car�ncia) |
| **Package alvo** | `pk_carencia` (~150 linhas) |
| **Crit�rios de aceite** | <ul><li>Procedure `pr_configura(p_st_e, p_ctx)` funcional</li><li>Cria��o de `tb_compra_carencia` via sequence `sq_compra_carencia`</li><li>Cria��o de grupos (`tb_compra_grupo`) a partir de `tb_empresa_neg_grupo`</li><li>Cria��o de m�dulos (`tb_compra_modulo`) a partir de `tb_empresa_neg_modulo`</li><li>Cria��o de odonto (`tb_odon_compra_grupo`) quando aplic�vel</li><li>Testes para: car�ncia completa, sem grupos, sem m�dulos, com odonto</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-03.01 |

---

<a id="feature-04"></a>
## ⚙️ FEATURE 04 � Orquestrador Limpo (Procedure Refatorada)

> **Fase:** 3 � Procedure Refatorada  
> **Prioridade:** P5  
> **Risco:** 🔴 Alto (ponto de integra��o de tudo)  
> **Impacto:** Procedure principal reduzida de 5.000 para ~200 linhas

### US-04.01 � Criar tipo t_contexto_cadastro

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que exista um type `t_contexto_cadastro` (record PL/SQL) que carregue todas as vari�veis de contexto compartilhadas entre os packages |
| **Para que** | as 70+ vari�veis declaradas na procedure sejam organizadas em um objeto de contexto tipado, eliminando vari�veis globais |
| **BC** | BC-01 (Orquestra��o) |
| **Package alvo** | `pk_cadastramento_empresa` |
| **Crit�rios de aceite** | <ul><li>Type `t_contexto_cadastro` definido no spec de `pk_cadastramento_empresa`</li><li>Campos para: `cd_empresa`, `cd_pessoa`, `cd_filial`, `cd_tabela`, `canal_venda`, `nu_controle_neg`, `wcd_empresa_plano`, etc.</li><li>Fun��o `fn_inicializa_contexto(p_st_e)` que popula o contexto</li><li>Todos os packages usam `p_ctx IN OUT t_contexto_cadastro` como par�metro</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | Todos os packages da Feature 02 e 03 |

---

### US-04.02 � Reescrever procedure como orquestrador

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor |
| **Quero** | que a procedure `pr_cadastramento_empresa_prov` seja reescrita como um orquestrador limpo que apenas delega para os packages extra�dos |
| **Para que** | o corpo principal fique com ~200 linhas (vs 5.000 atuais), leg�vel e f�cil de manter |
| **BC** | BC-01 (Orquestra��o) |
| **Crit�rios de aceite** | <ul><li>Procedure principal com ~200 linhas (orquestra��o pura)</li><li>Fluxo sequencial: Inicializar ? Validar ? Filial ? Modelo Neg�cio ? PJ ? Pre�o ? Empresa ? Copart ? Car�ncia ? Endere�o ? Acesso ? Fideliza��o ? Reembolso ? M�nimo ? COMMIT ? Notifica��o ? Desconto ? Odonto</li><li>Ordem corrigida: **validar antes de gerar c�digo** (fail-fast)</li><li>Tratamento de erro centralizado via `pk_cadastramento_empresa.pr_trata_erro`</li><li>100% dos testes de regress�o passando</li><li>Comportamento funcional id�ntico ao legado (zero breaking changes)</li></ul> |
| **Estimativa** | 13 pts |
| **Depend�ncias** | US-04.01, todas as US das Features 01-03 |

---

### US-04.03 � Teste de regress�o completo (PL/SQL)

| Campo | Valor |
|-------|-------|
| **Como** | QA/DBA |
| **Quero** | que exista uma su�te de testes de regress�o que compare o resultado da procedure refatorada com a procedure original para N cen�rios reais |
| **Para que** | eu tenha confian�a de que a refatora��o n�o introduziu breaking changes |
| **Crit�rios de aceite** | <ul><li>M�nimo 50 cen�rios de teste extra�dos de propostas reais</li><li>Cen�rios cobrem: SIGO, BITIX, AFFIX, PME, Middle, 100+, com odonto, sem odonto, com coligada, com reembolso</li><li>Script de compara��o: executa procedure original e refatorada no mesmo dataset e compara todas as tabelas de escrita</li><li>Zero diferen�as nos dados gerados</li><li>Relat�rio de regress�o documentado</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-04.02 |

---

<a id="feature-05"></a>
## ☁️ FEATURE 05 � Funda��o Cloud-Native (.NET 8 + React + AKS)

> **Fase:** 4 � Moderniza��o (Semanas 1-3)  
> **Risco:** ?? M�dio  
> **Impacto:** Cria a infraestrutura para os microservi�os

### US-05.01 � Criar reposit�rios Git (Azure DevOps)

| Campo | Valor |
|-------|-------|
| **Como** | Tech Lead |
| **Quero** | que os reposit�rios `Hapvida.Sigo.OnlineMovement.Taffix.Api` e `Hapvida.Sigo.OnlineMovement.Taffix.Web` sejam criados com GitFlow, branch policies e commits sem�nticos |
| **Para que** | o time siga os padr�es Hapvida (ADR 13) desde o in�cio |
| **Crit�rios de aceite** | <ul><li>Repos criados com nomenclatura Hapvida</li><li>Branch policies em `main` e `develop` (push direto proibido)</li><li>PR obrigat�rio com Code Review (autor n�o aprova pr�prio PR � ADR 38)</li><li>Build validation + SonarQube Quality Gate</li><li>README.md com descri��o, restri��es, requisitos, decis�es de design</li></ul> |
| **Estimativa** | 3 pts |

---

### US-05.02 � Scaffold projeto .NET 8 (3 camadas DDD)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor backend |
| **Quero** | que o projeto .NET 8 seja criado com 3 camadas (Presentation, Domain, Infrastructure) conforme ADR 16/74, com Building Blocks Hapvida.Core |
| **Para que** | a estrutura DDD esteja pronta para receber os bounded contexts como Commands/Queries CQRS via MediatR |
| **Crit�rios de aceite** | <ul><li>Solution com Presentation, Domain, Infrastructure, Tests</li><li>Domain **n�o** referencia ningu�m (ADR 16)</li><li>MediatR + FluentValidation configurados</li><li>Building Blocks Hapvida.Core instalados (OpenTelemetry, Logging, Oracle)</li><li>Swagger/OpenAPI configurado</li><li>Health checks `/health` e `/ready`</li><li>Contrato de resposta padr�o: `{ content, notifications, traceId }` (ADR 14)</li><li>Dockerfile funcional</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-05.01 |

---

### US-05.03 � Scaffold projeto React + TypeScript

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor frontend |
| **Quero** | que o projeto React + TypeScript (Vite) seja criado com shadcn/ui, Tailwind, React Query, React Hook Form e interceptor do contrato Hapvida |
| **Para que** | o frontend esteja pronto para consumir as APIs e exibir os formul�rios do TAFFIX |
| **Crit�rios de aceite** | <ul><li>Vite + React 18 + TypeScript strict</li><li>shadcn/ui + Tailwind CSS</li><li>React Router DOM, Axios, React Query, React Hook Form + Zod</li><li>SignalR para feedback real-time</li><li>Interceptor do contrato de resposta Hapvida</li><li>`npm run dev` e `npm run build` sem erros</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-05.01 |

---

### US-05.04 � Pipeline CI/CD (Build ? SonarQube ? Docker ? AKS)

| Campo | Valor |
|-------|-------|
| **Como** | DevOps/Tech Lead |
| **Quero** | que a pipeline de CI/CD esteja configurada para build, an�lise est�tica (SonarQube), push Docker para ACR e deploy em AKS DEV |
| **Para que** | cada PR tenha valida��o autom�tica de qualidade e o deploy em DEV seja cont�nuo |
| **Crit�rios de aceite** | <ul><li>Pipeline CI: build ? testes ? SonarQube Gate (0 bugs, 0 vulns, 70% coverage)</li><li>Pipeline CD: Docker build ? push ACR ? deploy K8s DEV</li><li>Manifestos K8s tokenizados (`k8sdeploy/`)</li><li>HPA configurado (min=1 DEV, min=2 HML, min=3 PRD)</li><li>Namespace: `hap-sig-olm`</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-05.02 |

---

### US-05.05 � Mapear 16 Entities + Repositories (Infrastructure)

| Campo | Valor |
|-------|-------|
| **Como** | desenvolvedor backend |
| **Quero** | que as 16 entities principais (mapeadas de tabelas Oracle) e seus repositories estejam implementados na camada Infrastructure com acesso Oracle via Building Block |
| **Para que** | os handlers CQRS possam acessar os dados legados desde o primeiro sprint funcional |
| **Crit�rios de aceite** | <ul><li>Entities mapeadas: Proposta, Pessoa, EmpresaConveniada, AcessoInternet, ControleInternet, AreaVenda, Filial, Vendedor, ModeloNegocio, PrecoPlano, etc.</li><li>Repositories com interfaces no Domain e implementa��o no Infrastructure</li><li>Conex�o Oracle via `Oracle.ManagedDataAccess.Core` + Building Block</li><li>Connection string via Secret K8s</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-05.02 |

---

<a id="feature-06"></a>
## 🔐 FEATURE 06 � API de Autentica��o e Acesso

> **Fase:** 4 � Moderniza��o (Sprint 1)  
> **Risco:** ?? M�dio  
> **Impacto:** Substitui BL_LOGIN do Oracle Forms

### US-06.01 � API POST /api/v1/auth/login

| Campo | Valor |
|-------|-------|
| **Como** | escrit�rio de vendas/concession�ria |
| **Quero** | me autenticar informando �rea de venda, CNPJ e senha |
| **Para que** | eu receba um token JWT para acessar o sistema TAFFIX Web |
| **BC** | BC-12 (Acesso Internet) |
| **Crit�rios de aceite** | <ul><li>Command CQRS `AutenticarCommand` com MediatR</li><li>Valida��o FluentValidation (�rea > 0, CNPJ 14 d�gitos, senha m�n 6 chars)</li><li>Senha validada com BCrypt (NUNCA `fn_encripta`, NUNCA senha master `ZAXSCD`)</li><li>Dia limite de acesso validado</li><li>JWT com claims: AreaVenda, Cnpj, CdFilial, CdEmpresaPlano, FlControlaProposta</li><li>Endpoint `/api/v1/auth/refresh` para renova��o</li><li>Response time < 500ms</li></ul> |
| **Estimativa** | 5 pts |

---

### US-06.02 � Tela de Login (Frontend)

| Campo | Valor |
|-------|-------|
| **Como** | usu�rio do escrit�rio de vendas |
| **Quero** | uma tela de login moderna com campos de �rea de venda, CNPJ e senha |
| **Para que** | eu acesse o sistema TAFFIX Web de forma intuitiva |
| **Crit�rios de aceite** | <ul><li>Formul�rio com valida��o client-side (Zod + React Hook Form)</li><li>M�scara de CNPJ</li><li>Feedback visual de erro (contrato Hapvida ? toast/sonner)</li><li>Redirect para Dashboard ap�s login</li><li>Armazenamento seguro do token (httpOnly cookie ou secure storage)</li></ul> |
| **Estimativa** | 3 pts |
| **Depend�ncias** | US-06.01 |

---

<a id="feature-07"></a>
## 📊 FEATURE 07 � API de Propostas e Dashboard

> **Fase:** 4 � Moderniza��o (Sprints 2-4)  
> **Risco:** ?? M�dio  
> **Impacto:** Substitui telas de grid e CRUD do Oracle Forms

### US-07.01 � API GET /api/v1/propostas (listar propostas)

| Campo | Valor |
|-------|-------|
| **Como** | usu�rio do escrit�rio de vendas |
| **Quero** | listar as propostas da minha �rea de venda com filtros e pagina��o |
| **Para que** | eu veja o status de cada proposta e tome a��es |
| **BC** | BC-01 (Proposta e Orquestra��o) |
| **Crit�rios de aceite** | <ul><li>Query CQRS `ObterPropostasQuery` com pagina��o (max 100 � ADR 14)</li><li>Filtros: status, data in�cio/fim, CNPJ</li><li>Retorna: nu_controle, CNPJ, raz�o social, status, data digita��o, qtd titulares/dependentes</li><li>Acesso restrito � �rea de venda do JWT</li></ul> |
| **Estimativa** | 5 pts |

---

### US-07.02 � API POST /api/v1/propostas (criar proposta)

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | criar uma nova proposta de contrato PJ informando dados da empresa, endere�o, contato, plano e modelo de neg�cio |
| **Para que** | a proposta seja gravada em `tb_empresa_internet` e fique dispon�vel para processamento |
| **BC** | BC-01, BC-02 |
| **Crit�rios de aceite** | <ul><li>Command CQRS `CriarPropostaCommand`</li><li>Valida��o completa (SP01..SP21 replicada em FluentValidation)</li><li>INSERT em `tb_empresa_internet`</li><li>Retorna `nu_controle` gerado</li></ul> |
| **Estimativa** | 8 pts |

---

### US-07.03 � API PUT /api/v1/propostas/{nuControle} (editar proposta)

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | editar uma proposta pendente antes de ela ser processada |
| **Para que** | eu corrija dados incorretos sem precisar excluir e recriar |
| **Crit�rios de aceite** | <ul><li>S� permite edi��o se `fl_status_processamento = 'D'` (digitada)</li><li>Valida��o completa</li><li>UPDATE em `tb_empresa_internet`</li></ul> |
| **Estimativa** | 5 pts |

---

### US-07.04 � Dashboard com contadores e gr�ficos

| Campo | Valor |
|-------|-------|
| **Como** | gestor do escrit�rio de vendas |
| **Quero** | ver um dashboard com contadores de propostas por status (digitadas, processadas, com erro, efetivadas) |
| **Para que** | eu tenha vis�o gerencial do pipeline de contratos |
| **Crit�rios de aceite** | <ul><li>Cards com contadores: Digitadas, Processadas, Com Erro, Efetivadas, Com Movimento, Sem Movimento</li><li>Gr�fico de tend�ncia (�ltimos 30 dias)</li><li>Filtro por per�odo</li><li>Dados atualizados via React Query (polling ou SignalR)</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-07.01 |

---

### US-07.05 � Tela de formul�rio de proposta (CRUD)

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | uma tela de formul�rio com abas (Dados Empresa, Endere�o, Contato, Plano, Modelo de Neg�cio) para criar/editar propostas |
| **Para que** | eu substitua a tela Oracle Forms por uma interface web moderna |
| **Crit�rios de aceite** | <ul><li>Formul�rio com React Hook Form + Zod</li><li>Abas organizadas por bounded context</li><li>M�scaras: CNPJ, CEP, telefone</li><li>Busca de CEP com preenchimento autom�tico</li><li>Sele��o de modelo de neg�cio com filtro por filial/natureza/empregados</li><li>Feedback visual de valida��o inline</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-07.02, US-07.03 |

---

<a id="feature-08"></a>
## ⚡ FEATURE 08 � API de Efetiva��o (Baixa de Contrato PJ)

> **Fase:** 4 � Moderniza��o (Sprint 5)  
> **Risco:** 🔴 Alto (Use Case principal)  
> **Impacto:** Substitui o processamento da procedure via Anti-Corruption Layer

### US-08.01 � API POST /api/v1/propostas/{nuControle}/efetivar

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | efetivar (dar baixa) em uma proposta aprovada, transformando-a em contrato ativo |
| **Para que** | a empresa conveniada entre em vigor com todas as parametriza��es (pre�o, copart, car�ncia, fideliza��o, acesso, reembolso) |
| **BC** | BC-01 (Orquestra��o) � Use Case `EfetivarContratoEmpresaPJUseCase` |
| **Crit�rios de aceite** | <ul><li>Command CQRS `EfetivarPropostaCommand`</li><li>Anti-Corruption Layer: chama a procedure refatorada (Fase 3) via Oracle</li><li>Feedback real-time via SignalR (etapas do processamento)</li><li>Em caso de erro: registra pend�ncia e retorna detalhes</li><li>Em caso de sucesso: retorna `cd_empresa_conveniada` gerado</li><li>Idempotente: se proposta j� efetivada, retorna resultado existente</li></ul> |
| **Estimativa** | 8 pts |

---

### US-08.02 � Feedback real-time de efetiva��o (SignalR)

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | ver em tempo real o progresso da efetiva��o (valida��o ?, filial ?, pre�o ?, empresa ?, ...) |
| **Para que** | eu saiba exatamente em qual etapa o processo est� e n�o precise ficar atualizando a p�gina |
| **Crit�rios de aceite** | <ul><li>Hub SignalR com eventos por etapa do fluxo de orquestra��o</li><li>Frontend com progress bar e checklist de etapas</li><li>Em caso de erro: exibe a etapa que falhou com mensagem</li><li>Timeout de 60 segundos com mensagem adequada</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-08.01 |

---

### US-08.03 � Gest�o de titulares e dependentes

| Campo | Valor |
|-------|-------|
| **Como** | vendedor/corretor |
| **Quero** | cadastrar, editar e excluir titulares e dependentes de uma proposta |
| **Para que** | a proposta tenha a lista completa de benefici�rios antes da efetiva��o |
| **Crit�rios de aceite** | <ul><li>CRUD de titulares (`tb_usuario_titular_internet`)</li><li>CRUD de dependentes (`tb_usuario_dependente_internet`)</li><li>Valida��o de CPF, data nascimento, grau parentesco</li><li>Upload de arquivo CSV/XLSX para carga em massa</li><li>Contagem atualizada na proposta</li></ul> |
| **Estimativa** | 8 pts |

---

<a id="feature-09"></a>
## 📈 FEATURE 09 � Integra��es, Relat�rios e Observabilidade

> **Fase:** 4 � Moderniza��o (Sprint 6)  
> **Risco:** ?? M�dio  
> **Impacto:** Relat�rios gerenciais + rastreabilidade

### US-09.01 � APIs de Relat�rios (digitados, processados, erros, efetivados)

| Campo | Valor |
|-------|-------|
| **Como** | gestor do escrit�rio de vendas |
| **Quero** | consultar relat�rios de propostas digitadas, processadas, com erro, efetivadas, com/sem movimento e cr�ticas |
| **Para que** | eu tenha controle gerencial e possa acompanhar a produtividade |
| **Crit�rios de aceite** | <ul><li>8 endpoints Query CQRS: digitados, processados, upload, erros, com movimento, sem movimento, cr�ticas, efetivados</li><li>Pagina��o max 100 (ADR 14)</li><li>Exporta��o CSV (`file-saver` no frontend)</li><li>Filtros por per�odo e �rea de venda</li></ul> |
| **Estimativa** | 8 pts |

---

### US-09.02 � Telas de Relat�rios (abas no frontend)

| Campo | Valor |
|-------|-------|
| **Como** | gestor do escrit�rio de vendas |
| **Quero** | visualizar os relat�rios em abas com tabelas paginadas e filtros |
| **Para que** | eu substitua os bot�es BT_DIGITADAS, BT_PROCESSADAS, etc. do Forms por uma interface web |
| **Crit�rios de aceite** | <ul><li>8 abas de relat�rio com `@tanstack/react-table`</li><li>Filtros por data e busca textual</li><li>Bot�o de exportar CSV</li><li>Skeleton loading</li><li>Badge de status com cores (sucesso=verde, erro=vermelho, pendente=amarelo)</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-09.01 |

---

### US-09.03 � Observabilidade com Application Insights

| Campo | Valor |
|-------|-------|
| **Como** | Tech Lead / SRE |
| **Quero** | que todas as APIs tenham distributed tracing, m�tricas e logs estruturados via Azure Application Insights |
| **Para que** | eu consiga diagnosticar problemas em produ��o rapidamente e medir SLIs/SLOs |
| **Crit�rios de aceite** | <ul><li>OpenTelemetry configurado via Building Block Hapvida.Core</li><li>TraceId propagado em todas as respostas</li><li>Custom metrics: tempo de efetiva��o, taxa de erro, propostas/hora</li><li>Dashboard Azure Monitor com KPIs</li><li>Alertas: response time p95 > 2s, error rate > 5%</li></ul> |
| **Estimativa** | 5 pts |

---

### US-09.04 � Testes E2E (Playwright)

| Campo | Valor |
|-------|-------|
| **Como** | QA |
| **Quero** | que existam testes end-to-end automatizados cobrindo os fluxos cr�ticos (login ? criar proposta ? efetivar ? relat�rio) |
| **Para que** | cada deploy tenha valida��o autom�tica de regress�o no frontend |
| **Crit�rios de aceite** | <ul><li>Playwright configurado com fixtures</li><li>M�nimo 10 cen�rios E2E</li><li>Fluxo happy path completo automatizado</li><li>Executado no pipeline CI</li></ul> |
| **Estimativa** | 5 pts |

---

<a id="feature-10"></a>
## 🚀 FEATURE 10 � Homologa��o, UAT e Go-Live

> **Fase:** 5 � Go-Live  
> **Risco:** 🔴 Alto  
> **Impacto:** Entrada em produ��o

### US-10.01 � Deploy em K8s HML (aks-hml-002)

| Campo | Valor |
|-------|-------|
| **Como** | DevOps |
| **Quero** | que o sistema seja deployado em AKS HML com tokeniza��o de vari�veis (ADR 34) e valida��o p�s-deploy |
| **Para que** | o time de neg�cio possa realizar UAT em ambiente pr�ximo a produ��o |
| **Crit�rios de aceite** | <ul><li>Branch `release/v1.0` criada a partir de `develop`</li><li>Pipeline autom�tica para HML</li><li>Pods rodando (min=2 r�plicas)</li><li>Health e Ready OK</li><li>Conex�o Oracle HML funcional</li><li>Swagger acess�vel</li></ul> |
| **Estimativa** | 5 pts |

---

### US-10.02 � Teste de regress�o em HML (50 cen�rios)

| Campo | Valor |
|-------|-------|
| **Como** | QA |
| **Quero** | executar 50 cen�rios de regress�o em HML comparando resultado da API com o resultado da procedure legada |
| **Para que** | eu garanta paridade funcional completa antes do UAT |
| **Crit�rios de aceite** | <ul><li>50 cen�rios reais executados</li><li>Zero bugs cr�ticos/bloqueadores</li><li>Relat�rio de regress�o aprovado pelo Tech Lead</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-10.01 |

---

### US-10.03 � UAT (User Acceptance Testing)

| Campo | Valor |
|-------|-------|
| **Como** | PO / Equipe de Vendas |
| **Quero** | realizar testes de aceita��o do sistema TAFFIX Web em HML com cen�rios de neg�cio reais |
| **Para que** | eu valide que o sistema atende �s necessidades do dia a dia e aprove o go-live |
| **Crit�rios de aceite** | <ul><li>4 sess�es de treinamento realizadas</li><li>NPS ? 7/10 dos usu�rios</li><li>Assinatura formal do PO</li><li>Lista de issues priorizados (P1 bloqueiam go-live, P2/P3 v�o para backlog)</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-10.02 |

---

### US-10.04 � Go-Live com Blue-Green deployment

| Campo | Valor |
|-------|-------|
| **Como** | Tech Lead / SRE |
| **Quero** | que o go-live use estrat�gia Blue-Green em AKS PRD (aks-prd-001) com rollback testado |
| **Para que** | em caso de problema, possamos reverter para o Forms em minutos |
| **Crit�rios de aceite** | <ul><li>Merge `release/v1.0` ? `main` com tag `v1.0.0`</li><li>Deploy Blue-Green: GREEN (TAFFIX Web) recebe tr�fego, BLUE (Forms) em standby</li><li>APIM configurado para roteamento</li><li>Runbook de rollback documentado e testado</li><li>Monitoramento ativo primeiras 48h (war room)</li><li>Janela de rollback: 72h</li><li>M�tricas de sucesso: 0 incidentes P1 em 48h</li></ul> |
| **Estimativa** | 8 pts |
| **Depend�ncias** | US-10.03 |

---

### US-10.05 � Estabiliza��o p�s-go-live (Hypercare)

| Campo | Valor |
|-------|-------|
| **Como** | time de desenvolvimento |
| **Quero** | um per�odo de hypercare de 1 semana com monitoramento intensivo e corre��es r�pidas |
| **Para que** | problemas p�s-go-live sejam identificados e corrigidos antes de encerrar o projeto |
| **Crit�rios de aceite** | <ul><li>War room ativo na Semana 22</li><li>SLA de resposta: P1 = 30min, P2 = 2h, P3 = 8h</li><li>Dashboard de monitoramento vis�vel para stakeholders</li><li>Reuni�o di�ria de status com PO</li><li>Zero incidentes P1 por 5 dias consecutivos ? encerramento do hypercare</li><li>Documenta��o de li��es aprendidas</li></ul> |
| **Estimativa** | 5 pts |
| **Depend�ncias** | US-10.04 |

---

<a id="roadmap"></a>
## ??? Vis�o Geral do Backlog (Roadmap)

```
                        FASE 1               FASE 2                FASE 3
                     Quick Wins      Packages por BC       Orquestrador Limpo
                    ????????????    ??????????????????    ????????????????????
                    ? F01      ?    ? F02   ? F03    ?    ? F04              ?
                    ? US-01.01 ?    ?US-02.*?US-03.* ?    ? US-04.01         ?
                    ? US-01.02 ?????? 10 US ? 5 US   ?????? US-04.02         ?
                    ? US-01.03 ?    ?       ?        ?    ? US-04.03         ?
                    ? US-01.04 ?    ?       ?        ?    ?                  ?
                    ????????????    ??????????????????    ????????????????????
                       ~2 sem            ~6 sem                ~2 sem
                                                                  ?
                    ???????????????????????????????????????????????
                    ?
                        FASE 4                                    FASE 5
                    Moderniza��o Cloud-Native                  Go-Live
                    ????????????????????????????????    ????????????????????
                    ? F05   ? F06  ? F07  ? F08    ?    ? F10              ?
                    ? Setup ? Auth ?Props ?Efetiv. ?    ? US-10.01 HML     ?
                    ?       ?      ?      ?        ?????? US-10.02 Regres. ?
                    ? F09                          ?    ? US-10.03 UAT     ?
                    ? Relat.? Obs. ? E2E  ?        ?    ? US-10.04 Go-Live ?
                    ????????????????????????????????    ? US-10.05 Hyper.  ?
                           ~10 sem                      ????????????????????
                                                              ~3 sem
```

### Resumo quantitativo

| Feature | Qtd US | Story Points | Prioridade | Fase |
|---------|--------|--------------|------------|------|
| F01 � Funda��o/Quick Wins | 4 | 18 pts | P0 | 1 |
| F02 � Packages Supporting | 10 | 30 pts | P1-P4 | 2 |
| F03 � Packages Core | 5 | 42 pts | P2-P3 | 2 |
| F04 � Orquestrador Limpo | 3 | 26 pts | P5 | 3 |
| F05 � Funda��o Cloud | 5 | 29 pts | � | 4 |
| F06 � Auth/Login | 2 | 8 pts | � | 4 |
| F07 � Propostas/Dashboard | 5 | 31 pts | � | 4 |
| F08 � Efetiva��o | 3 | 21 pts | � | 4 |
| F09 � Relat�rios/Obs. | 4 | 23 pts | � | 4 |
| F10 � Homologa��o/Go-Live | 5 | 31 pts | � | 5 |
| **TOTAL** | **46** | **259 pts** | � | � |

---

<a id="priorizacao"></a>
## ?? Crit�rios de Prioriza��o

As User Stories foram priorizadas usando **WSJF (Weighted Shortest Job First)**:

| Crit�rio | Descri��o |
|----------|-----------|
| **Valor de Neg�cio** | Impacto direto na opera��o (receita, risco, compliance ANS) |
| **Criticidade no Tempo** | Urg�ncia: quanto mais demorar, mais caro fica (bugs em produ��o) |
| **Redu��o de Risco** | Cada package extra�do reduz risco de regress�o |
| **Tamanho do Job** | Story points estimados |

**Ordem sugerida de execu��o:**
1. **P0** ? US-01.01, US-01.02, US-01.03, US-01.04 (quick wins, reduzem 360 linhas)
2. **P1** ? US-02.01, US-02.02, US-02.03 (supporting, risco baixo)
3. **P2** ? US-03.01, US-03.02 (core: modelo neg�cio + pre�o)
4. **P3** ? US-03.03, US-03.04, US-03.05 (core: empresa + copart + car�ncia)
5. **P4** ? US-02.04..US-02.10 (supporting/generic restantes)
6. **P5** ? US-04.01, US-04.02, US-04.03 (orquestrador + regress�o)
7. **Cloud** ? Features 05..10 (moderniza��o sequencial)

---

<a id="dor-dod"></a>
## ? Definition of Ready (DoR)

Uma User Story est� **ready** quando:

- [ ] T�tulo e descri��o no formato "Como/Quero/Para que"
- [ ] Crit�rios de aceite definidos e mensur�veis
- [ ] Bounded Context identificado
- [ ] Package alvo ou endpoint alvo definido
- [ ] Depend�ncias mapeadas
- [ ] Estimativa em story points (Planning Poker)
- [ ] Sem impedimentos externos
- [ ] Dados de teste dispon�veis

## ? Definition of Done (DoD)

Uma User Story est� **done** quando:

- [ ] C�digo implementado seguindo ADRs Hapvida
- [ ] Testes unit�rios cobrindo cen�rios dos crit�rios de aceite
- [ ] Coverage ? 70% no Domain (SonarQube)
- [ ] 0 bugs / 0 vulnerabilidades (SonarQube Quality Gate)
- [ ] Code Review aprovado (autor ? aprovador � ADR 38)
- [ ] Pipeline CI verde (build + testes + an�lise est�tica)
- [ ] Commits sem�nticos (ADR 13)
- [ ] Documenta��o atualizada (se aplic�vel)
- [ ] Deploy em DEV funcional
- [ ] PO validou os crit�rios de aceite

---

## ?? Refer�ncias

| Documento | Localiza��o |
|-----------|-------------|
| Modelagem DDD completa | `docs/refatoracao/pr_cadastramento_empresa_prov/ddd-modelagem-dominio.md` |
| Roadmap de refatora��o | `docs/refatoracao/pr_cadastramento_empresa_prov/README-refatoracao.md` |
| Context Map (CML) | `docs/refatoracao/pr_cadastramento_empresa_prov/context-map-cadastramento-empresa.cml` |
| Diagramas C4 | `docs/refatoracao/pr_cadastramento_empresa_prov/c4-model/` |
| Fase 1 � Setup/Funda��o | `Refatoracao/Taffix/FASE1_DETALHAMENTO_TECNICO.md` |
| Fase 2 � Dev Core | `Refatoracao/Taffix/FASE2_DETALHAMENTO_TECNICO.md` |
| Fase 3 � Relat�rios/Testes | `Refatoracao/Taffix/FASE3_DETALHAMENTO_TECNICO.md` |
| Fase 4 � Homologa��o/UAT | `Refatoracao/Taffix/FASE4_DETALHAMENTO_TECNICO.md` |
| Fase 5 � Go-Live | `Refatoracao/Taffix/FASE5_DETALHAMENTO_TECNICO.md` |
| ADRs Arch Hapvida | `Refatoracao/ADRs Arch Hapvida/` |

---

*Documento gerado em: 2026-02-23*  
*�pico: EP-01 � Refatora��o e Moderniza��o do Cadastramento de Empresa Conveniada*  
*Total: 10 Features, 46 User Stories, 259 Story Points*
