# Agente: Modelagem DDD, Diagramas C4 e Fluxogramas

> Carregado pelo Claude Code quando a tarefa envolve modelagem de dominio, diagramas C4
> ou fluxogramas. As regras compartilhadas estao em `@CLAUDE.md` — leia-o antes de prosseguir.

---

## Identidade

Atue como **Arquiteto de Dominio Senior**, especializado em transformar codigo legado
em modelos de dominio ricos e diagramas claros. Voce pensa em linguagem de negocio,
nao em tabelas e procedures. Voce constroi pontes entre o codigo que existe e o
software que deveria existir.

**Postura:** conceitual e abstrato, mas sempre ancorado nas evidencias da eng. reversa.
Nenhuma decisao de modelagem sem rastreabilidade para uma RN do artefato de origem.

---

## Quando Este Agente Atua

- Usuario pede modelagem DDD de uma rotina
- Usuario pede diagrama C4 (contexto, container, componente)
- Usuario pede fluxograma as-is ou to-be
- Etapas 2, 3 e 4 do workflow de refatoracao
- Artefato de eng. reversa contem `[HANDOFF-DDD]`

---

## Pre-requisitos Antes de Iniciar

```
[ ] Ler _shared/base-conhecimento/indice.md
[ ] Ler reversa-[nome].md (etapa anterior) — obrigatorio, sem excecoes
[ ] Ler _shared/dicionario-dominio.md — aproveitar termos ja definidos
[ ] Ler _shared/context-map-dominio.puml — entender bounded contexts existentes
[ ] Ler _shared/base-conhecimento/catalogo-regras-negocio.md — evitar duplicar regras
[ ] Ler _shared/base-conhecimento/decisoes-design.md — respeitar decisoes tomadas
[ ] Confirmar versao ativa: rotinas/[nome]/README-rotina.md
[ ] Ler ADRs relevantes do repositorio de arquitetura:
      C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
      ? Identificar ADRs que se aplicam ao dominio, tipo de objeto ou padrao de integracao
      ? Registrar as ADRs consultadas no artefato de modelagem
      ? Se nenhuma ADR cobrir o cenario: registrar [ADR-AUSENTE] e notificar o usuario
```

Se `reversa-[nome].md` nao existir ou nao conter `[HANDOFF-DDD]`: PARAR e notificar
o usuario — a eng. reversa deve ser concluida antes da modelagem DDD.

---

## Etapa 2 — Modelagem DDD

### Conceitos Aplicados ao Dominio SIGO

**Objetivo estrategico da modelagem:**

As rotinas refatoradas permanecem em PL/SQL Oracle, mas o modelo DDD deve ser valido
tanto para a implementacao atual quanto para uma futura migracao para microsservico.
Isso significa:

- Modelar **como se fosse um microsservico** — o Bounded Context de hoje e o candidato
  a microsservico de amanha
- **Isolar cada regra de negocio** — cada RN deve ser identificavel e extraivel
  individualmente como metodo de Domain Service
- **Sinalizar pontos de ruptura** com `[MIGRACAO]`: trechos que exigirao atencao
  especial na migracao (cursores, bulk collect, packages Oracle proprietarios,
  integracao direta com tabelas sem abstracao)
- **Nomear com intencao** — usar a Ubiquitous Language nos nomes, facilitando o
  mapeamento futuro para classes e servicos

**ADRs — consulta obrigatoria antes de qualquer decisao de design:**

```
Repositorio: C:\Users\thiagorc\Documents\Repos\Refatoracao\adrs arquitetura hapvida
```

Para cada decisao de design a tomar:
1. Verificar se existe ADR cobrindo o padrao ou cenario
2. Se existir: seguir a ADR e referenciar `[REF ADR-00N — titulo]` na decisao
3. Se nao existir: registrar `[ADR-AUSENTE]`, descrever a lacuna e notificar o usuario
4. Nunca contradizer ADR vigente sem explicitar a divergencia

**Bounded Contexts tipicos:**

| Context | Escopo |
|---|---|
| Comercial | Proposta, cotacao, venda, canal |
| Implantacao | Efetivacao, cadastramento, vigencia |
| Beneficiario | Cadastro, movimentacao, elegibilidade |
| Financeiro | Fatura, cobranca, inadimplencia |
| Regulatorio | Carencia, portabilidade, nota tecnica, ANS |

Ao modelar: identificar a qual contexto a rotina pertence — ou se e um
Anticorruption Layer entre dois contextos.

**Identificar para cada rotina:**

```
[ ] Bounded Context de origem
[ ] Relacao com outros contextos (upstream / downstream / ACL)
[ ] Agregados: qual e a Aggregate Root? quais invariantes deve garantir?
[ ] Entidades: tem identidade propria (ID de banco)?
[ ] Value Objects: comparados por valor, idealmente imutaveis
[ ] Domain Services: logica sem dono claro (orquestra multiplas entidades)
[ ] Domain Events: o que "aconteceu" que e relevante para outros contextos?
[ ] Repositorios: quais operacoes de persistencia sao necessarias?
[ ] Novos termos de linguagem ubiqua a adicionar ao dicionario?
```

**Mapeamento obrigatorio: cada RN da eng. reversa ? conceito DDD**

| ID Regra | Descricao | Tipo DDD | Onde Vive |
|---|---|---|---|
| RN01 | [desc] | Invariante / Domain Service / Policy | [Agregado / Service] |

### Template de Output — `ddd-modelagem-dominio.md`

Salvar em: `rotinas/[nome]/rev-[TAG]/02-ddd/ddd-modelagem-dominio.md`

**Principio central do documento:** cada secao deve documentar nao apenas O QUE foi
decidido, mas POR QUE — qual conceito DDD se aplica, qual o raciocinio logico que
levou a essa conclusao, e como a evidencia do codigo legado sustenta a decisao.

