# Dicionario de Siglas -- SIGO Refatoracao

> Criado em: 22/04/2026
> Escopo: Siglas utilizadas em artefatos de diagramacao, documentacao e codigo do projeto
> Complementa: `_shared/dicionario-dominio.md`

Ao referenciar uma sigla ja documentada aqui, usar `[REF dicionario-siglas.md]`.
Siglas de negocio com significado ampliado tambem constam no `dicionario-dominio.md`.

---

## 1. Projeto e Sistema

| Sigla   | Significado                                                         | Contexto de Uso                              |
|---------|---------------------------------------------------------------------|----------------------------------------------|
| SIGO    | Sistema de Gestao de Operadora de Planos de Saude                   | Nome do sistema legado principal -- Hapvida  |
| ANS     | Agencia Nacional de Saude Suplementar                               | Orgao regulador; riscos marcados com `[ANS]` |
| PIM     | Portal Internet de Movimentacao (nome legado do tipo/produto PME-SS) | [TIPO DE PROPOSTA] Sinonimo de SS/PME de pequeno porte. Nao e origem/ferramenta de venda -- propostas PIM podem ter origem WEBHAP ou BITIX. |
| SS      | Super Simples                                                       | [TIPO DE PROPOSTA] Nome atual equivalente a PIM: empresa PJ de pequeno porte (tipicamente ate 29 vidas). |
| CVS     | Concurrent Versions System                                          | Sistema de controle de versao do codigo legado |

---

## 2. Tipos de Proposta e Origens (Ferramentas de Venda)

**[CONCEITO]** TIPO DE PROPOSTA e ORIGEM sao dimensoes ortogonais:
- **Tipo** (porte/produto): PIM/SS, PME, Individual, Odonto -- determina fluxo de negocio
- **Origem** (ferramenta de venda): BITIX, WEBHAP, PONTO/TAFFIX -- determina onde foi digitada (campo `cd_operados`)

Uma proposta PIM/SS pode ter origem WEBHAP ou BITIX. Uma proposta PME idem. A rotina de efetivacao e escolhida pela ORIGEM, nao pelo TIPO.

### Tipos de Proposta

| Sigla   | Significado                                                         | Contexto de Uso                              |
|---------|---------------------------------------------------------------------|----------------------------------------------|
| PIM     | Portal Internet de Movimentacao (sinonimo de SS)                    | [TIPO] Empresa PJ de pequeno porte. Propostas PIM podem ter origem WEBHAP ou BITIX. |
| SS      | Super Simples                                                       | [TIPO] Mesmo que PIM, nomenclatura atual.    |
| PME     | Pequena e Media Empresa                                             | [TIPO] Empresas de 1 a 29 empregados (equivale a PIM/SS). Tambem comercializada via BITIX e WEBHAP. |
| POS     | POSBAIXA -- proposta cujo fluxo de conferencia documental ocorre APOS a efetivacao (excecao ao fluxo padrao PRE, que confere ANTES) | fn_get_confopera_emp = 1 indica proposta POSBAIXA |

### Origens (Ferramentas de Venda)

| Sigla   | Significado                                                         | Contexto de Uso                              |
|---------|---------------------------------------------------------------------|----------------------------------------------|
| BITIX   | [ORIGEM] Canal digital externo (NDI Minas)                          | Envia propostas PIM/PME via API JSON; `cd_operados='BITIX'`. Rotina: PK_VENDA_JSON. |
| WEBHAP  | [ORIGEM] Portal do Corretor (nome legado: "Portal PIM")              | Propostas digitadas por corretores; `cd_operados='WEBHAP'`. Rotina: PR_EFETIVA_INTERNET. Pode digitar PIM/SS ou PME (fluxos distintos). |
| TAFFIX  | [ORIGEM] Ferramenta usada por Administradoras de Beneficios         | Usa as mesmas estruturas de staging, mas para contratos por adesao. `cd_operados='PONTO'`. |
| PONTO   | Valor de `cd_operados` que identifica propostas de origem TAFFIX    | Usado para distinguir TAFFIX das demais origens. |
| NDI     | NDI Minas (parceiro operador da origem BITIX)                       | Empresa que opera a ferramenta BITIX         |
| SAC     | Servico de Atendimento ao Cliente                                   | Referenciado em notas de chamados (ex: SAC:1886321) |
| DIREX   | Diretoria Executiva                                                 | Origem da critica de empresa (pendencia 11)  |

---

## 3. Documentos e Identificadores Fiscais

