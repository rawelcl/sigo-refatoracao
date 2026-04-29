# Modelagem de Dominio (DDD) -- pr_cadastramento_empresa_prov

> **Objetivo:** Mapear todas as entidades, value objects, aggregates, domain services, repositories,
> domain events e demais artefatos DDD extraidos da analise da procedure `pr_cadastramento_empresa_prov`
> (4.991 linhas PL/SQL) e a "baixa" de contratos PJ de planos de saude.

---

## Sumario

1. [Glossario Ubiquo (Ubiquitous Language)](#1-glossario-ubiquo)
2. [Dominio, Subdominios e Bounded Contexts](#2-dominio-subdominios-e-bounded-contexts)
   - 2.0 [Dominio e Subdominios (Core / Supporting / Generic)](#20-dominio-e-subdominios)
   - 2.1 [Bounded Contexts Identificados](#21-bounded-contexts-identificados)
   - 2.2 [Context Map e Relacionamentos](#22-context-map--relacionamentos)
3. [Aggregates (Raizes de Agregado)](#3-aggregates)
4. [Entities (Entidades)](#4-entities)
5. [Value Objects](#5-value-objects)
6. [Domain Services](#6-domain-services)
7. [Application Services (Use Cases)](#7-application-services)
8. [Repositories](#8-repositories)
9. [Domain Events](#9-domain-events)
10. [Factories](#10-factories)
11. [Specifications (Regras de Validacao)](#11-specifications)
12. [Anti-Corruption Layer (ACL)](#12-anti-corruption-layer)
13. [Mapeamento Tabela -> Artefato DDD](#13-mapeamento-tabela--artefato-ddd)
14. [Diagrama de Agregados (Visual)](#14-diagrama-de-agregados)
15. [Fluxo de Dominio (Orquestracao)](#15-fluxo-de-dominio)

---

## 1. Glossario Ubiquo

> **Ubiquitous Language** e vocabulario compartilhado entre desenvolvedores e especialistas de negocio.

| Termo do Dominio | Tabela(s) no Legado | Significado |
|---|---|---|
| **Proposta** | `tb_empresa_internet` | Proposta de contrato PJ pendente de efetivacao ("baixa"), cadastrada pelo vendedor via TAFFIX ou BITIX |
| **Empresa Conveniada** | `tb_empresa_conveniada` | Contrato efetivado de uma pessoa juridica com a operadora de saude. e o conceito central da procedure |
| **Pessoa Juridica** | `tb_pessoa` | Entidade legal (CNPJ) associada ao contrato da empresa |
| **Filial** | `tb_filial` | Unidade regional da operadora (Hapvida/RN Saude) que gerencia a empresa |
| **area de Venda** | `tb_area_venda` | Concessionaria/escriterio de vendas. Vincula vendedor -> filial |
| **Vendedor** | `tb_vendedor_plano` | Corretor/vendedor que realizou a proposta |
| **Modelo de Negocio** | `tb_empresa_neg` / `tb_empresa_neg_bitix` | Parametrizacao comercial que define regras de precificacao, coparticipacao, carencia etc., com base em filial + natureza + faixa de empregados |
| **Coligada** | `tb_empresa_coligada` / `tb_empresa_coligada_bitx` | Grupo empresarial. Empresas de um mesmo grupo somam empregados para obter faixas de desconto diferenciadas |
| **Tabela de Preco** | `tb_preco_plano` / `tb_valor_plano` | Tabela com valores mensais por plano e faixa etaria |
| **Coparticipacao** | `tb_controle_fator_empresa` / `tb_fator_empresa` / `tb_terapias_espec_empresa` | Percentuais e regras de participacao do beneficiario nos custos de procedimentos |
| **Carencia** | `tb_compra_carencia` / `tb_compra_grupo` / `tb_compra_modulo` | Regras de carencia (periodos de espera) e compra parcial de carencia |
| **Fidelizacao** | `tb_fidelizacao_empresa` | Periodo minimo de permanencia contratual por faixa de admissao |
| **Unidade Contratual** | `tb_empresa_conveniada_unidade` / `tb_parametros_unidade` | Subdivisao do contrato (unidade 1 padrao), cada uma com sua tabela de preco |
| **Reembolso** | `tb_reemb_empresa_*` | Parametrizacao de livre escolha / reembolso por plano |
| **Minimo Contratual** | `tb_empresa_minimo_contratual` | Valor minimo de faturamento ou quantidade minima de vidas garantida contratualmente |
| **Acesso Internet** | `tb_acesso_internet` / `tb_controle_internet` | Credenciais de acesso ao portal web da empresa para movimentacao (inclusao/exclusao de beneficiarios) |
| **Canal de Venda** | Derivado de `qt_total_empregados` | Classificacao: 1 (1-29 vidas), 2 (30-99 Middle), null (100+) |
| **Natureza da Empresa** | `fl_natureza_empresa` | Tipo: PME (6,9), Adesao, Individual etc. |
| **AFFIX** | `fn_checa_contrato_affix` | Empresa administradora de beneficios que terceiriza a gestao. Contratos AFFIX possuem regras especiais |
| **Espelhamento Odonto** | `tb_odon_param_esp_*` | Replicacao automatica de parametros saude->odonto entre operadoras |
| **Isencao de Coparticipacao** | `tb_empresa_neg_isenta_copart` / `tb_copart_*` | Regras que isentam determinadas faixas etarias/crunicas/etc. da coparticipacao |
| **Breakeven** | `tb_empresa_breakeven` | Valor percentual de breakeven para controle de sinistralidade |
| **CAEPF** | Campo `cd_empresa_plano` | Cadastro de Atividade Economica da Pessoa Fisica e usado para resolver a empresa-plano |
| **Internacao PJ** | `tb_copart_internacao_param_pj` | Parametros especificos de coparticipacao em internacao para contratos PJ |

---

## 2. Dominio, Subdominios e Bounded Contexts

### 2.0 Dominio e Subdominios

#### Dominio Principal (Problem Space)

> **Dominio:** Gestao de Contratos Empresariais de Planos de Saude  
> **Problema central:** Transformar uma proposta comercial de plano de saude PJ em um contrato efetivado ("baixa"), provisionando todas as parametrizacoes necessarias para faturamento, atendimento e gestao do contrato.

#### Classificacao de Subdominios

No DDD estrategico, subdominios sao classificados em 3 tipos:
- **Core Domain** e e o diferencial competitivo; onde a empresa investe mais. Justifica complexidade e modelagem rica.
- **Supporting Subdomain** e Necessario para o Core funcionar, mas nao e diferencial. Modelagem moderada.
- **Generic Subdomain** e Problema comum a qualquer empresa. Pode ser resolvido com solucoes prontas.

```
-----------------------------------------------------------------------------------
|          DOMINIO: Gestao de Contratos Empresariais de Planos de Saude          |
|                                                                                 |
|  ---- -- CORE DOMAIN -------------------------------------------------------   |
|  |                                                                          |   |
|  |  Subdominio: EFETIVACAO DE CONTRATO PJ                                  |   |
|  |  |-- BC-01: Proposta e Orquestracao                                     |   |
|  |  |-- BC-08: Empresa Conveniada (entidade central do negocio)            |   |
|  |                                                                          |   |
|  |  Subdominio: PRECIFICACAO E MODELO COMERCIAL                            |   |
|  |  |-- BC-06: Modelo de Negocio (parametrizacao comercial)                |   |
|  |  |-- BC-07: Precificacao (tabelas de preco, valores, descontos)         |   |
|  |                                                                          |   |
|  |  Subdominio: REGULAMENTACAO E PARTICIPACAO DO BENEFICIARIO              |   |
|  |  |-- BC-09: Coparticipacao (franquias, fatores, isencoes)               |   |
|  |  |-- BC-10: Carencia e Compra de Carencia                               |   |
|  |                                                                          |   |
|  ----------------------------------------------------------------------------   |
|                                                                                 |
|  ---- -- SUPPORTING SUBDOMAINS ---------------------------------------------   |
|  |                                                                          |   |
|  |  Subdominio: CADASTRO DE PESSOA JURIDICA                                |   |
|  |  |-- BC-03: Pessoa Juridica (CNPJ, razao social)                        |   |
|  |  |-- BC-04: Endereco e Meios de Comunicacao                             |   |
|  |                                                                          |   |
|  |  Subdominio: ESTRUTURA COMERCIAL                                         |   |
|  |  |-- BC-05: Filial e area de Venda (vendedor, concessionaria)           |   |
|  |  |-- BC-18: Desconto e PIM (descontos administrativos)                  |   |
|  |                                                                          |   |
|  |  Subdominio: TERMOS CONTRATUAIS                                          |   |
|  |  |-- BC-11: Fidelizacao Contratual (permanencia minima)                 |   |
|  |  |-- BC-15: Reembolso / Livre Escolha                                   |   |
|  |  |-- BC-16: Minimo Contratual e Breakeven                               |   |
|  |                                                                          |   |
|  |  Subdominio: VALIDACAO DE PROPOSTA                                       |   |
|  |  |-- BC-02: Validacao de Proposta (regras de entrada)                   |   |
|  |                                                                          |   |
|  |  Subdominio: INTEGRACAO COM ODONTOLOGIA                                 |   |
|  |  |-- BC-13: Integracao Odontologica (espelhamento, super simples)       |   |
|  |                                                                          |   |
|  ----------------------------------------------------------------------------   |
|                                                                                 |
|  ---- -- GENERIC SUBDOMAINS ------------------------------------------------   |
|  |                                                                          |   |
|  |  Subdominio: ACESSO E IDENTIDADE                                        |   |
|  |  |-- BC-12: Acesso Internet / Portal (credenciais, permissoes)          |   |
|  |                                                                          |   |
|  |  Subdominio: AUDITORIA E OBSERVABILIDADE                                |   |
|  |  |-- BC-14: Auditoria e Log (tb_log_baixa_controle, pendencias)         |   |
|  |                                                                          |   |
|  |  Subdominio: NOTIFICACAO                                                |   |
|  |  |-- BC-17: Notificacao por E-mail (efetivacao)                         |   |
|  |                                                                          |   |
|  ----------------------------------------------------------------------------   |
|                                                                                 |
-----------------------------------------------------------------------------------
```

#### Tabela Resumo: Subdominios

| Tipo | Subdominio | BCs | Justificativa |
|---|---|---|---|
| **Core** | Efetivacao de Contrato PJ | BC-01, BC-08 | e o proposito da procedure inteira. A "baixa" de empresa conveniada e o processo mais critico do negocio de saude empresarial. Sem ele, nenhum contrato PJ entra em vigor. |
| **Core** | Precificacao e Modelo Comercial | BC-06, BC-07 | Define quanto cada empresa paga por cada plano/faixa. Erros aqui causam prejuizo financeiro direto. A complexidade de resolucao (filial e natureza e faixa de empregados e coligada) e diferencial. |
| **Core** | Regulamentacao e Participacao | BC-09, BC-10 | Coparticipacao e carencia sao regulados pela ANS. Erros geram glosas, multas regulatorias e judicializacao. A logica e intrincada (isencoes, internacao PJ, faixas etarias). |
| **Supporting** | Cadastro de Pessoa Juridica | BC-03, BC-04 | Necessario mas nao diferencial e e CRUD de pessoa/endereco/telefone com validacoes de CNPJ. |
| **Supporting** | Estrutura Comercial | BC-05, BC-18 | Resolucao de filial/vendedor/area de venda e suporte ao Core. PIM/descontos administrativos idem. |
| **Supporting** | Termos Contratuais | BC-11, BC-15, BC-16 | Fidelizacao, reembolso e minimo contratual sao importantes mas nao complexos e copiam dados de templates para o contrato. |
| **Supporting** | Validacao de Proposta | BC-02 | Suporte direto ao Core. Poderia ser Generic, mas as regras sao especificas do negocio (lista negra, CAEPF, natureza juridica com vigencia minima). |
| **Supporting** | Integracao Odontologia | BC-13 | Necessario para empresas com produto odonto, mas e integracao lateral com outro subsistema. |
| **Generic** | Acesso e Identidade | BC-12 | Criacao de login/senha para portal e problema generico, solucionavel com IAM padrao (ex: Microsoft Entra ID). |
| **Generic** | Auditoria e Observabilidade | BC-14 | Log de erros e pendencias e problema generico solucionavel com frameworks de logging (Application Insights, Serilog). |
| **Generic** | Notificacao | BC-17 | Envio de e-mail e problema generico solucionavel com Azure Communication Services ou qualquer servico de e-mail. |

#### Implicacoes Estrategicas

| Tipo | Estrategia de Implementacao | Investimento |
|---|---|---|
| **Core** | Modelagem rica (DDD tatico completo), testes extensivos, desenvolvedores seniores, codigo proprietario | **Alto** |
| **Supporting** | Modelagem moderada (Entities + Services), pode usar padroes mais simples, desenvolvedores plenos | **Medio** |
| **Generic** | Usar solucoes prontas/SaaS quando possivel, codigo minimo, evitar reinventar a roda | **Baixo** |

---

### 2.1 Bounded Contexts Identificados

```
---------------------------------------------------------------------
|                   BC-01: Proposta e Orquestracao                  |
|  | Recebe proposta, orquestra todo o fluxo, controla transacao |  |
---------------------------------------------------------------------
| BC-02: Validacao  | BC-03: Pessoa     | BC-04: Endereco e         |
|  de Proposta      |  Juridica (CNPJ)  |  Comunicacao              |
---------------------------------------------------------------------
| BC-05: Filial e   | BC-06: Modelo de  | BC-07: Precificacao       |
|  area de Venda    |  Negocio          |  (Tabelas de Preco)       |
---------------------------------------------------------------------
| BC-08: Empresa    | BC-09: Copartici- | BC-10: Carencia e         |
|  Conveniada       |  pacao            |  Compra de Carencia       |
---------------------------------------------------------------------
| BC-11: Fideliza-  | BC-12: Acesso     | BC-13: Integracao         |
|  cao Contratual   |  Internet/Portal  |  Odontologica             |
---------------------------------------------------------------------
| BC-14: Auditoria  | BC-15: Reembolso  | BC-16: Minimo Contratual  |
|  e Log            |  (Livre Escolha)  |  e Breakeven              |
---------------------------------------------------------------------
| BC-17: Notificacao| BC-18: Desconto   |                           |
|  (E-mail)         |  e PIM            |                           |
---------------------------------------------------------------------
```

### 2.2 Context Map e Relacionamentos

```
BC-01 (Orquestrador)
  |
  |-- [U] -> [D] BC-02 (Validacao)          Conformist
  |-- [U] -> [D] BC-03 (Pessoa Juridica)    Customer-Supplier
  |-- [U] -> [D] BC-05 (Filial/area Venda)  Customer-Supplier
  |-- [U] -> [D] BC-06 (Modelo Negocio)     Customer-Supplier
  |-- [U] -> [D] BC-07 (Precificacao)       Customer-Supplier
  |-- [U] -> [D] BC-08 (Empresa Conveniada) Partnership
  |-- [U] -> [D] BC-04 (Endereco/Comunic.)  Customer-Supplier
  |-- [U] -> [D] BC-09 (Coparticipacao)     Customer-Supplier
  |-- [U] -> [D] BC-10 (Carencia)           Customer-Supplier
  |-- [U] -> [D] BC-11 (Fidelizacao)        Customer-Supplier
  |-- [U] -> [D] BC-12 (Acesso Internet)    Customer-Supplier
  |-- [U] -> [D] BC-13 (Integracao Odonto)  ACL (Anti-Corruption Layer)
  |-- [U] -> [D] BC-14 (Auditoria/Log)      Open Host Service
  |-- [U] -> [D] BC-15 (Reembolso)          Customer-Supplier
  |-- [U] -> [D] BC-16 (Minimo Contratual)  Customer-Supplier
  |-- [U] -> [D] BC-17 (Notificacao)        ACL
  |-- [U] -> [D] BC-18 (Desconto/PIM)       Customer-Supplier

BC-06 (Modelo Negocio) <-> BC-07 (Precificacao)    Shared Kernel
BC-08 (Empresa Conv.)  <-> BC-09 (Coparticipacao)  Partnership
BC-08 (Empresa Conv.)  <-> BC-10 (Carencia)        Partnership
BC-05 (Filial)         <-> BC-06 (Modelo Negocio)  Customer-Supplier
```

---

## 3. Aggregates (Raizes de Agregado)

Cada Aggregate tem uma **raiz** que controla a consistencia transacional de suas entidades filhas.

### 3.1 Aggregate: **EmpresaConveniada** (Core e BC-08)

> **Raiz de Agregado principal.** Representa o contrato efetivado da empresa PJ.

```
EmpresaConveniada (ROOT)
  |-- UnidadeContratual (1..N)
  |     |-- ParametrosUnidade (1..N por tipo: 0-8)
  |           |-- ParametrosUnidadePlanoEsp (0..N)
  |-- EmpresaConveniadaNatureza (1..1)
  |-- FlagsConveniada (0..1)   e tb_emp_conveniada_saude_flags
  |-- ModeloReajusteEmpresa (1..1)
  |-- ImplantacaoEmpresa (0..1)
  |-- EmpresaConveniadaComissao (0..1) e consultor/comissao
  |-- CnpjContratante (0..1) e tb_empresa_cnpj_contratante (AFFIX)
  |-- ImagemContrato (0..1) e tb_empresa_conveniada_imagem
  |-- HistoricoEmpresa (0..N)
  |-- EmpresaEndereco (1..N)
  |-- BreakevenEmpresa (0..1) e tb_empresa_breakeven
  |-- AcessoDadosEmpresa (0..1) e tb_acesso_dados_empresa
  |-- MinimoContratual (0..1) e tb_empresa_minimo_contratual
```

**Invariantes do Aggregate:**
- `cd_empresa_conveniada` deve ser unico (gerado por `fn_empresa_conveniada`)
- Nao pode existir sem `Pessoa Juridica` associada
- Deve ter ao menos uma `UnidadeContratual` (unidade 1)
- `dt_inicio` e obrigatorio e define a vigencia
- BITIX: `dt_inicio <= sysdate` -> usa `trunc(sysdate)` para datas
- `cd_filial` e obrigatorio e imutavel apos criacao
- `fl_status = 2` (ativo)

---

### 3.2 Aggregate: **PessoaJuridica** (BC-03)

```
PessoaJuridica (ROOT)
  |-- EnderecoPessoa (1..N)
  |-- ContatoPessoa (0..N)
  |-- MeioComunicacao (0..N)
  |     |-- Telefone (tipo 1)
  |     |-- Fax (tipo 3)
  |     |-- Telex (tipo 4)
  |     |-- Celular (tipos 5 e 8)
  |     |-- Bip (tipo 6)
  |     |-- CaixaPostal (tipo 7)
  |     |-- Email (tipo 9)
  |-- NaturezaJuridicaEmpresa (0..1)
```

**Invariantes:**
- `nu_cgc_cpf` (CNPJ) deve ser valido (`pk_administracao.fn_check_cic`)
- CNPJ nao pode estar na Lista Negra (`tb_pessoa_lista_negra`)
- `cd_pessoa` + `cd_empresa_plano` identifica a PJ unicamente
- `fl_tipo_pessoa = 'J'` (Juridica)

---

### 3.3 Aggregate: **TabelaPreco** (BC-07)

```
TabelaPreco (ROOT) e tb_preco_plano
  |-- ValorPlano (1..N) e tb_valor_plano (por plano e faixa etaria)
  |-- DescontoPrecoPlano (0..N) e tb_desconto_preco_plano
  |-- ParametroFranquia (0..N) e tb_parametro_franquia

TabelaPrecoAgregado (ROOT) e para fl_tipo_tabela = 2
  |-- ValorPlanoAgregado (1..N)
  |-- DescontoPrecoPlanoAgregado (0..N)
```

**Invariantes:**
- Cada `TabelaPreco` e vinculada via `cd_tabela` ao contrato
- Valores vem de `tb_empresa_neg_tabela` (modelo de negocio)
- `fl_status != 3` (nao cancelado) e `fl_coparticipacao != 'S'` (exceto se flag)
- Faixa etaria normalizada por `tipo_faixa` pos-insert

---

### 3.4 Aggregate: **Coparticipacao** (BC-09)

```
ControleFatorEmpresa (ROOT) e tb_controle_fator_empresa
  |-- FatorEmpresa (1..N) e tb_fator_empresa
  |-- TerapiasEspecEmpresa (0..N) e tb_terapias_espec_empresa
  |-- IsencaoCoparticipacao (0..1) e campos em tb_controle_fator_empresa
  |-- CopartInternacaoPJ (0..N) e tb_copart_internacao_param_pj
  |-- CopartIsencaoTipoBenef (0..N) e tb_copart_isnt_tp_benef
  |-- CopartTipoReembolso (0..N) e tb_copart_tipo_reembolso
  |-- CopartTabelaEmpresa (0..N) e tb_copart_tab_empresa
```

**Invariantes:**
- Criado com base no `Modelo de Negocio` (tb_empresa_neg_fator)
- Duas variantes: AFFIX (controle affix) vs padrao
- `fl_cobra_internacao = 'S'` se houver parametros de internacao PJ
- Isencao de coparticipacao pode sobrescrever flags via UPDATE

---

### 3.5 Aggregate: **CompraCarencia** (BC-10)

```
CompraCarencia (ROOT) e tb_compra_carencia
  |-- CompraGrupo (0..N) e tb_compra_grupo (grupos de carencia comprados)
  |-- CompraModulo (0..N) e tb_compra_modulo (modulos de carencia comprados)
  |-- OdonCompraGrupo (0..N) e tb_odon_compra_grupo (odonto)
```

**Invariantes:**
- `nu_ordem_compra` via sequence `sq_compra_carencia`
- Vem de `tb_empresa_neg_carencia` (staging de negociacao)
- Grupos e modulos sao filhos da compra pai

---

### 3.6 Aggregate: **AcessoInternet** (BC-12)

```
AcessoInternet (ROOT) e tb_acesso_internet
  |-- ControleInternet (1..N) e tb_controle_internet (servicos: 7, 12, 14, 16)
  |-- LimiteAcessoContrato (0..N) e tb_emp_limite_acesso_contra (AFFIX)
```

**Invariantes:**
- `cd_acesso` via sequence `sq_acesso_internet`
- Senha: `pk_administracao.fn_encripta(substr(cd_pessoa, -6), 1, 10)`
- `cd_tipo_acesso = 5` (empresa conveniada)
- Dia limite: pagamento dia 5 -> limite 10 para servico 7; senao 15

---

### 3.7 Aggregate: **FidelizacaoEmpresa** (BC-11)

```
FidelizacaoEmpresa (ROOT) e tb_fidelizacao_empresa
```

**Invariantes:**
- SO criada para `canal_venda = 2` (Middle: 30-99 empregados)
- `fl_atendimento != 4` (exclui odontologia)
- `dt_fim = dt_inicio + 1000` (prazo padrao)

---

### 3.8 Aggregate: **ReembolsoEmpresa** (BC-15)

```
ReembolsoEmpresa (ROOT) e Virtual (sem tabela raiz propria)
  |-- ReembolsoEmpresaPrazoPag (0..N) e tb_reemb_empresa_prazo_pag
  |-- ReembolsoEmpresaPrazoPagTipo (0..N) e tb_reemb_empresa_prazo_pag_tip
  |-- ReembolsoEmpresaTabela (0..N) e tb_reemb_empresa_tabela
  |-- ReembolsoEmpresaComposicao (0..N) e tb_reemb_empresa_composicao
```

**Invariantes:**
- SO para planos com livre escolha (`fn_plano_livre_escolha = 'S'`)
- Dados originais vem de `tb_reemb_plano_*` (parametrizacao por plano)
- Limpa antes de inserir (DELETE + INSERT = idempotente)

---

### 3.9 Aggregate: **MinimoContratual** (BC-16)

```
MinimoContratual (ROOT) e tb_empresa_minimo_contratual
```

**Invariantes:**
- Vem de `tb_param_minimo_contratual` onde `cd_ativo = 'S'` e vigencia abrange `dt_inicio`
- Se nao encontrar (NO_DATA_FOUND), nao cria e e opcional

---

## 4. Entities (Entidades)

> Entidades possuem **identidade** persistente. Duas instancias com os mesmos atributos mas IDs diferentes sao objetos distintos.

| # | Entidade | Tabela | Identidade (PK) | Aggregate Pai |
|---|----------|--------|------------------|---------------|
| E01 | `EmpresaConveniada` | `tb_empresa_conveniada` | `cd_empresa_conveniada` | **EmpresaConveniada** (root) |
| E02 | `PessoaJuridica` | `tb_pessoa` | `cd_pessoa` + `cd_empresa_plano` | **PessoaJuridica** (root) |
| E03 | `UnidadeContratual` | `tb_empresa_conveniada_unidade` | `cd_empresa_conveniada` + `cd_unidade` | EmpresaConveniada |
| E04 | `ParametrosUnidade` | `tb_parametros_unidade` | `cd_empresa_conveniada` + `cd_unidade` + `fl_tipo_tabela` | EmpresaConveniada |
| E05 | `TabelaPreco` | `tb_preco_plano` | `cd_tabela` | **TabelaPreco** (root) |
| E06 | `ValorPlano` | `tb_valor_plano` | `cd_tabela` + `cd_plano` + `cd_faixa_etaria` | TabelaPreco |
| E07 | `ControleFatorEmpresa` | `tb_controle_fator_empresa` | `cd_empresa_conveniada` | **Coparticipacao** (root) |
| E08 | `FatorEmpresa` | `tb_fator_empresa` | `cd_empresa_conveniada` + `cd_fator` | Coparticipacao |
| E09 | `CompraCarencia` | `tb_compra_carencia` | `nu_ordem_compra` | **CompraCarencia** (root) |
| E10 | `CompraGrupo` | `tb_compra_grupo` | `nu_ordem_compra` + `cd_carencia` | CompraCarencia |
| E11 | `CompraModulo` | `tb_compra_modulo` | `nu_ordem_compra` + `cd_modulo` | CompraCarencia |
| E12 | `AcessoInternet` | `tb_acesso_internet` | `cd_acesso` | **AcessoInternet** (root) |
| E13 | `ControleInternet` | `tb_controle_internet` | `cd_acesso` + `cd_servico` | AcessoInternet |
| E14 | `EnderecoPessoa` | `tb_endereco_pessoa` | `cd_pessoa` + `cd_endereco_correspondencia` | PessoaJuridica |
| E15 | `ContatoPessoa` | `tb_contato_pessoa` | `cd_pessoa` + `nm_contato_pessoa` | PessoaJuridica |
| E16 | `MeioComunicacao` | `tb_meio_comunicacao_pessoa` | `cd_pessoa` + `cd_ordem_meio_comunicacao` | PessoaJuridica |
| E17 | `FidelizacaoEmpresa` | `tb_fidelizacao_empresa` | `cd_empresa_conveniada` + `cd_tipo_fidelizacao` | **FidelizacaoEmpresa** (root) |
| E18 | `HistoricoEmpresa` | `tb_hist_empresa_conveniada` | `cd_empresa_conveniada` + `cd_assunto` + `dt_historico` | EmpresaConveniada |
| E19 | `MinimoContratual` | `tb_empresa_minimo_contratual` | `cd_minimo_contratual` | **MinimoContratual** (root) |
| E20 | `DescontoPrecoPlano` | `tb_desconto_preco_plano` | PK composta | TabelaPreco |
| E21 | `ParametroFranquia` | `tb_parametro_franquia` | PK composta | TabelaPreco |
| E22 | `TerapiasEspecEmpresa` | `tb_terapias_espec_empresa` | `cd_empresa_conveniada` + `cd_terapia` | Coparticipacao |
| E23 | `ReembolsoEmpresaPrazoPag` | `tb_reemb_empresa_prazo_pag` | `cd_reemb_empresa_prazo_pag` | **ReembolsoEmpresa** |
| E24 | `ReembolsoEmpresaTabela` | `tb_reemb_empresa_tabela` | `cd_reemb_empresa_tabela` | ReembolsoEmpresa |
| E25 | `ReembolsoEmpresaComposicao` | `tb_reemb_empresa_composicao` | `cd_reemb_empresa_composicao` | ReembolsoEmpresa |
| E26 | `Proposta` | `tb_empresa_internet` | `nu_controle` | **Proposta** (root, BC-01) |
| E27 | `EmpresaBreakeven` | `tb_empresa_breakeven` | `cd_empresa_conveniada` | EmpresaConveniada |
| E28 | `CopartInternacaoPJ` | `tb_copart_internacao_param_pj` | composta | Coparticipacao |
| E29 | `OdonCompraGrupo` | `tb_odon_compra_grupo` | `nu_ordem_compra` + `cd_grupo` | CompraCarencia |
| E30 | `LimiteAcessoContrato` | `tb_emp_limite_acesso_contra` | composta | AcessoInternet |

---

## 5. Value Objects

> Value Objects **nao possuem identidade** e sao definidos por seus atributos. Dois VOs com os mesmos valores sao iguais.

| # | Value Object | Campos | Onde e usado | Observacoes |
|---|---|---|---|---|
| VO01 | `CNPJ` | `nu_cgc_cpf` (14 digitos) | PessoaJuridica, Proposta | Validado por `pk_administracao.fn_check_cic`. Self-validating |
| VO02 | `CAEPF` | `cd_empresa_plano` derivado | PessoaJuridica | Validado por `fn_check_caepf` |
| VO03 | `InscricaoEstadual` | `nu_inscricao_estadual` | Proposta | Pode ser nulo |
| VO04 | `Endereco` | `cd_cep, cd_uf, nm_cidade, nm_bairro, cd_tipo_logradouro, nm_rua, nu_endereco, ds_compl` | PessoaJuridica, Proposta | Validado contra `tb_cep_logradouro`, `tb_cep_localidade`, `tb_uf`, `tb_tipo_logradouro` |
| VO05 | `Email` | `ds_endereco_eletronico` | PessoaJuridica, MeioComunicacao | Limite de 256 chars |
| VO06 | `Telefone` | `nu_telefone`, `nu_fax`, `nu_movel`, `nu_telex`, `nu_bip`, `nu_cx_postal` | MeioComunicacao | Cada tipo mapeia para `cd_tipo_meio_comunicacao` |
| VO07 | `CanalVenda` | Derivado: 1 (1-29), 2 (30-99), null (100+) | EmpresaConveniada | Calculado a partir de `qt_total_empregados` |
| VO08 | `NaturezaEmpresa` | `fl_natureza_empresa` (1-10) | EmpresaConveniada, Proposta | 6=PME, 9=Simples, etc. |
| VO09 | `PeriodoVigencia` | `dt_inicio`, `dt_validade_contrato` | EmpresaConveniada | dt_fim pode ser calculado (add_months 12) |
| VO10 | `DiaPagamento` | `dt_dia_pagamento` (1-5 -> dia 5,10,15,20,25) | EmpresaConveniada | Convertido por `fn_buscar_dia_pagamento` |
| VO11 | `FaixaEmpregados` | `qt_total_empregados` | Proposta, Modelo Negocio | Determina canal de venda e parametrizacao |
| VO12 | `OrigemProposta` | SIGO vs BITIX | Proposta | Determina caminho de resolucao de coligada e modelo negocio |
| VO13 | `Contato` | `nm_contato_pessoa`, `nr_cargo_contato`, `nu_telefone`, `dt_nascimento_contato` | ContatoPessoa | Composto, identificado por nome |
| VO14 | `PercentualDesconto` | `pc_desconto` | DescontoPrecoPlano | Percentual de desconto sobre o valor do plano |
| VO15 | `FaixaEtaria` | `qt_idade_inicial`, `qt_idade_final` | FatorEmpresa, Coparticipacao | Range de idades para aplicacao de regras |
| VO16 | `FaixaFranquia` | `qt_franquia_inicial`, `qt_franquia_final` | FatorEmpresa | Range de quantidade de franquias |
| VO17 | `SenhaPortal` | Derivado de `cd_pessoa` (ultimos 6 digitos, encriptado) | AcessoInternet | Gerado por `pk_administracao.fn_encripta` |
| VO18 | `CodigoEmpresa` | `cd_empresa_conveniada` (varchar 5, lpad '0') | EmpresaConveniada | Gerado por `fn_empresa_conveniada`, imutavel |

---

## 6. Domain Services

> Domain Services encapsulam logica de dominio que **nao pertence naturalmente a nenhuma entidade**.

| # | Domain Service | BC | Responsabilidade | Funcao Legada |
|---|---|---|---|---|
| DS01 | `GeracaoCodigoEmpresaService` | BC-08 | Gerar codigo unico de empresa (`lcd_empresa`). Loop com ate 10.001 tentativas | `fn_empresa_conveniada()` |
| DS02 | `ResolucaoFilialService` | BC-05 | Resolver filial: vendedor -> area_venda -> filial; override por `cd_filial_contrato`; override por TAFFIX `filial_modelo` | Logica inline (linhas ~300-400) |
| DS03 | `ResolucaoModeloNegocioService` | BC-06 | Resolver parametrizacao comercial com base em filial + natureza + faixa de empregados. Inclui logica de coligada (soma empregados do grupo) | Cursors `cr_empresa_neg` / `cr_empresa_neg_bitix` |
| DS04 | `ValidacaoPropostaService` | BC-02 | Validar todos os campos da proposta: CNPJ, razao social, CEP, endereco, natureza juridica, contato, etc. (~30 validacoes) | Bloco inline linhas ~280-960 |
| DS05 | `CalculoTabelaPrecoService` | BC-07 | Criar tabela de preco (geral + agregados), copiar valores de `tb_empresa_neg_tabela`, aplicar descontos e franquias | Logica inline linhas ~1050-1430 |
| DS06 | `CalculoCanalVendaService` | BC-08 | Determinar canal de venda: 1-29 -> canal 1, 30-99 -> canal 2, >=100 -> null. Override para BITIX/SIGO coligada | Logica inline linhas ~1430-1500 |
| DS07 | `ConfiguracaoCoparticipacaoService` | BC-09 | Criar `tb_controle_fator_empresa` + fatores + terapias + isencoes + internacao PJ + tipo reembolso + tabela referencia | Logica inline linhas ~2700-4100 |
| DS08 | `ConfiguracaoCarenciaService` | BC-10 | Criar compra de carencia com grupos, modulos e odonto a partir de `tb_empresa_neg_carencia` | Logica inline linhas ~3850-4100 |
| DS09 | `ConfiguracaoReembolsoService` | BC-15 | Copiar parametrizacao de reembolso do plano para a empresa: prazos, tipos, tabelas, composicao | Bloco DECLARE inline linhas ~4200-4400 |
| DS10 | `NotificacaoEfetivacaoService` | BC-17 | Enviar e-mail de efetivacao ao vendedor/empresa. Diferencia Hapvida vs RN Saude | `pr_send_mail` / `pr_send_mail_html_rn` |
| DS11 | `DescontoEmpresaService` | BC-18 | Aplicar descontos PIM/ADM quando `FL_ATIVA_PIM_ADM = 'S'` | `pr_desconto_empresa` |
| DS12 | `CobrancaFaltaParamService` | BC-08 | Verificar parametros de cobranca faltantes | `humaster.pr_cobranca_falta_param` |
| DS13 | `CriticaEmpresaProvService` | BC-01 | Executar criticas pos-mudanca de codigo provisorio ('T'+nu_controle) para definitivo | `humaster.pr_con_emp_prov` |
| DS14 | `EspelhamentoOdontoService` | BC-13 | Replicar parametros saude->odonto entre operadoras quando parametrizacao ativa (cd=225) | `pr_odon_param_esp_empresa` |
| DS15 | `SuperSimplesOdontoService` | BC-13 | Configurar odonto "super simples" para empresas sem controle odonto | `Humaster.Pr_Vcc_Empresa_Super_Simples` |

---

## 7. Application Services (Use Cases)

> Application Services orquestram o fluxo de uso, delegando logica ao dominio.

### 7.1 `EfetivarContratoEmpresaPJUseCase` (Use Case principal)

```
Entrada: nu_controle (NUMBER) e identificador da proposta
Saida:   erro_controle (VARCHAR2) e mensagem de sucesso ou erro

Fluxo:
  1. Carregar Proposta (tb_empresa_internet WHERE nu_controle = |)
  2. PARA CADA proposta pendente (tp_operacao = '1' e inclusao):
     a. Inicializar contexto (reset variaveis, calcular descontos)
     b. Validar proposta completa (ValidacaoPropostaService)        | PRIMEIRO: fail fast
     c. Resolver filial (ResolucaoFilialService)
     d. Resolver modelo de negocio (ResolucaoModeloNegocioService)
     e. Gerar codigo da empresa (GeracaoCodigoEmpresaService)       | SO APOS VALIDAR
     f. Criar/Atualizar pessoa juridica (PessoaJuridica Aggregate)
     g. Criar tabela de preco (CalculoTabelaPrecoService)
     h. Determinar canal de venda (CalculoCanalVendaService)
     i. Criar empresa conveniada (EmpresaConveniada Aggregate)
     j. Configurar coparticipacao (ConfiguracaoCoparticipacaoService)
     k. Configurar fidelizacao (FidelizacaoEmpresa Aggregate)
     l. Cadastrar endereco e meios de comunicacao (PessoaJuridica children)
     m. Registrar historico (HistoricoEmpresa Entity)
     n. Configurar carencia (ConfiguracaoCarenciaService)
     o. Configurar isencao de coparticipacao (update em ControleFatorEmpresa)
     p. Configurar internacao PJ (CopartInternacaoPJ Entity)
     q. Configurar reembolso (ConfiguracaoReembolsoService)
     r. Criar acesso internet (AcessoInternet Aggregate)
     s. Atualizar usuarios internet (T+controle | codigo definitivo)
     t. Executar criticas pos-baixa (CriticaEmpresaProvService)
     u. Criar breakeven padrao (70%)
     v. Registrar e-mail corporativo (AcessoDadosEmpresa)
     w. Configurar minimo contratual (MinimoContratual Aggregate)
     x. COMMIT
     y. Enviar notificacao por e-mail (NotificacaoEfetivacaoService)
     z. Aplicar descontos PIM (DescontoEmpresaService)
     aa. Verificar cobranca falta param (CobrancaFaltaParamService)
     ab. Espelhamento odonto (EspelhamentoOdontoService)
     ac. Odonto super simples (SuperSimplesOdontoService)

  > **NOTA e Diferenca em relacao ao legado:** No codigo atual da procedure,
  > `fn_empresa_conveniada()` (geracao do codigo) e chamada ANTES das validacoes
  > (linha ~240 vs validacoes linhas ~248-960). Isso causa desperdicio de codigos
  > quando a validacao falha. Na modelagem DDD, a ordem foi corrigida: validar
  > primeiro (fail fast), gerar codigo so quando se tem certeza de que a proposta
  > e valida.
  3. EM CASO DE ERRO:
     a. ROLLBACK
     b. Verificar se empresa ja foi criada (p_erro_controle parcial)
     c. Registrar pendencia (tb_pendencia_empresa_internet)
     d. COMMIT do log de pendencia
```

---

## 8. Repositories

> Repositories abstraem o acesso a dados, encapsulando queries e persistencia.

| # | Repository | BC | Aggregate / Entity | Operacoes |
|---|---|---|---|---|
| R01 | `PropostaRepository` | BC-01 | Proposta | `findPendentes(nu_controle)`, `atualizarStatus(nu_controle, status)` |
| R02 | `PessoaJuridicaRepository` | BC-03 | PessoaJuridica | `findByCnpjEPlano(cnpj, empresa_plano)`, `criar(pessoa)`, `atualizar(pessoa)` |
| R03 | `EmpresaConveniadaRepository` | BC-08 | EmpresaConveniada | `criar(empresa)`, `existsById(cd_empresa)` |
| R04 | `TabelaPrecoRepository` | BC-07 | TabelaPreco | `criarTabela(preco)`, `copiarValores(tabela_origem, tabela_destino)` |
| R05 | `ModeloNegocioRepository` | BC-06 | e (Read Model) | `findByFilialNaturezaEmpregados(filial, natureza, empregados)`, `findBitix(...)` |
| R06 | `FilialRepository` | BC-05 | e (Read Model) | `findByAreaVenda(area_venda)`, `findById(cd_filial)` |
| R07 | `VendedorRepository` | BC-05 | e (Read Model) | `findById(cd_vendedor)`, `validarAtivo(cd_vendedor)` |
| R08 | `CoparticipacaoRepository` | BC-09 | Coparticipacao | `criarControle(controle)`, `criarFatores(fatores)`, `criarTerapias(terapias)` |
| R09 | `CarenciaRepository` | BC-10 | CompraCarencia | `criarCompra(compra)`, `criarGrupos(grupos)`, `criarModulos(modulos)` |
| R10 | `AcessoInternetRepository` | BC-12 | AcessoInternet | `criar(acesso)`, `criarControles(controles)` |
| R11 | `FidelizacaoRepository` | BC-11 | FidelizacaoEmpresa | `criar(fidelizacao)` |
| R12 | `ReembolsoRepository` | BC-15 | ReembolsoEmpresa | `limparPorEmpresaPlano(empresa, plano)`, `copiarDePlano(plano, empresa)` |
| R13 | `MinimoContratualRepository` | BC-16 | MinimoContratual | `findVigenteByControle(controle, dt_inicio)`, `criar(minimo)` |
| R14 | `EnderecoComunicacaoRepository` | BC-04 | PessoaJuridica (child) | `criarEndereco(endereco)`, `criarMeiosComunicacao(meios)`, `criarContato(contato)` |
| R15 | `AuditoriaRepository` | BC-14 | e (Write Model) | `registrarLog(nu_controle, mensagem, status)`, `registrarPendencia(pendencia)` |
| R16 | `ListaNegraRepository` | BC-02 | e (Read Model) | `isCnpjBloqueado(cnpj)` |
| R17 | `ColigadaRepository` | BC-06 | e (Read Model) | `findByEmpresa(empresa)`, `somarEmpregados(coligada)` |
| R18 | `CepRepository` | BC-04 | e (Read Model) | `validarCep(cep)`, `findLogradouro(cep)` |

---

## 9. Domain Events

> Domain Events comunicam que **algo significativo aconteceu** no dominio.

| # | Evento | Publisher (BC) | Subscribers (BC) | Payload |
|---|---|---|---|---|
| DE01 | `PropostaRecebida` | BC-01 | BC-02 | `{nu_controle, tp_operacao}` |
| DE02 | `PropostaValidada` | BC-02 | BC-05, BC-06 | `{nu_controle, cnpj, natureza, empregados}` |
| DE03 | `FilialResolvida` | BC-05 | BC-06, BC-07 | `{cd_filial, cd_area_venda, cd_vendedor}` |
| DE04 | `ModeloNegocioResolvido` | BC-06 | BC-07, BC-09, BC-10, BC-11 | `{nu_controle_neg, parametros_modelo}` |
| DE05 | `PessoaJuridicaCriada` | BC-03 | BC-08, BC-04 | `{cd_pessoa, nu_cgc_cpf, cd_empresa_plano}` |
| DE06 | `PessoaJuridicaAtualizada` | BC-03 | BC-08 | `{cd_pessoa}` |
| DE07 | `TabelaPrecoCriada` | BC-07 | BC-08 | `{cd_tabela, cd_tabela_agregado}` |
| DE08 | `EmpresaConveniadaCriada` | BC-08 | BC-09, BC-10, BC-11, BC-12, BC-13, BC-15, BC-16, BC-17 | `{cd_empresa, cd_filial, cd_pessoa, dt_inicio, canal_venda}` |
| DE09 | `CoparticipacaoConfigurada` | BC-09 | BC-08 | `{cd_empresa, fl_cobra_internacao}` |
| DE10 | `CarenciaConfigurada` | BC-10 | e | `{cd_empresa, compras: [...]}` |
| DE11 | `FidelizacaoConfigurada` | BC-11 | e | `{cd_empresa, fidelizacoes: [...]}` |
| DE12 | `EnderecosCadastrados` | BC-04 | e | `{cd_pessoa, cd_endereco_correspondencia}` |
| DE13 | `AcessoInternetCriado` | BC-12 | BC-17 | `{cd_acesso, cd_pessoa, senha_gerada}` |
| DE14 | `EfetivacaoNotificada` | BC-17 | e | `{email, cd_empresa, razao_social}` |
| DE15 | `ReembolsoConfigurado` | BC-15 | e | `{cd_empresa, planos: [...]}` |
| DE16 | `MinimoContratualDefinido` | BC-16 | e | `{cd_empresa, tipo_minimo, qtd_vida}` |
| DE17 | `EmpresaConveniadaErro` | BC-01 | BC-14 | `{nu_controle, erro, cd_empresa_parcial}` |
| DE18 | `IntegracaoOdontoRealizada` | BC-13 | e | `{cd_empresa, tipo: 'espelhamento'|'super_simples'}` |
| DE19 | `DescontoPIMAplicado` | BC-18 | e | `{cd_empresa, desconto}` |
| DE20 | `BreakevenDefinido` | BC-16 | e | `{cd_empresa, valor: 70}` |

---

## 10. Factories

> Factories encapsulam a logica de **criacao complexa** de objetos de dominio.

| # | Factory | Cria | Complexidade | Logica |
|---|---|---|---|---|
| F01 | `EmpresaConveniadaFactory` | `EmpresaConveniada` | Alta | ~60 colunas, 2 variantes (BITIX vs normal), datas condicionais, flags derivadas |
| F02 | `TabelaPrecoFactory` | `TabelaPreco` + filhos | Media | Cria tabela geral + agregados, copia valores de modelo de negocio |
| F03 | `PessoaJuridicaFactory` | `PessoaJuridica` | Media | Gera `cd_pessoa` via `pk_administracao.fn_digito_out`, resolve `cd_empresa_plano` |
| F04 | `CompraCarenciaFactory` | `CompraCarencia` + filhos | Media | Cria compra + grupos + modulos + odonto a partir de staging |
| F05 | `AcessoInternetFactory` | `AcessoInternet` + controles | Baixa | Gera acesso, senha encriptada, controles para servicos (7,12,14,16) |
| F06 | `MeioComunicacaoFactory` | Lista de `MeioComunicacao` | Baixa | Para cada telefone nao-nulo, cria entrada com tipo apropriado. Celular cria 2 (tipo 5 e 8) |
| F07 | `ControleFatorEmpresaFactory` | `ControleFatorEmpresa` + fatores | Alta | 2 variantes (AFFIX vs normal), ~20 campos, fatores por loop de staging |
| F08 | `ReembolsoEmpresaFactory` | `ReembolsoEmpresa` + filhos | Media | Copia 4 sub-tabelas do plano para a empresa |
| F09 | `FidelizacaoFactory` | `FidelizacaoEmpresa` | Baixa | Copia de `tb_empresa_neg_fidelizacao` |

---

## 11. Specifications (Regras de Validacao)

> Specifications encapsulam **regras de negocio** como predicados reutilizaveis.

| # | Specification | Regra | Excecao ao falhar |
|---|---|---|---|
| SP01 | `CnpjValidoSpec` | CNPJ valido via `fn_check_cic` e nao esta na lista negra | `raise_application_error(-20201, 'CNPJ invalido ou bloqueado')` |
| SP02 | `VendedorAtivoSpec` | Vendedor existe em `tb_vendedor_plano` e esta ativo | `'vendedor invalido. informe DBA'` |
| SP03 | `FilialValidaSpec` | Filial existe em `tb_filial` e esta ativa para o `cd_empresa_plano` | `'filial invalida'` |
| SP04 | `NaturezaEmpresaValidaSpec` | `fl_natureza_empresa` esta preenchida e dentro dos valores validos | `'natureza da empresa nao informada'` |
| SP05 | `TotalEmpregadosValidoSpec` | `qt_total_empregados > 0` | `'total de empregados nao informado'` |
| SP06 | `CepValidoSpec` | CEP existe em `tb_cep_logradouro` ou `tb_cep_localidade` | `'CEP invalido'` |
| SP07 | `UfValidaSpec` | UF existe em `tb_uf` | `'UF invalida'` |
| SP08 | `LocalidadeValidaSpec` | Cidade nao e nula | `'cidade nao informada'` |
| SP09 | `BairroValidoSpec` | Bairro nao e nulo | `'bairro nao informado'` |
| SP10 | `TipoLogradouroValidoSpec` | Tipo logradouro existe em `tb_tipo_logradouro` | `'tipo logradouro invalido'` |
| SP11 | `LogradouroValidoSpec` | Logradouro nao e nulo | `'logradouro nao informado'` |
| SP12 | `ComplementoValidoSpec` | Complemento <= 100 chars | `'complemento invalido'` |
| SP13 | `EmailValidoSpec` | Email <= 256 chars (se preenchido) | `'endereco eletronico invalido'` |
| SP14 | `DiaPagamentoValidoSpec` | `dt_dia_pagamento` esta preenchido | `'dia de pagamento nao informado'` |
| SP15 | `ValidadeContratoSpec` | `dt_validade_contrato` esta preenchida | `'validade do contrato nao informada'` |
| SP16 | `NaturezaJuridicaVigenciaSpec` | Para natureza juridica com validacao, vigencia minima de 6 meses | `'natureza juridica exige vigencia minima'` |
| SP17 | `ContatoValidoSpec` | `nm_contato_pessoa` esta preenchido | `'contato nao informado'` |
| SP18 | `CargoContatoValidoSpec` | `nr_cargo_contato` esta preenchido | `'cargo do contato nao informado'` |
| SP19 | `RazaoSocialValidaSpec` | `nm_pessoa_razao_social` nao e nula | `'razao social nao informada'` |
| SP20 | `ModeloNegocioExistenteSpec` | Modelo de negocio encontrado para os parametros filial/natureza/empregados | `'modelo de negocio nao encontrado'` |
| SP21 | `CaepfValidoSpec` | Validacao CAEPF quando aplicavel | `'CAEPF invalido'` |

---

## 12. Anti-Corruption Layer (ACL)

> ACL protege o modelo de dominio contra conceitos e estruturas do sistema legado.

### 12.1 ACL: Staging -> Dominio (tb_empresa_internet -> Aggregates)

```
---------------------------        ----------------------------
|   tb_empresa_internet    |        |     Modelo de Dominio     |
|   (cursor cr_empresa_    |  ACL   |                          |
|    internet - 80+ cols)  | =====> |  Proposta (VO)           |
|                          |        |  PessoaJuridica (Agg)    |
|  - nu_cgc_cpf            |        |  Endereco (VO)           |
|  - nm_pessoa_razao_social|        |  CanalVenda (VO)         |
|  - fl_natureza_empresa   |        |  NaturezaEmpresa (VO)    |
|  - dt_inicio             |        |  DiaPagamento (VO)       |
|  - ... (80+ campos)      |        |  ...                     |
---------------------------        ----------------------------
```

**Adapter:** `PropostaAdapter`
- Converte o record do cursor `cr_empresa_internet` (flat, ~80+ campos) em objetos de dominio tipados
- Separa dados de pessoa, endereco, contato, meios de comunicacao
- Normaliza flags e codigos legados

### 12.2 ACL: Modelo Negocio Legado -> Dominio

```
---------------------------        ----------------------------
| tb_empresa_neg           |        |                          |
| tb_empresa_neg_bitix     |  ACL   |  ParametrosComerciais    |
| tb_empresa_neg_tabela    | =====> |  (Value Object)          |
| tb_empresa_neg_desconto  |        |                          |
| tb_empresa_neg_franquia  |        |  - forma_pagamento       |
| tb_empresa_neg_fator     |        |  - carteira_cobranca     |
| tb_empresa_neg_controle  |        |  - tipo_faixa            |
| tb_empresa_neg_carencia  |        |  - plano                 |
| tb_empresa_neg_fideliz.. |        |  - tipo_acomodacao       |
| tb_empresa_neg_isenta..  |        |  - empresa_utilizacao    |
| tb_empresa_neg_pln_esp   |        |  - empresa_cobranca      |
| tb_empresa_neg_grupo     |        |  - tabelas[]             |
| tb_empresa_neg_modulo    |        |  - descontos[]           |
|                          |        |  - franquias[]           |
|  (~15 tabelas staging)   |        |  - fatores[]             |
---------------------------        ----------------------------
```

**Adapter:** `ModeloNegocioAdapter`
- Unifica `cr_empresa_neg` e `cr_empresa_neg_bitix` (cursors identicos)
- Implementa **Strategy Pattern** para SIGO vs BITIX

### 12.3 ACL: Integracao Odonto

```
---------------------------        ----------------------------
|  Subsistema Odonto       |  ACL   |  Dominio Saude           |
|  - tb_odon_empresa_*     | =====> |  (EmpresaConveniada)     |
|  - tb_odon_compra_grupo  |        |                          |
|  - pr_odon_param_esp_*   |        |                          |
|  - Pr_Vcc_Empresa_*      |        |                          |
---------------------------        ----------------------------
```

**Adapter:** `IntegracaoOdontoAdapter`
- Isola chamadas a procedures odonto (`pr_odon_param_esp_empresa`, `Pr_Vcc_Empresa_Super_Simples`)
- Protege o dominio de saude contra mudancas no subsistema odonto

---

## 13. Mapeamento Tabela -> Artefato DDD

### 13.1 Tabelas de ESCRITA (DML: INSERT/UPDATE/DELETE)

| Tabela | Operacao | Artefato DDD | Aggregate | BC |
|---|---|---|---|---|
| `tb_pessoa` | INSERT/UPDATE | Entity: PessoaJuridica | PessoaJuridica | BC-03 |
| `tb_empresa_conveniada` | INSERT | Entity: EmpresaConveniada (Root) | EmpresaConveniada | BC-08 |
| `tb_empresa_conveniada_unidade` | INSERT | Entity: UnidadeContratual | EmpresaConveniada | BC-08 |
| `tb_empresa_conveniada_nat` | INSERT | Entity: EmpresaConveniadaNatureza | EmpresaConveniada | BC-08 |
| `tb_emp_conveniada_saude_flags` | INSERT | Entity: FlagsConveniada | EmpresaConveniada | BC-08 |
| `tb_modelo_reaj_empresa` | INSERT | Entity: ModeloReajusteEmpresa | EmpresaConveniada | BC-08 |
| `tb_implantacao_emp` | INSERT | Entity: ImplantacaoEmpresa | EmpresaConveniada | BC-08 |
| `tb_empresa_conveniada_com` | INSERT | Entity: EmpresaConveniadaComissao | EmpresaConveniada | BC-08 |
| `tb_empresa_cnpj_contratante` | INSERT | Entity: CnpjContratante | EmpresaConveniada | BC-08 |
| `tb_empresa_conveniada_imagem` | UPDATE | Entity: ImagemContrato | EmpresaConveniada | BC-08 |
| `tb_hist_empresa_conveniada` | INSERT | Entity: HistoricoEmpresa | EmpresaConveniada | BC-08 |
| `tb_empresa_breakeven` | INSERT | Entity: EmpresaBreakeven | EmpresaConveniada | BC-16 |
| `tb_acesso_dados_empresa` | INSERT | Entity: AcessoDadosEmpresa | EmpresaConveniada | BC-08 |
| `tb_empresa_minimo_contratual` | INSERT | Entity: MinimoContratual | MinimoContratual | BC-16 |
| `tb_preco_plano` | INSERT | Entity: TabelaPreco (Root) | TabelaPreco | BC-07 |
| `tb_valor_plano` | INSERT/UPDATE | Entity: ValorPlano | TabelaPreco | BC-07 |
| `tb_desconto_preco_plano` | INSERT | Entity: DescontoPrecoPlano | TabelaPreco | BC-07 |
| `tb_parametro_franquia` | INSERT | Entity: ParametroFranquia | TabelaPreco | BC-07 |
| `tb_parametros_unidade` | INSERT | Entity: ParametrosUnidade | EmpresaConveniada | BC-08 |
| `tb_parametros_unidade_pln_esp` | INSERT | Entity: ParametrosUnidadePlanoEsp | EmpresaConveniada | BC-08 |
| `tb_controle_fator_empresa` | INSERT/UPDATE | Entity: ControleFatorEmpresa (Root) | Coparticipacao | BC-09 |
| `tb_fator_empresa` | INSERT | Entity: FatorEmpresa | Coparticipacao | BC-09 |
| `tb_terapias_espec_empresa` | INSERT | Entity: TerapiasEspecEmpresa | Coparticipacao | BC-09 |
| `tb_copart_internacao_param_pj` | INSERT | Entity: CopartInternacaoPJ | Coparticipacao | BC-09 |
| `tb_copart_isnt_tp_benef` | INSERT | Entity: CopartIsencaoTipoBenef | Coparticipacao | BC-09 |
| `tb_copart_tipo_reembolso` | INSERT/UPDATE | Entity: CopartTipoReembolso | Coparticipacao | BC-09 |
| `tb_copart_tab_empresa` | INSERT | Entity: CopartTabelaEmpresa | Coparticipacao | BC-09 |
| `tb_compra_carencia` | INSERT | Entity: CompraCarencia (Root) | CompraCarencia | BC-10 |
| `tb_compra_grupo` | INSERT | Entity: CompraGrupo | CompraCarencia | BC-10 |
| `tb_compra_modulo` | INSERT | Entity: CompraModulo | CompraCarencia | BC-10 |
| `tb_odon_compra_grupo` | INSERT | Entity: OdonCompraGrupo | CompraCarencia | BC-10 |
| `tb_fidelizacao_empresa` | INSERT | Entity: FidelizacaoEmpresa (Root) | FidelizacaoEmpresa | BC-11 |
| `tb_acesso_internet` | INSERT | Entity: AcessoInternet (Root) | AcessoInternet | BC-12 |
| `tb_controle_internet` | INSERT/UPDATE | Entity: ControleInternet | AcessoInternet | BC-12 |
| `tb_emp_limite_acesso_contra` | INSERT | Entity: LimiteAcessoContrato | AcessoInternet | BC-12 |
| `tb_endereco_pessoa` | INSERT | Entity: EnderecoPessoa | PessoaJuridica | BC-04 |
| `tb_empresa_endereco` | INSERT/UPDATE | Entity: EmpresaEndereco | EmpresaConveniada | BC-04 |
| `tb_contato_pessoa` | INSERT/UPDATE | Entity: ContatoPessoa | PessoaJuridica | BC-04 |
| `tb_meio_comunicacao_pessoa` | INSERT | Entity: MeioComunicacao | PessoaJuridica | BC-04 |
| `tb_natureza_juridica_emp` | UPDATE | Entity: NaturezaJuridicaEmpresa | PessoaJuridica | BC-03 |
| `tb_reemb_empresa_prazo_pag` | DELETE/INSERT | Entity: ReembolsoEmpresaPrazoPag | ReembolsoEmpresa | BC-15 |
| `tb_reemb_empresa_prazo_pag_tip` | DELETE/INSERT | Entity: ReembolsoEmpresaPrazoPagTipo | ReembolsoEmpresa | BC-15 |
| `tb_reemb_empresa_tabela` | DELETE/INSERT | Entity: ReembolsoEmpresaTabela | ReembolsoEmpresa | BC-15 |
| `tb_reemb_empresa_composicao` | DELETE/INSERT | Entity: ReembolsoEmpresaComposicao | ReembolsoEmpresa | BC-15 |
| `tb_empresa_internet` | UPDATE | Entity: Proposta | Proposta | BC-01 |
| `tb_usuario_titular_internet` | UPDATE | e (cross-aggregate) | e | BC-01 |
| `tb_usuario_dependente_internet` | UPDATE | e (cross-aggregate) | e | BC-01 |
| `humaster.tb_log_baixa_controle` | INSERT | e (Infrastructure) | e | BC-14 |
| `tb_pendencia_empresa_internet` | INSERT | e (Infrastructure) | e | BC-14 |

### 13.2 Tabelas de LEITURA (SELECT e Read Models)

| Tabela | Artefato DDD | BC |
|---|---|---|
| `tb_empresa_internet` | Read Model: PropostaReadModel | BC-01 |
| `tb_vendedor_plano` | Read Model: VendedorReadModel | BC-05 |
| `tb_area_venda` | Read Model: AreaVendaReadModel | BC-05 |
| `tb_filial` | Read Model: FilialReadModel | BC-05 |
| `tb_empresa_neg` / `_bitix` | Read Model: ModeloNegocioReadModel | BC-06 |
| `tb_empresa_neg_tabela` | Read Model: TabelaNegocioReadModel | BC-06 |
| `tb_empresa_neg_desconto` | Read Model: DescontoNegocioReadModel | BC-06 |
| `tb_empresa_neg_franquia` | Read Model: FranquiaNegocioReadModel | BC-06 |
| `tb_empresa_neg_fator` | Read Model: FatorNegocioReadModel | BC-06 |
| `tb_empresa_neg_controle` | Read Model: ControleNegocioReadModel | BC-06 |
| `tb_empresa_neg_pln_esp` | Read Model: PlanoEspecialNegocioReadModel | BC-06 |
| `tb_empresa_neg_carencia` | Read Model: CarenciaNegocioReadModel | BC-10 |
| `tb_empresa_neg_fidelizacao` | Read Model: FidelizacaoNegocioReadModel | BC-11 |
| `tb_empresa_neg_isenta_copart` | Read Model: IsencaoCopartReadModel | BC-09 |
| `tb_empresa_neg_grupo` | Read Model: GrupoNegocioReadModel | BC-10 |
| `tb_empresa_neg_modulo` | Read Model: ModuloNegocioReadModel | BC-10 |
| `tb_empresa_cop_intern_pj` | Read Model: InternacaoPjReadModel | BC-09 |
| `tb_empresa_neg_isnt_cop_tp_ben` | Read Model: IsencaoTipoBenefReadModel | BC-09 |
| `tb_pessoa_lista_negra` | Read Model: ListaNegraReadModel | BC-02 |
| `tb_cep_logradouro` | Read Model: CepReadModel | BC-04 |
| `tb_cep_localidade` | Read Model: LocalidadeReadModel | BC-04 |
| `tb_uf` | Read Model: UfReadModel | BC-04 |
| `tb_tipo_logradouro` | Read Model: TipoLogradouroReadModel | BC-04 |
| `tb_plano` / `tb_plano_ans` / `tb_registro_plano_ans` | Read Model: PlanoReadModel | BC-07 |
| `tb_empresa_coligada` / `_bitx` | Read Model: ColigadaReadModel | BC-06 |
| `tb_natureza_juridica_wnce` | Read Model: NaturezaJuridicaReadModel | BC-02 |
| `tb_area_venda_proposta_senha` | Read Model: AreaVendaSenhaReadModel | BC-05 |
| `tb_emp_internet_filial` | Read Model: PropostaFilialReadModel | BC-05 |
| `tb_odon_empresa_internet` | Read Model: OdontoInternetReadModel | BC-13 |
| `tb_odon_empresa_neg_grupo` | Read Model: OdontoGrupoNegocioReadModel | BC-13 |
| `tb_indice_modelo_calculo_neg` | Read Model: IndiceModeloCalculoReadModel | BC-06 |
| `tb_taxa_implantacao` | Read Model: TaxaImplantacaoReadModel | BC-08 |
| `tb_empresa_internet_com` | Read Model: PropostaComissaoReadModel | BC-08 |
| `tb_reemb_plano_*` (4 tabelas) | Read Model: ReembolsoPlanoReadModel | BC-15 |
| `tb_param_minimo_contratual` | Read Model: MinimoContratualParamReadModel | BC-16 |
| `tb_odon_parametro_diversos` | Read Model: OdontoParametroReadModel | BC-13 |
| `tb_odon_param_esp_operadora` | Read Model: OdontoEspelhamentoReadModel | BC-13 |
| `tb_numero_extenso` | Read Model: NumeroExtensoReadModel | BC-12 |
| `tb_copart_tabela_plano` | Read Model: CopartTabelaPlanoReadModel | BC-09 |
| `tb_reg_ans_parametro` | Read Model: RegAnsParametroReadModel | BC-07 |

---

## 14. Diagrama de Agregados (Visual)

```
                              -----------------------------------
                              |       << Proposta >>             |
                              |  tb_empresa_internet (staging)   |
                              |  nu_controle (PK)                |
                              -----------------------------------
                                          | orquestra
                                          |
--------------------   ---------------------------------------------------------------
|<< PessoaJuridica |   |                << EmpresaConveniada >>                      |
|    Aggregate >>  |   |                                                             |
|                  |   |  -----------------------  --------------------------        |
| PessoaJuridica----------- EmpresaConveniada   |  | UnidadeContratual      |        |
|  --Endereco      |   |  | (ROOT)              |  |  --ParametrosUnidade   |        |
|  --Contato       |   |  |  cd_empresa_conv(PK)|  |     --ParamPlanEsp    |        |
|  --MeioComunic.  |   |  -----------------------  --------------------------        |
|  --NatJuridica   |   |                                                             |
--------------------   |  --------------- ---------------- ---------------------     |
                       |  |ConvNatureza | |FlagsConv     | |ModeloReajuste     |     |
                       |  --------------- ---------------- ---------------------     |
                       |  --------------- ---------------- ---------------------     |
                       |  |Implantacao  | |Comissao      | |CnpjContratante   |     |
                       |  --------------- ---------------- ---------------------     |
                       |  --------------- ---------------- ---------------------     |
                       |  |Historico    | |EmpEndereco   | |Breakeven         |     |
                       |  --------------- ---------------- ---------------------     |
                       |  --------------- ----------------                           |
                       |  |ImagemContr  | |AcessoDados   |                           |
                       |  --------------- ----------------                           |
                       ---------------------------------------------------------------

------------------------  -------------------------  ---------------------------
| << TabelaPreco >>    |  | << Coparticipacao >>   |  | << CompraCarencia >>    |
|                      |  |                        |  |                         |
| TabelaPreco (ROOT)   |  | ControleFator (ROOT)   |  | CompraCarencia (ROOT)   |
|  --ValorPlano        |  |  --FatorEmpresa        |  |  --CompraGrupo          |
|  --DescontoPreco     |  |  --TerapiasEspec       |  |  --CompraModulo         |
|  --ParamFranquia     |  |  --IsencaoCopart       |  |  --OdonCompraGrupo      |
|                      |  |  --InternacaoPJ        |  ---------------------------
| TabelaPrecoAgregado  |  |  --IsencaoTipoBenef    |
|  --ValorPlano        |  |  --TipoReembolso       |  ---------------------------
|  --DescontoPreco     |  |  --TabelaEmpresa       |  | << AcessoInternet >>    |
------------------------  -------------------------  |                         |
                                                      | AcessoInternet (ROOT)   |
------------------------  -------------------------  |  --ControleInternet     |
| << Fidelizacao >>    |  | << Reembolso >>        |  |  --LimiteAcesso        |
|                      |  |                        |  ---------------------------
| FidelizacaoEmp(ROOT) |  | ReembolsoPrazoPag      |
------------------------  | ReembolsoPrazoPagTipo  |  ---------------------------
                          | ReembolsoTabela         |  | << MinimoContratual >>  |
                          | ReembolsoComposicao     |  |                         |
                          -------------------------  | MinimoContratual (ROOT)  |
                                                      ---------------------------
```

---

## 15. Fluxo de Dominio (Orquestracao)

```
-- EfetivarContratoEmpresaPJUseCase --------------------------------------
|                                                                         |
|  | PropostaRepository.findPendentes(nu_controle)                       |
|     |                                                                   |
|  | ValidacaoPropostaService.validar(proposta)          | FAIL FAST     |
|     |-- SP01..SP21 (Specifications)                                     |
|     |-- Event: PropostaValidada                                        |
|     |                                                                   |
|  | ResolucaoFilialService.resolver(proposta)                           |
|     |-- VendedorRepository.findById()                                   |
|     |-- FilialRepository.findByAreaVenda()                              |
|     |-- Event: FilialResolvida                                         |
|     |                                                                   |
|  | ResolucaoModeloNegocioService.resolver(proposta, filial)            |
|     |-- ColigadaRepository.somarEmpregados()                           |
|     |-- ModeloNegocioRepository.findByParams()                          |
|     |-- Event: ModeloNegocioResolvido                                  |
|     |                                                                   |
|  | GeracaoCodigoEmpresaService.gerarCodigo()           | SO AQUI      |
|     |  (apos validacao + resolucao de filial e modelo)                  |
|     |                                                                   |
|  | PessoaJuridicaFactory.criarOuAtualizar(proposta)                    |
|     |-- PessoaJuridicaRepository.criar/atualizar()                     |
|     |-- Event: PessoaJuridicaCriada                                    |
|     |                                                                   |
|  | TabelaPrecoFactory.criar(modeloNegocio)                             |
|     |-- TabelaPrecoRepository.criarTabela()                            |
|     |-- Event: TabelaPrecoCriada                                       |
|     |                                                                   |
|  | EmpresaConveniadaFactory.criar(proposta, pessoa, tabela, filial)    |
|     |-- CalculoCanalVendaService.calcular()                            |
|     |-- EmpresaConveniadaRepository.criar()                            |
|     |-- Event: EmpresaConveniadaCriada                                 |
|     |                                                                   |
|  | ConfiguracaoCoparticipacaoService.configurar(empresa, modeloNeg)    |
|     |-- CoparticipacaoRepository.criarControle/Fatores/Terapias()      |
|     |-- Event: CoparticipacaoConfigurada                               |
|     |                                                                   |
|  | FidelizacaoFactory.criar(empresa, modeloNeg)  [se canal=2]         |
|     |-- FidelizacaoRepository.criar()                                  |
|     |-- Event: FidelizacaoConfigurada                                  |
|     |                                                                   |
|  | EnderecoComunicacaoService.cadastrar(pessoa, proposta)              |
|     |-- EnderecoComunicacaoRepository.criar*()                         |
|     |-- Event: EnderecosCadastrados                                    |
|     |                                                                   |
|  | ConfiguracaoCarenciaService.configurar(empresa, modeloNeg)          |
|     |-- CompraCarenciaFactory.criar()                                  |
|     |-- CarenciaRepository.criar*()                                    |
|     |-- Event: CarenciaConfigurada                                     |
|     |                                                                   |
|  | ConfiguracaoReembolsoService.configurar(empresa, tabela)            |
|     |-- ReembolsoEmpresaFactory.criar()                                |
|     |-- ReembolsoRepository.limparECopiar()                            |
|     |-- Event: ReembolsoConfigurado                                    |
|     |                                                                   |
|  | AcessoInternetFactory.criar(pessoa, empresa)                       |
|     |-- AcessoInternetRepository.criar()                               |
|     |-- Event: AcessoInternetCriado                                    |
|     |                                                                   |
|  | MinimoContratualRepository.criar(empresa, params)  [se existir]    |
|     |-- Event: MinimoContratualDefinido                                |
|     |                                                                   |
|  | COMMIT                                                              |
|     |                                                                   |
|  | NotificacaoEfetivacaoService.enviarEmail(empresa, proposta)         |
|  | DescontoEmpresaService.aplicar(empresa)  [se FL_ATIVA_PIM_ADM]     |
|  | CobrancaFaltaParamService.verificar(empresa)                       |
|  | EspelhamentoOdontoService.espelhar(empresa)  [se param 225=1]      |
|  | SuperSimplesOdontoService.configurar(empresa)  [se sem odonto]     |
|                                                                         |
|  | EM CASO DE ERRO:                                                    |
|     |-- ROLLBACK                                                        |
|     |-- AuditoriaRepository.registrarLog()                             |
|     |-- AuditoriaRepository.registrarPendencia()                       |
|     |-- COMMIT (pendencia)                                              |
---------------------------------------------------------------------------
```

---

## Metricas do Modelo

| Metrica | Quantidade |
|---|---|
| **Bounded Contexts** | 18 |
| **Aggregates** | 9 |
| **Entities** | 30 |
| **Value Objects** | 18 |
| **Domain Services** | 15 |
| **Application Services** | 1 (Use Case principal) |
| **Repositories** | 18 |
| **Domain Events** | 20 |
| **Factories** | 9 |
| **Specifications** | 21 |
| **Anti-Corruption Layers** | 3 |
| **Tabelas de escrita** | 47 |
| **Tabelas de leitura** | 37+ |

---

## Relacao com Documentos Existentes

| Documento | Relacao |
|---|---|
| `README-refatoracao.md` | Roadmap de fases (Quick Wins -> Packages -> Orquestrador -> Cloud) |
| `context-map-cadastramento-empresa.cml` | Context Map em DSL Context Mapper |
| `context-map-cadastramento-empresa.puml` | Diagrama visual do Context Map |
| `fluxo-execucao-cadastramento.puml` | Fluxo sequencial de execucao |
| `c4-model/*.puml` | Diagramas C4 (Contexto, Container, Componente) |
| **Este documento** | **Modelagem DDD detalhada com todos os artefatos** |

---

## Observacoes e Decisoes de Modelagem

### 1. Transacao unica (Consistency Boundary)
No legado, **toda a procedure roda em uma unica transacao** com COMMIT ao final. Na modelagem DDD, cada Aggregate define seu proprio boundary de consistencia. A migracao para multiplas transacoes (eventual consistency) exige **Saga Pattern**.

### 2. BITIX vs SIGO e Strategy Pattern
A duplicacao BITIX/SIGO e tratada como **variantes de um mesmo dominio**, nao como bounded contexts separados. Usar **Strategy Pattern** para unificar:
- `IOrigemPropostaStrategy` com implementacoes `SigoStrategy` e `BitixStrategy`
- Diferencas: resolucao de coligada, cursor de modelo negocio, datas de processamento

### 3. AFFIX e Caso Especial
Contratos AFFIX (`fn_checa_contrato_affix = 'S'`) possuem regras especiais em:
- Endereco (reutiliza da AFFIX em vez de criar novo)
- Coparticipacao (controle diferenciado)
- Limites de acesso (copia da empresa de cobranca)
- CNPJ contratante (insere relacao)
Modelar como **Policy** ou **Specification** que modifica o comportamento.

### 4. Agregados vs Tabelas Staging
As tabelas `tb_empresa_neg_*` (~15 tabelas) sao **Read Models do BC-06** que servem como fonte de parametrizacao. Elas NAO sao entidades de dominio e sao a "proposta comercial" que alimenta a criacao dos agregados reais.

### 5. Historico como Entidade
`tb_hist_empresa_conveniada` so e criada para naturezas 6 e 9 (PME/Simples) com assunto 130 (Empresa Nova). Modelada como Entity dentro do Aggregate EmpresaConveniada, nao como Event Sourcing.

### 6. Pos-COMMIT = Integracoes
Os passos apos o COMMIT (y a ac) sao **integracoes assincronas** que nao devem bloquear o fluxo principal. Na refatoracao, devem ser **Domain Events** publicados e consumidos de forma assincrona.

---

## Documentos Relacionados

| Documento | Descrição |
|-----------|-----------|
| `REGRAS-DE-NEGOCIO-POR-CONTEXTO.md` | 152 regras de negócio detalhadas por BC, com referências ao código-fonte |
| `ESTRATEGIA-REFATORACAO-PLSQL.md` | Estratégia de refatoração PL/SQL — Strangler Fig, 18 packages (`pk_tipos_cadastro`, `pk_log_auditoria`, etc.), `fn_montar_contexto`, roadmap de extração em 5 fases, regras de tradução PL/SQL→C# |
| `BACKLOG-EPICO-FEATURES-USERSTORIES-PLSQL.md` | Backlog completo com 27 User Stories e critérios de aceite |
| `README-refatoracao.md` | Roadmap geral de refatoração (4 fases: Quick Wins → Packages → Orquestrador → Modernização) |
| `context-map-cadastramento-empresa.cml` | Context Map DSL (Context Mapper) |

---

*Documento gerado em: 2025*  
*Procedure analisada: `pr_cadastramento_empresa_prov` e 4.991 linhas*  
*Repositorio: Hapvida.Sigo.Health.Plsql*