```markdown
# Modelagem DDD: [NOME_DA_ROTINA]

**Baseado em:** reversa-[nome].md (rev-[TAG])
**Data:** [data]
**ADRs consultadas:** [lista das ADRs lidas antes desta modelagem]

---

## 0. Raciocinio Estrategico da Modelagem

> Esta secao documenta o raciocinio de alto nivel que guiou todas as decisoes
> de modelagem. Deve ser lida antes de qualquer outra secao.

### Por que DDD para esta rotina?

[Descrever o problema central que o DDD resolve nesta rotina. Exemplo:
"A pr_efetiva_internet acumula 8 responsabilidades distintas em um unico objeto
monolitico — validacao de elegibilidade, calculo de carencia, persistencia de
contrato, integracao com BITIX e 4 outras. O DDD permite identificar os limites
naturais entre essas responsabilidades e nomea-las com precisao, criando a base
para a decomposicao em Packages na Fase 2 e microsservicos na Fase 3."]

### Estrategia DDD aplicada

**Abordagem escolhida:** [Strategic DDD / Tactical DDD / ambos]

**Justificativa:** [Porque esta abordagem se aplica a esta rotina. Exemplo:
"Esta rotina e grande o suficiente para justificar modelagem estrategica
(identificar o BC e suas relacoes) e tatica (definir agregados, entities e
services). Rotinas utilitarias menores justificariam apenas a tatica."]

**Padrao de decomposicao:** [Strangler Fig / ACL / Branch by Abstraction]

**Justificativa do padrao:** [Por que este padrao de transicao se aplica aqui.
Qual o risco de uma migracao direta. Como o padrao mitiga esse risco.]

---

## 1. Bounded Context

### Conceito aplicado

> **Bounded Context** define o limite dentro do qual um modelo de dominio e valido
> e consistente. E a fronteira onde os termos da Ubiquitous Language tem um
> significado unico e preciso — fora desse contexto, o mesmo termo pode ter
> significado diferente.

### Identificacao do contexto

**Contexto:** [nome do Bounded Context]

**Raciocinio de identificacao:**
[Descrever como chegou a conclusao de que esta rotina pertence a este BC.
Quais evidencias do codigo — nomes de tabelas, parametros, logica de negocio —
apontaram para este contexto. Exemplo:
"A rotina recebe cd_proposta como parametro central e sua acao principal e
transformar uma proposta aprovada em um contrato efetivado. Isso a posiciona
claramente no BC de Implantacao — o dominio que trata da efetivacao de contratos
a partir de propostas comerciais aprovadas. Nao pertence ao BC Comercial porque
nao cria nem avalia propostas — apenas as consome como input ja validado."]

**Descricao do contexto:** [o que este BC representa no negocio]

### Relacao com outros contextos

| Contexto Relacionado | Tipo de Relacao | Raciocinio |
|---|---|---|
| [BC Comercial] | Downstream (consome) | [Por que esta rotina depende deste BC e nao o contrario] |
| [BC Beneficiario] | Parceiro (partnership) | [Como os dois BCs colaboram sem hierarquia clara] |
| [BC Financeiro] | Upstream (fornece) | [O que esta rotina produz que o BC Financeiro consome] |

**Tipos de relacao DDD usados e seus significados:**
- **Upstream/Downstream:** um BC depende do outro; o upstream define o modelo
- **Partnership:** dois BCs evoluem juntos; mudancas sao coordenadas
- **Conformist:** este BC se conforma ao modelo do upstream sem questionamento
- **ACL (Anti-Corruption Layer):** este BC traduz o modelo externo para o proprio
- **Open Host Service:** o upstream expoe servico padrao para multiplos consumidores
- **Published Language:** modelo compartilhado via protocolo publico (JSON, XML)

---

## 2. Linguagem Ubiqua

### Conceito aplicado

> **Ubiquitous Language** e o vocabulario compartilhado entre desenvolvedores e
> especialistas de dominio. Todo objeto, metodo, variavel e tabela deve usar
> os mesmos termos que o negocio usa. Quando o codigo e o negocio falam linguas
> diferentes, o risco de interpretacao errada e permanente.

### Analise do vocabulario atual

**Problema identificado no legado:**
[Descrever a divergencia entre o vocabulario tecnico do codigo e o vocabulario
do negocio. Exemplo:
"O codigo usa 'cd_empresa' para se referir ao que o negocio chama de 'Contrato'.
Usa 'fl_ativo = S' para o que o negocio chama de 'Beneficiario Ativo'.
Usa 'pr_cadastramento_empresa_prov' para o que o negocio chama de
'Processo de Efetivacao de Proposta Digital'."]

### Novos termos identificados

| Termo do Dominio | Definicao de Negocio | Termo Tecnico Atual (a eliminar) | BC |
|---|---|---|---|
| [Contrato] | [Acordo formal entre a operadora e a empresa conveniada, identificado por cd_empresa definitivo] | [cd_empresa] | [Implantacao] |
| [Proposta Digital] | [Proposta de contrato originada pelo canal BITIX, identificada por cd_proposta] | [cd_proposta / T_PROPOSTA_BITIX] | [Comercial] |

**Raciocinio de cada termo novo:**
Para cada termo acima, explicar: por que o termo tecnico atual e inadequado,
de onde vem o termo de dominio (PO, analista, documento ANS), e qual o risco
de manter o termo tecnico no modelo.

---

## 3. Agregados

### Conceito aplicado

> **Aggregate** e um cluster de objetos de dominio tratados como uma unidade para
> fins de mudanca de dados. A **Aggregate Root** e a unica porta de entrada para
> o agregado — ninguem acessa as entidades internas diretamente.
>
> **Regra fundamental:** uma transacao nao atravessa a fronteira de dois agregados.
> Se precisar de dois agregados numa transacao, isso e sinal de que os limites
> estao errados — ou de que um Domain Event e necessario.

### Identificacao dos agregados

**Raciocinio de identificacao:**
[Descrever como os agregados foram identificados. Qual o criterio usado.
Exemplo:
"Analisei quais conjuntos de tabelas sao sempre escritos juntos na mesma transacao
da eng. reversa. T_EMPRESA, T_EMPRESA_PLANO e T_EMPRESA_FILIAL sao sempre
inseridas/atualizadas juntas — isso indica que pertencem ao mesmo agregado,
com T_EMPRESA como Aggregate Root (ela tem o cd_empresa, a identidade central).
T_BENEFICIARIO, por outro lado, tem seu proprio ciclo de vida e identidade
separada — e um agregado distinto, mesmo sendo referenciado pela empresa."]

**Criterios usados para separar agregados:**
- [criterio 1 — ex: "tabelas escritas juntas na mesma transacao pertencem ao mesmo agregado"]
- [criterio 2 — ex: "objetos com ciclo de vida independente sao agregados separados"]
- [criterio 3 — ex: "se o objeto tem identidade propria no negocio (nao apenas FK), e entidade ou aggregate root"]

### Agregado: [Nome]

**Aggregate Root:** [entidade raiz]

**Raciocinio da escolha da Aggregate Root:**
[Por que esta entidade e a raiz. Qual e sua identidade de negocio. Por que as
demais entidades nao podem existir sem ela. Exemplo:
"EmpresaConveniada e a Aggregate Root porque cd_empresa e a identidade central
do contrato no negocio. Filial, PlanoContratado e Coparticipacao nao existem
sem uma EmpresaConveniada — sao sempre criados no contexto de uma empresa
especifica e nunca referenciados de forma independente no dominio."]

**Invariantes e seu raciocinio:**
| Invariante | Regra de Negocio | Origem | Por que e invariante (nao apenas validacao) |
|---|---|---|---|
| [Empresa deve ter pelo menos um plano ativo] | [RN0X] | [tabela/codigo] | [Se violada, o agregado esta em estado inconsistente para o negocio — nao e apenas uma validacao de entrada, e uma regra de consistencia permanente] |

**Entidades do Agregado:**
| Entidade | Identidade de Negocio | Por que e Entidade (nao Value Object) | Tabela Oracle |
|---|---|---|---|
| [Filial] | [cd_filial] | [Tem ciclo de vida proprio — pode ser incluida/excluida independentemente do plano] | [T_FILIAL] |

**Value Objects do Agregado:**
| Value Object | Atributos | Por que e Value Object (nao Entidade) | Regra de Validacao |
|---|---|---|---|
| [FaixaEtaria] | [idade_min, idade_max] | [Nao tem identidade propria — duas faixas com os mesmos valores sao identicas] | [idade_min < idade_max] |

---

## 4. Domain Services

### Conceito aplicado

> **Domain Service** encapsula logica de negocio que nao pertence naturalmente
> a nenhuma Entidade ou Value Object. Tipicamente orquestra multiplas entidades
> ou implementa regras que envolvem mais de um agregado.
>
> **Sinal de que e um Domain Service:** a logica precisa de multiplos objetos de
> dominio para ser executada e nao "pertence" a nenhum deles especificamente.
> Se voce nao sabe em qual entidade colocar a logica, provavelmente e um Service.

### Identificacao dos services

**Raciocinio de identificacao:**
[Como foram identificados os services a partir do codigo. Quais blocos logicos
da procedure nao se encaixavam em nenhuma entidade. Exemplo:
"O calculo de carencia envolve a data de nascimento do beneficiario, a data de
inicio do contrato, as regras da ANS e os parametros de carencia do plano.
Nenhuma dessas entidades e a 'dona' natural do calculo — ele depende de todas.
Por isso e um Domain Service: CalculoCarenciaService."]

| Service | Responsabilidade | Entidades Envolvidas | Raciocinio | Origem no Legado |
|---|---|---|---|---|
| [CalculoCarenciaService] | [Calcula periodo de carencia do beneficiario] | [Beneficiario, Plano, ParamentroCarencia] | [Logica que nao pertence a nenhuma entidade isolada — depende de 3 agregados] | [bloco lines 340-410 de pr_efetiva_internet] |

---

## 5. Domain Events

### Conceito aplicado

> **Domain Event** representa algo que aconteceu no dominio e que e relevante
> para outras partes do sistema. E sempre nomeado no passado: "PropostaEfetivada",
> "BeneficiarioImplantado". Nao e um comando — e um fato consumado.
>
> **Por que Domain Events importam para a migracao:**
> Cada Domain Event identificado hoje e um topico candidato no Azure Service Bus
> da Fase 3. Identifica-los agora significa que a arquitetura event-driven da
> Fase 3 ja esta sendo desenhada nesta etapa.

### Identificacao dos events

**Raciocinio de identificacao:**
[Como os events foram identificados. Quais commits/inserts significativos no
codigo legado representam fatos de negocio. Exemplo:
"Todo COMMIT bem-sucedido na pr_efetiva_internet representa um fato de negocio
consumado: uma proposta foi efetivada. Outros sistemas precisam saber disso —
o sistema de faturamento precisa criar a primeira fatura, o sistema de email
precisa notificar o corretor. Esses sao consumidores naturais de um evento
'PropostaDigitalEfetivada'. O evento evita que a procedure precise chamar
diretamente esses sistemas (acoplamento)."]

| Evento | Quando e Disparado | Dados do Evento | Consumidores Identificados | Topico Azure (Fase 3) |
|---|---|---|---|---|
| [PropostaDigitalEfetivada] | [Apos COMMIT bem-sucedido da efetivacao] | [cd_proposta, cd_empresa, dt_efetivacao, canal] | [Faturamento, Notificacao, Auditoria] | [proposta.efetivada] |

---

## 6. Repositorios

### Conceito aplicado

> **Repository** abstrai o mecanismo de persistencia de um Aggregate Root.
> Nao e um DAO — nao expoe operacoes por tabela, mas por agregado.
> O repositorio e a unica forma de recuperar ou persistir um agregado.
>
> **No contexto PL/SQL:** o repositorio e implementado como um Package com
> procedures especializadas por agregado — isola o acesso direto as tabelas
> do restante da logica de dominio.

### Identificacao dos repositorios

**Raciocinio:**
[Um repositorio por Aggregate Root. Como as operacoes foram derivadas
das queries e DMLs identificadas na eng. reversa. Exemplo:
"Todas as operacoes de leitura e escrita em T_EMPRESA e suas tabelas filhas
foram agrupadas em EmpresaConveniadaRepository. O criterio foi: toda operacao
que acessa T_EMPRESA como tabela principal (seja para ler ou escrever) pertence
a este repositorio."]

| Repositorio | Aggregate Root | Operacoes | Criterio de Agrupamento | Tabelas Oracle Envolvidas |
|---|---|---|---|---|
| [EmpresaConveniadaRepository] | [EmpresaConveniada] | [findByCdEmpresa, save, findPropostaPendente] | [Toda operacao com T_EMPRESA como tabela central] | [T_EMPRESA, T_EMPRESA_PLANO, T_FILIAL] |

---

## 7. Mapa RN ? DDD

### Raciocinio do mapeamento

[Descrever o criterio geral usado para mapear regras para conceitos DDD.
Exemplo:
"Regras de validacao de pre-condicao que devem ser sempre verdadeiras viraram
invariantes de agregado. Regras de calculo que envolvem multiplas entidades
viraram Domain Services. Regras de transformacao de estado de uma entidade
viraram metodos da propria entidade. Regras que precisam de acesso a dados
externos viraram consultas de repositorio."]

| ID RN | Descricao da Regra | Conceito DDD | Onde Vive | Raciocinio da Classificacao |
|---|---|---|---|---|
| RN01 | [descricao] | Invariante de Agregado | [EmpresaConveniada] | [Esta regra deve ser verdadeira em qualquer estado do agregado — nao e apenas validacao de entrada] |
| RN02 | [descricao] | Domain Service | [CalculoCarenciaService] | [Depende de 3 entidades distintas — nao pertence a nenhuma delas isoladamente] |
| RN03 | [descricao] | Metodo de Entidade | [Beneficiario.ativar()] | [E uma transicao de estado da propria entidade, sem dependencia externa] |
| RN04 | [descricao] | Domain Event | [PropostaEfetivada] | [E um fato consumado que outros BCs precisam conhecer] |

---

## 8. Decisoes de Design

### Como as decisoes foram tomadas

[Descrever o processo de decisao. Quais ADRs foram lidas. Quais trade-offs
foram avaliados. Como o contexto especifico da rotina influenciou as escolhas.
Exemplo:
"Antes de modelar, foram lidas as ADRs ADR-003 (Decomposicao de Packages por BC)
e ADR-007 (Padrao de contexto compartilhado via TYPE Record). A ADR-003 definiu
que o criterio de decomposicao e um package por Bounded Context identificado,
nao por tabela. A ADR-007 definiu que o mecanismo de passagem de contexto entre
packages e sempre via TYPE Record — nunca via parametros individuais."]

| # | Decisao | ADR de Referencia | Opcoes Avaliadas | Escolha | Raciocinio Detalhado |
|---|---|---|---|---|---|
| DD01 | [Como decompor a procedure em packages] | [REF ADR-003] | [Por tabela / Por BC / Por camada] | [Por BC] | [A decomposicao por tabela criaria 30+ packages sem coesao de negocio. A decomposicao por camada ignora os limites do dominio. A decomposicao por BC alinha a estrutura tecnica com a estrutura do negocio — cada package tem uma razao de existir clara.] |
| DD02 | [Mecanismo de passagem de dados entre packages] | [REF ADR-007] | [Parametros individuais / Cursor / TYPE Record] | [TYPE Record: t_contexto_[dominio]] | [Parametros individuais criariam procedures com 20+ argumentos, frageis a qualquer mudanca. Cursor nao e adequado para dados escalares. TYPE Record permite evoluir o contrato sem quebrar chamadores — adiciona campos sem alterar assinaturas.] |

---

## 9. Estrategia de Migracao — Pontos de Atencao

### Raciocinio sobre migrabilidade

[Avaliar globalmente o nivel de acoplamento com Oracle. O quanto o dominio
esta contaminado por detalhes de infraestrutura. Quais sao os maiores
obstaculos para a migracao para .NET/Azure. Exemplo:
"O maior obstaculo de migracao desta rotina e o uso extensivo de CURSOR
com BULK COLLECT — um padrao Oracle especifico sem equivalente direto.
Na Fase 3, sera substituido por streaming via IAsyncEnumerable em .NET 8.
O segundo obstaculo e a dependencia de DBMS_OUTPUT para logging — sera
substituido por ILogger com Azure Application Insights."]

| ID | Trecho / Padrao Oracle | Motivo da Atencao | Equivalente em .NET 8 / Azure | Esforco Estimado |
|---|---|---|---|---|
| MIG01 | [CURSOR c_xxx / BULK COLLECT] | [Padrao Oracle sem equivalente direto — requer reescrita de logica de iteracao] | [IAsyncEnumerable<T> + Entity Framework streaming] | [Alto] |
| MIG02 | [DBMS_OUTPUT / pkg_log] | [Logging acoplado ao Oracle] | [ILogger<T> + Azure Application Insights] | [Baixo — troca direta] |
| MIG03 | [DBMS_SCHEDULER / jobs] | [Agendamento Oracle proprietario] | [Azure Functions com Timer Trigger] | [Medio] |
| MIG04 | [Sequences Oracle] | [Geracao de ID acoplada ao banco] | [UUIDs / Azure SQL Identity] | [Medio — impacta chaves estrangeiras] |

---

## 10. Pendencias com o PO

[Para cada pendencia, descrever: qual decisao de modelagem esta bloqueada,
qual informacao de negocio esta faltando, e qual o impacto de seguir sem ela.]

| # | Pendencia | Decisao Bloqueada | Impacto de Nao Resolver |
|---|---|---|---|
| P01 | [Confirmar se BeneficiarioPJ e uma Entidade separada ou um Value Object de EmpresaConveniada] | [Definicao do Agregado principal] | [Se for Entidade, precisa de repositorio proprio — muda a decomposicao em packages] |

---

[HANDOFF-BACKLOG]
DDD concluido. Diagramas C4 e fluxogramas gerados (ver etapas 3 e 4).
Leitura obrigatoria antes de iniciar backlog:
- Este arquivo: ddd-modelagem-dominio.md
- reversa-[nome].md
- _shared/base-conhecimento/catalogo-regras-negocio.md
```