| Sigla   | Significado                                                         | Contexto de Uso                              |
|---------|---------------------------------------------------------------------|----------------------------------------------|
| CPF     | Cadastro de Pessoa Fisica                                           | Identificador de beneficiarios (titular/dep) |
| CNPJ    | Cadastro Nacional da Pessoa Juridica                                | Identificador de empresa conveniada          |
| CIC     | Cadastro de Identificacao do Contribuidor                           | Termo tecnico usado em FN_CHECK_CIC (CPF/CNPJ) |
| CAEPF   | Cadastro de Atividade Economica da Pessoa Fisica                    | Retorno do FN_CHECK_CIC quando valor = 3     |
| PJ      | Pessoa Juridica                                                     | Tipo da empresa conveniada                   |

---

## 4. Tecnologia e Banco de Dados

| Sigla    | Significado                                                        | Contexto de Uso                              |
|----------|--------------------------------------------------------------------|----------------------------------------------|
| PL/SQL   | Procedural Language / Structured Query Language                    | Linguagem Oracle usada em todo o codigo legado |
| DML      | Data Manipulation Language (INSERT, UPDATE, DELETE, SELECT)        | Operacoes de banco proibidas via MCP (somente leitura) |
| DDL      | Data Definition Language (CREATE, ALTER, DROP)                     | Operacoes estruturais de banco               |
| API      | Application Programming Interface                                  | Interface de integracao (ex: BITIX -> PK_VENDA_JSON) |
| JSON     | JavaScript Object Notation                                         | Formato de payload da integracao BITIX       |
| SMTP     | Simple Mail Transfer Protocol                                      | Protocolo de envio de email (pr_send_mail)   |
| REST     | Representational State Transfer                                    | Estilo arquitetural da API BITIX             |
| HUMASTER | Nome do schema Oracle principal do SIGO                            | Prefixo em diagramas: HUMASTER.TB_*, PR_*, FN_* |

---

## 5. Convencao de Prefixos de Objetos Oracle

| Prefixo | Tipo de Objeto Oracle    | Exemplo                           |
|---------|--------------------------|-----------------------------------|
| TB_     | Table (Tabela)           | TB_EMPRESA_INTERNET               |
| PR_     | Procedure (Procedimento) | PR_EFETIVA_INTERNET               |
| FN_     | Function (Funcao)        | FN_REGISTRO_SISTEMA               |
| PK_     | Package (Pacote)         | PK_VENDA_JSON                     |
| SQ_     | Sequence (Sequencia)     | SQ_LOG_BAIXA                      |
| VW_     | View (Visao)             | VW_EMPRESA_CONVENIADA             |

---

## 6. Convencao de Prefixos de Colunas Oracle

| Prefixo | Significado de Negocio   | Exemplo de Coluna                 |
|---------|--------------------------|-----------------------------------|
| FL_     | Flag (indicador booleano S/N ou 0/1) | FL_STATUS, FL_BAIXA_AUTOMATICA |
| NU_     | Numero (identificador numerico)     | NU_CONTROLE, NU_TOTAL_EMPREGADO |
| CD_     | Codigo (codigo de dominio)          | CD_EMPRESA_CONVENIADA, CD_PENDENCIA |
| DT_     | Data                                | DT_CADASTRAMENTO, DT_INICIO     |
| TP_     | Tipo (classificacao)                | TP_OPERACAO, TP_CONTRATO        |
| VL_     | Valor (monetario ou numerico)       | VL_MENSALIDADE                  |
| NM_     | Nome (descritivo textual)           | NM_EMPRESA, NM_TITULAR          |
| ST_     | Status ou String (cursor/variavel)  | ST_E (cursor), ST_RETORNO       |
| DS_     | Descricao                           | DS_PENDENCIA                    |
| SG_     | Sigla                               | SG_ESTADO                       |

---

## 7. Arquitetura e Metodologia

| Sigla   | Significado                                                         | Contexto de Uso                              |
|---------|---------------------------------------------------------------------|----------------------------------------------|
| ADR     | Architecture Decision Record                                        | Registro de decisao arquitetural -- pasta `adrs arquitetura hapvida/` |
| DDD     | Domain-Driven Design                                                | Metodologia de modelagem de dominio aplicada ao projeto |
| EDA     | Event-Driven Architecture (Arquitetura Orientada a Eventos)         | ADR-02; eventos de dominio via Service Bus   |
| CQRS    | Command Query Responsibility Segregation                            | ADR-03; separacao de leitura e escrita       |
| ACL     | Anti-Corruption Layer (Camada Anticorrupcao)                        | ADR-05; isola dominio de sistemas externos   |
| BC      | Bounded Context (Contexto Delimitado)                               | Unidade de fronteira de dominio no DDD; prefixo BC-EI-XX, BC-VJ-XX |
| VO      | Value Object (Objeto de Valor)                                      | Building block DDD -- sem identidade propria |
| DE      | Domain Event (Evento de Dominio)                                    | Fato imutavel ocorrido no dominio; nomeado em ingles (ADR-18) |
| DS      | Domain Service (Servico de Dominio)                                 | Logica de dominio que nao pertence a uma entidade |
| C4      | Context, Container, Component, Code                                 | Modelo de arquitetura de software (Simon Brown) |
| UML     | Unified Modeling Language                                           | Linguagem de modelagem visual padrao         |

