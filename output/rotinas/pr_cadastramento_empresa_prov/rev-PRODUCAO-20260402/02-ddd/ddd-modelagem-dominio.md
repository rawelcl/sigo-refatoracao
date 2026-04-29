# Modelagem DDD: PR_CADASTRAMENTO_EMPRESA_PROV

**Baseado em:** reversa-pr-cadastramento-empresa-prov.md (rev-PRODUCAO-20260402)
**Data:** 21/04/2026
**Agente:** Agente DDD (GitHub Copilot)
**ADRs consultadas:** ADR-01, ADR-02, ADR-05, ADR-21, ADR-22, ADR-74

---

## 0. ADRs Consultadas

Revisao realizada em 21/04/2026 antes de qualquer decisao de design [REF CLAUDE.md -- Principios Universais].

| ADR  | Titulo                                  | Aplicabilidade ao Dominio                                                                    | Status Alinhamento   |
|------|-----------------------------------------|----------------------------------------------------------------------------------------------|----------------------|
| ADR-01 | Building Blocks                       | [MIGRACAO] Componentes reutilizaveis C#/.NET8 para futura implementacao                      | Lacuna futura        |
| ADR-02 | Arquitetura Orientada a Eventos (EDA) | Domain Events identificados na secao 5 sao candidatos a topicos do Azure Service Bus         | Alinhado             |
| ADR-05 | Padrao da Camada Anticorrupcao (ACL)  | [OK] ACLs identificadas na secao 8 para isolamento de dependencies externas                  | Alinhado             |
| ADR-21 | Linguagem Onipresente                 | [OK] Glossario da secao 2 em portugues correto; nomes tecnicos futuros em ingles             | Alinhado             |
| ADR-22 | Padrao Repositorio                    | [ATENCAO] Repositorios devem separar interface (dominio) de implementacao (infra)            | Divergencia parcial  |
| ADR-74 | Domain-Driven Design (DDD)            | [OK] Todos os building blocks presentes: Entidades, VOs, Agregados, Repos, DS, DE, Specs    | Alinhado             |
| ADR-03 | CQRS                                  | [ADR-AUSENTE] Segregacao Command/Query nao modelada -- INSERT/SELECTs misturados             | Lacuna               |
| ADR-AUSENTE | TYPE Record PL/SQL               | Nao existe ADR especifica para passagem de contexto via TYPE Record em PL/SQL -- ver DD-CAD-02 | Lacuna registrada |

---

## Sumario