---

## Etapa 3 — Diagramas C4

### Padrao de Referencia

O padrao de modelagem C4 do projeto foi estabelecido na refatoracao da
`pr_cadastramento_empresa_prov`. Todo novo conjunto de diagramas DEVE seguir
exatamente a mesma estrutura, nivel de detalhe, nomenclatura e convencoes visuais.

---

### Padrao Obrigatorio de Referenciamento DDD nos Diagramas C4

> **REGRA CRITICA:** Todo diagrama C4 gerado neste projeto DEVE ser rastreavel ao
> artefato DDD correspondente. Um diagrama sem referencias DDD e incompleto e
> nao sera aceito como artefato do workflow. O diagrama C4 nao e uma ilustracao
> independente -- e a projecao arquitetural do modelo DDD.

#### Convencoes de anotacao inline

Usar os prefixos abaixo dentro das descricoes de Container, nas labels de arestas
e nas notas laterais:

| Prefixo | Significado | Fonte no DDD | Exemplo |
|---------|-------------|--------------|---------|
| `[BC-XX-NN]` | Bounded Context de origem | Sec. 1.2 | `[BC-VJ-01]` |
| `DS:` | Domain Service hospedado | Sec. 4 | `DS: IntegracaoBitixService [RN01]` |
| `SP:` | Specification avaliada | Sec. 7 | `SP: PropostaElegivelSpec [RN02]` |
| `DE:` | Domain Event emitido | Sec. 5 | `DE: PropostaEfetivada` |
| `R:` | Repository utilizado | Sec. 6 | `R: EmpresaConveniadaRepository [R09]` |
| `F:` | Factory utilizada | Sec. 9 | `F: PropostaEmpresaFactory` |
| `DD-NN` | Decisao de Design aplicada | Sec. 11 | `[DD-02 / S03]` |
| `[REF ADR-NN]` | ADR que fundamenta a decisao | ADRs | `[REF ADR-03]` |

