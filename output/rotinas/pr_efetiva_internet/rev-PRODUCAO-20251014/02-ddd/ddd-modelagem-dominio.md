# Modelagem DDD: PR_EFETIVA_INTERNET

**Baseado em:** reversa-pr-efetiva-internet.md (rev-PRODUCAO-20251014)
**Data:** 17/04/2026
**Agente:** Agente DDD (GitHub Copilot)
**Revisao ADRs:** 17/04/2026 -- Alinhamento com ADRs vigentes + marcacoes [MIGRACAO] + eventos em ingles

---

## 0. ADRs Consultadas

Revisao realizada em 17/04/2026 antes de qualquer decisao de design [REF CLAUDE.md -- Principios Universais].

| ADR | Titulo | Aplicabilidade ao Dominio | Status Alinhamento |
|-----|--------|---------------------------|--------------------|
| ADR-01 | Building Blocks | [MIGRACAO] Componentes reutilizaveis C#/.NET8 para futura implementacao | Lacuna futura |
| ADR-02 | Arquitetura Orientada a Eventos (EDA) | [ATENCAO] Events devem ser nomeados em ingles, broker: Service Bus para eventos criticos | Divergencia parcial |
| ADR-03 | CQRS | [ADR-AUSENTE] Segregacao Command/Query nao modelada explicitamente -- ver Secao 6 | Lacuna |
| ADR-05 | Padrao da Camada Anticorrupcao (ACL) | [OK] ACLs 01..04 alinhadas com a ADR | Alinhado |
| ADR-16 | Estrutura e Design dos Projetos | [MIGRACAO] Naming futuro: `Hapvida.Insurance.EfetivacaoPIM.{Tipo}` | Lacuna futura |
| ADR-18 | Padroes de mensageria (pub/sub) | [ATENCAO] Eventos na Secao 5 nomeados em portugues -- violacao: payload deve ser em ingles | Divergencia |
| ADR-21 | Linguagem Onipresente | [OK] Glossario Secao 2 em portugues correto; nomes tecnicos futuros em ingles | Alinhado |
| ADR-22 | Padrao Repositorio | [ATENCAO] Repositorios listados sem separar interface (dominio) de implementacao -- ver Secao 6 | Divergencia parcial |
| ADR-74 | Domain-Driven Design (DDD) | [OK] Todos os building blocks presentes: Entidades, VOs, Agregados, Repos, DS, DE, Specs, Factories | Alinhado |

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
8. [Anti-Corruption Layers](#8-anti-corruption-layers)
9. [Factories](#9-factories)
10. [Mapa RN -> DDD](#10-mapa-rn---ddd)
11. [Decisoes de Design](#11-decisoes-de-design)
12. [Pendencias com o PO](#12-pendencias-com-o-po)
13. [Pontos de Atencao para Migracao Futura](#13-pontos-de-atencao-para-migracao-futura)

---

## 1. Bounded Context

**Contexto principal:** Implantacao -- Efetivacao PIM (Portal Internet de Movimentacao)
**Schema legado:** HUMASTER
**Descricao:** Dominio responsavel por transformar propostas digitadas no canal internet (PIM) em contratos e beneficiarios definitivos no sistema SIGO. Orquestra 9 fases sequenciais de validacao, cadastramento e efetivacao para diferentes segmentos de contrato.

### 1.1 Subdominio e Tipo

| Tipo     | Subdominio                    | Descricao                                                                        |
|----------|-------------------------------|----------------------------------------------------------------------------------|
| Core     | Orquestracao de Efetivacao    | Loop principal: iterar propostas, decidir se efetiva, chamar sub-rotinas         |
| Core     | Processamento de Beneficiarios| Baixa de titulares e dependentes via pr_cadastramento_internet2                  |
| Support  | Validacao de Pendencias       | Motor de 13 tipos de pendencia (cd_pendencia 1..13) que bloqueiam efetivacao     |
| Support  | Critica de Beneficiarios      | pr_critica_internet, pr_critica_empresa_internet_1, tb_usuario_critica_internet  |
| Support  | Integracao Saude-Odonto       | Espelhamento de processos entre operadoras saude e odonto                        |
| Support  | Gestao de Status              | Maquina de estados dos controles e beneficiarios                                 |
| Generic  | Auditoria e Log               | Log de baixa, rastreabilidade de processamento                                   |
| Generic  | Configuracao de Sistema       | Flags e parametros do sistema (fn_registro_sistema)                              |
| Generic  | Integracao Externa            | Neoway, orcamento, adesao digital                                                |

### 1.2 Bounded Contexts Identificados

| BC       | Nome                       | Tipo    | Responsabilidade                                                                 |
|----------|----------------------------|---------|----------------------------------------------------------------------------------|
| BC-EI-01 | Orquestracao de Efetivacao | Core    | Loop principal PIM: iterar propostas, decidir efetivacao, tratar erros           |
| BC-EI-02 | Validacao de Pendencias    | Support | Motor de 13 pendencias (cd_pendencia 1..13) bloqueando efetivacao                |
| BC-EI-03 | Critica de Beneficiarios   | Support | pr_critica_internet, pr_critica_empresa_internet_1, tb_usuario_critica_internet  |
| BC-EI-04 | Cadastro de Empresa PJ     | Core    | Delegacao para pr_cadastramento_empresa_prov (empresa conveniada definitiva)     |
| BC-EI-05 | Integracao Saude-Odonto    | Support | Espelhamento saude->odonto: pr_odon_cad_empresa_prov, PR_NAT_JURIDICA_ODON       |
| BC-EI-06 | Processamento Beneficiarios| Core    | Baixa titulares/dependentes: pr_cadastramento_internet2, atualizacao de status   |
| BC-EI-07 | Gestao de Status           | Support | Maquina de estados. AS-IS: fl_status_processamento de tb_empresa_internet (0, 1, 2, 8, 9, 17) + fl_status de tb_proposta_venda (somente origem BITIX). TO-BE EI: apenas fl_status_processamento de tb_empresa_internet (mantem 0, 1, 2, 8, 9, 17) -- tb_proposta_venda e exclusiva da origem BITIX e sai do escopo do EI. [REF] fl_status_processamento='17' tem dois produtores disjuntos por origem: (1) Propostas WEBHAP: atribuido pelo Portal do Corretor Super Simples (fora do EI, antes da entrada em staging); (2) Propostas BITIX: atribuido por PR_VE_DIVERGENCIA_NEOWAY via PK_VENDA_JSON (VJ RN14). Os dois caminhos sao disjuntos (particionamento por cd_operados) -- nao interferem entre si. No EI to-be (exclusivo WEBHAP/TAFFIX), apenas o 1o caminho e relevante; o EI apenas consome o estado, nunca o produz. [REF Conflito 1 e Conflito 2 -- _shared/analise-comparativa-ddd-ei-vj.md] |
| BC-EI-08 | Auditoria e Log            | Generic | tb_log_baixa_controle, rastreabilidade de criticas e erros                       |
| BC-EI-09 | Configuracao de Sistema    | Generic | fn_registro_sistema: flags de controle de todo o fluxo                           |
| BC-EI-10 | Integracao Externa         | Generic | Neoway (fn_checa_divergencia), orcamento, adesao digital                         |
| BC-EI-11 | Carga Automatica PIM Modelo| Support | Carga automatica para empresas com modelo (tb_empresa_digitada)                  |
| BC-EI-12 | Individual/Familiar        | Support | Processamento automatico de contratos individuais                                |
| BC-EI-13 | Odonto Puro                | Support | Efetivacao exclusiva de empresas odonto sem saude                                |
| BC-EI-14 | Coligada SIGO (AS-IS inclui BITIX) | Support | AS-IS: PR_COLIGA_EMPRESA_BITIX, pr_processa_empresa_coligada, PK_VENDA_JSON.pr_efetiva. [REMOVER-NO-TO-BE] Parte BITIX (PR_COLIGA_EMPRESA_BITIX + chamada PK_VENDA_JSON.pr_efetiva + fn_registro_sistema('COLIGADA_EMPRESA_BITIX')) MIGRA para scheduler VJ. TO-BE EI: apenas pr_processa_empresa_coligada (coligadas SIGO nativas). [REF DD-05] [REF A9 -- pendencias-abertas.md] **[REF RN-T10]** `TB_EMPRESA_COLIGADA` e tabela canonica unica de coligadas, independentemente da origem. Coligadas BITIX entram em TB_EMPRESA_COLIGADA via PR_COLIGA_EMPRESA_BITIX (a partir do staging TB_EMPRESA_COLIGADA_BITX). Downstream BC-EI-14 sempre le TB_EMPRESA_COLIGADA -- nao le TB_EMPRESA_COLIGADA_BITX. [REF Conflito 8 -- _shared/analise-comparativa-ddd-ei-vj.md] |

### 1.3 Relacionamentos entre Bounded Contexts

| Contexto Relacionado  | Relacao           | Descricao                                                                  |
|-----------------------|-------------------|----------------------------------------------------------------------------|
| BC-EI-02 Pendencias   | Customer-Supplier | BC-EI-01 consome resultado do motor de pendencias                          |
| BC-EI-03 Criticas     | Customer-Supplier | BC-EI-01 consome resultado da critica antes de efetivar                   |
| BC-EI-04 Cadastro PJ  | Customer-Supplier | BC-EI-01 delega criacao da empresa para BC-EI-04                          |
| BC-EI-05 Saude-Odonto | Customer-Supplier | BC-EI-01 aciona espelhamento odonto apos empresa saude criada              |
| BC-EI-06 Beneficiarios| Customer-Supplier | BC-EI-01 aciona baixa de beneficiarios apos empresa criada                 |
| BC-EI-09 Configuracao | Conformist        | BC-EI-01 consome flags sem transformacao                                   |
| BC-EI-10 Ext. Externas| ACL               | BC-EI-02 isola chamadas a Neoway, orcamento, adesao digital                |

---

## 2. Novos Termos -- Linguagem Ubiqua

| Termo                   | Definicao de Negocio                                                          | Equivalente Tecnico                            | Contexto |
|-------------------------|--------------------------------------------------------------------------------|------------------------------------------------|----------|
| PIM                     | Portal Internet de Movimentacao -- canal digital de vendas PME (<=29 vidas)   | Conceito de negocio (nao tem tabela propria)   | BC-EI-01 |
| Proposta Internet       | Registro da empresa candidata a contrato, com dados em staging                | tb_empresa_internet (nu_controle)              | BC-EI-01 |
| Proposta Odonto         | Registro espelho da proposta saude para operadora odonto                       | tb_odon_empresa_internet                       | BC-EI-05 |
| Numero de Controle      | Identificador unico da proposta no staging                                     | tb_empresa_internet.nu_controle                | BC-EI-01 |
| Empresa Conveniada      | Entidade definitiva criada apos efetivacao da proposta                        | tb_empresa_conveniada                          | BC-EI-04 |
| Codigo Provisorio       | Codigo temporario 'T'+nu_controle, usado antes da efetivacao                  | tb_usuario_titular_internet.cd_empresa         | BC-EI-06 |
| Codigo Definitivo       | Codigo final da empresa conveniada (5 chars, lpad '0')                        | tb_empresa_conveniada.cd_empresa_conveniada    | BC-EI-04 |
| Baixa Automatica        | Processo automatizado que efetiva propostas PIM sem intervencao manual        | Logica de negocio central                      | BC-EI-01 |
| Titular Internet        | Beneficiario titular cadastrado via PIM                                        | tb_usuario_titular_internet                    | BC-EI-06 |
| Dependente Internet     | Dependente de titular cadastrado via PIM                                       | tb_usuario_dependente_internet                 | BC-EI-06 |
| Pendencia               | Restricao que impede a efetivacao automatica da proposta                       | tb_pendencia_empresa_internet (cd_pendencia)   | BC-EI-02 |
| Critica                 | Validacao de dados do beneficiario que pode bloquear a baixa                  | tb_usuario_critica_internet                    | BC-EI-03 |
| Canal de Venda          | Classificacao: 1 (1-29 vidas PME), 2 (30-99 vidas Middle)                    | Derivado de nu_total_empregado                 | BC-EI-01 |
| Localidade Limitrofe    | Cidade na area de abrangencia que requer aprovacao manual                      | tb_localidade_limitrofe                        | BC-EI-02 |
| Vendedor Nacional       | Vendedor com area de venda configurada como nacional                           | tb_area_venda_cfg.fl_vendedor_nacional         | BC-EI-02 |
| Ex-Cliente              | Empresa que ja teve contrato e esta sendo reativada (fl_tipo_contrato=2)      | tb_empresa_conveniada                          | BC-EI-04 |
| Coligada                | Grupo empresarial vinculado -- soma de empregados determina modelo de negocio  | tb_empresa_coligada                            | BC-EI-14 |
| Divergencia Neoway      | Inconsistencia detectada pelo servico externo Neoway (validacao cadastral)    | fn_checa_divergencia                           | BC-EI-10 |
| Empresa Digitada        | Empresa cadastrada por modelo/template (carga automatica)                     | tb_empresa_digitada                            | BC-EI-11 |
| Odonto Puro             | Empresa odonto sem vinculo a uma proposta saude                               | tb_odon_empresa_internet sem nu_controle_saude | BC-EI-13 |
| Individual/Familiar     | Empresa de plano individual ou familiar (codigo '00100')                       | fn_individual_familiar                         | BC-EI-12 |

---

## 3. Agregados

### AG01 -- Agregado: PropostaInternet (Aggregate Root)

**Aggregate Root:** PropostaInternet (tb_empresa_internet)
**BC:** BC-EI-01

**Invariantes:**
- tp_operacao = '1' (inclusao) para ser candidata a efetivacao
- fl_status_processamento IN (0, 1, 8) para entrar no loop PIM
- fl_sinaliza_vidas_ok = 'S' (digitacao concluida pelo operador) -- origem: RN05
- dt_cadastramento > '01/11/2012' (corte historico hardcode) -- origem: RN05 [ATENCAO]
- nu_total_empregado entre 1 e 29 (PME) ou entre 30 e 99 (Middle) -- origem: RN07

> [MIGRACAO] O loop principal que itera PropostaInternet e implementado via CURSOR PL/SQL (st_e) com ~40 colunas. Na migracao para microsservico: substituir por paginacao com EF Core/Dapper retornando projections LINQ tipadas. Cada "pagina" de propostas vira um batch processado por CommandHandler (ADR-03). [REF ADR-22 -- Padrao Repositorio]

**Entidades:**

| Entidade             | Identidade          | Atributos Principais                                                  | Tabela Oracle               |
|----------------------|---------------------|-----------------------------------------------------------------------|-----------------------------|
| PropostaInternet     | nu_controle         | tp_operacao, fl_status_processamento, fl_sinaliza_vidas_ok, nu_cgc_cpf| tb_empresa_internet         |
| TitularInternet      | nu_controle         | cd_empresa, fl_status_processamento, dt_nascimento, nu_cpf, dt_digitacao| tb_usuario_titular_internet |
| DependenteInternet   | nu_controle + dep   | cd_empresa, fl_status_processamento, dt_nascimento, nu_cpf, cd_tipo_dependente| tb_usuario_dependente_internet|

**Value Objects:**

| Value Object         | Atributos                                    | Regra de Validacao                                          |
|----------------------|----------------------------------------------|-------------------------------------------------------------|
| CanalVenda           | Derivado de nu_total_empregado               | 1-29=Canal1(PME), 30-99=Canal2(Middle), outros=nulo         |
| CodigoProvisorio     | 'T' + nu_controle                            | Usado como cd_empresa antes da efetivacao                   |
| CodigoDefinitivo     | cd_empresa_conveniada (VARCHAR2(5), lpad '0')| Gerado por pr_cadastramento_empresa_prov                    |
| FaixaVidas           | count(titulares + dependentes nao cancelados)| Deve estar entre 1 e 29 para PIM -- gera pendencia 8        |
| OrigemProposta       | cd_operados ('BITIX' ou outro)              | AS-IS: empresas BITIX sao isentas da validacao Neoway (RN18). [REMOVER-NO-TO-BE] EI to-be nao processa propostas BITIX -- este VO e a isencao Neoway associada devem ser removidos da procedure refatorada. A logica de isencao BITIX permanece no VJ. [REF MIG-16] |
| NomeInvalido         | nm_pessoa_razao_social + nm_fantasia         | Contem ASSOC%, CONDOM%, INSTITUTO%, SIND% -- gera pendencia 1|
| VidasAcima6Dias      | count de vidas com dt_digitacao - dt_cadastramento > 6| Conta vidas incluidas tardiamente -- gera pendencia 10|

---

### AG02 -- Agregado: PropostaOdonto (Aggregate Root)

**Aggregate Root:** PropostaOdonto (tb_odon_empresa_internet)
**BC:** BC-EI-05

**Invariantes:**
- nu_controle_saude vincula obrigatoriamente a uma PropostaInternet
- nu_cgc_cpf deve ser identico ao da proposta saude (RN21)
- So e processada se proposta saude foi efetivada com sucesso (l_empresa_conveniada_saude != null)

**Entidades:**

| Entidade       | Identidade | Atributos Principais                                            | Tabela Oracle              |
|----------------|------------|------------------------------------------------------------------|----------------------------|
| PropostaOdonto | nu_controle| nu_controle_saude, nu_cgc_cpf, cd_empresa, fl_status_processamento| tb_odon_empresa_internet   |

---

### AG03 -- Agregado: PendenciaEmpresa (Aggregate Root)

**Aggregate Root:** PendenciaEmpresaInternet (tb_pendencia_empresa_internet)
**BC:** BC-EI-02

**Invariantes:**
- cd_pendencia deve estar ativo em tb_tp_pend_empresa_internet (fl_status=1)
- Pendencia ativa bloqueia efetivacao (COUNT_PENDENCIAS > 0)
- Pendencias sao limpas (DELETE) e reavaliadas a cada ciclo do loop

**Entidades:**

| Entidade                 | Identidade         | Atributos Principais                                | Tabela Oracle                  |
|--------------------------|--------------------|-----------------------------------------------------|--------------------------------|
| PendenciaEmpresaInternet | nu_controle_pend.  | cd_pendencia, nu_controle, dt_status, cd_operador   | tb_pendencia_empresa_internet  |
| TipoPendenciaEmpresa     | cd_pendencia       | cd_pendencia, ds_pendencia, fl_status               | tb_tp_pend_empresa_internet    |

---

### AG04 -- Agregado: CriticaBeneficiario (Aggregate Root)

**Aggregate Root:** CriticaUsuarioInternet (tb_usuario_critica_internet)
**BC:** BC-EI-03

**Invariantes:**
- Critica existente bloqueia baixa do beneficiario
- Critica pode ser liberada pelo operador via tb_critica_liberada
- Critica '999-ERRO' indica falha tecnica em pr_cadastramento_internet2

**Entidades:**

| Entidade               | Identidade              | Atributos Principais                    | Tabela Oracle               |
|------------------------|-------------------------|-----------------------------------------|-----------------------------|
| CriticaUsuarioInternet | nu_controle + dep       | ds_critica, ds_campo, dt_critica        | tb_usuario_critica_internet |
| CriticaLiberada        | nu_controle + ds_critica| dt_liberacao, cd_operador               | tb_critica_liberada         |

---

### AG05 -- Agregado: EmpresaConveniada (Aggregate Root)

**Aggregate Root:** EmpresaConveniada (tb_empresa_conveniada)
**BC:** BC-EI-04

**Invariantes:**
- fl_status: 1=pendente, 2=ativo (nao pode ser ativada com pendencias criticas)
- fl_empresa_nova = 'S' apos efetivacao via PIM
- cd_tipo_internet: 0=operador (carga modelo), 1=tudo (completo), 2=so inclusao
- PendenciaEmpresa com cd_pendencia=1 obrigatoria apos criacao (RN22)

**Entidades:**

| Entidade           | Identidade             | Atributos Principais                                    | Tabela Oracle          |
|--------------------|------------------------|---------------------------------------------------------|------------------------|
| EmpresaConveniada  | cd_empresa_conveniada  | fl_status, fl_empresa_nova, cd_tipo_internet, ds_observacao| tb_empresa_conveniada|
| PendenciaEmpresa   | cd_empresa + cd_pend.  | cd_empresa_conveniada, cd_pendencia, nm_operador        | tb_pendencia_empresa   |
| UsuarioDefinitivo  | cd_usuario             | fl_status_usuario, ds_observacao                        | tb_usuario             |
| CompraCarencia     | nu_ordem_compra        | dias_adm_especial (=30 para odonto puro -- RN25)        | tb_compra_carencia     |

---

### AG06 -- Agregado: LogBaixaControle (Aggregate Root)

**Aggregate Root:** LogBaixaControle (humaster.tb_log_baixa_controle)
**BC:** BC-EI-08

**Invariantes:**
- cd_log = MAX(cd_log) + 1 (sequence manual -- sem garantia atomica) [ATENCAO] PADRAO-03
- fl_status: '0'=processo iniciado, '5'=critica encontrada, '10'=finalizado
- ds_observacao limitado a 1024 caracteres

> [MIGRACAO] cd_log = MAX+1 gera race condition em jobs paralelos. Em PL/SQL to-be: substituir por SEQUENCE Oracle (SQ_LOG_BAIXA). Na migracao para microsservico: UUID/ULID gerado no dominio, sem dependencia de banco. [REF ADR-74 -- consistencia de agregado]

---

### AG07 -- Agregado: PropostaVenda (Aggregate Root) [REMOVER-NO-TO-BE]

**Aggregate Root:** PropostaVenda (tb_proposta_venda)
**BC:** BC-EI-07

**[REMOVER-NO-TO-BE]** TB_PROPOSTA_VENDA e populada exclusivamente pela origem BITIX (confirmado 24/04/2026). As duas unicas operacoes do EI sobre esta tabela (SELECT COUNT em linha 1188 do CVS e UPDATE fl_status=9 em linha 1198) so disparam para propostas BITIX -- no EI to-be (exclusivo origens WEBHAP/TAFFIX) sao codigo morto. Este agregado, o repositorio R12 (PropostaVendaRepository) e o bloco de codigo associado devem ser REMOVIDOS na refatoracao de PR_EFETIVA_INTERNET. A propriedade da tabela TB_PROPOSTA_VENDA e a invariante "fl_status=9 quando ha criticas" pertencem integralmente ao DDD do VJ (BC-VJ-01/BC-VJ-05, AR PropostaEmpresaBitix).

**Invariantes (AS-IS, mantidas apenas como referencia historica):**
- fl_status = 9 quando existem criticas de beneficiarios (RN19) -- so se ativa para BITIX
- Atualizado somente quando wfl_critica='S' e existem criticas

**Resolucao do Conflito 1:** Com AG07 removido do EI, TB_PROPOSTA_VENDA deixa de ser tabela em disputa na analise comparativa EI x VJ -- ela pertence exclusivamente ao VJ. [REF Conflito 1 -- _shared/analise-comparativa-ddd-ei-vj.md]

---

### AG08 -- Agregado: EmpresaDigitada (Aggregate Root)

**Aggregate Root:** EmpresaDigitada (tb_empresa_digitada)
**BC:** BC-EI-11

**Invariantes:**
- fl_baixa_automatica = 1 habilita processamento da carga modelo (RN02)
- total de titulares <= 29 para processar (RN02)
- Avaliacao de fl_baixa: tb_modelo_empresa E tb_area_venda -- o segundo SELECT sobrescreve o primeiro [ATENCAO] RN02

---

## 4. Domain Services

> [REF ADR-74 -- Servicos de Dominio] Operacoes sem dono claro em uma entidade. Na migracao: cada DS vira uma classe C# injetavel via DI com interface propria.
> [MIGRACAO] Todos os DS abaixo estao implementados como blocos PL/SQL inline na procedure principal (2800 linhas). Na refatoracao em PL/SQL to-be: extrair cada DS para um package separado. Na migracao para microsservico: cada DS vira uma classe de servico independente.

| ID   | Domain Service                   | BC       | Responsabilidade                                                               | Procedure/Function Legada                            | Nota Migracao |
|------|----------------------------------|----------|--------------------------------------------------------------------------------|------------------------------------------------------|---------------|
| DS01 | AvaliacaoPendenciasService       | BC-EI-02 | Avaliar os 13 tipos de pendencia para uma proposta. Limpar e reinserir.        | Bloco inline (linhas 360-900): loops stp1..stp13     | [MIGRACAO] Strategy: ISpecification<PropostaInternet>[] |
| DS02 | CriticaBeneficiarioService       | BC-EI-03 | Executar criticas saude e odonto. Contar criticas.                             | pr_critica_internet, pr_critica_empresa_internet_1   | [MIGRACAO] Strategy: IOperadoraStrategy (Saude/Odonto) |
| DS03 | EfetivacaoEmpresaService         | BC-EI-04 | Delegar criacao da empresa a pr_cadastramento_empresa_prov. Tratar retorno.    | pr_cadastramento_empresa_prov(nu_controle, p_return) | [MIGRACAO] CommandHandler com Result<CdEmpresa> |
| DS04 | EfetivacaoOdontoService          | BC-EI-05 | Processar empresa odonto vinculada: pr_odon_cad_empresa_prov + nat. juridica.  | pr_odon_cad_empresa_prov, PR_NAT_JURIDICA_ODON       | [MIGRACAO] Strategy pattern compartilhado |
| DS05 | BaixaBeneficiarioService         | BC-EI-06 | Efetivar titulares/dependentes: status, codigo provisorio->definitivo, internet2| pr_cadastramento_internet2(nu_controle, fl_critica) | [MIGRACAO] BULK COLLECT -> IEnumerable<T> + BulkUpdate |
| DS06 | GestaoStatusService              | BC-EI-07 | Atualizar fl_status_processamento: 0->8->9, reverter para 1 em erro.           | Logica inline (multiplos UPDATEs)                    | [MIGRACAO] State machine explicita (enum + transitions) |
| DS07 | LogBaixaService                  | BC-EI-08 | Registrar logs de processo: inicio, criticas, finalizacao. cd_log = MAX+1.     | Blocos INSERT tb_log_baixa_controle                  | [MIGRACAO] ILogger estruturado + ULID |
| DS08 | ConfiguracaoSistemaService       | BC-EI-09 | Carregar flags: FL_CRITICA_SAUDE_ODONTO, FL_LOG_BAIXA_CONTROLE, HABILITA_65ANOS| fn_registro_sistema(nome)                            | [MIGRACAO] IConfiguration + Azure App Config (ADR-34) |
| DS09 | ValidacaoExternaService          | BC-EI-10 | Verificar: divergencia Neoway, orcamento cancelado, adesao digital aprovada.   | fn_checa_divergencia, fn_vi_checa_orcamento          | [MIGRACAO] HttpClient + Polly (retry/circuit breaker) |
| DS10 | CargaAutomaticaModeloService     | BC-EI-11 | Processar carga automatica PIM para empresas com modelo, <=29 vidas.           | Bloco inline (linhas 60-175)                         | [MIGRACAO] Use Case separado com paginacao |
| DS11 | ProcessamentoIndividualService   | BC-EI-12 | Criticar e efetivar contratos individuais/familiares (fl_inclui_usuario_auto). | Bloco inline (linhas 2170-2280)                      | [MIGRACAO] Use Case separado |
| DS12 | OdontoPuroService                | BC-EI-13 | Efetivacao de empresas somente odonto + pr_odon_Obrigacao_Agregado.            | Bloco inline (linhas 1870-2000)                      | [MIGRACAO] Use Case separado |
| DS13a | ColigadaBitixService [REMOVER-NO-TO-BE] | BC-EI-14 | AS-IS: acionar PR_COLIGA_EMPRESA_BITIX + PK_VENDA_JSON.pr_efetiva condicionado por fn_registro_sistema('COLIGADA_EMPRESA_BITIX')=1. **PR_COLIGA_EMPRESA_BITIX transfere coligadas BITIX do staging TB_EMPRESA_COLIGADA_BITX para a tabela canonica TB_EMPRESA_COLIGADA [REF RN-T10].** [REMOVER-NO-TO-BE] Toda logica BITIX deste servico MIGRA para scheduler de PK_VENDA_JSON -- criar DBMS_JOB/DBMS_SCHEDULER para VJ.pr_efetiva como pre-requisito do deploy do EI refatorado. EI to-be nao contem nenhuma referencia a PK_VENDA_JSON. PR_COLIGA_EMPRESA_BITIX migra para o VJ (nao e sub-rotina independente -- e parte do fluxo de unificacao staging->canonica da origem BITIX). [REF DD-05] [REF A9] | Bloco final (linhas 2267-2275 do CVS) | [MIGRACAO] Scheduler proprio VJ: DBMS_SCHEDULER no to-be PL/SQL; Azure Function Timer Trigger no microsservico. Inventario completo em MIG-16 e A-TO-BE-02. |
| DS13b | ColigadaSigoService | BC-EI-14 | AS-IS e TO-BE: processar vinculo de coligadas nativas SIGO via pr_processa_empresa_coligada. Permanece no EI refatorado -- nao e logica BITIX. | Bloco final (linhas 2276-2290 do CVS aprox.) | [MIGRACAO] Refatorar como Domain Service isolado; sem dependencia de PK_VENDA_JSON. |
| DS14 | ResolveCidadeContratoService     | BC-EI-02 | Resolver cidade: vendedor nacional usa filial do contrato, senao usa empresa.  | Bloco inline (linhas 410-460)                        | [MIGRACAO] Value Object CidadeContrato |

---

## 5. Domain Events

> [ATENCAO] ADR-18 -- Divergencia: Os eventos abaixo estao nomeados em portugues por conveniencia da documentacao. A ADR-18 exige que todo payload e nome de topico seja em INGLES, seguindo o padrao `hap-{context}-{nome-topico}` (kebab-case, passado). O contexto para esta funcionalidade e `hap-ins-pim-{evento}`. Os nomes de topico ADR-18 compliant estao na coluna "Topico (ADR-18)".
>
> [ATENCAO] ADR-18 -- Broker: Eventos de efetivacao (DE05, DE06, DE08, DE09) representam mudancas de estado criticas -- broker recomendado: **Azure Service Bus** (mensagens nao podem ser perdidas). Eventos de log (DE13) podem usar RabbitMQ.

| ID   | Evento (PT)                    | Topico ADR-18 (EN)                              | Publisher  | Subscribers         | Payload (camelCase EN)                                        |
|------|--------------------------------|-------------------------------------------------|------------|---------------------|---------------------------------------------------------------|
| DE01 | PropostaPIMSelecionada         | `hap-ins-pim-proposal-selected`                 | BC-EI-01   | BC-EI-02            | {nuControle, nuTotalEmpregado, tpOperacao}                    |
| DE02 | PendenciasAvaliadas            | `hap-ins-pim-validations-assessed`              | BC-EI-02   | BC-EI-01            | {nuControle, countPendencias, tipos[]}                        |
| DE03 | PropostaLiberadaParaEfetivacao | `hap-ins-pim-proposal-cleared`                  | BC-EI-01   | BC-EI-03, BC-EI-04  | {nuControle, cdEmpresaExistente}                              |
| DE04 | CriticasSaudeExecutadas        | `hap-ins-pim-beneficiary-critiques-run`         | BC-EI-03   | BC-EI-01            | {nuControle, qtdCriticasSaude, qtdCriticasOdonto}             |
| DE05 | EmpresaCriadaComSucesso        | `hap-ins-pim-company-created`                   | BC-EI-04   | BC-EI-05, BC-EI-06  | {nuControle, cdEmpresaDefinitivo}                             |
| DE06 | EmpresaCriacaoFalhou           | `hap-ins-pim-company-creation-failed`           | BC-EI-04   | BC-EI-08            | {nuControle, erro, mensagem}                                  |
| DE07 | OdontoEfetivadoComSucesso      | `hap-ins-pim-dental-company-created`            | BC-EI-05   | BC-EI-06            | {nuControleOdonto, cdEmpresaOdonto}                           |
| DE08 | CodigoProvisoriaMigrado        | `hap-ins-pim-provisional-code-migrated`         | BC-EI-06   | BC-EI-07            | {cdEmpresa, nuControle, tipo: 'health'/'dental'}              |
| DE09 | BeneficiarioEfetivado          | `hap-ins-pim-beneficiary-effected`              | BC-EI-06   | BC-EI-08            | {nuControle, cdUsuario, cdEmpresa}                            |
| DE10 | BeneficiarioComErro            | `hap-ins-pim-beneficiary-failed`                | BC-EI-06   | BC-EI-08            | {nuControle, erro, cdEmpresa}                                 |
| DE11 | BeneficiariosNaoEfetivados     | `hap-ins-pim-beneficiaries-not-effected`        | BC-EI-06   | BC-EI-07            | {cdEmpresa, qtNaoEfetivados, qtOdonto}                        |
| DE12 | StatusEmpresaRevertido         | `hap-ins-pim-company-status-reverted`           | BC-EI-07   | BC-EI-08            | {cdEmpresa, flStatus: 1, observacao}                          |
| DE13 | LogBaixaRegistrado             | `hap-ins-pim-log-registered`                    | BC-EI-08   | --                  | {cdLog, nuControle, flStatus}                                 |
| DE14 | EfetivacaoPIMConcluida         | `hap-ins-pim-effection-completed`               | BC-EI-01   | --                  | {totalProcessadas, totalPendentes, totalErros}                |

---

## 6. Repositorios

> [ATENCAO ADR-22 -- Padrao Repositorio] Os repositorios abaixo representam as INTERFACES de dominio. A ADR-22 exige que a implementacao fique fora da camada de dominio (camada de infraestrutura). Em PL/SQL to-be: o BODY do package implementa a interface. Na migracao: implementacao usa EF Core / Dapper, sem logica de negocio no repositorio.
>
> [ADR-AUSENTE -- CQRS ADR-03] As operacoes de leitura (`find*`, `buscar*`, `contar*`) e escrita (`inserir`, `atualizar`, `limpar`) estao misturadas nos repositorios. A ADR-03 exige segregacao Command/Query. Para o microsservico futuro: separar em **ReadRepository** (QueryService, retorna projecoes/DTOs) e **WriteRepository** (persiste apenas agregados). Sinalizar a criacao de ADR especifica para contratos de repositorio PL/SQL antes de implementar.

| ID  | Repositorio                     | Aggregate Root           | Operacoes                                                                     | Tabelas Oracle                         |
|-----|---------------------------------|--------------------------|-------------------------------------------------------------------------------|----------------------------------------|
| R01 | PropostaInternetRepository      | PropostaInternet         | findPendentesParaPIM(), atualizarStatus(), atualizarCdEmpresa()               | tb_empresa_internet                    |
| R02 | PropostaOdontoRepository        | PropostaOdonto           | findByNuControleSaude(), atualizarStatus()                                    | tb_odon_empresa_internet               |
| R03 | PendenciaInternetRepository     | PendenciaEmpresa         | limparPorControle(), inserir(), contarPorControle()                           | tb_pendencia_empresa_internet          |
| R04 | TipoPendenciaRepository         | TipoPendenciaEmpresa     | findAtivas(cd_pendencia)                                                      | tb_tp_pend_empresa_internet            |
| R05 | CriticaRepository               | CriticaBeneficiario      | contarCriticas(cd_empresa), inserirCriticaErro()                              | tb_usuario_critica_internet            |
| R06 | CriticaLiberadaRepository       | CriticaLiberada          | existeCriticaLiberada(nu_controle, ds_critica)                                | tb_critica_liberada                    |
| R07 | TitularInternetRepository       | TitularInternet          | findByEmpresa(), atualizarEmpresa(), atualizarStatus(), contarPorStatus()     | tb_usuario_titular_internet            |
| R08 | DependenteInternetRepository    | DependenteInternet       | findByEmpresa(), atualizarEmpresa(), atualizarStatus()                        | tb_usuario_dependente_internet         |
| R09 | EmpresaConveniadaRepository     | EmpresaConveniada        | reativar(), marcarNova(), marcarPendente(), buscarDtCadastramento()           | tb_empresa_conveniada                  |
| R10 | PendenciaEmpresaRepository      | EmpresaConveniada        | limparPorEmpresa(), inserirPendenciaInicial()                                 | tb_pendencia_empresa                   |
| R11 | LogBaixaRepository              | LogBaixaControle         | proximoCdLog(), registrar(), registrarCritica()                               | humaster.tb_log_baixa_controle         |
| R12 | PropostaVendaRepository [REMOVER-NO-TO-BE] | PropostaVenda (AG07) | existe(nu_controle), atualizarStatus() -- AS-IS so dispara para propostas BITIX | tb_proposta_venda |
| R13 | UsuarioDefinitivoRepository     | EmpresaConveniada        | atualizarStatus(), existeAtivo()                                              | tb_usuario                             |
| R14 | LocalidadeLimitrofeRepository   | Read Model               | contarPorCidade(), buscarFilial()                                             | tb_localidade_limitrofe                |
| R15 | VendedorRepository              | Read Model               | buscarFilial(), isVendedorNacional()                                          | tb_vendedor_plano, tb_area_venda_cfg   |
| R16 | AreaVendaRepository             | Read Model               | findComBaixaAutomatica()                                                      | tb_area_venda                          |
| R17 | EmpresaDigitadaRepository       | EmpresaDigitada          | findByAreaVendaComVidas()                                                     | tb_empresa_digitada, tb_modelo_empresa |
| R18 | RegistroSistemaRepository       | Read Model               | buscarValor(nome_registro)                                                    | tb_registro_sistema                    |

---

## 7. Specifications (Regras de Validacao)

Specifications encapsulam as regras de pendencia como predicados reutilizaveis. Cada Spec corresponde a um cd_pendencia.

| ID   | Specification               | cd_pend | Regra                                                                        | Resultado ao falhar       |
|------|-----------------------------|---------|------------------------------------------------------------------------------|---------------------------|
| SP01 | NomeInvalidoSpec            | 1       | Razao social ou fantasia contem ASSOC%, CONDOM%, INSTITUTO%, SIND%           | Pendencia 1               |
| SP02 | LocalidadeLimitrofeSpec     | 2       | Cidade do endereco/contrato encontrada em tb_localidade_limitrofe            | Pendencia 2               |
| SP03 | VendedorFilialConsistenteSpec| 3      | Filial do vendedor NULL, ou filial da localidade NULL, ou ambas divergem     | Pendencia 3               |
| SP04 | DependenteIdadeLimiteSpec   | 4       | Existe dependente (tipo!=1) com >43 anos sem parametrizacao de agregado      | Pendencia 4 [ANS]         |
| SP05 | SobrinhoIdadeLimiteSpec     | 5       | Existe dependente tipo 14 (sobrinho) com >23 anos sem parametrizacao         | Pendencia 5 [ANS]         |
| SP06 | IdadeLimite59AnosSpec       | 6       | Existe titular ou dependente com >=59 anos (quando HABILITA_65ANOS=0)        | Pendencia 6 [ANS]         |
| SP07 | CPFInvalidoSpec             | 7       | Titular com CPF invalido, ou dependente >18 anos sem CPF / com CPF invalido  | Pendencia 7               |
| SP08 | FaixaVidasInvalidaSpec      | 8       | Total de vidas (titulares + dependentes) < 1 ou > 29                         | Pendencia 8               |
| SP09 | InclusaoTardiaSpec          | 10      | Existe vida com (dt_digitacao - dt_cadastramento) > 6 dias                   | Pendencia 10              |
| SP10 | CriticaDIREXSpec            | 11      | pr_critica_empresa_internet_1 detecta inconsistencia                          | Pendencia 11              |
| SP11 | DivergenciaNeowaySpec       | 12      | fn_checa_divergencia retorna 'S' (exceto BITIX na AS-IS). [REF] Propostas BITIX recebem o equivalente funcional de CD_PENDENCIA=12 por outro caminho: PR_VE_DIVERGENCIA_NEOWAY + fl_status_processamento='17' via PK_VENDA_JSON. Ver VJ RN14 e base RN-T07 (catalogo-regras-negocio.md). Os dois caminhos sao disjuntos por cd_operados. [REF Conflito 3 -- _shared/analise-comparativa-ddd-ei-vj.md] | Pendencia 12              |
| SP12 | IdadeLimite65AnosSpec       | 13      | Existe titular ou dependente com >=65 anos (quando HABILITA_65ANOS!=0)        | Pendencia 13 [ANS]        |
| SP13 | ExClienteSpec               | --      | Empresa ja possui conveniada com fl_tipo_contrato=2                           | Caminho: reativar         |
| SP14 | VendedorNacionalSpec        | --      | fl_vendedor_nacional='S' -- isenta da validacao de filial                     | Bypass da SP03            |

---

## 8. Anti-Corruption Layers

> [REF ADR-05 -- Padrao da Camada Anticorrupcao] As ACLs abaixo estao alinhadas com a ADR-05: cada ACL isola a comunicacao entre contextos, centraliza logica de transformacao e permite que o dominio evolua sem conhecer os detalhes dos integradores.
> [MIGRACAO] Na migracao para microsservico: cada ACL vira um servico de adaptacao dedicado com HttpClient + Polly (retry/circuit breaker) para integradores externos, ou mensageria (Service Bus) para integradores internos.

### ACL01 -- Staging -> Orquestracao

```
tb_empresa_internet                    Contexto de Efetivacao
(cursor st_e -- ~40 colunas)  =====>   PropostaInternet (Agg)
- nu_controle                          CanalVenda (VO)
- nu_total_empregado                   NomeInvalido (VO)
- nm_pessoa_razao_social               FaixaVidas (VO)
- nm_fantasia                          CidadeContrato (VO)
- cd_vendedor_plano                    OrigemProposta (VO)
- cd_filial_contrato                   StatusProcessamento (VO)
- dt_cadastramento
- (~40+ campos)
```

**Adapter:** PropostaInternetAdapter
- Calcula CanalVenda a partir de nu_total_empregado
- Avalia NomeInvalido a partir de nm_pessoa_razao_social + nm_fantasia
- Extrai OrigemProposta de cd_operados

### ACL02 -- Resultado de Efetivacao -> Codigo Definitivo

```
p_return (VARCHAR2)            Resultado Efetivacao
da pr_cadastramento_  =====>   CodigoDefinitivo (VO)
empresa_prov                   - extraido apos ','
"mensagem,XXXXX"               - validado contra 'ORA-'
ou "ORA-xxxxx"                 - truncado para 5 chars
```

[CRITICO] Parsing fragil: ver proposta-novo-contrato-retorno.md -- RN20, S11.

**Adapter:** ResultadoEfetivacaoAdapter
- Extrai cd_empresa de `substr(p_return, instr(p_return, ',') + 1)`
- Verifica se contem 'ORA-' (indica erro)

> [MIGRACAO] Este ACL e o ponto de maior fragilidade estrutural. **Fase 1-2** da refatoracao de `pr_cadastramento_empresa_prov`: ACL02 permanece ativo (procedure antiga mantem a assinatura VARCHAR2 como Adapter/Facade -- ver DD-01 Opcao D Hibrida). **Fase 3** PL/SQL to-be: ACL02 e DESCONTINUADO -- EI passa a consumir o RECORD `pk_efetivacao_types.t_resultado_efetivacao` diretamente (acesso por campo, sem parsing). **Microsservico:** CommandHandler retorna `Result<CdEmpresa>` -- sem parsing de string. [REF DD-01 -- _shared/base-conhecimento/decisoes-design.md] [REF MIG-09 nesta secao] [REF ADR-03 -- CQRS: CommandHandler]

### ACL03 -- Proposta Odonto -> Espelhamento

```
tb_odon_empresa_internet       Contexto Saude-Odonto
- nu_controle          =====>  PropostaOdonto (Agg)
- nu_controle_saude            - vinculacao 1:1
- nu_cgc_cpf                   - mesmo CNPJ obrigatorio
- cd_empresa                   - pendencias espelhadas
```

**Adapter:** PropostaOdontoAdapter
- Valida nu_controle_saude = nu_controle da proposta saude
- Valida nu_cgc_cpf identicos

### ACL04 -- Integracoes Externas

```
Subsistemas Externos           Dominio Efetivacao
fn_checa_divergencia  =====>   FlagDivergencia (VO)
fn_vi_checa_orcamento          StatusOrcamento (VO)
fn_efetiva_adesao_dig          StatusAdesao (VO)
fn_individual_familiar         TipoEmpresa (VO)
pk_administracao.fn_check_cic  ValidacaoCPF (VO)
```

**Adapter:** IntegracaoExternaAdapter
- Encapsula chamadas a funcoes externas
- Traduz retornos crus em Value Objects tipados

---

## 9. Factories

| ID  | Factory                     | Cria                       | Complexidade | Logica                                                                     |
|-----|-----------------------------|----------------------------|--------------|----------------------------------------------------------------------------|
| F01 | PendenciaFactory            | PendenciaEmpresaInternet   | Media        | Cria pendencia com cd_pendencia, nu_controle, dt_status=sysdate. Duplica para odonto quando ha proposta odonto vinculada. |
| F02 | LogBaixaFactory             | LogBaixaControle           | Baixa        | cd_log = MAX+1 [ATENCAO]. Preenche nu_controle, ds_observacao (1024 chars), fl_status ('0', '5', '10'). |
| F03 | CriticaErroFactory          | CriticaUsuarioInternet     | Baixa        | ds_critica='999-ERRO NA PR_CADASTRAMENTO_INTERNET2:'+sqlerrm, ds_campo='nu_controle'. |
| F04 | PendenciaEmpresaFactory     | PendenciaEmpresa           | Baixa        | Cria pendencia tipo 1 (empresa nova) em tb_pendencia_empresa com nm_operador='HUMASTER'. |
| F05 | ContextoEfetivacaoFactory   | Contexto de efetivacao     | Alta         | Inicializa ~25 variaveis de controle (reset completo a cada proposta no loop). |

---

## 10. Mapa RN -> DDD

| ID RN | Descricao Resumida                                    | Tipo DDD                      | Onde Vive                                    |
|-------|-------------------------------------------------------|-------------------------------|----------------------------------------------|
| RN01  | Carga de 4 flags de controle no inicio                | ConfiguracaoSistema           | DS08 -- ConfiguracaoSistemaService           |
| RN02  | Baixa automatica PME <= 29 vidas por modelo           | Invariante de PropostaInternet| AG08 -- EmpresaDigitada / DS10               |
| RN03  | Ativacao do bloco PIM via MOVIMENTACAO_PIM_AUTOMATICO | Invariante de Orquestracao    | BC-EI-01 -- Use Case principal               |
| RN04  | Pre-validacao de coligadas antes do loop              | Domain Service                | DS13b -- ColigadaSigoService (AS-IS inclui acionamento via DS13a; no TO-BE permanece apenas a parte SIGO) |
| RN05  | Selecao de empresas PIM (dt_cad, fl_sinaliza, status) | Invariante de PropostaInternet| AG01 / R01 -- findPendentesParaPIM()         |
| RN06  | Exclusao de ex-clientes e PME 30-99 vidas             | Specification + Invariante    | SP13 -- ExClienteSpec / BC-EI-01             |
| RN07  | Determinacao do canal de venda por tamanho da empresa | Value Object                  | VO -- CanalVenda                             |
| RN08  | Pendencia 1 -- nome suspeito (ASSOC, SIND, etc.)      | Specification                 | SP01 -- NomeInvalidoSpec                     |
| RN09  | Pendencia 2 -- localidade limitrofe                   | Specification                 | SP02 -- LocalidadeLimitrofeSpec              |
| RN10  | Pendencia 3 -- vendedor fora da filial                | Specification                 | SP03 -- VendedorFilialConsistenteSpec        |
| RN11  | Pendencia 4 -- dependente acima de 43 anos            | Specification [ANS]           | SP04 -- DependenteIdadeLimiteSpec            |
| RN12  | Pendencia 5 -- sobrinho acima de 23 anos              | Specification [ANS]           | SP05 -- SobrinhoIdadeLimiteSpec              |
| RN13  | Pendencia 6/13 -- titular/dependente >= 59 ou 65 anos | Specification [ANS]           | SP06/SP12 -- IdadeLimite59/65AnosSpec        |
| RN14  | Pendencia 7 -- CPF invalido                           | Specification                 | SP07 -- CPFInvalidoSpec                      |
| RN15  | Pendencia 8 -- faixa de vidas invalida                | Specification                 | SP08 -- FaixaVidasInvalidaSpec               |
| RN16  | Pendencia 10 -- vida digitada apos 6 dias             | Specification                 | SP09 -- InclusaoTardiaSpec                   |
| RN17  | Pendencia 11 -- critica DIREX                         | Specification                 | SP10 -- CriticaDIREXSpec                     |
| RN18  | Pendencia 12 -- divergencia Neoway (exceto BITIX -- AS-IS) | Specification + ACL      | SP11 + ACL04 -- DivergenciaNeowaySpec. [REMOVER-NO-TO-BE] A clausula 'exceto BITIX' nao existe no EI to-be -- EI nao processa BITIX. SP11 passara a verificar Neoway para todas as origens nao-BITIX (WEBHAP, TAFFIX/PONTO, demais). |
| RN19  | Critica de beneficiarios antes do cadastro            | Domain Service + Invariante   | DS02 -- CriticaBeneficiarioService           |
| RN20  | Cadastro de empresa nova via pr_cadastramento_emp_prov| Domain Service + ACL          | DS03 -- EfetivacaoEmpresaService + ACL02     |
| RN21  | Cadastro de empresa odonto vinculada                  | Domain Service                | DS04 -- EfetivacaoOdontoService              |
| RN22  | Migracao de codigo provisorio para definitivo         | Domain Event + Repository     | DE08 + R07/R08 -- CodigoProvisoriaMigrado    |
| RN23  | Efetivacao de usuarios por canal de venda             | Domain Service                | DS05 -- BaixaBeneficiarioService             |
| RN24  | Tratamento de empresa com usuarios nao efetivados     | Domain Event + Repository     | DE11 + R09 -- BeneficiariosNaoEfetivados     |
| RN25  | Processamento odonto puro (sem saude)                 | Domain Service                | DS12 -- OdontoPuroService                    |
| RN26  | Efetivacao de inclusoes (cd_tipo_internet=2)          | Domain Service                | DS05 -- BaixaBeneficiarioService             |
| RN27  | Processamento completo (cd_tipo_internet=1)           | Domain Service                | DS05 -- BaixaBeneficiarioService             |
| RN28  | Processamento individual/familiar                     | Domain Service                | DS11 -- ProcessamentoIndividualService       |
| RN29  | Obrigacao de odonto agregado                          | Domain Service                | DS12 -- OdontoPuroService                    |
| RN30  | Processamento BITIX (integracao JSON) [REMOVER-NO-TO-BE] | Domain Service            | DS13a -- ColigadaBitixService. [REMOVER-NO-TO-BE] Esta RN MIGRA INTEGRALMENTE para PK_VENDA_JSON/scheduler. Nao existe no EI to-be. Ver MIG-16 e A-TO-BE-02. |
| RN31  | Processamento de coligadas SIGO                       | Domain Service                | DS13b -- ColigadaSigoService                 |

---

## 11. Decisoes de Design

> [REF ADR-74 -- DDD] Todas as decisoes de design devem ser referenciadas a uma ADR vigente. Decisoes sem ADR sao sinalizadas como [ADR-AUSENTE].

| Decisao | ADR de Referencia | Opcoes | Escolha | Justificativa |
|---------|-------------------|--------|---------|---------------|
| Procedure orquestradora vs dominio | [REF ADR-74 -- DDD] | Manter monolito / Separar em Use Cases | Use Cases separados por fase | 9 fases sao dominios distintos; cada fase deve ser testavel e deployavel independente |
| Motor de pendencias | [REF ADR-74 -- Specifications] | Logica inline / Specification pattern | Specification pattern (SP01..SP14) | 13 tipos de pendencia com logica identica -- abstrai em predicados testaveis |
| Contrato de retorno pr_cadastramento_emp | [ADR-AUSENTE] Sem ADR para contratos PL/SQL -- sinalizar lacuna | String parsada via substr/instr / OUT parameter tipado / Hibrido (Adapter + RECORD canonico) | **Hibrido (Opcao D)**: Fase 1-2 mantem assinatura legado `(p_nu_controle IN, p_erro_controle OUT VARCHAR2)`; Fase 3 introduz nova assinatura `(p_nu_controle IN, p_resultado OUT pk_efetivacao_types.t_resultado_efetivacao)` e a procedure antiga permanece como Adapter/Facade -- zero breaking change nos 4 chamadores (TAFFIX, BITIX, EI, VJ) durante a transicao. [REF DD-01 em _shared/base-conhecimento/decisoes-design.md] | Contrato canonico definido pela modelagem em execucao de pr_cadastramento_empresa_prov. Ver `output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/.../ESTRATEGIA-REFATORACAO-PLSQL.md` (Fase 3) e `APRESENTACAO-REFATORACAO-DDD.md` (Opcao D Hibrida). Parsing fragil no EI permanece necessario ate Fase 3 entrar em producao. [REF Conflito 5 -- _shared/analise-comparativa-ddd-ei-vj.md] |
| Duplicacao saude/odonto | [REF ADR-74 -- Domain Services] | Codigo duplicado (AS-IS) / Strategy por operadora | Strategy pattern | ~40% do codigo e duplicado; extrair em sub-rotina parametrizada por operadora |
| Log de baixa (cd_log = MAX+1) | [REF ADR-74 -- consistencia de agregado] | Manter SELECT MAX+1 / Sequence Oracle | Sequence Oracle (SQ_LOG_BAIXA) | Race condition critica com jobs paralelos (PADRAO-03) |
| WHEN OTHERS THEN NULL (50+) | [ADR-AUSENTE] Sem ADR para tratamento de erro PL/SQL -- sinalizar lacuna | Manter / Log estruturado + reraise | Log estruturado + reraise critico | Erros perdidos silenciosamente impedem diagnostico; risco operacional (PADRAO-01) |
| Transacao por empresa vs commit parcial | [REF ADR-74 -- consistencia de agregado] | COMMIT dentro do loop (AS-IS) / Unit of Work por empresa | Unit of Work por empresa | COMMITs parciais criam janelas de inconsistencia na migracao de codigo provisorio |
| Semantica do flag PIM (wVerificaPim) | [REF ADR-21 -- Linguagem Onipresente] | Manter logica invertida / Renomear | Renomear para wPimDesligado | Semantica invertida aumenta risco de bug em manutencao (S19) |
| Nomes de Domain Events | [REF ADR-18 -- Mensageria] + [REF ADR-21 -- Linguagem Onipresente] | Manter em portugues / Usar ingles (ADR-18) | Documentacao em PT + topicos ADR-18 em EN | Documentacao em portugues facilita leitura; topicos de broker devem ser ingles per ADR-18 |
| Repositorio interface vs implementacao | [REF ADR-22 -- Padrao Repositorio] | Interface + impl juntos (AS-IS PL/SQL) / Separar interface do dominio | Separar interface (dominio) de implementacao (infra) | ADR-22 exige agnosticismo de banco; necessario para futura migracao |
| Segregacao CQRS | [ADR-AUSENTE] ADR-03 nao coberto explicitamente -- sinalizar lacuna | Repositorios unificados (AS-IS) / Separar ReadModel e WriteModel | ReadModel separado para consultas complexas | ADR-03 exige CommandHandler sem retorno e QueryService para leituras |

---

## 12. Pendencias com o PO

- [ ] A01: Schema real e HUMASTER; usuario informou HEALTH. Confirmar se existe sinonimo publico valido em HEALTH.
- [ ] A02: Dupla consulta de fl_baixa (tb_modelo_empresa depois tb_area_venda sobrescreve). Qual regra prevalece?
- [ ] A03: fn_valida_coligada_baixa chamada com V_PROPOSTA_MAE=NULL. Codigo incompleto ou placeholder?
- [ ] A04: Data hardcode '01/11/2012' como corte historico. Pode ser removida ou parametrizada?
- [OK 24/04/2026] A05: Contrato de retorno de pr_cadastramento_empresa_prov via string fragil. **RESOLVIDO** pela modelagem em execucao de pr_cadastramento_empresa_prov -- adotada Opcao D Hibrida (Adapter/Facade mantem assinatura legado durante Fase 1-2; Fase 3 introduz RECORD canonico `pk_efetivacao_types.t_resultado_efetivacao` com 6 campos: fl_status, cd_empresa, ds_mensagem, ds_etapa_erro, cd_sqlcode, ds_sqlerrm). Parsing fragil no EI permanece ate Fase 3 entrar em producao. [REF DD-01 atualizado em _shared/base-conhecimento/decisoes-design.md] [REF Conflito 5 -- _shared/analise-comparativa-ddd-ei-vj.md] [REF MIG-09 nesta secao].
- [ ] A06: Logica de exclusao de ex-cliente acoplada ao flag HABILITA_65ANOS. Intencional ou acidente?
- [ ] A07: Limite de 59 vs 65 anos: qual e o limite correto para o produto atual? [ANS]
- [ ] A08: cd_pendencia=499 hardcoded em RN27. Qual o significado?
- [ ] A09: Sinonimo publico PR_EFETIVA_INTERNET esta INVALID (09/04/2026). Verificar com DBA.
- [ ] A10: Data hardcode '16/05/2017' para odonto puro. Pode ser parametrizada?
- [ ] A11: MOVIMENTACAO_PIM_AUTOMATICO='NAO' em producao. Bloco PIM desligado. Temporario ou permanente?
- [OK] A-TO-BE-01: [DECIDIDO 24/04/2026 pelo usuario] VJ deve ser TOTALMENTE desacoplado de EI. A chamada direta EI->VJ foi REJEITADA. VJ tera scheduler proprio (DBMS_JOB/DBMS_SCHEDULER no PL/SQL to-be; Azure Function Timer no microsservico). Evento ADR-02 nao e necessario para o trigger. O bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 do CVS) deve ser REMOVIDO da refatoracao de PR_EFETIVA_INTERNET. [REF DD-05 -- decisoes-design.md]
- [-] A-TO-BE-02: [24/04/2026] Inventario de logica BITIX no EI a ser removida na refatoracao e migrada para VJ/scheduler. Elementos a REMOVER do EI to-be: (1) DS13a/BC-EI-14 parte BITIX: bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 do CVS) + chamada PK_VENDA_JSON.pr_efetiva; (2) VO OrigemProposta: referencia a cd_operados='BITIX' e regra de isencao Neoway; (3) RN30: processamento BITIX (integracao JSON) -- migra para scheduler VJ; (4) SP11/RN18: remover clausula 'exceto BITIX' -- no EI to-be todas as origens nao-BITIX (WEBHAP, TAFFIX/PONTO) sao verificadas pelo DivergenciaNeowaySpec; (5) fn_registro_sistema('COLIGADA_EMPRESA_BITIX'): flag passa a pertencer exclusivamente ao VJ; (6) AG07 PropostaVenda + R12 PropostaVendaRepository: TB_PROPOSTA_VENDA e exclusiva da origem BITIX -- remover as duas operacoes residuais no EI (linhas 1188 e 1198 do CVS: SELECT COUNT e UPDATE fl_status=9). Elementos a documentar no DDD do VJ: ver MIG-16. Pre-requisito do deploy: A9 em pendencias-abertas.md. [REF DD-05] [REF MIG-16]

---

## 13. Pontos de Atencao para Migracao Futura

> Esta secao consolida todos os pontos sinalizados com [MIGRACAO] no documento.
> [REF ADR-01 -- Building Blocks] [REF ADR-16 -- Estrutura e Design dos Projetos]
> Futura implementacao: `Hapvida.Insurance.EfetivacaoPIM.{Api|Consumer|Orchestrator}`

| ID | Ponto de Atencao | Padrao Oracle Legado | Equivalente em Microsservico | ADR Associada |
|----|------------------|----------------------|------------------------------|---------------|
| MIG-01 | CURSOR st_e iterando ~40 colunas de tb_empresa_internet | FOR LOOP com CURSOR | Paginacao com EF Core / Dapper -- projection LINQ tipada | ADR-22 |
| MIG-02 | BULK COLLECT + FORALL na efetivacao de beneficiarios | BULK COLLECT / FORALL | IEnumerable<T> + EF Core BulkUpdate / ExecuteUpdate | ADR-22 |
| MIG-03 | fn_registro_sistema: configuracao via tabela Oracle | SELECT de TB_REGISTRO_SISTEMA | Azure App Configuration / IConfiguration (appsettings + tokenizacao ADR-34) | ADR-34 |
| MIG-04 | DBMS_JOB / DBMS_SCHEDULER como disparador da procedure | DBMS_JOB | Azure Function Timer Trigger ou Kubernetes CronJob | ADR-17 / ADR-29 |
| MIG-05 | COMMIT dentro do loop por empresa | COMMIT parcial em loop | Unit of Work: IUnitOfWork + DbContext.SaveChangesAsync -- uma transacao por empresa | ADR-74 |
| MIG-06 | cd_log = MAX(cd_log) + 1 (race condition em jobs paralelos) | SELECT MAX+1 inline | SEQUENCE Oracle no to-be PL/SQL -- UUID/ULID gerado no dominio no microsservico | ADR-74 |
| MIG-07 | Domain Events disparados via chamada direta (sem event bus) | Chamada direta de procedure | Azure Service Bus (DE05/06/08/09: criticos, sem perda) ou RabbitMQ (DE13: log) | ADR-02 / ADR-18 |
| MIG-08 | DS01..DS14 implementados como blocos inline (2800 linhas) | Blocos PL/SQL inline em procedure unica | Domain Services como classes C# injetaveis via DI -- uma classe por responsabilidade | ADR-74 |
| MIG-09 | Contrato de retorno pr_cadastramento_empresa_prov via string | OUT VARCHAR2 parseado com substr/instr (`substr(p_return, instr(p_return, ',') + 1)` + checagem `ORA-`) | **Fase 3 PL/SQL to-be (canonico):** nova assinatura `(p_nu_controle IN, p_resultado OUT pk_efetivacao_types.t_resultado_efetivacao)` -- RECORD com 6 campos (fl_status, cd_empresa, ds_mensagem, ds_etapa_erro, cd_sqlcode, ds_sqlerrm). Procedure antiga permanece como Adapter/Facade. **Microsservico:** CommandHandler com Result<CdEmpresa>. [REF contrato canonico em output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/.../ESTRATEGIA-REFATORACAO-PLSQL.md] [REF DD-01 em _shared/base-conhecimento/decisoes-design.md] [REF Conflito 5 RESOLVIDO em _shared/analise-comparativa-ddd-ei-vj.md] | ADR-03 / ADR-05 |
| MIG-10 | Duplicacao saude/odonto (~40% do codigo identico) | IF duplo inline por operadora | Strategy Pattern: IOperadoraStrategy com SaudeStrategy e OdontoStrategy | ADR-74 |
| MIG-11 | WHEN OTHERS THEN NULL (50+ ocorrencias -- erros silenciosos) | Swallow de excecao | Middleware de excecao global + ILogger estruturado + reraise com DomainException | ADR-74 |
| MIG-12 | Repositorios como acesso direto a tabelas Oracle (DML inline) | DML inline sem abstracao | Interfaces IRepository no dominio; implementacoes EF Core/Dapper na infra | ADR-22 |
| MIG-13 | ACLs externas (Neoway, orcamento, adesao) via function Oracle | fn_checa_divergencia, fn_vi_checa_orcamento | HttpClient + Polly (retry + circuit breaker) encapsulado em ACL service | ADR-05 |
| MIG-14 | Specifications (SP01..SP14) como blocos IF inline | IF aninhados em procedure | Classes ISpecification<PropostaInternet> -- testaveis e reutilizaveis | ADR-74 |
| MIG-15 | Contexto de efetivacao em ~25 variaveis locais da procedure | Variaveis locais PL/SQL | ContextoEfetivacao como RECORD TYPE to-be; DTO/Value Object imutavel no microsservico | ADR-74 |
| MIG-16 | Bloco BITIX inteiro do EI (DS13a + BC-EI-14 parte BITIX + AG07 + R12) -- REMOVER NO TO-BE | Logica BITIX inline no EI: PR_COLIGA_EMPRESA_BITIX + chamada PK_VENDA_JSON.pr_efetiva + fn_registro_sistema('COLIGADA_EMPRESA_BITIX') + VO OrigemProposta (isencao Neoway) + RN30 (linhas 2267-2275 do CVS) + AG07 PropostaVenda + R12 PropostaVendaRepository (linhas 1188 e 1198 do CVS: SELECT COUNT e UPDATE tb_proposta_venda fl_status=9) | REMOVER do EI to-be. Elementos a absorver no VJ/scheduler: (1) criar DBMS_JOB/DBMS_SCHEDULER para PK_VENDA_JSON.pr_efetiva como pre-requisito do deploy do EI refatorado; (2) avaliar incorporacao de PR_COLIGA_EMPRESA_BITIX no VJ ou manter como sub-rotina independente; (3) fn_registro_sistema('COLIGADA_EMPRESA_BITIX') passa a ser flag exclusivo do VJ; (4) isencao Neoway para BITIX permanece no VJ; (5) AG07 PropostaVenda e R12 -- TB_PROPOSTA_VENDA e exclusiva do BITIX, pertence integralmente ao VJ; a invariante "fl_status=9 se ha criticas" deve ser validada/absorvida no VJ. Refatoracao do EI to-be nao deve conter nenhuma referencia a BITIX, PK_VENDA_JSON, TB_PROPOSTA_VENDA ou TB_EMPRESA_COLIGADA_BITX. | DD-05 / ADR-74 |

---

[HANDOFF-BACKLOG]
DDD revisado e aprovado para consumo pelo Agente Backlog.
Revisao aplicada: 17/04/2026 -- alinhamento ADRs + [MIGRACAO] markers + Domain Events EN (ADR-18).

Lacunas de ADR identificadas nesta revisao:
- [ADR-AUSENTE] CQRS em repositorios PL/SQL (ADR-03 nao cobre PL/SQL)
- [ADR-AUSENTE] Tratamento de erro em PL/SQL (WHEN OTHERS padronizado)
- [ADR-AUSENTE] Contratos de API PL/SQL (OUT parameters vs strings)

Leitura obrigatoria antes de iniciar backlog:
- Este arquivo: output/rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/02-ddd/ddd-modelagem-dominio.md
- reversa-pr-efetiva-internet.md (rev-PRODUCAO-20251014)
- _shared/base-conhecimento/catalogo-regras-negocio.md
- _shared/base-conhecimento/padroes-identificados.md
- _shared/base-conhecimento/decisoes-design.md (DD-01 -- contrato canonico de pr_cadastramento_empresa_prov)
- _shared/analise-comparativa-ddd-ei-vj.md (Conflitos 1..10, em especial 3, 5, 10)
- output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/pr_cadastramento_empresa_prov/ESTRATEGIA-REFATORACAO-PLSQL.md (contrato canonico Fase 3: pk_efetivacao_types.t_resultado_efetivacao)
- output/rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/backup/01-engenharia-reversa/proposta-novo-contrato-retorno.md (evidencia historica do parsing fragil -- solucao de design SUPERSEDED pela DD-01)