---

## 8. Diagramacao e Artefatos

| Sigla / Termo | Significado                                                    | Contexto de Uso                              |
|---------------|----------------------------------------------------------------|----------------------------------------------|
| PUML          | PlantUML -- linguagem de diagramacao textual                   | Extensao `.puml`; compilado para SVG         |
| SVG           | Scalable Vector Graphics                                       | Formato de saida dos diagramas PUML          |
| AS-IS         | Estado atual do sistema (antes da refatoracao)                 | Diagrama que representa o codigo legado      |
| TO-BE         | Estado futuro proposto (apos refatoracao)                      | Diagrama que representa a proposta refatorada |
| C4-L1         | C4 Model -- Nivel 1: Contexto do Sistema                       | `c4-1-system-context.puml`                   |
| C4-L2         | C4 Model -- Nivel 2: Container                                 | `c4-2-container-*.puml`                      |
| C4-L3         | C4 Model -- Nivel 3: Componente                                | `c4-3-component-*.puml`                      |
| RN            | Regra de Negocio                                               | Prefixo de marcacao nos diagramas: `[RN01]`, `[RN02]`, etc. |

---

## 9. Identificadores de Bounded Contexts

| Prefixo  | Bounded Context                          | Rotina Principal              |
|----------|------------------------------------------|-------------------------------|
| BC-EI-XX | Efetivacao Internet (PR_EFETIVA_INTERNET)| PR_EFETIVA_INTERNET           |
| BC-VJ-XX | Venda JSON (PK_VENDA_JSON)               | PK_VENDA_JSON                 |
| BC-CE-XX | Cadastramento Empresa (PR_CADASTRAMENTO_EMPRESA_PROV) | PR_CADASTRAMENTO_EMPRESA_PROV |

---

## 10. Tokens de Controle do Workflow

| Token               | Producido por        | Significado                                          |
|---------------------|----------------------|------------------------------------------------------|
| `[OK]`              | Qualquer agente      | Concluido e revisado                                 |
| `[EM-CURSO]`        | Qualquer agente      | Em andamento                                         |
| `[-]`               | Qualquer agente      | Pendente                                             |
| `[REVISAO]`         | Qualquer agente      | Requer revisao                                       |
| `[CRITICO]`         | Qualquer agente      | Problema critico identificado                        |
| `[ANS]`             | Qualquer agente      | Risco regulatorio ANS                                |
| `[ATENCAO]`         | Qualquer agente      | Ambiguidade documentada -- nao e suposicao silenciosa|
| `[REF]`             | Qualquer agente      | Referencia a outro artefato -- nao redocumentar      |
| `[BLOQUEADO]`       | Orquestrador         | Aguardando informacao externa                        |
| `[HANDOFF-DDD]`     | Agente Eng. Reversa  | Eng. reversa concluida; DDD pode iniciar             |
| `[HANDOFF-BACKLOG]` | Agente DDD           | DDD concluido; backlog pode iniciar                  |
| `[MIGRACAO]`        | Agente DDD           | Ponto de atencao para futura migracao a microsservico|
| `[ADR-AUSENTE]`     | Qualquer agente      | Decisao sem ADR correspondente -- requer criacao     |

---

## 11. Termos de Qualidade de Codigo (Eng. Reversa)

| Sigla / Termo | Significado                                                    | Onde Aparece                                 |
|---------------|----------------------------------------------------------------|----------------------------------------------|
| PADRAO-XX     | Padrao ou anti-padrao identificado no codigo legado            | `padroes-identificados.md`; `[PADRAO-01]`    |
| S-XX          | Smell de codigo (code smell) numerado                          | Artefatos de eng. reversa e DDD              |
| A-XX          | Ambiguidade numerada identificada na analise                   | Artefatos de eng. reversa e DDD              |
| MIG-XX        | Marcacao de ponto de migracao numerado                         | Diagramas TO-BE; complementa `[MIGRACAO]`    |
| BULK COLLECT  | Operacao Oracle para busca em lote (array processing)          | Marcado com `[MIGRACAO]` -- sem equiv. direto|
| FORALL        | Operacao Oracle para DML em lote sobre arrays                  | Marcado com `[MIGRACAO]` -- sem equiv. direto|
| DBMS_JOB      | Agendador legado Oracle (obsoleto, substituido por DBMS_SCHEDULER) | Disparador batch em diagramas C4        |
| UoW           | Unit of Work (Unidade de Trabalho)                             | Padrao de controle de transacao no TO-BE     |