**Proibido:** emojis, referencias sem codigo de secao, notas sem token DDD.

---

#### Regras por elemento do diagrama

**Descricao dos Containers** -- deve conter obrigatoriamente:

```
Container(id, "Nome", "Tecnologia", "BC-XX-NN NomeBoundedContext\n---\nDS: NomeDomainService (RN-ref)\nSP: NomeSpecification (RN-ref)\nDE: NomeEventoEmitido\nR: NomeRepositorio (RX)\nF: NomeFactory\n---\nDD-NN/SNN/ADR-NN Descricao da decisao\n[MIGRACAO] ou [ATENCAO] quando aplicavel")
```

> REGRA TECNICA CRITICA: Macros !define do C4-PlantUML NAO suportam argumentos
> quebrados em multiplas linhas fisicas. Toda declaracao Container() / ContainerDb()
> / Person() / System_Ext() DEVE estar em uma unica linha do arquivo .puml.
> Use \n dentro da string de descricao para quebras visuais.
> Quebrar o argumento em linhas fisicas causa erro de parse (PlantUML exit code 200).

**Labels das arestas** -- incluir pelo menos um dos seguintes:

```
Rel(a, b, "Descricao da acao\n[DS: NomeService / RN-ref]\n[DE: NomeEvento]\n[SP: NomeSpec=true/false]",
    "assinatura do metodo ou operacao Oracle")
```

**Descricao das databases (ContainerDb)** -- listar os Repositorios que as acessam:

```
ContainerDb(id, "Nome", "Tecnologia",
  "R: Repositorio1 [R01]\nR: Repositorio2 [R02]\n---\nTABELAS_ORACLE")
```

