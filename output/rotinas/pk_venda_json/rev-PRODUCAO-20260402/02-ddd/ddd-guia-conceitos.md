# Guia de Conceitos DDD Aplicados: PK_VENDA_JSON

**Rotina:** PK_VENDA_JSON (PACKAGE SPEC + BODY, Schema HUMASTER)
**Versao CVS:** PRODUCAO-20260402
**Artefato de referencia:** ddd-modelagem-dominio.md (mesma pasta)
**Data:** 18/04/2026

---

## Objetivo deste Documento

Este guia explica cada conceito do Domain-Driven Design (DDD) utilizado na modelagem da
rotina PK_VENDA_JSON. Para cada conceito sao apresentados:

1. **O que e** -- definicao do padrao DDD
2. **Por que se aplica aqui** -- problema que o conceito resolve neste contexto
3. **Como foi identificado** -- evidencia no codigo legado
4. **O que ficou definido** -- resultado concreto da modelagem

O objetivo e servir tanto de guia de estudo para quem nao conhece DDD quanto de
rastreabilidade tecnica para quem precisa entender as decisoes de modelagem.

---

## Sumario

1. [Domain-Driven Design (DDD) -- Visao Geral](#1-domain-driven-design-ddd--visao-geral)
2. [Bounded Context (Contexto Delimitado)](#2-bounded-context-contexto-delimitado)
3. [Linguagem Ubiqua (Ubiquitous Language)](#3-linguagem-ubiqua-ubiquitous-language)
4. [Aggregate (Agregado)](#4-aggregate-agregado)
5. [Entity (Entidade)](#5-entity-entidade)
6. [Value Object (Objeto de Valor)](#6-value-object-objeto-de-valor)
7. [Domain Service (Servico de Dominio)](#7-domain-service-servico-de-dominio)
8. [Domain Event (Evento de Dominio)](#8-domain-event-evento-de-dominio)
9. [Repository (Repositorio)](#9-repository-repositorio)
10. [Specification (Especificacao)](#10-specification-especificacao)
11. [Factory (Fabrica)](#11-factory-fabrica)
12. [Anti-Corruption Layer (ACL)](#12-anti-corruption-layer-acl)
13. [CQRS -- Command Query Responsibility Segregation](#13-cqrs--command-query-responsibility-segregation)
14. [Context Map (Mapa de Contextos)](#14-context-map-mapa-de-contextos)
15. [Resumo da Modelagem Aplicada](#15-resumo-da-modelagem-aplicada)

---

## 1. Domain-Driven Design (DDD) -- Visao Geral

### O que e

DDD e uma abordagem de desenvolvimento de software criada por Eric Evans (livro
"Domain-Driven Design: Tackling Complexity in the Heart of Software", 2003). A premissa
central e que o software deve refletir o dominio de negocio com fidelidade -- as
estruturas de codigo devem espelhar as estruturas conceituais do negocio, e a
linguagem usada no codigo deve ser a mesma linguagem usada pelos especialistas de
negocio.

DDD divide-se em dois blocos:

- **Building Blocks** (blocos de construcao): os padroes taticos -- Aggregate, Entity,
  Value Object, Repository, Service, Factory, etc. Dizem *como* modelar um unico
  subdominio.
- **Strategic Design** (design estrategico): os padroes estrategicos -- Bounded Context,
  Context Map, Ubiquitous Language. Dizem *o que* modelar e *onde estao as fronteiras*.

### Por que se aplica aqui

PK_VENDA_JSON e um package PL/SQL de 6.334 linhas que acumula dois dominios distintos,
15 variaveis globais de estado, codigo triplicado e logica de negocio misturada com
infraestrutura Oracle. DDD oferece o vocabulario e os padroes para:

- Identificar as fronteiras corretas (o que pertence junto e o que deve ser separado)
- Nomear conceitos com precisao de negocio (eliminando termos tecnicos no modelo)
- Preparar o codigo para uma futura migracao para microsservicos sem reescrever tudo do zero

### Referencia ADR

[REF ADR-74] Domain-Driven Design (DDD) -- orienta toda a modelagem deste projeto.

---

## 2. Bounded Context (Contexto Delimitado)

### O que e

Um Bounded Context (BC) e uma fronteira explicita dentro da qual um modelo de dominio
tem significado consistente. Dentro de um BC, cada termo tem uma definicao unica e
inequivoca. Fora desse BC, o mesmo termo pode ter significado diferente.

Exemplo classico: "Cliente" no contexto de Vendas tem atributos diferentes de "Cliente"
no contexto de Suporte -- sao o mesmo ser humano, mas modelos distintos. Forcar um
modelo unico gera complexidade acidental.

A fronteira de um BC nao precisa ser um microsservico -- pode ser um package, um
modulo, uma namespace. O BC e conceitual; a implementacao e separada.

### Por que se aplica aqui

PK_VENDA_JSON mistura artificialmente dois dominios distintos: (1) recepcao e traducao
de propostas JSON do sistema externo BITIX (responsabilidade de integracao), e (2)
efetivacao de propostas em contratos definitivos no SIGO (responsabilidade de negocio
de saude suplementar). Esses dois dominios tem regras, ciclos de vida e responsabilidades
completamente diferentes.

### Como foi identificado

A analise das 12 rotinas internas do package revelou dois agrupamentos sem sobreposicao:

- Grupo 1 -- Integracao: `pr_pim_insere_cnpj`, `fn_set_empresa_internet`,
  `pr_set_usuario_internet`, `pr_odon_cad_empresa_prov`, `pr_set_usuario_od`
  (receber, desserializar, persistir staging)
- Grupo 2 -- Efetivacao: `pr_efetiva`, `pr_efetiva_baixa_manual`,
  `pr_efetiva_baixa_manual_emp`, `fn_get_criticas_pendencias`
  (ler staging, validar, efetivar, atualizar status)

Adicionalmente, a analise de dependencias revelou que o codigo de efetivacao e
praticamente identico ao de PR_EFETIVA_INTERNET -- evidencia de que pertencem ao
mesmo BC de negocio, apenas replicados por canal.

### O que ficou definido

Foram identificados **10 Bounded Contexts** (BC-VJ-01 a BC-VJ-10):

| BC        | Nome                           | Tipo    |
|-----------|--------------------------------|---------|
| BC-VJ-01  | Recepcao de Proposta BITIX     | Core    |
| BC-VJ-02  | Validacao e Critica BITIX      | Support |
| BC-VJ-03  | Efetivacao Empresa BITIX       | Core    |
| BC-VJ-04  | Efetivacao Beneficiarios BITIX | Core    |
| BC-VJ-05  | Gestao de Status Final         | Support |
| BC-VJ-06  | Grupo Coligado BITIX           | Support |
| BC-VJ-07  | Mapeamento Saude-Odonto        | Support |
| BC-VJ-08  | Auto-baixa POS                 | Core    |
| BC-VJ-09  | Configuracao de Sistema        | Generic |
| BC-VJ-10  | Integracao Odonto              | Support |

A classificacao **Core / Support / Generic** e estrategica:

- **Core Domain**: diferenciais competitivos da Hapvida -- onde investir mais qualidade
- **Supporting**: necessario, mas nao e vantagem competitiva -- pode ser terceirizado
- **Generic**: commodidade -- deve ser comprado, nao construido do zero

---

## 3. Linguagem Ubiqua (Ubiquitous Language)

### O que e

Linguagem Ubiqua e o vocabulario compartilhado entre desenvolvedores e especialistas de
negocio dentro de um Bounded Context. Cada conceito recebe um nome preciso, acordado entre
as duas partes. Esse nome e usado em todo lugar: conversa, codigo, documentacao, testes.

A premissa e que a distancia entre o codigo e o negocio gera bugs. Se o desenvolvedor
precisa "traduzir mentalmente" de `FL_STATUS = 6` para "proposta elegivel para
efetivacao" toda vez que le o codigo, a probabilidade de erro cresce com o tempo.

### Por que se aplica aqui

O codigo legado esta cheio de termos tecnicos, valores magicos e abreviacoes sem
documentacao: `FL_STATUS = 6`, `p_origem = 'BITIX'`, `fn_get_confopera_emp = 1`,
`'-999'`, `'BAIXAPOS'`. Um novo desenvolvedor nao consegue entender o negocio lendo
o codigo.

### Como foi identificado

Cada condicao de guarda (`IF`, `ELSIF`), cada constante literal e cada nome de variavel
foi mapeado para seu significado de negocio. Exemplos centrais:

```sql
-- Legado (tecnico)
IF FL_STATUS = 6 THEN ...

-- Dominio (negocio)
IF proposta.status = StatusProposta.AGUARDANDO_BAIXA THEN ...
```

```sql
-- Legado (tecnico)
IF fn_get_confopera_emp(p_nu_controle) = 1 THEN ...

-- Dominio (negocio)
IF proposta.canalDeVenda = CanalDeVenda.POS THEN ...
```

### O que ficou definido

Foram definidos **15 novos termos** na Linguagem Ubiqua da rotina:

| Termo Tecnico (legado)               | Termo de Dominio (DDD)        |
|--------------------------------------|-------------------------------|
| p_origem = 'BITIX'                   | Origem BITIX                  |
| fn_get_confopera_emp = 1             | Canal POS                     |
| FL_STATUS = 6                        | Proposta Aguardando Baixa     |
| pr_efetiva_baixa_manual(...,'BAIXAPOS') | Auto-baixa POS              |
| G_TOTAL_BENEFICIARIO vs G_COUNT_BENEFIIFIM | Contagem de Beneficiarios|
| TB_PIM_CONTROLE_CPF                  | Mapeamento Controle           |
| NU_TOTAL_EMPREGADO BETWEEN 30 AND 99 | Empresa Middle                |
| FL_CONTA_CONJUNTA_ODONTO = 'S'       | Conta Conjunta Odonto         |
| TB_FILE_DOCUMENTO_BITIX              | Blocklist BITIX               |
| TB_EMPRESA_COLIGADA_BITX             | Proposta Coligada BITIX       |
| '-999'                               | [ATENCAO] A08: pendente definicao com PO |

[REF ADR-21] Linguagem Onipresente -- orienta a adocao dos termos definidos nesta secao.

---

## 4. Aggregate (Agregado)

### O que e

Um Aggregate e um cluster de objetos de dominio (Entidades e Value Objects) tratado
como uma unidade para fins de consistencia. Cada Aggregate tem um **Aggregate Root**
(raiz), que e o unico objeto pelo qual os objetos externos podem referenciar o cluster.

Toda modificacao ao Aggregate passa pela raiz. Isso garante que as invariantes
(regras que nunca podem ser violadas) sejam sempre verificadas antes de qualquer
persistencia.

**Regra pratica de identificacao:** objetos que precisam ser salvos juntos na mesma
transacao para manter a consistencia do negocio pertencem ao mesmo Aggregate.

### Por que se aplica aqui

PK_VENDA_JSON opera sobre multiplas tabelas numa mesma transacao sem uma raiz clara de
consistencia. Isso torna dificil saber "quem e responsavel por garantir que as regras
de negocio sejam verificadas antes do COMMIT". O Aggregate define essa responsabilidade.

### Como foi identificado

As tabelas escritas juntas no mesmo bloco transacional foram agrupadas:

- `TB_PROPOSTA_VENDA` + `TB_EMPRESA_INTERNET` + `TB_ODON_EMPRESA_INTERNET` +
  `TB_EMPRESA_COLIGADA_BITX` + `TB_STATUS_PROPOSTA_CADASTRO` -- sempre modificadas
  juntas no ciclo de vida de uma proposta
- `TB_USUARIO_TITULAR_INTERNET` + `TB_USUARIO_DEPENDENTE_INTERNET` +
  `TB_USUARIO_CRITICA_INTERNET` + `TB_PIM_CONTROLE_CPF` -- sempre modificadas juntas
  no ciclo de vida de um beneficiario

### O que ficou definido

Dois Aggregates foram definidos:

**Agregado 1 -- PropostaEmpresaBitix**
- Aggregate Root: `NU_CONTROLE` (da proposta)
- Invariantes protegidas:
  - [RN02] Apenas propostas com status=6 sao elegiveis para efetivacao
  - [RN03] Grupo coligado so pode efetivar quando todas as empresas estao em status 6, 7 ou 10
  - [RN09] Uma proposta ja integrada nao pode ser reintegrada (idempotencia)
  - [RN16] Contagem de beneficiarios processados deve coincidir com o JSON

**Agregado 2 -- BeneficiarioBitix**
- Aggregate Root: `NU_CONTROLE` do beneficiario
- Invariantes protegidas:
  - [RN06] Beneficiario so pode ser efetivado com zero criticas
  - [RN14] Beneficiario com status Neoway (17) impede auto-baixa POS de toda a empresa

---

## 5. Entity (Entidade)

### O que e

Uma Entity e um objeto de dominio definido pela sua **identidade** -- nao pelos seus
atributos. Duas entidades com os mesmos atributos mas identidades diferentes sao objetos
distintos. A identidade persiste ao longo do tempo, mesmo que os atributos mudem.

Exemplo: um beneficiario que muda de endereco continua sendo o mesmo beneficiario. A
identidade (CPF, matricula) nao muda.

### Por que se aplica aqui

No codigo legado, as tabelas eram tratadas de forma indistinta -- qualquer tabela com
qualquer chave. Definir Entities torna explicito quais objetos tem identidade propria e
precisam de rastreabilidade ao longo do tempo.

### Como foi identificado

Tabelas com chave primaria significativa para o negocio, onde o mesmo registro e
atualizado multiplas vezes ao longo do processo (nao apenas inserido e lido) foram
classificadas como Entities.

### O que ficou definido

**Entities do Agregado PropostaEmpresaBitix:**
- `EmpresaInternet` -- identidade: NU_CONTROLE
- `OdonEmpresaInternet` -- identidade: NU_CONTROLE (odonto)
- `PendenciaEmpresaBitix` -- identidade: NU_CONTROLE_PENDENCIA
- `StatusCadastroBitix` -- log de transicoes de status

**Entities do Agregado BeneficiarioBitix:**
- `TitularInternet` -- identidade: NU_CONTROLE do titular
- `DependenteInternet` -- identidade: NU_CONTROLE do dependente
- `CriticaBeneficiario` -- identidade: NU_CONTROLE + CD_CRITICA
- `MapeamentoSaudeOdonto` -- identidade: par (NU_CONTROLE_TIT + NU_CONTROLE empresa)

---

## 6. Value Object (Objeto de Valor)

### O que e

Um Value Object e um objeto de dominio definido pelos seus **atributos** -- nao tem
identidade propria. Dois Value Objects com os mesmos atributos sao identicos e
intercambiaveis. Value Objects sao **imutaveis**: qualquer modificacao cria um novo
objeto.

Exemplos classicos: uma data, um valor monetario, um endereco, uma cor.

**Regra pratica de identificacao:** se voce pode substituir uma instancia por outra com
os mesmos valores sem que o negocio perceba diferenca, e um Value Object.

### Por que se aplica aqui

O codigo legado usa escalares soltos (`FL_STATUS NUMBER`, `V_ORIGEM VARCHAR2`,
`l_empresa_conveniada_saude_pai VARCHAR2`) sem semantica de negocio. Value Objects
encapsulam esses valores com suas regras de validacao, tornando invalidos os estados
como `FL_STATUS = 15` (inexistente na maquina de estados) ou `V_ORIGEM = 'QQQQ'`
(origem invalida).

### Como foi identificado

Conjuntos de atributos que (1) andam sempre juntos, (2) tem restricoes de valores
validos, e (3) nao precisam ser identificados individualmente no banco foram
agrupados em Value Objects.

### O que ficou definido

**Value Objects do Agregado PropostaEmpresaBitix:**

| Value Object              | Atributos / Valores Validos                                 | Problema Resolvido                    |
|---------------------------|-------------------------------------------------------------|---------------------------------------|
| StatusProposta            | 0, 1, 2, 3, 4, 6, 7, 8, 9, 10                             | Impede status 15, -1, null            |
| OrigemEfetivacao          | 'T229B', 'JOB', 'BITIX', 'BAIXAPOS', 'BPR'                | Elimina literais espalhados no codigo  |
| GrupoColigada             | cd_proposta_mae + lista de tprovisorio                     | Encapsula regra de completude (RN03)   |
| FluxoPOSRastreamento      | 7=coligada, 10=base, 17=Neoway, 99=blocklist               | Substitui magicas em TB_PIM_FLUXO_POS |
| ConfiguracaoCobrancaMiddle| l_empresa_conveniada_saude_pai + l_empresa_cobranca        | Encapsula '-999' [ATENCAO] A08         |

**Value Objects do Agregado BeneficiarioBitix:**

| Value Object              | Atributos / Valores Validos                                 | Problema Resolvido                    |
|---------------------------|-------------------------------------------------------------|---------------------------------------|
| CodigoProvisorioEmpresa   | 'T' || nu_controle_empresa                                  | Isola convencao fragil [S09]           |
| StatusProcessamentoBenef  | '0', '1', '2', '8', '9', '17'                              | Documenta o que '17' significa         |
| ControleOdontoTitular     | nu_controle_tit_od (NUMBER, nullable)                       | Documenta que NULL = sem plano odonto  |

---

## 7. Domain Service (Servico de Dominio)

### O que e

Um Domain Service encapsula logica de negocio que **nao pertence naturalmente a nenhuma
entidade ou value object especifico**. Quando uma operacao envolve multiplos objetos de
dominio e nenhum deles e o "dono" natural da operacao, essa operacao e um Domain Service.

**Regra de ouro:** se voce esta forcando uma operacao dentro de uma entidade so para ter
um lugar para coloca-la, provavelmente e um Domain Service.

Domain Services nao tem estado (stateless). Recebem objetos de dominio como entrada,
realizam a logica e retornam um resultado ou disparam eventos.

### Por que se aplica aqui

As rotinas mais complexas do package (`pr_pim_insere_cnpj`, `pr_efetiva`,
`fn_get_criticas_pendencias`) nao pertencem a nenhuma entidade -- elas orquestram
multiplas entidades ao mesmo tempo. Sao candidatos naturais a Domain Services.

### Como foi identificado

Criterios usados para classificar uma rotina como Domain Service:

1. A rotina acessa 3 ou mais tabelas de entidades distintas numa unica operacao
2. Nenhuma entidade individualmente pode ser considerada "dona" da logica
3. A logica representa um processo de negocio completo (nao um simples getter/setter)

### O que ficou definido

Foram identificados **9 Domain Services**:

| Service                        | Logica de Negocio                                    | Problema de Design Identificado       |
|--------------------------------|------------------------------------------------------|---------------------------------------|
| IntegracaoBitixService         | Receber JSON, desserializar, persistir staging       | Mistura ACL com logica de negocio     |
| EfetivacaoBatchService         | Loop JOB sobre propostas status=6                   | Depende de flag fn_registro_sistema   |
| EfetivacaoEspecificaService    | Efetivar proposta individual por origem              | Codigo triplicado [S02]               |
| MotorCriticasService           | Contar criticas/pendencias em 3 modos                | [CRITICO] efeito colateral de escrita [S12] |
| GrupoColigadoService           | Verificar completude de grupo coligado               | Logica inline sem procedure propria   |
| AutoBaixaPOSService            | 4 verificacoes POS + acionar efetivacao              | Bloco inline sem nome ou fronteira    |
| MapeamentoSaudeOdontoService   | Criar/consultar vinculo 1:1 saude-odonto             | Espalhado em 2 rotinas distintas      |
| StatusFinalService             | Decidir status 7 ou 10 apos efetivacao               | Replicado em 3 rotinas [S07]          |
| PendenciaUsuarioService        | Atualizar pendencias apos efetivacao de beneficiario | WHEN OTHERS THEN NULL silencioso [S01]|

---

## 8. Domain Event (Evento de Dominio)

### O que e

Um Domain Event representa um **fato que aconteceu no dominio** e que outros partes do
sistema podem precisar saber. O nome de um Domain Event e sempre no passado: "Proposta
Efetivada", "Grupo Incompleto Detectado", "Auto-baixa Acionada".

Domain Events servem para desacoplar producao de reacao. Quem produz o evento nao
precisa saber quem vai consumi-lo. Isso e a base da Arquitetura Orientada a Eventos
(Event-Driven Architecture).

No contexto atual (PL/SQL), os eventos nao sao publicados em filas -- eles sao
**identificados conceitualmente** para preparar a migracao futura (Fase 3, microsservicos
Azure). No TO-BE em PL/SQL, podem ser registrados em tabelas de eventos.

### Por que se aplica aqui

O package executa varios COMMITs intermediarios que representam fatos de negocio
irreversiveis. Cada COMMIT significativo e um candidato a Domain Event -- especialmente
os que causam reacoes em outros sistemas (PR_EFETIVA_INTERNET, integracao BITIX, JOB).

### Como foi identificado

Cada COMMIT ou transicao de estado irreversivel no codigo foi mapeado para um evento:

```sql
-- Codigo legado (COMMIT implicito apos batch)
UPDATE TB_PROPOSTA_VENDA SET FL_STATUS = 10 WHERE NU_CONTROLE = p_nu_controle;

-- Domain Event identificado:
-- PropostaEfetivada (nu_controle, cd_empresa, fl_status_final=10)
```

### O que ficou definido

Foram identificados **8 Domain Events**:

| Evento                          | Quando                                                  | Topico Azure (Fase 3)                  |
|---------------------------------|---------------------------------------------------------|----------------------------------------|
| PropostaIntegradaBitix          | staging concluido (FL_COMMIT='N' ou 'S')                | sigo.proposta.integrada.bitix          |
| AutoBaixaAcionada               | POS + sem coligada + sem criticas/Neoway/blocklist       | sigo.proposta.auto-baixa.acionada      |
| PropostaEfetivada               | pr_efetiva_baixa_manual conclui com empresa criada       | sigo.proposta.efetivada                |
| EmpresaComCritica               | motor retorna > 0 com p_valida_nao_coligada='S'          | sigo.proposta.critica.detectada        |
| GrupoColigadoIncompleto         | COUNT_NAO_APTA_BAIXA > 0 no loop                        | sigo.grupo.coligado.incompleto         |
| ColigadaRegistradaComFluxoPOS   | POS + FL_COMMIT='S' + V_COLIGADA='S'                    | sigo.coligada.pos.registrada           |
| PropostaDevolvida               | motor > 0 + sem POS + nao coligada                       | sigo.proposta.devolvida                |
| DivergenciaContadorBeneficiario | V_AUX != G_COUNT_BENEFIIFIM apos JSON                   | sigo.proposta.divergencia.beneficiario |

[REF ADR-02] Arquitetura Orientada a Eventos -- orienta a identificacao e o modelo de publicacao dos Domain Events.

---

## 9. Repository (Repositorio)

### O que e

Um Repository e uma abstracao que simula uma **colecao em memoria** de objetos de
dominio. Do ponto de vista do dominio, um Repository parece um conjunto onde voce pode
adicionar, buscar e remover objetos -- sem se preocupar com SQL, cursores ou transacoes.

O Repository isola o dominio dos detalhes de persistencia. Isso significa que a logica
de negocio nao sabe (nem precisa saber) se os dados estao num Oracle, PostgreSQL ou
arquivo JSON.

**Regra de cardinalidade:** existe exatamente **um Repository por Aggregate Root**.
Voce nao cria um Repository para cada tabela -- cria para cada Aggregate Root.

### Por que se aplica aqui

O codigo legado acessa tabelas diretamente de dentro das procedures, sem qualquer
abstracao. Isso acopla a logica de negocio ao schema Oracle, tornando impossivel
testar a logica sem um banco rodando. Repositorios criam essa separacao.

### Como foi identificado

Para cada Aggregate Root identificado, foram listadas todas as operacoes DML
(SELECT, INSERT, UPDATE, DELETE) realizadas sobre suas tabelas. Essas operacoes
tornaram-se os metodos do Repository.

### O que ficou definido

Foram definidos **11 Repositorios**:

| Repositorio                   | Aggregate Root           | Operacoes Principais                                 |
|-------------------------------|--------------------------|------------------------------------------------------|
| PropostaVendaRepository       | PropostaEmpresaBitix     | findByStatus(6), updateStatus, updateCdEmpresa       |
| EmpresaInternetRepository     | PropostaEmpresaBitix     | insert, update, selectByControle, updateCdEmpresa    |
| ColigadaBitixRepository       | PropostaEmpresaBitix     | findByMae, countNaoApta, insert, delete              |
| FluxoPOSRepository            | PropostaEmpresaBitix     | setFluxo, getFluxo                                   |
| StatusCadastroRepository      | PropostaEmpresaBitix     | insert (log de status)                               |
| PendenciaEmpresaRepository    | PropostaEmpresaBitix     | insert, selectByControle                             |
| BeneficiarioInternetRepository| BeneficiarioBitix        | findByEmpresa, updateStatus, selectCriticas          |
| CriticaBeneficiarioRepository | BeneficiarioBitix        | countByControle, selectByControle                    |
| MapeamentoControleRepository  | BeneficiarioBitix        | findByControleTit, insert, update                    |
| BlocklistRepository           | BeneficiarioBitix        | countBlocklistByControle                             |
| PendenciaUsuarioRepository    | BeneficiarioBitix        | deleteByUsuario, insertByUsuario                     |

[REF ADR-22] Padrao Repositorio -- orienta a definicao e cardinalidade dos repositorios.

---

## 10. Specification (Especificacao)

### O que e

Uma Specification encapsula uma **regra de negocio booleana** como um objeto reutilizavel.
Em vez de espalhar condicoes IF identicas em varios lugares do codigo, a Specification
nomeia explicitamente o que esta sendo verificado.

A grande vantagem e a composicao: Specifications podem ser combinadas com AND, OR, NOT,
criando regras complexas a partir de regras simples nomeadas.

Exemplo:
```
AutoBaixaPOSElegivelSpec = CanalPOSSpec AND FlCommitSimSpec AND
                           SemColigadaSpec AND PropostaSemCriticasSpec AND
                           SemBlocklistSpec AND SemPendenciaNeowaySpec
```

### Por que se aplica aqui

O codigo legado tem condicoes de guarda longas e repetidas espalhadas em varios lugares.
A condicao de auto-baixa POS, por exemplo, e verificada em pelo menos 3 locais com
ligeiras variacoes -- evidencia de duplicacao de regra sem nome.

### Como foi identificado

Cada bloco `IF` que representa uma **pre-condicao de negocio** (nao uma pre-condicao
tecnica) foi candidato a Specification. A regra foi: se a condicao tem nome de negocio
("proposta elegivel", "sem blocklist"), e uma Specification.

### O que ficou definido

Foram definidas **8 Specifications**:

| Specification               | Regra de Negocio                                          | Regra de Negocio (RN) |
|-----------------------------|-----------------------------------------------------------|-----------------------|
| PropostaElegivelSpec        | FL_STATUS = 6                                             | RN02                  |
| GrupoColigadoCompletoSpec   | COUNT(coligadas com status invalido) = 0                  | RN03                  |
| PropostaSemCriticasSpec     | fn_get_criticas_pendencias(nu_controle, modo) = 0         | RN04                  |
| IdempotenciaIntegracaoSpec  | Proposta ja integrada nao reprocessa                      | RN09                  |
| SemBlocklistSpec            | fn_get_blocklist_emp(nu_controle) = 0                     | RN13                  |
| SemPendenciaNeowaySpec      | fn_get_pend_neoway(nu_controle) = 0                       | RN14                  |
| ContadorBeneficiariosOkSpec | COUNT(beneficiarios staging) = G_TOTAL_BENEFICIARIO       | RN16                  |
| AutoBaixaPOSElegivelSpec    | Composicao de: POS + FL_COMMIT='S' + sem coligada + sem criticas + sem blocklist + sem Neoway | RN08 |

---

## 11. Factory (Fabrica)

### O que e

Uma Factory encapsula a **logica de criacao** de objetos de dominio complexos. Quando
criar um objeto requer mais do que um simples construtor -- por exemplo, consultar
sequences, gerar identificadores, replicar dados para sistemas relacionados -- a Factory
isola essa complexidade.

A Factory garante que o objeto criado esta **sempre em estado valido** desde o momento
da criacao. Nunca se cria um objeto incompleto para "completar depois".

### Por que se aplica aqui

A criacao de uma nova proposta no SIGO envolve gerar dois numeros de controle (saude e
odonto) via sequences Oracle, criar registros em multiplas tabelas e ja vincular os
controles entre si. Essa complexidade de criacao precisa de um lugar explicito.

### Como foi identificado

Blocos de codigo que (1) invocam sequences Oracle, (2) criam o objeto principal E
objetos relacionados ao mesmo tempo, ou (3) tem logica de "se existe reutiliza, senao
cria" foram identificados como Factories.

### O que ficou definido

Foram definidas **3 Factories**:

| Factory                      | O Que Cria                                        | Complexidade Encapsulada                                    |
|------------------------------|---------------------------------------------------|-------------------------------------------------------------|
| PropostaEmpresaFactory       | NU_CONTROLE (saude) e NU_CONTROLE_OD (odonto)    | 2 chamadas a sequences; vinculo saude-odonto desde a criacao|
| EmpresaInternetFactory       | TB_EMPRESA_INTERNET%ROWTYPE + replica odonto      | Desserializacao JSON + mapeamento para estrutura Oracle      |
| ControleOdontoTitularFactory | NU_CONTROLE_TIT_OD para mapeamento beneficiario  | Reutiliza existente de TB_PIM_CONTROLE_CPF ou gera novo (RN10)|

---

## 12. Anti-Corruption Layer (ACL)

### O que e

Um Anti-Corruption Layer (ACL) e uma camada de traducao que protege o dominio interno
de ser "contaminado" pelo modelo de um sistema externo. Quando dois sistemas com
modelos diferentes precisam se comunicar, o ACL traduz os conceitos de um para o
outro sem deixar que as estruturas externas entrem no dominio interno.

O nome "anti-corruption" se refere a proteger a integridade do modelo de dominio
interno. Sem o ACL, o dominio interno precisaria se adaptar ao modelo externo,
corrompendo sua coerencia.

### Por que se aplica aqui

O sistema BITIX envia propostas em formato JSON com sua propria nomenclatura, estrutura
e convencoes. O SIGO tem seu proprio modelo de dominio (TB_EMPRESA_INTERNET, staging,
efetivacao). O `pr_pim_insere_cnpj` atualmente mistura a traducao (responsabilidade
do ACL) com a logica de negocio de integracao e auto-baixa (responsabilidade do
dominio SIGO).

### Como foi identificado

A analise de `pr_pim_insere_cnpj` revelou dois tipos de codigo misturados:

- **Tipo ACL** (traducao): `JSON_VALUE(to_clob(json), '$.FL_COMMIT')`,
  `fn_set_empresa_internet`, `pr_set_usuario_internet` -- convertendo JSON para estruturas Oracle
- **Tipo Dominio** (logica de negocio): verificacao de idempotencia, regras de coligada,
  auto-baixa POS, chamada a `pr_efetiva_baixa_manual`

### O que ficou definido

`PK_VENDA_JSON.pr_pim_insere_cnpj` e o **ACL canonico** entre BITIX e SIGO.

Traducoes realizadas:

| Conceito BITIX (externo)     | Traducao para SIGO                                 |
|------------------------------|----------------------------------------------------|
| Campo JSON "FL_COMMIT"       | Flag staging vs efetivacao imediata                |
| Campo JSON "COD_OPERADORA"   | Ignorado -- hardcode 'BITIX' [ATENCAO] A06         |
| Estrutura JSON empresa       | TB_EMPRESA_INTERNET%ROWTYPE                        |
| Estrutura JSON beneficiarios | TB_USUARIO_TITULAR/DEPENDENTE_INTERNET             |
| Estrutura JSON odonto        | TB_ODON_EMPRESA_INTERNET                           |
| Status de resposta           | JSON de retorno {TPROVISORIO, INTEGRACAO, MENSAGEM}|

**Decisao de design TO-BE:** extrair o ACL para `BITIXAdapterService`, separado do
`EfetivacaoService`. O contrato de retorno deve ser tipado, nao JSON livre.

[REF ADR-05] Padrao da Camada Anticorrupcao -- fundamenta a identificacao e separacao do ACL.

---

## 13. CQRS -- Command Query Responsibility Segregation

### O que e

CQRS e o principio de separar operacoes de **leitura** (Query) de operacoes de
**escrita** (Command). Uma operacao de leitura retorna dados sem modificar o estado
do sistema. Uma operacao de escrita modifica o estado sem retornar dados de dominio.

A motivacao e que leitura e escrita tem requisitos diferentes de otimizacao,
consistencia e escalabilidade. Mistura-los na mesma operacao cria codigo confuso e
com efeitos colaterais inesperados.

**Regra simples:** uma funcao que retorna um valor NAO deve alterar o estado do
sistema como efeito colateral. Uma procedure que altera o estado NAO deve retornar
dados de dominio como saida primaria.

### Por que se aplica aqui

`fn_get_criticas_pendencias` e uma funcao de leitura (conta criticas) que contem um
`UPDATE FL_STATUS=9` como efeito colateral quando `p_valida_nao_coligada='S'`. Isso
significa que:

1. Qualquer codigo que chama a funcao "para saber" o numero de criticas pode,
   inadvertidamente, alterar o status da proposta
2. O comportamento muda conforme o parametro passado, sem que o chamador perceba
3. [CRITICO] Se a funcao levantar uma excecao interna e retornar 0 (WHEN OTHERS THEN
   NULL), o UPDATE pode NAO ocorrer -- e a proposta sera considerada sem criticas,
   podendo ser efetivada sem validacao ANS [A09]

### Como foi identificado

Pela analise do codigo de `fn_get_criticas_pendencias`:

```sql
-- Este e um FUNCTION (deveria ser apenas leitura)
FUNCTION fn_get_criticas_pendencias(...) RETURN NUMBER IS
BEGIN
  ...
  IF p_valida_nao_coligada = 'S' THEN
    -- [CRITICO] ESCRITA dentro de funcao de leitura
    UPDATE TB_PROPOSTA_VENDA SET FL_STATUS = 9 WHERE NU_CONTROLE = p_nu_controle;
  END IF;
  RETURN v_count_criticas;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0; -- [CRITICO] Mascara excecao; proposta pode ser efetivada sem validacao
END;
```

### O que ficou definido

Separacao em dois objetos distintos:

| Objeto TO-BE          | Tipo    | Responsabilidade                                | Efeito Colateral |
|-----------------------|---------|--------------------------------------------------|------------------|
| MotorCriticasQuery    | Query   | Retornar COUNT de criticas/pendencias            | Nenhum           |
| AplicarStatusErroCommand | Command | Atualizar FL_STATUS=9 quando criticas > 0    | Escrita explicita |

[REF ADR-03] CQRS -- fundamenta a separacao de MotorCriticasQuery de AplicarStatusErroCommand.

---

## 14. Context Map (Mapa de Contextos)

### O que e

O Context Map documenta os relacionamentos entre Bounded Contexts. Os tipos de
relacionamento mais comuns sao:

- **Customer-Supplier (Cliente-Fornecedor):** BC downstream (cliente) depende do
  upstream (fornecedor). O upstream define o contrato, o downstream se adapta.
- **Conformist (Conformista):** downstream usa o modelo do upstream sem transformacao --
  nao tem poder de negociar o contrato.
- **ACL (Anti-Corruption Layer):** downstream se protege do upstream com uma camada
  de traducao.
- **Shared Kernel (Nucleo Compartilhado):** dois BCs compartilham parte do modelo --
  mudancas exigem coordenacao entre as equipes.
- **Separate Ways (Caminhos Separados):** BCs sem relacao -- evoluem independentemente.

### Por que se aplica aqui

PK_VENDA_JSON nao e um sistema isolado. Ele recebe dados do BITIX, chama
`pr_cadastramento_empresa_prov`, `pr_critica_internet`, `pr_cadastramento_internet2`,
e e chamado por `PR_EFETIVA_INTERNET`. Mapear essas relacoes e essencial para
entender o impacto de qualquer mudanca.

### O que ficou definido

Relacionamentos mapeados:

| BC Origem    | BC Destino         | Tipo de Relacao  | Descricao                                                          |
|--------------|---------------------|------------------|--------------------------------------------------------------------|
| BC-VJ-01     | BC-VJ-02            | Customer-Supplier| Recepcao aciona validacao de criticas                              |
| BC-VJ-01     | BC-VJ-06            | Customer-Supplier| Recepcao verifica e atualiza grupo coligado                        |
| BC-VJ-03     | BC-VJ-04            | Customer-Supplier| Efetivacao empresa aciona efetivacao de beneficiarios              |
| BC-VJ-03     | BC-VJ-05            | Customer-Supplier| Efetivacao empresa aciona decisao de status final                  |
| BC-VJ-08     | BC-VJ-02            | Customer-Supplier| Auto-baixa POS depende de BC-VJ-02 para verificar criticas         |
| BC-VJ-09     | BC-VJ-01, VJ-03     | Conformist       | Todos consomem fn_registro_sistema sem transformacao               |
| BC-EI-14*    | BC-VJ-01            | ACL              | PR_EFETIVA_INTERNET chama PK_VENDA_JSON.pr_efetiva (Fase 9)        |
| BITIX        | BC-VJ-01            | ACL              | pr_pim_insere_cnpj e o ACL canonico BITIX->SIGO                    |

*BC-EI-14 definido na modelagem de PR_EFETIVA_INTERNET.

---

## 15. Resumo da Modelagem Aplicada

Esta secao consolida o processo completo de modelagem em ordem cronologica.

---

### 15.1 Ponto de Partida

A modelagem foi ancorada exclusivamente no artefato de engenharia reversa
(`reversa-pk-venda-json.md`), que levantou:
- **16 regras de negocio** (RN01 a RN16)
- **12 code smells** (S01 a S12), sendo 5 criticos
- Ecossistema completo: 12 rotinas internas, 20 tabelas, 6.334 linhas de PL/SQL

---

### 15.2 Identificacao dos Bounded Contexts

A primeira pergunta foi: **"o que este package realmente faz?"**

A analise revelou que PK_VENDA_JSON acumula **dois dominios distintos** num unico
package:

- **Dominio de Integracao:** traduzir JSON do BITIX para o modelo do SIGO (ACL)
- **Dominio de Efetivacao:** efetivar propostas em contratos definitivos

Isso gerou os 10 Bounded Contexts, com a classificacao Core/Support/Generic definindo
onde investir mais qualidade e atencao de design.

---

### 15.3 Linguagem Ubiqua

Foram mapeados 15 termos tecnicos para vocabulario de negocio. Cada valor magico
(`FL_STATUS = 6`, `'-999'`, `'BAIXAPOS'`) ganhou um nome significativo, rastreavel
e documentado.

---

### 15.4 Agregados

A pergunta-chave foi: **"quais objetos precisam ser salvos juntos para garantir
consistencia?"**

Dois Agregados foram definidos -- PropostaEmpresaBitix e BeneficiarioBitix -- cada
um com suas invariantes derivadas diretamente das RNs da engenharia reversa.

---

### 15.5 Domain Services

Foram identificados 9 Services para logicas que nao pertencem a nenhuma entidade
isolada. O criterio foi: se a operacao envolve 3+ entidades e nenhuma e a "dona"
natural da logica, e um Domain Service.

O caso mais critico foi o `MotorCriticasService` (`fn_get_criticas_pendencias`):
uma funcao de leitura com efeito colateral de escrita -- violacao direta do principio
CQRS e risco ANS [A09].

---

### 15.6 Domain Events

8 eventos foram identificados a partir dos COMMITs e transicoes de estado
significativas. Cada COMMIT que representa um "fato consumado de negocio" virou um
evento com nome no passado, payload definido e consumidores mapeados.

Para a Fase 3 (microsservicos Azure), cada evento tem um topico candidato no
Azure Service Bus.

---

### 15.7 Repositorios

11 repositorios foram mapeados, um por Aggregate Root ou agrupamento coeso de
tabelas. As operacoes de cada repositorio foram derivadas diretamente dos DML
identificados na engenharia reversa.

---

### 15.8 Specifications

8 Specifications foram criadas a partir das pre-condicoes de guardas (`IF/ELSIF`)
no codigo. A `AutoBaixaPOSElegivelSpec` e um exemplo de composicao -- e a conjuncao
de 6 Specifications simples, tornando a condicao POS legivel e testavel de forma
independente.

---

### 15.9 Mapeamento RN -> DDD

Todas as 16 regras de negocio foram rastreadas para um conceito DDD preciso:

| Tipo DDD        | Quantidade de RNs | RNs                          |
|-----------------|-------------------|------------------------------|
| Specification   | 7                 | RN02, RN03, RN08, RN09, RN13, RN14, RN16 |
| Domain Service  | 3                 | RN04, RN06, RN10             |
| Policy/Strategy | 2                 | RN01, RN07                   |
| Factory/Service | 2                 | RN05, RN15                   |
| Domain Event    | 2                 | RN12, RN16                   |

---

### 15.10 Decisoes de Design Principais

| Decisao                                     | Problema Resolvido                                | ADR Referenciada |
|---------------------------------------------|---------------------------------------------------|------------------|
| Separar ACL de efetivacao                   | pr_pim_insere_cnpj mistura traducao com negocio   | ADR 05           |
| Contrato tipado para pr_cadastramento_empresa_prov | Parsing fragil substr/instr [S03/CRITICO]  | --               |
| Eliminar 15 variaveis globais de package    | Risco de corrupcao em execucao concorrente [S04/CRITICO] | --        |
| CQRS: separar motor de criticas             | Funcao de leitura com UPDATE colateral [S12/A09]  | ADR 03           |
| Extrair rotina central unica de efetivacao  | Codigo triplicado com 85% de identidade [S02/S07] | --               |

---

### 15.11 Pontos de Atencao para Migracao Futura

Foram identificados e marcados com `[MIGRACAO]` os seguintes obstaculos para a
Fase 3 (microsservicos):

| Obstaculo Oracle               | Equivalente na Fase 3                             |
|--------------------------------|---------------------------------------------------|
| Cursores com BULK COLLECT      | Paginacao + streaming em .NET 8                   |
| DBMS_OUTPUT como logging       | ILogger / Azure Application Insights              |
| Oracle Scheduler (JOB batch)   | Azure Functions com Timer Trigger                 |
| Sequences Oracle para IDs      | UUID v4 ou Azure SQL Identity                     |
| pk_json_ext acoplado ao Oracle | System.Text.Json / Newtonsoft.Json em .NET        |

---

## Referencias

- [REF] ddd-modelagem-dominio.md -- artefato primario desta modelagem
- [REF] reversa-pk-venda-json.md -- base de evidencias (eng. reversa)
- [REF ADR-74] Domain-Driven Design
- [REF ADR-21] Linguagem Onipresente
- [REF ADR-05] Padrao da Camada Anticorrupcao
- [REF ADR-22] Padrao Repositorio
- [REF ADR-02] Arquitetura Orientada a Eventos
- [REF ADR-03] CQRS