0. [ADRs Consultadas](#0-adrs-consultadas)
1. [Raciocinio Estrategico da Modelagem](#1-raciocinio-estrategico-da-modelagem)
2. [Bounded Context](#2-bounded-context)
3. [Linguagem Ubiqua -- Novos Termos](#3-linguagem-ubiqua--novos-termos)
4. [Agregados](#4-agregados)
5. [Domain Services](#5-domain-services)
6. [Domain Events](#6-domain-events)
7. [Repositorios](#7-repositorios)
8. [Specifications](#8-specifications)
9. [Anti-Corruption Layers](#9-anti-corruption-layers)
10. [Factories](#10-factories)
11. [Mapa RN -> DDD](#11-mapa-rn---ddd)
12. [Decisoes de Design](#12-decisoes-de-design)
13. [Pendencias com o PO](#13-pendencias-com-o-po)
14. [Pontos de Atencao para Migracao Futura](#14-pontos-de-atencao-para-migracao-futura)

---

## 1. Raciocinio Estrategico da Modelagem

### Por que DDD para esta rotina?

A PR_CADASTRAMENTO_EMPRESA_PROV acumula **16 fases sequenciais** em uma unica procedure de
**5.025 linhas** -- validacao de propostas, geracao de codigos, resolucao de contexto comercial,
gestao de pessoa juridica, precificacao, regulatorio ANS, criacao do contrato, parametrizacao
operacional, coparticipacao, reembolso, acesso internet, notificacao e integracao odonto.

O DDD permite identificar os **12 limites naturais** entre essas responsabilidades e nomea-los
com precisao, criando a base para a decomposicao em packages na **Fase 2** (PL/SQL refatorado)
e microsservicos na **Fase 3** (Azure Cloud Native).

Esta rotina e a **mais complexa e central do fluxo de efetivacao PIM**: e ela quem materializa
o contrato definitivo da empresa conveniada. Todo o valor gerado pelo canal digital (PIM, TAFFIX,
BITIX) converge nesta procedure.

### Estrategia DDD aplicada

**Abordagem escolhida:** Strategic DDD + Tactical DDD (ambos)

**Justificativa:** A rotina e grande e complexa o suficiente para justificar modelagem estrategica
(identificar o BC e suas relacoes com Comercial, Beneficiario, Financeiro e Regulatorio) e tatica
(definir agregados, entidades, value objects, services e events). A modelagem tatica e necessaria
porque ha multiplos agregados interagindo dentro da mesma transacao -- situacao que exige
identificacao precisa de invariantes e limites.

**Padrao de decomposicao:** Strangler Fig Pattern

**Justificativa:** A procedure e chamada por 5 rotinas em producao (PR_EFETIVA_INTERNET,
PR_BAIXA_EMPRESA_COLIGADA, PR_BAIXA_EMP_COLIGADA_SAUDE, PR_EFETIVA_BAIXA_COLIGADA, PK_PIM).
Uma migracao direta quebraria todos os chamadores. O Strangler Fig permite substituir
incrementalmente cada BC por um package dedicado, mantendo a interface publica original
(p_nu_controle, p_erro_controle) ate que todos os chamadores sejam atualizados.

---

## 2. Bounded Context

### Identificacao do contexto

**Contexto principal:** Implantacao -- Cadastramento de Empresa Conveniada

**Raciocinio de identificacao:**
A rotina recebe `p_nu_controle` (identificador de proposta provisoria) e sua acao principal e
transformar essa proposta em um contrato definitivo em `tb_empresa_conveniada`. Isso a posiciona
claramente no **BC de Implantacao** -- o dominio responsavel por efetivar contratos a partir de
propostas aprovadas pelo canal comercial. Nao pertence ao BC Comercial porque nao cria nem avalia
propostas -- apenas as consome como input ja validado.

Dentro do BC de Implantacao, esta rotina representa o **subdominio de Cadastramento de Empresa**,
distinguindo-se do subdominio de Cadastramento de Beneficiarios (PR_CADASTRAMENTO_INTERNET2).

**Descricao do contexto:** Dominio responsavel por criar o contrato definitivo de uma empresa
conveniada a partir de uma proposta provisoria armazenada em staging (`tb_empresa_internet`),
parametrizando todos os aspectos contratuais e operacionais necessarios para que a empresa
possa comecar a operar no plano de saude.

**Schema legado:** HUMASTER

### Subdominios identificados

| Subdominio          | Tipo    | Bounded Context ID | Descricao                                                          |
|---------------------|---------|--------------------|--------------------------------------------------------------------|
| Orquestracao        | Core    | BC-CAD-01          | Coordena as 16 fases; controla transacao e tratamento de erros     |
| Validacao           | Support | BC-CAD-02          | Valida vendedor, lista negra, documento, dados cadastrais          |
| Identificacao Contratual | Support | BC-CAD-03      | Resolve filial, canal (SIGO/BITIX), parametros de negociacao       |
| Gestao de Pessoa    | Support | BC-CAD-04          | Cria ou localiza PessoaJuridica/Fisica com codigo definitivo       |
| Precificacao        | Core    | BC-CAD-05          | Cria/reutiliza tabela de precos; copia valores, franquias, descontos|
| Regulatorio ANS     | Core    | BC-CAD-06          | RN195 (faixa etaria), RN279/309 (inativos), coparticipacao RN195  |
| Criacao do Contrato | Core    | BC-CAD-07          | INSERT principal em tb_empresa_conveniada e ~15 tabelas relacionadas|
| Parametrizacao Operacional | Core | BC-CAD-08        | parametros_unidade, carencias, grupos, modulos, fidelizacao        |
| Coparticipacao e Reembolso | Core | BC-CAD-09        | controle_fator_empresa, copart tables, reemb tables                |
| Acesso Internet     | Support | BC-CAD-10          | Cria tb_acesso_internet + controles + senha + vincula titulares    |
| Notificacao         | Generic | BC-CAD-11          | Email de boas-vindas por operadora; log de envio                   |
| Odonto              | Support | BC-CAD-12          | Super Simples (se sem odonto); repasse odonto automatico           |

### Relacao com outros contextos

| Contexto Relacionado          | Tipo de Relacao | Raciocinio                                                                                   |
|-------------------------------|-----------------|----------------------------------------------------------------------------------------------|
| BC Comercial (proposta)       | Downstream      | Consome `tb_empresa_internet` ja preenchida pelo canal comercial -- sem influencia no upstream|
| BC Beneficiario               | Upstream        | EmpresaConveniada criada aqui e referenciada por PR_CADASTRAMENTO_INTERNET2                  |
| BC Financeiro                 | Upstream        | Tabela de precos e minimo contratual criados aqui alimentam o faturamento                    |
| BC Regulatorio ANS            | Conformist      | Regras RN195, RN279/309 definidas pela ANS -- este BC se conforma sem questionamento         |
| BC BITIX (ACL)                | ACL             | Propostas BITIX tem cursor e datas distintas; ACL isola essa diferenca do core de negocio    |
| BC SIGO Coligadas (ACL)       | ACL             | Consolidacao de vidas SIGO usa logica especifica; ACL isola do core                          |
| BC Odonto                     | Partnership     | Odonto Super Simples e repasse dependem do estado da empresa conveniada recen criada          |

---

## 3. Linguagem Ubiqua -- Novos Termos

### Problema identificado no legado

O codigo usa nomenclatura tecnica que diverge do vocabulario de negocio. Exemplos:
- `fl_status_processamento IN (0, 8)` para o que o negocio chama de "Proposta Nova" ou "Proposta em Reprocessamento"
- `wfl_tabela_geral = 'S'` para "Tabela de Precos Compartilhada AFFIX"
- `V_DT_PROCESSAMENTO` para "Data de Efetivacao Ajustada por Prorrogacao"
- `pr_cadastramento_empresa_prov` para o que o negocio chama de "Processo de Efetivacao Definitiva de Empresa"

### Novos termos identificados

Termos marcados com [REF] ja constam em `_shared/dicionario-dominio.md` e nao sao redobrados aqui.

| Termo do Dominio               | Definicao de Negocio                                                                                     | Termo Tecnico Atual          | BC        |
|--------------------------------|----------------------------------------------------------------------------------------------------------|------------------------------|-----------|
| Efetivacao Definitiva          | Processo de transformar proposta provisoria em contrato operacional ativo                                | pr_cadastramento_empresa_prov| BC-CAD-01 |
| Modelo de Negocio Atacado      | Modelo padrao (cd_modelo_negocio=1) onde cada empresa tem tabela de precos exclusiva                     | lcd_modelo_negocio = 1       | BC-CAD-05 |
| Modelo de Negocio AFFIX        | Modelo nao-atacado (cd_modelo_negocio != 1) onde empresas compartilham tabela de precos da operadora     | lcd_modelo_negocio != 1      | BC-CAD-05 |
| Tabela de Precos Exclusiva     | Tabela de precos criada especificamente para uma empresa atacado                                         | wfl_tabela_geral = 'N'       | BC-CAD-05 |
| Tabela de Precos Compartilhada | Tabela de precos da operadora reutilizada por empresas AFFIX                                             | wfl_tabela_geral = 'S'       | BC-CAD-05 |
| Empresa Coligada SIGO          | Empresa do mesmo grupo empresarial vinculada via tb_empresa_coligada; consolida vidas para precificacao  | TB_EMPRESA_COLIGADA [REF]    | BC-CAD-03 |
| Empresa Coligada BITIX         | Empresa do mesmo grupo vinculada via BITIX; usa dt_assinatura em vez de dt_inicio                       | TB_EMPRESA_COLIGADA_BITX     | BC-CAD-03 |
| Canal de Venda PME             | Canal 1: empresas com 1 a 29 empregados                                                                  | wcd_canal_venda = 1          | BC-CAD-03 |
| Canal de Venda Middle          | Canal 2: empresas com 30 a 99 empregados                                                                 | wcd_canal_venda = 2          | BC-CAD-03 |
| Fidelizacao Contratual         | Clausula de permanencia minima; dt_fim = dt_inicio + 1000 dias (regra questionada -- ver P06)           | TB_FIDELIZACAO_EMPRESA       | BC-CAD-08 |
| Minimo Contratual              | Valor de faturamento minimo garantido pelo contrato; oriundo de TB_PARAM_MINIMO_CONTRATUAL               | tb_empresa_minimo_contratual | BC-CAD-08 |
| Tabela de Inativos (RN279)     | Tabela de precos para beneficiarios inativos conforme RN279/309 da ANS                                  | lcd_tabela_inativo + lfl_rn  | BC-CAD-06 |
| Flag Faixa Etaria ANS          | Indicador de que a empresa segue regras de reajuste por faixa etaria conforme RN195 da ANS              | v_fl_faixa_ans / fl_faixa_etaria_ans | BC-CAD-06 |
| Acesso ADM Empresa             | Credencial de acesso ao portal internet para administrador da empresa conveniada                         | tb_acesso_internet (cd_tipo_acesso=5) | BC-CAD-10 |
| Email de Boas-Vindas           | Comunicacao enviada ao administrador da empresa com dados de acesso ao portal                            | pr_send_mail / pr_send_mail_html_rn | BC-CAD-11 |
| Breakeven Empresa              | Valor de referencia fixo (70) gravado em tb_empresa_breakeven -- significado obscuro (ver P07)          | tb_empresa_breakeven, vl=70  | BC-CAD-07 |
| Contrato AFFIX                 | Contrato gerenciado por administradora (fn_checa_contrato_affix='S'); herda vigencia da empresa-mae     | fn_checa_contrato_affix      | BC-CAD-03 |
| Data de Efetivacao Ajustada    | Data de processamento usada quando ha prorrogacao de vigencia (dt_inicio <= sysdate)                    | V_DT_PROCESSAMENTO           | BC-CAD-07 |

---

## 4. Agregados

### Raciocinio de identificacao

Analisei quais conjuntos de tabelas sao **sempre escritos juntos na mesma transacao** e quais objetos
possuem **identidade propria e ciclo de vida independente**:

- `tb_empresa_conveniada` e suas ~35 tabelas filhas sao sempre inseridas/atualizadas juntas, com
  `cd_empresa_conveniada` como eixo central -- **agregado principal**.
- `tb_pessoa` tem ciclo de vida independente (pode existir sem empresa conveniada) -- **agregado separado**.
- `tb_acesso_internet` tem identidade propria (`cd_acesso` via sequence) e pode ser referenciado por
  outros dominos -- **agregado separado**.
- `tb_empresa_internet` e o input: nao e criada aqui, apenas lida e atualizada -- **referencia externa**.

---

### Agregado 1: EmpresaConveniada

**Aggregate Root:** EmpresaConveniada

**Raciocinio da escolha:**
`cd_empresa_conveniada` e a identidade central do contrato no sistema. Todas as ~35 tabelas que
recebem INSERT nesta procedure referenciam `cd_empresa_conveniada` como FK obrigatoria. Nenhuma
delas faz sentido sem a empresa -- sao partes constitutivas do contrato.

**Invariantes:**
| Invariante                                  | Regra de Negocio | Origem | Raciocinio                                                                               |
|---------------------------------------------|------------------|--------|------------------------------------------------------------------------------------------|
| Deve ter codigo de empresa unico            | RN03             | fn_empresa_conveniada | Estado inconsistente se cd_empresa for NULL ou duplicado -- identidade do agregado |
| Deve ter pelo menos um plano contratado     | RN10             | tb_valor_plano | Empresa sem plano nao pode receber beneficiarios -- invariante de negocio           |
| Deve ter cd_pessoa valido com digito        | RN09             | pk_administracao.fn_digito_out | Sem pessoa nao ha contrato valido -- dependencia existencial     |
| Data de inicio deve ser anterior ao cancelamento | RN10        | validacao | Contrato com datas inconsistentes e invalido para qualquer operacao                |
| Vendedor deve ser ativo no cadastro         | RN04             | tb_vendedor_plano | Contrato sem vendedor ativo nao pode ser rastreado comercialmente                  |

**Entidades do Agregado:**
| Entidade                    | Identidade de Negocio     | Por que e Entidade                                                  | Tabela Oracle                     |
|-----------------------------|---------------------------|---------------------------------------------------------------------|-----------------------------------|
| FilialEmpresa               | cd_filial                 | Pode ser incluida/excluida independentemente; identidade propria    | tb_empresa_conveniada_unidade     |
| PlanoContratado             | cd_plano + cd_empresa_conveniada | Ciclo de vida vinculado ao contrato; pode ser alterado sem recriar empresa | tb_parametros_unidade      |
| CarenciaContratada          | cd_carencia + cd_empresa  | Cada carencia tem identidade propria; pode ser negociada individualmente | tb_compra_carencia             |
| GrupoContratado             | cd_grupo + cd_empresa     | Grupos de beneficiarios com identidade propria                      | tb_compra_grupo                   |
| ModuloContratado            | cd_modulo + cd_empresa    | Modulos contratados podem ser ativados/desativados                  | tb_compra_modulo                  |
| FidelizacaoContratual       | cd_empresa + dt_inicio    | Clausula com periodo definido; tem vigencia propria                 | tb_fidelizacao_empresa            |
| HistoricoContrato           | cd_empresa + dt_criacao   | Auditoria de criacao; imutavel apos gravacao                        | tb_hist_empresa_conveniada        |
| ControleAcessoContrato      | cd_acesso + cd_empresa    | Limite de acesso vinculado ao contrato                              | tb_emp_limite_acesso_contra       |

**Value Objects do Agregado:**
| Value Object               | Atributos                                        | Por que e Value Object                                                          | Regra de Validacao                           |
|----------------------------|--------------------------------------------------|---------------------------------------------------------------------------------|----------------------------------------------|
| EnderecoEmpresa            | cep, logradouro, numero, complemento, uf, cidade | Sem identidade propria; dois enderecos iguais sao identicos                    | cep deve existir em tb_cep_logradouro        |
| PeriodoContratual          | dt_inicio, dt_validade_contrato, dt_assinatura   | Imutavel apos gravacao; define a vigencia do contrato                           | dt_inicio < dt_validade_contrato             |
| ParametrosFaixaEtaria      | fl_faixa_etaria_ans, dt_rn_279_309_2, fl_rn_279_309 | Conjunto de flags ANS sem identidade propria                                  | Derivado de RN15 e RN14                      |
| ParametrosModelo           | cd_modelo_negocio, fl_natureza_empresa, wcd_canal_venda | Define o regime comercial da empresa; imutavel na criacao                  | modelo_negocio em valores validos (1..N)     |
| InformacoesCadastrais      | nu_cgc_cpf, nm_pessoa_razao_social, nu_total_empregado | Dados cadastrais basicos; validados antes da criacao                        | cnpj valido via fn_check_cic; razao nao nula |

---

### Agregado 2: PessoaJuridica

**Aggregate Root:** PessoaJuridica

**Raciocinio da escolha:**
`tb_pessoa` tem `cd_pessoa` como identidade independente (gerada via `sq_pessoa`). Uma pessoa
pode existir antes da empresa conveniada (se ja era titular de outro contrato) e pode sobreviver
a cancellamento da empresa. Ciclo de vida completamente independente.

**Invariantes:**
| Invariante                    | Regra de Negocio | Raciocinio                                                       |
|-------------------------------|------------------|------------------------------------------------------------------|
| Deve ter digito verificador valido | RN09       | Sem digito correto o cd_pessoa nao e localizavel pelos sistemas  |
| CNPJ/CPF nao pode ser nulo    | RN09             | Identidade fiscal obrigatoria para qualquer pessoa no sistema    |

**Value Objects:**
| Value Object      | Atributos                    | Por que e Value Object                             |
|-------------------|------------------------------|----------------------------------------------------|
| DocumentoFiscal   | nu_cgc_cpf, nu_caepf, fl_tipo_pessoa | Imutavel; define a identidade fiscal da pessoa|
| ContatoPessoa     | ds_email, nu_ddd, nu_telefone | Valores descritivos sem identidade propria         |

---

### Agregado 3: AcessoInternetEmpresa

**Aggregate Root:** AcessoInternetEmpresa

**Raciocinio da escolha:**
`tb_acesso_internet` tem `cd_acesso` gerado via `sq_acesso_internet`. E referenciado por
`tb_usuario_titular_internet` e `tb_usuario_dependente_internet` (vinculo de acesso dos
beneficiarios). Pode existir sem empresa conveniada ativa (historico de acesso).

**Invariantes:**
| Invariante              | Raciocinio                                                            |
|-------------------------|-----------------------------------------------------------------------|
| Senha nao pode ser nula | Sem senha o acesso ao portal e impossivel                            |
| cd_tipo_acesso deve ser 5 | Define acesso de empresa (nao de beneficiario); integridade do tipo |

---

## 5. Domain Services

### Raciocinio de identificacao

Identifiquei os Domain Services pelos blocos logicos da procedure que **dependem de multiplos
objetos de dominio** e nao pertencem naturalmente a nenhum deles isoladamente.

| Service                           | Responsabilidade                                                          | Entidades Envolvidas                                       | Raciocinio                                                                      | Origem no Legado           |
|-----------------------------------|---------------------------------------------------------------------------|------------------------------------------------------------|---------------------------------------------------------------------------------|----------------------------|
| GeracaoCodigoEmpresaService       | Gera cd_empresa_conveniada unico via loop de tentativas                   | EmpresaConveniada, fn_empresa_conveniada                   | Logica de geracao de codigo e acoplada ao Oracle -- nao pertence a entidade     | L255: loop fn_empresa_conveniada |
| ResolucaoFilialService            | Resolve lcd_filial via hierarquia de 3 niveis (contrato, TAFFIX, vendedor)| FilialEmpresa, VendedorPlano, tb_emp_internet_filial       | Hierarquia de prioridade envolve 3 fontes distintas -- nao pertence a nenhuma   | L320-L370                  |
| ConsolidacaoVidasColigadaService  | Consolida nu_total_empregado para grupos SIGO ou BITIX                    | EmpresaColigadaSIGO, EmpresaColigadaBITIX, PropostaInternet| Logica envolve 3 tabelas diferentes por canal -- nao pertence a nenhuma entidade| L470-L540                  |
| SelecaoParametrosNegociacaoService| Seleciona parametros de negociacao corretos (canal SIGO vs BITIX)          | tb_empresa_neg (cursor), PropostaInternet                  | Dois cursores com datas diferentes; escolha depende do canal detectado          | L490-L530                  |
| CalculoVigenciaContratoService    | Calcula dt_validade_contrato (12 meses ou herdada da mae)                  | EmpresaConveniada, EmpresaMae                              | Regra envolve consulta a empresa-mae para modelos AFFIX                         | L1926-L1945                |
| CalculoFaixaEtariaANSService      | Determina v_fl_faixa_ans via condicoes AFFIX + canal + 100 vidas          | EmpresaConveniada, ParametrosModelo                        | Multiplas condicoes de negocio sem dono claro -- servico de dominio regulatorio | L1948-L1956                |
| GestaoTabelaPrecosService         | Cria tabela exclusiva ou reutiliza compartilhada; copia valores/franquias  | TabelaPrecos, EmpresaConveniada, fn_cd_tb_preco_plano      | Logica bifurcada por modelo de negocio; envolve 4+ tabelas de precos           | L1497-L1820                |
| CalculoRN279InatibosService       | Determina tabela de inativos e flags conforme RN279/309 ANS               | TabelaInativos, EmpresaConveniada                          | Delega para pr_tabela_inativos_rn279 + fn_copia_tabela_preco; regulatorio      | L1957-L1980                |
| GestaoAcessoInternetService       | Cria acesso internet com senha e controles de servico                     | AcessoInternetEmpresa, ControleInternet                    | Envolve 4 tipos de controle + vinculo a titulares/dependentes                  | L4350-L4460                |
| NotificacaoBoasVindasService      | Seleciona e envia email por operadora; registra log de envio              | EmpresaConveniada, Email, LogEnvioKit                      | Condicional por cd_empresa_plano; nao pertence a nenhuma entidade              | L4666-L4740                |

---

## 6. Domain Events

### Raciocinio de identificacao

Cada Domain Event foi identificado como um **fato consumado no negocio** que outros contextos precisam
conhecer. Todo COMMIT bem-sucedido desta procedure representa a materializacao de um contrato -- evento
de alta relevancia para Faturamento, Beneficiario e Auditoria.

Nomes em ingles conforme ADR-02 (mensageria pub/sub).

| Evento                              | Quando e Disparado                                             | Dados do Evento                                                    | Consumidores Identificados                | Topico Azure (Fase 3)              |
|-------------------------------------|----------------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------|------------------------------------|
| CompanyContractCreated              | Apos INSERT bem-sucedido em tb_empresa_conveniada              | cd_empresa, nu_controle, dt_inicio, cd_modelo_negocio, cd_filial  | Faturamento, Beneficiario, Auditoria      | empresa.contrato.criado            |
| ContractProvisioningCompleted       | Apos COMMIT de toda a parametrizacao operacional               | cd_empresa, cd_filial, total_planos, total_vidas                  | Faturamento, Odonto, Notificacao          | empresa.provisioning.concluido     |
| WelcomeEmailSent                    | Apos pr_send_mail / pr_send_mail_html_rn bem-sucedido          | cd_empresa, email_destino, cd_empresa_plano, dt_envio             | Auditoria, CRM                            | empresa.email.boasvindas.enviado   |
| CompanyPricingTableProvisioned      | Apos INSERT em tb_preco_plano (modelo atacado) ou vinculo AFFIX| cd_empresa, lcd_tabela, wfl_tabela_geral, cd_modelo_negocio       | Faturamento, Regulatorio                  | empresa.precificacao.provisionada  |
| ContractRegistrationFailed          | Apos WHEN OTHERS: ROLLBACK + INSERT tb_pendencia               | nu_controle, cd_pendencia, sqlerrm (anonimizado)                  | Monitoramento, Suporte, Auditoria         | empresa.cadastro.falhou            |

---

## 7. Repositorios

### Raciocinio

Um repositorio por Aggregate Root. Operacoes derivadas das queries e DMLs da eng. reversa.
Toda operacao que acessa uma tabela como tabela principal (nao via JOIN auxiliar) pertence ao
repositorio do agregado dono dessa tabela.

| Repositorio                         | Aggregate Root            | Operacoes                                                                        | Tabelas Oracle Envolvidas                                                                           |
|-------------------------------------|---------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| EmpresaConveniadaRepository         | EmpresaConveniada         | save, addPlano, addCarencia, addGrupo, addModulo, addFidelizacao, addHistorico, addEnderecos, addContatos, addCoparticipacao, addReembolso, addImplantacao, addBrekeven, findByCdEmpresa | tb_empresa_conveniada + todas as ~35 tabelas filhas                             |
| PropostaInternetEmpresaRepository   | PropostaInternet (readonly)| findByNuControle, updateDatas, updateStatus                                      | tb_empresa_internet                                                                                 |
| PessoaJuridicaRepository            | PessoaJuridica            | findByNuCgcCpf, save, update                                                     | tb_pessoa, tb_endereco_pessoa, tb_contato_pessoa, tb_meio_comunicacao_pessoa                        |
| AcessoInternetRepository            | AcessoInternetEmpresa     | save, addControlesServico, vinculaTitulares, vinculaDependentes, findByEmpresa   | tb_acesso_internet, tb_controle_internet, tb_usuario_titular_internet, tb_usuario_dependente_internet, tb_emp_limite_acesso_contra |
| ParametrizacaoComercialRepository   | (sem AR proprio)          | findParametrosNegociacao, findTabelaPreco, copyTabelaPreco                       | tb_empresa_neg, tb_empresa_neg_tabela, tb_preco_plano, tb_valor_plano, tb_parametro_franquia, tb_desconto_preco_plano |
| LogAuditoriaRepository              | (infraestrutura)          | saveLog, savePendencia                                                           | tb_log_baixa_controle, tb_pendencia_empresa_internet, tb_log_envio_kit                              |

**[ATENCAO]** Conforme ADR-22, cada repositorio deve ter uma **interface de dominio** (sem dependencia de
Oracle) e uma **implementacao de infraestrutura** (Oracle-specific). Na Fase 2 PL/SQL, a separacao
e feita via Package Specification (interface) + Package Body (implementacao).

---

## 8. Specifications

Specifications expressam criterios de elegibilidade e validacao como objetos de dominio autonomos.
Permitem combinar regras (AND/OR) e testar de forma isolada.

| Specification                         | Criterio                                                                   | Regra    | Uso                                         |
|---------------------------------------|----------------------------------------------------------------------------|----------|---------------------------------------------|
| PropostaElegivelParaProcessamentoSpec | fl_status_processamento IN (0, 8) AND nu_controle = param                  | RN01     | Cursor principal -- seleciona propostas      |
| ApenasInclusaoSpec                    | tp_operacao = '1'                                                          | RN02     | Guard clause -- ignora alteracao/exclusao    |
| VendedorAtivoSpec                     | EXISTS em tb_vendedor_plano WHERE cd_vendedor_plano = param                | RN04     | Valida vendedor antes de prosseguir         |
| CNPJNaoRestritoSpec                   | NOT EXISTS em tb_pessoa_lista_negra dentro do periodo de vigencia          | RN05     | Bloqueia CNPJ em lista negra                |
| DocumentoFiscalValidoSpec             | fn_check_cic IN (1,2,3); se CPF: fn_check_caepf > 0                       | RN09     | Valida CNPJ/CPF/CAEPF                       |
| DadosCadastraisCompletosSpec          | ~18 campos obrigatorios nao nulos                                          | RN10     | Guard clause cadastral completa             |
| PropostaComPlanoValidoSpec            | cd_plano NOT NULL AND dt_inicio NOT NULL AND dt_cancelamento NULL          | RN10     | Valida plano antes de qualquer operacao     |

---

## 9. Anti-Corruption Layers

ACLs isolam dependencias de sistemas externos, evitando contaminacao do modelo de dominio.

| ACL                              | Sistema Externo                   | Funcao                                                        | Metodo Exposto no Dominio                    |
|----------------------------------|-----------------------------------|---------------------------------------------------------------|----------------------------------------------|
| CodigoEmpresaGeneratorACL        | fn_empresa_conveniada (HUMASTER)  | Gera cd_empresa_conveniada unico via loop                     | gerarCodigoEmpresa(): String                 |
| ValidacaoDocumentoACL            | pk_administracao.fn_check_cic     | Valida CNPJ/CPF/CAEPF e retorna tipo (1/2/3)                  | validarDocumentoFiscal(doc): TipoDocumento   |
| GeracaoCodPessoaACL              | pk_administracao.fn_digito_out    | Adiciona digito verificador ao cd_pessoa                      | gerarCodigoPessoa(seed): String              |
| CriptografiaACL                  | pk_administracao.fn_encripta      | Criptografa senha de acesso internet                          | criptografarSenha(texto): String             |
| TabelaInatibosRN279ACL           | pr_tabela_inativos_rn279          | Busca tabela de inativos valida conforme RN279/309            | buscarTabelaInativos(...): ResultadoRN279    |
| CopiaTabelaPrecosACL             | fn_copia_tabela_preco             | Copia tabela de precos de inativos                            | copiarTabelaPrecos(tabela): Integer          |
| NotificacaoEmailACL              | pr_send_mail + pr_send_mail_html_rn | Envia email texto ou HTML conforme operadora                | enviarEmailBoasVindas(empresa, email): void  |
| OdontoSuperSimplesACL            | pr_vcc_empresa_super_simples      | Replica empresa para modulo odonto urgente                    | replicarParaOdontoUrgente(cdEmpresa): void   |
| RepasseOdontoACL                 | pr_odon_param_esp_empresa         | Parametriza repasse odonto automatico por operadora           | parametrizarRepasseOdonto(cdEmpresa): void   |

---

## 10. Factories

Factories encapsulam a logica de criacao complexa de agregados, garantindo que o estado inicial
seja sempre valido.

| Factory                         | Cria                    | Logica de Criacao                                                                                           |
|---------------------------------|-------------------------|-------------------------------------------------------------------------------------------------------------|
| EmpresaConveniadaFactory        | EmpresaConveniada       | A partir de PropostaInternet + parametros de negociacao + codigo gerado + pessoa + tabela de precos         |
| PessoaJuridicaFactory           | PessoaJuridica          | Verifica se ja existe por nu_cgc_cpf; se nao: gera sq_pessoa, aplica fn_digito_out, valida documento       |
| AcessoInternetFactory           | AcessoInternetEmpresa   | Gera sq_acesso_internet, cria senha (ultimos 6 digitos cd_pessoa criptografados -- [CRITICO] S10), insere  |

---

## 11. Mapa RN -> DDD

### Criterio geral de mapeamento

- **Invariante de Agregado:** Regras que devem ser sempre verdadeiras para o agregado ser valido
- **Domain Service:** Logica que envolve multiplos objetos de dominio e nao pertence a nenhum deles
- **Specification:** Criterio de elegibilidade ou validacao de pre-condicao
- **Metodo de Entidade:** Transicao de estado que pertence exclusivamente a uma entidade
- **Domain Event:** Fato consumado que outros BCs precisam conhecer
- **Factory:** Logica complexa de criacao de agregado

| ID RN | Descricao                                       | Conceito DDD             | Onde Vive                             | Raciocinio                                                                          |
|-------|-------------------------------------------------|--------------------------|---------------------------------------|-------------------------------------------------------------------------------------|
| RN01  | Selecao de propostas por status                 | Specification            | PropostaElegivelParaProcessamentoSpec | Criterio de elegibilidade -- pode ser testado isoladamente                          |
| RN02  | Apenas inclusao (tp_operacao='1')               | Specification            | ApenasInclusaoSpec                    | Guard clause -- nao e uma transicao de estado, e um filtro de entrada               |
| RN03  | Geracao do codigo via loop                      | Domain Service + ACL     | GeracaoCodigoEmpresaService + ACL     | Loop e detalhe de infraestrutura Oracle; Domain Service abstrai a intencao          |
| RN04  | Validacao do vendedor ativo                     | Specification            | VendedorAtivoSpec                     | Pre-condicao de negocio verificavel isoladamente                                    |
| RN05  | CNPJ na lista negra                             | Specification            | CNPJNaoRestritoSpec                   | Pre-condicao verificavel isoladamente                                               |
| RN06  | Resolucao de filial com hierarquia              | Domain Service           | ResolucaoFilialService                | Tres fontes em hierarquia -- nao pertence a nenhuma entidade isolada               |
| RN07  | Consolidacao de vidas SIGO                      | Domain Service           | ConsolidacaoVidasColigadaService      | Envolve tb_empresa_coligada e tb_empresa_internet -- multiplos agregados            |
| RN08  | Selecao de parametros SIGO vs BITIX             | Domain Service           | SelecaoParametrosNegociacaoService    | Dois cursores com logicas distintas por canal -- isolar o ramo condicional          |
| RN09  | Validacao tripla CNPJ/CPF/CAEPF                 | Specification + ACL      | DocumentoFiscalValidoSpec + ACL       | Validacao e do dominio; execucao delega para pk_administracao (ACL)                 |
| RN10  | ~18 validacoes de dados cadastrais              | Specification            | DadosCadastraisCompletosSpec          | Conjunto de pre-condicoes agrupadas em specification composta                       |
| RN11  | Canal de venda por faixa de vidas               | Metodo de entidade       | EmpresaConveniada.calcularCanalVenda()| Regra pura sobre atributos da propria empresa -- pertence a entidade               |
| RN12  | Tabela de precos propria vs compartilhada       | Domain Service           | GestaoTabelaPrecosService             | Envolve modelo_negocio + tabela_saude + fn_cd_tb_preco_plano -- multiplas deps      |
| RN13  | Planos por coparticipacao                       | Invariante de Agregado   | EmpresaConveniada                     | Empresa sempre deve ter planos coerentes com seu fl_coparticipacao                  |
| RN14  | RN279/309 tabela de inativos [ANS]              | Domain Service           | CalculoRN279InatibosService           | Delega calculo para pr_tabela_inativos_rn279 (ACL) e interpreta resultado           |
| RN15  | Flag faixa etaria ANS (RN195) [ANS]             | Domain Service           | CalculoFaixaEtariaANSService          | Multiplas condicoes (AFFIX + canal + 100 vidas) sem dono claro                     |
| RN16  | Dois branches de INSERT (dt_assinatura)         | Factory (condicional)    | EmpresaConveniadaFactory              | Logica de criacao com estado inicial bifurcado por prorrogacao                      |
| RN17  | Validade do contrato 12 meses ou herdada        | Domain Service           | CalculoVigenciaContratoService        | Envolve empresa-mae para modelos AFFIX -- nao pertence a EmpresaConveniada isolada |
| RN18  | Senha = ultimos 6 digitos do cd_pessoa          | Factory + ACL [CRITICO]  | AcessoInternetFactory + CriptografiaACL | [CRITICO] Senha deterministica -- ver S10; ACL isola fn_encripta                  |
| RN19  | Controles de acesso por dia de pagamento        | Metodo de entidade       | AcessoInternetEmpresa.configurarControles() | Logica sobre atributos do proprio acesso                                      |
| RN20  | Email de boas-vindas por operadora              | Domain Service           | NotificacaoBoasVindasService          | Logica condicional de selecao de template; nao pertence a empresa nem ao email     |
| RN21  | Minimo contratual na efetivacao                 | Metodo de entidade       | EmpresaConveniada.vincularMinimoContratual() | Operacao de vinculo em tb_empresa_minimo_contratual                         |
| RN22  | Odonto Super Simples para empresas sem odonto   | Domain Service + ACL     | OdontoSuperSimplesService + ACL       | Verificacao de ausencia de odonto + delegacao para Pr_Vcc_Empresa_Super_Simples    |
| RN23  | Tratamento de erro: ROLLBACK + pendencia [CRITICO] | Domain Event + Service | ContractRegistrationFailed + ErrorHandlingService | [CRITICO] p_erro_controle=NULL mascara o erro -- ver DD-CAD-04             |

---

## 12. Decisoes de Design

### Como as decisoes foram tomadas

Antes de modelar, foram lidas as ADRs ADR-22 (Padrao Repositorio), ADR-74 (DDD), ADR-05 (ACL),
ADR-02 (EDA) e ADR-21 (Linguagem Onipresente). As decisoes abaixo referenciam cada ADR aplicavel.

| #       | Decisao                                              | ADR de Referencia                   | Opcoes Avaliadas                                        | Escolha                                                  | Raciocinio                                                                                                                                                              |
|---------|------------------------------------------------------|-------------------------------------|---------------------------------------------------------|----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| DD-CAD-01 | Decomposicao em packages por Bounded Context       | [REF ADR-74]                        | Por tabela / Por camada / Por BC                        | 12 packages organizados por BC (BC-CAD-01..12)          | Decomposicao por tabela criaria ~40 packages sem coesao. Decomposicao por camada ignora limites do dominio. Decomposicao por BC alinha estrutura tecnica com o negocio. |
| DD-CAD-02 | t_contexto_cadastramento como TYPE Record          | [ADR-AUSENTE -- criar ADR para TYPE Record PL/SQL] | Parametros individuais / Cursor / TYPE Record | TYPE Record: t_contexto_cadastramento                | Parametros individuais criariam procedures com 25+ argumentos. TYPE Record permite evoluir sem quebrar assinaturas. Alinhado com padrao estabelecido em PR_EFETIVA_INTERNET. |
| DD-CAD-03 | Manter interface publica (p_nu_controle, p_erro_controle) | [REF ADR-05 -- ACL para chamadores] | Refatorar interface / Manter / Wrapper ACL   | Manter interface publica; refatorar internamente        | 5 chamadores em producao nao podem ser atualizados simultaneamente. Strangler Fig permite refatoracao incremental mantendo interface.                                    |
| DD-CAD-04 | Corrigir mascaramento de erro em p_erro_controle   | [REF ADR-74] [REF DD-01 base]       | Manter NULL / Retornar SQLERRM / Retornar codigo        | p_erro_controle = SQLERRM (nao NULL); criar tb_log para detalhe | [CRITICO] S04 + RN23: retornar NULL no handler engana todos os chamadores. Alinhado com DD-01 ja registrado em decisoes-design.md.                                     |
| DD-CAD-05 | Substituir senha deterministica por senha aleatoria | [REF ADR-74] [CRITICO S10]          | Manter 6 digitos / Random seguro / UUID                 | Senha aleatoria de 8 chars via dbms_random.string       | Senha baseada em cd_pessoa e previsivel para qualquer pessoa que conheca o codigo. Risco de seguranca real.                                                              |
| DD-CAD-06 | Remover CNPJ e senha do corpo do email             | [CRITICO S09]                       | Manter / Link seguro / Remover dados sensiveis          | Remover CNPJ e senha do email; usar link de primeiro acesso | Dados sensiveis em email plaintext violam boas praticas de seguranca. Referenciado como risco em S09.                                                                  |
| DD-CAD-07 | Eliminar WHEN OTHERS THEN NULL (80+ ocorrencias)   | [REF ADR-74] [S01]                  | Manter / Logar todos / Propagar                         | Logar via pk_log_auditoria; propagar excecoes relevantes | Excecoes engolidas ocultam bugs em producao. 80+ pontos de silenciamento e critico para observabilidade.                                                                |
| DD-CAD-08 | Extrair MAX+1 para SEQUENCE em todas as ocorrencias | [S05]                               | Manter MAX+1 / SEQUENCE Oracle / UUID                   | SEQUENCE Oracle (mantida em PL/SQL; UUID na Fase 3)     | MAX+1 gera race condition em concorrencia. Sequences Oracle sao atomicas e seguras. UUID na migracao Fase 3.                                                            |

---

## 13. Pendencias com o PO

| #   | Pendencia                                                                                          | Decisao Bloqueada                                    | Impacto de Nao Resolver                                             |
|-----|----------------------------------------------------------------------------------------------------|------------------------------------------------------|---------------------------------------------------------------------|
| P01 | tp_operacao != '1': alteracao e exclusao nao implementados nesta procedure. Ha procedure separada? | Scope do package BC-CAD-01                          | Se nao existir, RN02 indica gap funcional que precisa ser preenchido |
| P02 | p_erro_controle=NULL no handler: confirmado como bug ou comportamento intencional?                 | DD-CAD-04: como corrigir sem quebrar chamadores      | [CRITICO] Chamadores interpretam erro como sucesso -- A02           |
| P03 | V_COUNT_DT_ASSINATURA=1 zera dt_assinatura: nomenclatura contraintuitiva -- e intencional?         | Modelagem correta do EmpresaConveniadaFactory       | Risco de interpretacao errada ao refatorar o branch de INSERT       |
| P04 | Condicao fl_faixa_etaria_ans para 100 vidas EXATAS e regra ANS ou limitacao tecnica?               | CalculoFaixaEtariaANSService -- criterio preciso     | [ANS] Empresas com exatamente 100 vidas podem ter flag incorreta    |
| P05 | wfl_tabela_geral: SACTI 449802 ampliou para modelo!=1 -- todos os modelos != 1 corretos?           | GestaoTabelaPrecosService -- escopo correto          | Modelos de negocio incorretamente usando tabela compartilhada       |
| P06 | tb_fidelizacao_empresa: dt_fim = dt_inicio + 1000 dias -- regra de negocio ou placeholder?         | FidelizacaoContratual Value Object                  | Se placeholder, ha contratos com fidelizacao incorreta em producao  |
| P07 | tb_empresa_breakeven com valor fixo=70: qual o significado operacional deste valor?                | Invariante de EmpresaConveniada                     | Valor hardcoded sem rastreabilidade -- pode ser obsoleto            |

---

## 14. Pontos de Atencao para Migracao Futura

### Avaliacao global

A PR_CADASTRAMENTO_EMPRESA_PROV apresenta **alto acoplamento com infraestrutura Oracle**. Os maiores
obstaculos sao: (1) CURSORES sobre tabelas de negociacao (cr_empresa_neg, cr_empresa_neg_bitix) sem
equivalente direto; (2) dependencia de pk_administracao para validacao de documentos e criptografia;
(3) 80+ blocos WHEN OTHERS THEN NULL que ocultam erros e precisarao de tratamento explicito antes
da migracao; (4) transacao unica cobrindo 40+ tabelas -- na Fase 3 precisara de SAGA pattern.

| ID       | Trecho / Padrao Oracle                             | Motivo da Atencao                                              | Equivalente em .NET 8 / Azure                                               | Esforco   |
|----------|----------------------------------------------------|----------------------------------------------------------------|-----------------------------------------------------------------------------|-----------|
| MIG-CAD-01 | CURSOR cr_empresa_neg + FETCH + EXIT WHEN FOUND  | Cursor Oracle sem equivalente direto em .NET/SQL padrao        | LINQ FirstOrDefault() + Entity Framework                                    | Medio     |
| MIG-CAD-02 | CURSOR cr_empresa_internet (loop principal)      | Iteracao sobre staging -- requer streaming                     | IAsyncEnumerable<T> + EF Core ou Dapper                                     | Medio     |
| MIG-CAD-03 | fn_empresa_conveniada (loop ate 10001 tentativas)| Geracao de ID nao idempotente e fragil                         | UUID (Guid.NewGuid()) ou Azure SQL Identity                                  | Baixo     |
| MIG-CAD-04 | sq_pessoa, sq_acesso_internet (SEQUENCE Oracle)  | Sequences Oracle nao portaveis                                 | Guid.NewGuid() para ID negocio; Identity para ID tecnico                    | Medio     |
| MIG-CAD-05 | pk_administracao.fn_check_cic (validacao CNPJ)   | Package Oracle proprietario; logica de digito verificador      | NuGet: Caelum.BrazilianDocuments ou implementacao propria                    | Baixo     |
| MIG-CAD-06 | pk_administracao.fn_encripta (criptografia senha)| Criptografia Oracle proprietaria nao portavel                  | BCrypt.Net-Next ou PBKDF2 via .NET Cryptography API                          | Baixo     |
| MIG-CAD-07 | pr_send_mail / pr_send_mail_html_rn (email)      | Email via Oracle UTL_MAIL/SMTP nao e cloud-native              | Azure Communication Services Email SDK                                       | Baixo     |
| MIG-CAD-08 | WHEN OTHERS THEN NULL (80+ ocorrencias)          | Excecoes engolidas -- comportamento invisivel em producao      | Logging explicito via ILogger; exception middleware com correlationId        | Alto      |
| MIG-CAD-09 | Transacao unica cobrindo 40+ tabelas (COMMIT)    | Uma transacao distribuida nao e viavel em microsservicos       | SAGA Pattern (coreografia ou orquestracao) com compensacao por evento        | Alto      |
| MIG-CAD-10 | pr_vcc_empresa_super_simples (odonto sincrono)   | Chamada sincrona para outro dominio dentro da transacao        | Domain Event 'CompanyContractCreated' consumido pelo servico de Odonto      | Medio     |
| MIG-CAD-11 | pr_desconto_empresa (PIM ADM, pos-commit)        | Chamada pos-commit -- dependencia de ordem de execucao         | Domain Event 'ContractProvisioningCompleted' consumido por DescontoService  | Medio     |
| MIG-CAD-12 | MAX+1 como sequence (~15 ocorrencias internas)   | Race condition em producao com carga concorrente               | Sequences Oracle na Fase 2; IDENTITY/UUID na Fase 3                          | Medio     |
| MIG-CAD-13 | dbms_output.put_line(sqlerrm) no handler         | Logging nao capturado em JOBs e invisiavel em producao         | ILogger<T> + Azure Application Insights com structured logging              | Baixo     |

[HANDOFF-BACKLOG]
DDD concluido. Diagramas C4 e fluxogramas gerados (ver etapas 3 e 4).
Leitura obrigatoria antes de iniciar backlog:
- Este arquivo: ddd-modelagem-dominio.md
- reversa-pr-cadastramento-empresa-prov.md
- _shared/base-conhecimento/catalogo-regras-negocio.md
- _shared/base-conhecimento/decisoes-design.md (ver DD-01 sobre contrato tipado e DD-CAD-01..08)