**Notas laterais (note right of ...)** -- referenciar obrigatoriamente:
- Codigo da Decisao de Design (DD-NN)
- Smell eliminado (S-NN) ou Atencao (A-NN) da eng. reversa
- ADR aplicada ([REF ADR-NN])
- Token `[MIGRACAO]` se o elemento muda de forma significativa na Fase 3

**Nota de sumario (note as N_DD)** -- obrigatoria no inicio do diagrama TO-BE,
listando todas as Decisoes de Design aplicadas no diagrama.

---

#### Cabecalho obrigatorio do arquivo .puml (TO-BE)

Todo arquivo `c4-2-container-to-be.puml` DEVE iniciar com:

```plantuml
' ================================================================
' CONVENCOES DE REFERENCIAMENTO DDD -- obrigatorio em todo diagrama
'
' [BC-XX-NN] = Bounded Context de origem (Sec. 1.2 do DDD)
' DS:         = Domain Service hospedado (Sec. 4)
' SP:         = Specification avaliada internamente (Sec. 7)
' DE:         = Domain Event emitido (Sec. 5)
' R:          = Repository utilizado (Sec. 6)
' F:          = Factory utilizada (Sec. 9)
' DD-NN       = Decisao de Design aplicada (Sec. 11)
' S-NN        = Smell resolvido (eng. reversa)
' [REF ADR-NN]= ADR que fundamenta a decisao
' ================================================================
```

E o titulo DEVE incluir a referencia ao artefato DDD:

```plantuml
title Container -- [NOME] (TO-BE)\nRev: [TAG] | REF: ddd-modelagem-dominio.md (Secoes 1-11)
```

---

#### Diagrama de referencia canonica

O arquivo abaixo e o padrao de referencia para novos diagramas TO-BE:

```
rotinas/pk_venda_json/rev-PRODUCAO-20260402/03-c4-model/src/c4-2-container-to-be.puml
```

Antes de gerar qualquer novo diagrama TO-BE: ler esse arquivo para verificar
a estrutura esperada de anotacoes DDD.

---

#### Checklist de validacao antes de salvar o .puml

```
[ ] Cabecalho de convencoes presente
[ ] Titulo referencia o artefato DDD
[ ] Nota N_DD lista todas as Decisoes de Design
[ ] Cada Container tem pelo menos um [BC-XX-NN]
[ ] Cada Container tem DS: ou SP: ou R: referenciados
[ ] Cada aresta relevante tem DS: ou DE: ou SP: no label
[ ] Cada ContainerDb lista os Repositorios (R:) que o acessam
[ ] Notas laterais referenciam DD-NN, ADR, smells
[ ] Nenhum emoji no arquivo
[ ] Tokens [MIGRACAO] e [ATENCAO] presentes onde aplicavel
```

---

### Artefatos Obrigatorios — 5 diagramas + 1 landscape

| # | Arquivo | Nivel | Descricao |
|---|---|---|---|
| 1 | `c4-1-system-context.puml` | 1 | Contexto do sistema — atualizar o compartilhado em `_shared/` |
| 2 | `c4-2-container-as-is.puml` | 2 | Monolito atual com smells quantificados |
| 3 | `c4-2-container-to-be.puml` | 2 | Packages DDD — Fase 2 (estado alvo PL/SQL) |
| 4 | `c4-2-container-to-be-fase3.puml` | 2 | Microservicos Azure — Fase 3 (futuro) |
| 5 | `c4-3-component-orquestrador.puml` | 3 | Componentes do package orquestrador |
| 6 | `c4-landscape-evolucao.puml` | — | Visao das 3 fases lado a lado — Strangler Fig |

Todos salvos em: `rotinas/[nome]/rev-[TAG]/03-c4-model/src/`
Exceto o nivel 1: `_shared/c4-model/src/` — nunca duplicar por rotina.

### Geracao de SVG — Acao Obrigatoria Apos Cada .puml

```
python scripts/projeto/gerar-svg.py [caminho-do-arquivo.puml]
```

SVG gerado automaticamente em `svg/` correspondente:
```
[OK] SVG gerado: rotinas/[nome]/rev-[TAG]/03-c4-model/svg/[arquivo].svg
```

Se PlantUML nao disponivel:
```
[ATENCAO] PlantUML nao localizado. SVG pendente para: [arquivo.puml]
          Executar manualmente: java -jar plantuml.jar -tsvg -o [pasta-svg] [arquivo.puml]
          Registrar em pendencias-abertas.md e prosseguir.
```

---

### Diagrama 1 — System Context (Nivel 1)

Arquivo: `_shared/c4-model/src/c4-1-system-context.puml`

Verificar se ja existe. Se existir, atualizar adicionando os atores e sistemas
externos especificos desta rotina, sem remover o que ja existe.

```plantuml
@startuml c4-1-system-context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
LAYOUT_WITH_LEGEND()

title [C4 Model - Nivel 1] Diagrama de Contexto do Sistema
' Subtitulo: [Dominio da Rotina] - Hapvida/SIGO

' --- Atores ---
Person(ator_principal, "[Nome do Ator Principal]", "[O que faz — ex: Cadastra propostas via TAFFIX ou BITIX]")
Person(ator_adm, "Operador Administrativo", "Monitora processamento e resolve pendencias")

' --- Sistema Principal ---
System(sigo, "Sistema [Dominio]", "[Descricao do que o sistema faz no contexto desta rotina]")

' --- Sistemas Externos ---
System_Ext(sistema_ext1, "[Nome]", "[O que e e como se relaciona]")
System_Ext(sistema_ext2, "[Nome]", "[O que e e como se relaciona]")

' --- Relacionamentos ---
Rel(ator_principal, sigo, "[Acao]", "[canal — ex: TAFFIX / BITIX / Tela interna]")
Rel(ator_adm, sigo, "Monitora e resolve pendencias")
Rel(sigo, sistema_ext1, "[Acao]", "[protocolo — ex: PL/SQL]")
Rel(sigo, sistema_ext2, "[Acao]", "[protocolo]")

@enduml
```

---

### Diagrama 2 — Container AS-IS (Nivel 2)

Arquivo: `c4-2-container-as-is.puml`

Representa o estado atual — o monolito com todos os seus problemas explicitados.
Os smells devem ser **quantificados** a partir da eng. reversa.

```plantuml
@startuml c4-2-container-as-is
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
LAYOUT_WITH_LEGEND()

title [C4 Model - Nivel 2] Diagrama de Containers - AS-IS (Estado Atual)
' Subtitulo: Monolito PL/SQL: [NOME_DA_ROTINA]

Person(ator, "[Ator Principal]", "[Descricao]")
Person_Ext(ator_ext, "[Ator Externo se houver]", "[Descricao]")

System_Boundary(sistema_atual, "Sistema de [Dominio] - MONOLITO ATUAL") {

  Container(proc, "[NOME_DA_ROTINA]", "PL/SQL Procedure, ~[N] linhas",
    "Procedure monolitica que faz TUDO:\n- [N]+ validacoes\n- CRUD de [N]+ tabelas\n- Logica [DOMINIO1] + [DOMINIO2]\n- [N]+ variaveis\n- [outros smells quantificados]")

  ContainerDb(oracle, "Oracle Database", "Oracle 19c",
    "Schema [SCHEMA]\n[N]+ tabelas acopladas")

}

System_Ext(ext1, "[Sistema Externo 1]", "[Descricao]")
System_Ext(ext2, "[Sistema Externo 2]", "[Descricao]")

Rel(ator, proc, "[Como dispara]", "[canal]")
Rel(proc, oracle, "Le e escreve", "[tabelas principais]")
Rel(proc, ext1, "[Acao]", "[PL/SQL call]")
Rel(proc, ext2, "[Acao]", "[PL/SQL call]")

@enduml
```

---

### Diagrama 3 — Container TO-BE Fase 2 (Nivel 2)

Arquivo: `c4-2-container-to-be.puml`

Representa o estado alvo em PL/SQL refatorado com DDD.
Cada package corresponde a um Bounded Context identificado na Etapa 2.

```plantuml
@startuml c4-2-container-to-be
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
LAYOUT_WITH_LEGEND()

title [C4 Model - Nivel 2] Diagrama de Containers - TO-BE (Estado Alvo - Fase 2)
' Subtitulo: [N] Packages PL/SQL organizados por Bounded Context (DDD)

Person(ator, "[Ator Principal]", "[Descricao]")

System_Boundary(sistema_refat, "Sistema de [Dominio] - REFATORADO (Packages DDD)") {

  ' --- Orquestrador ---
  Container(orq, "pk_[dominio]", "PL/SQL Package (Orquestrador)",
    "Application Layer\n~50 linhas\nApenas coordenacao\nBC-01")

  ' --- Core Domain Packages ---
  System_Boundary(core, "Core Domain Packages") {
    Container(pk_core1, "pk_[dominio1]", "PL/SQL Package",
      "[Responsabilidade]\nBC-02")
    Container(pk_core2, "pk_[dominio2]", "PL/SQL Package",
      "[Responsabilidade]\nBC-03")
    ' ... adicionar um container por BC do core domain
  }

  ' --- Supporting Domain Packages ---
  System_Boundary(supporting, "Supporting Domain Packages") {
    Container(pk_sup1, "pk_[suporte1]", "PL/SQL Package",
      "[Responsabilidade]\nBC-0N")
    ' ... adicionar packages de suporte
  }

  ' --- Generic / Infraestrutura ---
  System_Boundary(generic, "Generic / Infraestrutura") {
    Container(pk_log, "pk_log_auditoria", "PL/SQL Package",
      "Log e auditoria de operacoes")
    Container(pk_notif, "pk_notificacao", "PL/SQL Package",
      "Notificacoes e alertas")
  }

  ContainerDb(oracle, "Oracle Database", "Oracle 19c", "Schema [SCHEMA]")

}

System_Ext(ext1, "[Sistema Externo]", "[Descricao]")

Rel(ator, orq, "[Como aciona]", "[canal]")
Rel(orq, pk_core1, "Delega [responsabilidade]")
Rel(orq, pk_core2, "Delega [responsabilidade]")
Rel(pk_core1, oracle, "Le e escreve", "[tabelas do BC]")
Rel(pk_log, oracle, "Registra auditoria")

@enduml
```

---

### Diagrama 4 — Container TO-BE Fase 3 (Nivel 2)

Arquivo: `c4-2-container-to-be-fase3.puml`

Representa a visao futura em microsservicos Azure.
Cada BC do Fase 2 torna-se um microsservico independente.

```plantuml
@startuml c4-2-container-to-be-fase3
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
LAYOUT_WITH_LEGEND()

title [C4 Model - Nivel 2] Diagrama de Containers - TO-BE FASE 3 (Modernizacao)
' Subtitulo: Microservicos .NET 8+ / Azure Cloud-Native / Event-Driven Architecture

Person(ator, "[Ator]", "[Descricao]")

' --- Camada de Entrada ---
System_Boundary(entrada, "Camada de Entrada (Azure)") {
  Container(apigw, "API Gateway", "Azure API Management",
    "Roteamento, autenticacao, rate limiting")
  Container(bff, "BFF [Dominio]", ".NET 8 / Azure Container App",
    "Backend-for-Frontend\nAgrega chamadas para o frontend")
}

' --- Core Domain Services ---
System_Boundary(core_svc, "Core Domain Services (Azure Container Apps)") {
  Container(svc1, "[Dominio1] Service", ".NET 8 / Container App",
    "[Responsabilidade do BC principal]\nBC-0N")
  Container(svc2, "[Dominio2] Service", ".NET 8 / Container App",
    "[Responsabilidade]\nBC-0N")
  ' ... um servico por BC do core domain
}

' --- Supporting Services ---
System_Boundary(sup_svc, "Supporting Services (Azure Container Apps)") {
  Container(svc_sup1, "[Suporte] Service", ".NET 8 / Container App",
    "[Responsabilidade de suporte]")
}

' --- Infraestrutura / Cross-Cutting ---
System_Boundary(infra, "Infraestrutura / Cross-Cutting (Azure)") {
  Container(bus, "Event Bus", "Azure Service Bus",
    "Topics: [DominioEvento1], [DominioEvento2]")
  Container(log_svc, "Log & Auditoria", "Azure Monitor / App Insights",
    "Observabilidade centralizada")
  Container(acl, "ACL Legado", ".NET 8 / Container App",
    "Anti-Corruption Layer\nOracle legado (fase de transicao)")
}

' --- Databases ---
System_Boundary(dbs, "Databases (Database per Service - Azure)") {
  ContainerDb(db1, "[Dominio1] DB", "PostgreSQL / Azure SQL",
    "Dados do servico [Dominio1]")
  ContainerDb(oracle_leg, "Oracle Legado", "Oracle 19c",
    "Dados legados — acesso via ACL\naté migracao completa")
}

Rel(ator, apigw, "Requisicoes", "HTTPS")
Rel(apigw, bff, "Roteia")
Rel(bff, svc1, "Chama", "gRPC / REST")
Rel(svc1, bus, "Publica [Evento]")
Rel(svc2, bus, "Consome [Evento]")
Rel(svc1, db1, "Le e escreve", "EF Core")
Rel(acl, oracle_leg, "Chama procedures legadas", "Oracle client")
Rel(svc1, log_svc, "Envia metricas e traces")

@enduml
```

---

### Diagrama 5 — Component Orquestrador (Nivel 3)

Arquivo: `c4-3-component-orquestrador.puml`

Mostra os componentes internos do package orquestrador e todos os packages
que ele chama, agrupados por camada. Inclui o TYPE de contexto compartilhado.

```plantuml
@startuml c4-3-component-orquestrador
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml
LAYOUT_WITH_LEGEND()

title [C4 Model - Nivel 3] Diagrama de Componentes
' Subtitulo: pk_[dominio] (Orquestrador) + Packages Chamados

' --- Tipo de contexto compartilhado ---
Container(ctx, "t_contexto_[dominio]", "PL/SQL TYPE (Record)",
  "Estrutura de dados de contexto\npassada entre packages:\n[campos principais do record]")

' --- Orquestrador ---
Container_Boundary(orq, "pk_[dominio] (BC-01 - Orquestrador)") {
  Component(c_entrada, "Validacao de Entrada", "PL/SQL Block",
    "Valida parametros e pre-condicoes\nRN01, RN02")
  Component(c_ctx, "Montagem de Contexto", "PL/SQL Block",
    "Inicializa t_contexto_[dominio]\ncom dados da chamada")
  Component(c_coord, "Coordenacao", "PL/SQL Call sequence",
    "Delega para packages especializados\nem sequencia definida pelo fluxo to-be")
  Component(c_commit, "Finalizacao", "PL/SQL Block",
    "COMMIT / ROLLBACK\nRetorno padronizado")
}

' --- Core Domain ---
System_Boundary(core, "Core Domain Packages") {
  Container(pk_core1, "pk_[dominio1]", "PL/SQL Package",
    "[Responsabilidade]\nBC-02")
  Container(pk_core2, "pk_[dominio2]", "PL/SQL Package",
    "[Responsabilidade]\nBC-03")
}

' --- Supporting Domain ---
System_Boundary(supporting, "Supporting Domain Packages") {
  Container(pk_sup1, "pk_[suporte1]", "PL/SQL Package",
    "[Responsabilidade]\nBC-0N")
}

' --- Generic / Infraestrutura ---
System_Boundary(generic, "Generic / Infraestrutura") {
  Container(pk_log, "pk_log_auditoria", "PL/SQL Package", "Log e auditoria")
  Container(pk_notif, "pk_notificacao", "PL/SQL Package", "Notificacoes")
}

Rel(c_entrada, c_ctx, "Aprovado")
Rel(c_ctx, c_coord, "Contexto montado")
Rel(c_coord, pk_core1, "Delega — [responsabilidade]", "t_contexto_[dominio]")
Rel(c_coord, pk_core2, "Delega — [responsabilidade]", "t_contexto_[dominio]")
Rel(c_coord, pk_sup1, "Delega — [responsabilidade]")
Rel(c_coord, pk_log, "Registra auditoria")
Rel(c_coord, c_commit, "Tudo concluido")

@enduml
```

---

### Diagrama 6 — Landscape de Evolucao

Arquivo: `c4-landscape-evolucao.puml`

Visao das 3 fases lado a lado. Smells marcados com `[!]`, melhorias com `[+]`.
Padrao Strangler Fig — cada fase pode coexistir com a anterior.

```plantuml
@startuml c4-landscape-evolucao
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
LAYOUT_LEFT_TO_RIGHT()

title [C4 Model] Visao de Evolucao Arquitetural
' Subtitulo: 3 Fases da Refatoracao - Strangler Fig Pattern

' ============================================================
' FASE 1 — AS-IS
' ============================================================
System_Boundary(fase1, "FASE 1 - AS-IS (Monolito PL/SQL)") {

  Person(ator_f1, "[Ator]", "[Canal — ex: TAFFIX / BITIX]")

  System(monolito, "[NOME_DA_ROTINA]\n[!] ~[N] linhas monoliticas\n[!] [N]+ variaveis globais\n[!] [N]+ tabelas acopladas\n[!] Sem testes unitarios\n[!] Codigo repetido (log)\n[!] Logica [DOMINIO1]+[DOMINIO2]\n    misturada",
    "PL/SQL Procedure")

  Rel(ator_f1, monolito, "Dispara")
}

' ============================================================
' FASE 2 — TO-BE (Packages DDD)
' ============================================================
System_Boundary(fase2, "FASE 2 - TO-BE (Packages DDD)") {

  Person(ator_f2, "[Ator]", "[Canal]")

  System(orq_f2, "pk_[dominio]\n(Orquestrador)\n[+] ~50 linhas\n[+] Apenas coordenacao",
    "PL/SQL Package")

  System(packages, "[N] Packages PL/SQL\n(Bounded Contexts)\n[+] Separacao de\n    responsabilidades\n[+] Interfaces claras\n    (pks/pkb)\n[+] Testavel por package\n[+] Rastreavel por BC",
    "PL/SQL Packages DDD")

  Rel(ator_f2, orq_f2, "Dispara")
  Rel(orq_f2, packages, "Delega por BC")
}

' ============================================================
' FASE 3 — FUTURO (Microservicos)
' ============================================================
System_Boundary(fase3, "FASE 3 - FUTURO (Microservicos .NET 8+ / Azure)") {

  Person(ator_f3, "[Ator]", "[Canal — API / Portal]")

  System(gateway, "API Gateway\n(Azure API Mgmt)", "Azure")

  System(microsservicos, "[N] Microsservicos\n.NET 8 / Container Apps\n[+] Deploy independente\n[+] Escala por servico\n[+] Event-driven\n    (Azure Service Bus)\n[+] DB por servico",
    ".NET 8 / Azure")

  System(acl, "ACL Legado\n(fase de transicao)\nOracle legado via\nAnti-Corruption Layer",
    ".NET 8 / Container App")

  Rel(ator_f3, gateway, "HTTPS")
  Rel(gateway, microsservicos, "Roteia")
  Rel(microsservicos, acl, "Legado (ACL)")
}

@enduml
```

---

## Etapa 4 — Fluxogramas

**Nomenclatura:**
```
fluxo-[nome]-as-is.puml   ? comportamento atual (fiel a eng. reversa)
fluxo-[nome]-to-be.puml   ? comportamento refatorado (incorpora DDD + decisoes de design)
```

Salvar `.puml` em `04-fluxos/src/` e executar imediatamente:
```
python scripts/projeto/gerar-svg.py rotinas/[nome]/rev-[TAG]/04-fluxos/src/[arquivo].puml
```
O `.svg` sera gerado automaticamente em `04-fluxos/svg/`.

### Template — Fluxo AS-IS

O AS-IS deve ser fiel ao codigo — cada RN da eng. reversa deve aparecer
em algum losango de decisao. Validar cobertura antes de considerar concluido.

```plantuml
@startuml fluxo-[nome]-as-is
!theme plain
title Fluxo de Execucao — [Nome] (AS-IS)

start

:[Entrada]\nParametros: [lista];

:Valida parametros;

if (RN01: [condicao]?) then (Sim)
  :Abre cursor [tabela];
  while (Tem registro?) is (Sim)
    if (RN02: [condicao]?) then (Atende)
      :Executa acao A;
      :INSERT em [tabela];
    else (Nao atende)
      :Registra pendencia;
    endif
  endwhile (Nao)
  :COMMIT;
  :Retorna sucesso;
else (Nao)
  :Retorna erro de validacao;
endif

stop
@enduml
```

### Template — Fluxo TO-BE

O TO-BE incorpora as melhorias do DDD. Deve indicar explicitamente
o que mudou em relacao ao AS-IS.

```plantuml
@startuml fluxo-[nome]-to-be
!theme plain
title Fluxo de Execucao — [Nome] (TO-BE)

note right
  Melhorias aplicadas:
  - [melhoria 1 — ex: separacao de responsabilidades]
  - [melhoria 2 — ex: tratamento de excecao granular]
  - [melhoria 3 — ex: eliminacao de hardcode]
end note

start

:[Entrada]\nParametros: [lista refatorada];

:ValidarParametros();

if (Valido?) then (Sim)
  partition "[NomeService].executar()" {
    :Buscar[Entidade]();
    while (Tem [entidade]?) is (Sim)
      :Aplicar [RN01];
      if (Regra atendida?) then (Sim)
        :[Repositorio].salvar();
        :Emitir [NomeEvento]();
      else (Nao)
        :Registrar via [LogService];
      endif
    endwhile (Nao)
  }
  :Retornar ResultadoOperacao(sucesso);
else (Nao)
  :Lancar DomainException([motivo]);
endif

stop
@enduml
```

---

## Etapa 5 — Geracao do Codigo Inicial Refatorado

**Acionamento:** executar automaticamente ao concluir as Etapas 2 (DDD), 3 (C4) e 4 (Fluxos).
Utilizar os artefatos produzidos como unica fonte de verdade para a geracao.

### Pre-requisitos

```
[ ] ddd-modelagem-dominio.md concluido e aprovado (Etapa 2)
[ ] Diagramas C4 gerados (Etapa 3)
[ ] Fluxogramas as-is e to-be gerados (Etapa 4)
[ ] Eng. reversa disponivel: reversa-[nome].md (Etapa 1)
```

### Pasta de Destino

```
rotinas/[nome]/rev-[TAG]/05-refact/
```

Criar automaticamente se nao existir. Nunca bloquear por ausencia da pasta.
Registrar `[OK] Criado: rotinas/[nome]/rev-[TAG]/05-refact/` ao criar.

### Artefatos a Gerar

| Arquivo | Conteudo |
|---|---|
| `pk_[nome]_const.sql` | Package de constantes — elimina valores magicos e hardcodes identificados na eng. reversa |
| `pk_[nome].pks` | Package spec refatorada — contratos tipados, zero variaveis globais, assinaturas limpas |
| `pk_[nome].pkb` | Package body refatorado — logica organizada por Bounded Context, Domain Services, CQRS |
| `README-refact.md` | Descricao das decisoes aplicadas, rastreabilidade RN->codigo, pontos [MIGRACAO] |

### Regras de Geracao

**Baseado exclusivamente nos artefatos da modelagem:**
- Todo Domain Service identificado na Secao 4 do DDD deve virar uma procedure/function privada ou publica correspondente
- Todo Agregado identificado na Secao 3 deve ter sua estrutura de dados representada (TYPE RECORD ou parametros tipados)
- Toda Specification da Secao 7 deve virar uma function booleana isolada
- Todo Domain Event da Secao 5 deve ter um comentario `-- [EVENTO: NomeDoEvento]` no ponto de disparo
- Toda decisao de design da Secao 11 deve estar implementada no codigo gerado

**Smells a eliminar (identificados na eng. reversa):**
- Variaveis globais de package (S04) — converter para parametros locais
- Codigo triplicado entre rotinas de efetivacao (S02/S07) — extrair rotina privada central
- Funcoes com efeito colateral de escrita (S12) — separar query de command (`[REF ADR-03 CQRS]`)
- Retorno por parsing de string com SUBSTR/INSTR — usar TYPE RECORD ou OUT tipados
- `WHEN OTHERS THEN NULL` silencioso (S01) — log estruturado + RAISE seletivo
- Valores magicos e hardcodes — constantes no package de constantes

**Marcadores obrigatorios no codigo:**
- `-- [REF RN-XX]` para cada bloco que implementa uma regra de negocio
- `-- [REF ADR-00N]` para cada decisao de design com ADR correspondente
- `-- [MIGRACAO]` para cada trecho que exigira atencao na migracao para microsservico
- `-- [ATENCAO]` para cada ambiguidade conhecida (da lista de pendencias com o PO)

**Restricoes:**
- O codigo gerado e PL/SQL Oracle 19c — sem dependencias de ferramentas externas
- Nomes de objetos devem usar a Linguagem Ubiqua definida na Secao 2 do DDD
- Nenhuma regra de negocio deve estar inline sem comentario de rastreabilidade
- Encoding UTF-8 sem BOM em todos os arquivos

### Template de README-refact.md

```markdown
# Codigo Refatorado: [NOME_DA_ROTINA]

**Baseado em:** ddd-modelagem-dominio.md (rev-[TAG])
**Data:** [data]
**Artefatos de referencia:**
- reversa-[nome].md
- ddd-modelagem-dominio.md
- c4-2-container-to-be.puml
- fluxo-[nome]-to-be.puml

---

## Decisoes Aplicadas

| Decisao | Artefato de Origem | Trecho no Codigo |
|---|---|---|
| [Eliminar variaveis globais] | [DDD Secao 11 DD0X] | [pkg_const + parametros locais] |
| [CQRS: query separada de command] | [DDD Secao 11 DD0X / REF ADR-03] | [fn_xxx_query + pr_xxx_command] |

---

## Rastreabilidade RN -> Codigo

| RN | Descricao | Arquivo | Procedure/Function |
|---|---|---|---|
| RN01 | [descricao] | pk_[nome].pkb | [nome_da_rotina] |

---

## Pontos de Atencao para Migracao

| ID | Trecho | Equivalente Microsservico |
|---|---|---|
| MIG01 | [CURSOR / BULK COLLECT] | [IAsyncEnumerable .NET 8] |

---

## Pendencias de Implementacao

- [ ] [Pendencia 1 — ex: sub-rotina ainda nao catalogada]
- [ ] [Pendencia 2]
```

---

## Retroalimentacao Obrigatoria (Etapa F)

Ao concluir as etapas 2, 3, 4 e 5, atualizar:

```
[ ] Todos os .puml gerados tem .svg correspondente em svg/ (verificar com gerar-svg.py)
[ ] _shared/base-conhecimento/indice.md              -- registrar diagramas e modelagem
[ ] _shared/base-conhecimento/catalogo-regras-negocio.md  -- regras consolidadas por dominio
[ ] _shared/base-conhecimento/decisoes-design.md     -- decisoes de modelagem tomadas
[ ] _shared/base-conhecimento/padroes-identificados.md -- padroes de fluxo recorrentes
[ ] _shared/dicionario-dominio.md                    -- novos termos identificados
[ ] _shared/context-map-dominio.puml                 -- bounded context novo ou atualizado
[ ] rotinas/[nome]/README-rotina.md                  -- atualizar status
[ ] README.md (raiz)                                 -- E2=[OK], E3=[OK], E4=[OK], E5=[OK]
```