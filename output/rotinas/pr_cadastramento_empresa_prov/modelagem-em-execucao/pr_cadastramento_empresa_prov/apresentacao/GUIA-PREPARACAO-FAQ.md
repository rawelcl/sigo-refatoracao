# Guia de Preparacao Intelectual
## FAQ: Perguntas Esperadas e Como Responder

> **Objetivo:** Preparar voce para perguntas de desenvolvedores, POs e gerentes de TI
> durante a apresentacao da refatoracao DDD da `pr_cadastramento_empresa_prov`.

---

## INDICE

1. [Perguntas sobre DDD (Conceitos)](#1-perguntas-sobre-ddd)
2. [Perguntas sobre Decisoes Tecnicas](#2-perguntas-sobre-decisoes-tecnicas)
3. [Perguntas do PO / Negocio](#3-perguntas-do-po--negocio)
4. [Perguntas do Gerente de TI](#4-perguntas-do-gerente-de-ti)
5. [Perguntas Criticas / Cticas](#5-perguntas-criticas--ceticas)
6. [Perguntas sobre o Roadmap](#6-perguntas-sobre-o-roadmap)
7. [Cheat Sheet: Conceitos DDD Rapidos](#7-cheat-sheet)
8. [Analogias Poderosas para Nao-Tecnicos](#8-analogias)
9. [Argumentos de Autoridade](#9-argumentos-de-autoridade)
10. [Anti-Padroes: O Que NAO Dizer](#10-anti-padroes)

---

## 1. Perguntas sobre DDD

### P: "O que e DDD em termos simples?"

**R:** DDD e uma forma de organizar software onde a gente modela o codigo com base
no que o negocio faz, nao no que o banco de dados armazena. Em vez de pensar
"qual tabela eu insiro?", a gente pensa "qual processo de negocio estou executando?".

O resultado e um codigo que qualquer pessoa -- tecnica ou nao -- consegue ler e
entender. Em vez de `INSERT INTO tb_empresa_conveniada(...)`, voce le
`pk_empresa_conveniada.pr_cria_empresa(contexto)`.

**Complemento se insistirem:** Foi criado por Eric Evans em 2003. E usado pela
Netflix, Uber, Nubank, grandes bancos. Nao e modismo -- tem 20+ anos de maturidade.

---

### P: "O que e um Bounded Context?"

**R:** E como um departamento de uma empresa. Cada departamento tem seu proprio
vocabulario, suas proprias regras, e funciona de forma independente.

**Analogia:** Pense na Hapvida. O setor Comercial usa a palavra "proposta" com um
significado. O setor Financeiro usa "proposta" com outro. O setor Regulatorio,
outro. No DDD, cada um desses contextos e um "Bounded Context" -- e o codigo
dentro dele so precisa se preocupar com as regras DAQUELE contexto.

**No nosso caso:** A procedure mistura 18 "departamentos" em 1 arquivo de 5.000
linhas. E como se voce juntasse Comercial, Financeiro, Regulatorio, TI e
Atendimento numa unica sala e mandasse todos trabalharem na mesma planilha.

---

### P: "O que e um Aggregate?"

**R:** E um grupo de dados que sempre mudam juntos e protegem suas proprias regras.

**Analogia do carrinho de compras:** Quando voce adiciona um item no carrinho de
compras, o total atualiza automaticamente. Voce nao pode ter um carrinho com
total = R$100 mas itens que somam R$200. O carrinho + itens + total sao um Aggregate.

**No nosso caso:** Quando criamos uma Empresa Conveniada, SEMPRE criamos junto a
Unidade Contratual, os Parametros, as Flags, o Historico. Se faltar qualquer um,
o contrato esta inconsistente. Esses dados formam o Aggregate `EmpresaConveniada`
com 13 entidades filhas.

---

### P: "O que e Linguagem Ubiqua?"

**R:** E quando TI e Negocio usam as mesmas palavras para as mesmas coisas. Hoje,
o desenvolvedor fala "INSERT na tb_empresa_conveniada" e o PO fala "baixa da
empresa". Os dois estao falando da mesma coisa mas nao se entendem.

Com DDD, o codigo reflete a linguagem do negocio. O PO diz "efetivar empresa
conveniada" e o desenvolvedor ve `pk_empresa_conveniada.pr_cria_empresa()`. A
mesma linguagem no codigo, nas reunioes e nos documentos.

**Beneficio pratico:** Menos mal-entendidos, menos retrabalho, especificacoes
mais claras.

---

### P: "Qual a diferenca entre Bounded Context e Subdominio?"

**R curta:** Subdominio e o PROBLEMA (existe no mundo real). Bounded Context e a
SOLUCAO (existe no software).

**R completa:** Um subdominio e uma area do negocio que existe independentemente
de software -- "Precificacao" existe mesmo sem computadores. O Bounded Context e
como a gente MODELA esse subdominio no software. Geralmente e 1:1 (um BC por
subdominio), mas nem sempre.

**No nosso caso:** O subdominio "Regulamentacao e Participacao do Beneficiario"
(que existe por causa da ANS) e modelado em 2 BCs: BC-09 (Coparticipacao) e
BC-10 (Carencia). Porque, no codigo, as regras de coparticipacao sao diferentes
o suficiente das regras de carencia para justificar separacao.

---

### P: "O que sao Domain Events?"

**R:** Sao fatos que aconteceram no dominio e que outros modulos precisam saber.

**Analogia:** Quando voce pede comida no iFood, o evento "PedidoRealizado" dispara:
o restaurante recebe a notificacao, o pagamento e processado, o motoboy e acionado.
Cada um reage ao mesmo evento de forma independente.

**No nosso caso:** Quando a Empresa Conveniada e criada, o evento
`EmpresaConveniadaCriada` dispara:
- BC-09 (Coparticipacao) configura os fatores
- BC-10 (Carencia) configura as compras de carencia
- BC-12 (Acesso Internet) cria o login/senha do portal
- BC-17 (Notificacao) envia e-mail de boas-vindas

Hoje, tudo isso esta numa unica procedure sequencial. Com eventos, cada modulo e
independente e pode evoluir sem impactar os outros.

---

### P: "O que e Anti-Corruption Layer (ACL)?"

**R:** E uma camada de protecao entre o codigo novo e o codigo legado.

**Analogia:** E como um adaptador de tomada. Voce nao remodela a fiacao da casa
inteira para usar um aparelho novo -- voce coloca um adaptador.

**No nosso caso:** A `tb_empresa_internet` tem 80+ colunas num formato flat.
O ACL pega esse formato e converte para objetos de dominio tipados (CNPJ,
Endereco, CanalVenda). Assim, o codigo novo nunca precisa saber o formato
do cursor legado.

---

### P: "O que e Strangler Fig Pattern?"

**R:** E a estrategia de migrar um sistema legado gradualmente, sem desligar o
antigo. O nome vem da figueira estranguladora -- uma planta que cresce ao redor
de uma arvore existente ate substitui-la completamente, sem nunca derruba-la.

**No nosso caso:** Cada fase cria packages que "envolvem" partes da procedure.
A procedure continua funcionando, mas por dentro chama os novos packages.
Quando todos os packages estao prontos, a procedure original e so uma casca
de 30 linhas. Podemos remover quando quisermos.

**Beneficio-chave:** Em NENHUM momento o sistema para de funcionar. Cada fase e
entregavel e independente.

---

### P: "DDD nao e overengineering para PL/SQL?"

**R:** Essa e uma otima pergunta e a resposta e: depende da complexidade.
Para um CRUD simples, DDD seria overengineering sim. Mas a nossa procedure tem:

- 4.991 linhas
- 18 responsabilidades diferentes
- 84+ tabelas
- Regras de ANS com implicacoes legais
- Logica financeira que impacta faturamento
- 2 caminhos paralelos (SIGO/BITIX) quase identicos
- 0 testes automatizados

Esse nivel de complexidade JUSTIFICA modelagem rica. E o DDD foi adaptado ao
PL/SQL -- nao estamos criando microservicos Java com Spring Boot. Estamos
criando packages PL/SQL organizados por dominio. E a mesma linguagem, a mesma
stack, a mesma infra. A unica coisa que muda e a ORGANIZACAO.

---

## 2. Perguntas sobre Decisoes Tecnicas

### P: "Por que 18 Bounded Contexts? Nao e muito?"

**R:** 18 e o numero de responsabilidades distintas que encontramos na procedure.
Nao inventamos nenhum -- cada BC corresponde a um bloco real de logica no codigo.

Se agrupassemos demais, voltariamos ao problema original: muita coisa misturada.
Se separassemos demais, teriamos fragmentacao desnecessaria.

Os 18 BCs se dividem em:
- 5 CORE (onde investimos mais): Proposta, Empresa, Modelo Negocio, Preco, Copayment
- 8 SUPPORTING (necessarios mas simples): PJ, Endereco, Filial, etc.
- 3 GENERIC (problema comum): Log, Email, Portal

Na pratica, os 3 Generic podem usar solucoes prontas. Os 8 Supporting sao simples.
So os 5 Core precisam de modelagem rica. Entao o "18" se reduz a "5 complexos
+ 13 simples".

---

### P: "Por que corrigir a ordem de geracao do codigo da empresa?"

**R:** Hoje, o codigo da empresa e gerado ANTES das validacoes. Se a proposta
falha na validacao (ex: CNPJ invalido), o sistema ja consumiu um numero da
sequence. Com o volume de rejeicoes, temos saltos na numeracao.

Na modelagem DDD, aplicamos o principio **Fail Fast**: validar tudo primeiro,
e so gerar o codigo se a proposta for valida. Isso elimina desperdicios e
torna a numeracao mais previsivel.

**Risco de mudar:** Muito baixo. A sequence continua gerando numeros; so
mudamos QUANDO ela e chamada. Se a proposta e valida, o resultado e o mesmo.

---

### P: "Por que TYPE RECORD e nao multiplos parametros OUT?"

**R:** Avaliamos 4 opcoes:

| Opcao | Vantagem | Desvantagem |
|-------|----------|-------------|
| **A) TYPE RECORD** | Extensivel, type-safe, limpo | Precisa de package de tipos |
| B) Multiplos OUT | Simples | Poluicao de assinatura, inflexivel |
| C) Overload | Zero impacto | Nao funciona em procedures standalone |
| **D) Hibrida (A+C)** | Melhor dos dois mundos | Complexidade media |

Escolhemos a **Opcao D (Hibrida)**: criamos o TYPE RECORD no package novo
E mantemos a procedure antiga como adapter. Os 4 chamadores existentes
continuam funcionando sem mudanca. Cada um migra quando quiser.

---

### P: "Como garantir que nao quebramos nada?"

**R:** Com 3 camadas de seguranca:

1. **Adapter Pattern:** A procedure original continua existindo com a mesma
   assinatura. Internamente, chama os novos packages. Se algo der errado no
   package, o EXCEPTION do adapter trata.

2. **Testes de regressao:** Cada package tera testes unitarios. Antes de cada
   deploy, rodamos com os mesmos `nu_controle` que ja foram processados e
   comparamos os resultados.

3. **Feature flags:** Podemos ativar/desativar os packages novos via
   `tb_registro_sistema`. Se detectarmos problema em producao, desligamos
   o package e voltamos ao codigo original em segundos.

---

### P: "E o COMMIT? A procedure faz COMMIT interno. Como fica com DDD?"

**R:** Excelente ponto. No DDD puro, a transacao e controlada pelo chamador,
nao pelo Domain Service. Mas mudar isso AGORA seria arriscado porque a
`pr_efetiva_internet` (2.290 linhas) depende de dados comitados entre etapas.

**Decisao:** O COMMIT interno e MANTIDO nas Fases 1 e 2. So na Fase 3,
quando refatorarmos a `pr_efetiva_internet` tambem, removemos o COMMIT
interno e implementamos Unit of Work ou Saga Pattern.

Isso esta documentado como **ADR-03** (Architecture Decision Record).

---

### P: "Como funciona o Saga Pattern que voces mencionam?"

**R simples:** Um Saga e uma sequencia de transacoes locais onde, se uma falha,
as anteriores sao compensadas (desfeitas).

**Analogia da viagem:** Para reservar uma viagem, voce reserva o voo, o hotel
e o carro. Se a reserva do carro falha, voce cancela o hotel e o voo.
Cada reserva e uma transacao independente. O Saga coordena todas elas.

**No nosso caso (Fase 3+):** Se a criacao da Coparticipacao falha apos a
Empresa Conveniada ja ter sido criada, o Saga desfaz (ou marca como pendente)
a empresa. Hoje, isso e tratado com o bloco `EXCEPTION WHEN OTHERS` que
verifica se a empresa existe e insere uma pendencia.

Na Fase 4 (Cloud), o Saga e implementado com **Azure Durable Functions**.

---

### P: "O que muda para quem trabalha no Forms/TAFFIX?"

**R:** Na Fase 1 e 2: **NADA**. O Forms/TAFFIX chama
`pr_cadastramento_empresa_prov(nu_controle, p_return)` e continua
recebendo o mesmo formato de retorno.

Na Fase 3: O retorno pode mudar para TYPE RECORD, mas o adapter mantem a
compatibilidade.

Na Fase 4 (Cloud): O Forms/TAFFIX chamaria uma API REST em vez de uma procedure.
Mas isso so acontece quando a modernizacao do frontend tambem estiver em andamento.

---

### P: "E os cursors duplicados cr_empresa_neg e cr_empresa_neg_bitix?"

**R:** Eles sao **identicos** -- mesmas colunas, mesma logica, so muda a tabela
de coligada consultada. Na Fase 1, unificamos num unico cursor parametrizado
(ou view) que recebe a origem (SIGO/BITIX) como parametro.

Na Fase 2, isso vira o package `pk_modelo_negocio` com o Strategy Pattern:
`SigoStrategy` e `BitixStrategy`. A logica de resolver o modelo de negocio
e a mesma; so muda a fonte de dados das coligadas.

---

## 3. Perguntas do PO / Negocio

### P: "Qual o beneficio concreto para o time comercial?"

**R:** Tres beneficios diretos:

1. **Mudancas mais rapidas:** Se a ANS mudar uma regra de coparticipacao, mexemos
   SOMENTE no `pk_coparticipacao`. Nao precisamos analisar 5.000 linhas para
   entender o impacto. Hoje, essa analise leva dias. Com os packages, leva horas.

2. **Menos bugs em producao:** Cada package e testavel isoladamente. Se a
   coparticipacao tem bug, sabemos exatamente onde olhar. Hoje, quando aparece
   um erro, o desenvolvedor precisa percorrer 5.000 linhas para achar.

3. **Novas funcionalidades possiveis:** Hoje, adicionar um novo canal de venda
   (ex: app mobile) exige mexer na procedure inteira. Com DDD, adicionamos
   uma nova Strategy e os packages existentes aceitam automaticamente.

---

### P: "Isso vai atrasar as entregas atuais?"

**R:** Nao, por causa do Strangler Fig Pattern. As fases sao independentes:

- **Fase 1 (Quick Wins):** Sao refatoracoes internas que NAO mudam comportamento.
  Podem ser feitas em paralelo com features novas.

- **Fase 2 (Packages):** Cada package e extraido um de cada vez. O codigo restante
  continua funcionando. Podemos parar entre qualquer package e o sistema funciona.

- **Fases 3-4:** So comecariam apos a base estar solida. E sao planejamento de
  medio/longo prazo.

---

### P: "Como validamos que a refatoracao nao mudou o resultado?"

**R:** Com comparacao de dados. Pegamos os ultimos N `nu_controle` processados
com sucesso, rodamos com o codigo refatorado em ambiente de homologacao, e
comparamos TODAS as tabelas afetadas (47 tabelas de escrita) campo a campo.

Se os dados sao identicos, a refatoracao e transparente. Se algum campo difere,
analisamos se e uma correcao esperada (ex: fix do gap de sequence) ou um bug.

---

### P: "Quantas propostas processamos por dia? A refatoracao afeta performance?"

**R:** A refatoracao em PL/SQL (Fases 1-3) NAO afeta performance. Estamos apenas
reorganizando o codigo em packages. As queries e INSERTs sao os mesmos. O Oracle
compila packages com a mesma eficiencia que procedures standalone.

Na verdade, a performance pode MELHORAR levemente porque:
- Packages sao carregados em memoria uma vez e reutilizados (PIN na SGA)
- Podemos identificar queries lentas e otimiza-las isoladamente
- Cursors duplicados eliminados = menos parse

---

## 4. Perguntas do Gerente de TI

### P: "Qual o ROI desse projeto?"

**R:** O ROI vem de 4 fontes:

1. **Reducao de tempo de manutencao:** Se cada fix leva 5 dias hoje e passara a
   levar 1 dia, em 50 fixes/ano economizamos ~200 dias de trabalho do time.

2. **Reducao de incidentes:** Menos bugs em producao = menos hora-extra de
   suporte, menos impacto no SLA para o cliente.

3. **Habilitacao de novas features:** Features bloqueadas pela complexidade do
   monolito se tornam viaveis (novos canais, novas regras, integracao com novos
   parceiros).

4. **Reduc de risco de pessoa-chave:** Hoje, se a pessoa que conhece a procedure
   sai da empresa, temos um risco critico. Com packages documentados e testados,
   qualquer desenvolvedor pleno consegue contribuir.

---

### P: "Qual o custo do projeto?"

**R:** O custo principal e **tempo de desenvolvimento**:

- **Fase 1 (Quick Wins):** ~2-4 semanas (1-2 devs)
- **Fase 2 (Packages):** ~3-6 meses (2-3 devs, incremental)
- **Fase 3 (Orquestrador):** ~2-3 meses (2 devs seniors)
- **Fase 4 (Cloud):** Projeto separado, depende de decisoes estrategicas

**NAO ha custo de infraestrutura** nas Fases 1-3. Estamos usando o mesmo Oracle,
a mesma stack PL/SQL. So reorganizamos o codigo.

A Fase 4 (Cloud) tem custo de infra (Azure), mas isso ja e planejamento de
modernizacao geral da companhia, nao especifico desta procedure.

---

### P: "E se der errado? Qual o plano B?"

**R:** Cada fase tem rollback:

- **Fase 1:** Os packages sao novos. Se falharem, comentamos a chamada e voltamos
  ao codigo inline. Levaria minutos.

- **Fase 2:** A procedure original coexiste com os packages. Se um package falhar,
  podemos reverter package por package via feature flag.

- **Fase 3:** O adapter mantem a assinatura original. Se o novo orquestrador
  falhar, reativamos a procedure antiga. As duas versoes podem coexistir.

- **Fase 4:** Deploy Blue/Green com Azure Container Apps. Se falhar, rollback
  automatico para a versao anterior.

---

### P: "Precisamos de DDD para refatorar ou podemos so separar em packages?"

**R:** Podemos separar em packages sem DDD? Sim, tecnicamente podemos. Mas
sem DDD, corremos o risco de separar errado:

- Criar packages por "tipo de operacao" (validacao, insercao, atualizacao) em
  vez de por "dominio de negocio" (coparticipacao, carencia, precificacao).
  Isso e o que chamamos de "Separation by Layer" vs "Separation by Feature".

- A separacao por layer (ex: pkg_inserts, pkg_validacoes, pkg_queries) gera
  packages que sabem de tudo -- nao resolve o acoplamento.

- A separacao por feature/dominio (ex: pkg_coparticipacao, pkg_carencia) gera
  packages autonomos -- cada um sabe so do seu assunto.

DDD nos da a **bussola** para separar certo. Sem ele, separariamos com base
na intuicao, e a intuicao de cada desenvolvedor seria diferente.

---

### P: "Quantas pessoas precisamos no time?"

**R:** O ideal e:

| Fase | Devs | Perfil | PO |
|------|------|--------|-----|
| Fase 1 | 1-2 | Pleno/Senior | Dispensavel (nao muda comportamento) |
| Fase 2 | 2-3 | Senior (Core BCs) + Pleno (Supporting) | Necessario (validar regras) |
| Fase 3 | 2 | Seniors | Necessario (novo contrato) |
| Fase 4 | 3-5 | Seniors + Especialista Azure | Necessario |

---

## 5. Perguntas Criticas / Ceticas

### P: "Isso nao e reescrever o sistema inteiro?"

**R:** Nao. Reescrever e jogar fora e comecar do zero. O que estamos fazendo e
**reorganizar de dentro para fora**. E como reformar uma casa morando nela:
comecamos pelo quarto que menos incomoda, e vamos avancando comodo por comodo.

- Nas Fases 1-3, o BANCO nao muda. As TABELAS nao mudam. Os DADOS nao mudam.
  Os CHAMADORES nao mudam (na Fase 1).
- So reorganizamos o CODIGO PL/SQL em packages.
- A procedure original continua existindo como facade/adapter.

---

### P: "Voces nao estao complicando algo que funciona?"

**R:** "Funciona" e um criterio necessario mas nao suficiente. A procedure
funciona, mas:

- **Ninguem quer mexer nela** (medo)
- **Cada mudanca custa caro** (dias de analise)
- **Bugs sao dificeis de diagnosticar** (5.000 linhas sem separacao)
- **Nao temos testes** (zero seguranca)
- **So 1-2 pessoas entendem** (risco de pessoa-chave)

A pergunta nao e "funciona?" -- e "por quanto tempo mais vai funcionar assim?"
E "qual o custo de manter assim vs. refatorar?"

---

### P: "Nao e melhor reescrever em .NET direto?"

**R:** Seria se tivessemos:
- Todas as regras de negocio documentadas (nao temos)
- Testes automatizados do legado para validar (nao temos)
- Certeza de que a reescrita faz tudo igual (como garantir com 5.000 linhas?)

A estrategia em fases resolve isso:
- Fases 1-3 **extraem e documentam** as regras de negocio nos packages
- Os packages servem como **especificacao viva** para a reescrita em .NET
- Na Fase 4, cada package PL/SQL vira um microservico .NET com confianca,
  porque sabemos exatamente o que cada um faz

**Sem as Fases 1-3, a reescrita em .NET seria um tiro no escuro.**

---

### P: "E se o time nao souber DDD?"

**R:** O time nao precisa ser especialista em DDD. Precisa entender 5 conceitos:

1. **Bounded Context** = cada package cuida de um assunto
2. **Aggregate** = grupo de dados que mudam juntos
3. **Specification** = regra de validacao encapsulada
4. **Domain Service** = logica que nao pertence a nenhuma tabela
5. **Repository** = encapsula queries e inserts

O restante (Events, Factories, ACL) e para fases mais avancadas e sera
introduzido gradualmente.

**Acao proposta:** 1-2 sessoes de treinamento de 2h antes de iniciar a Fase 2.

---

### P: "A documentacao toda ja vai ficar desatualizada..."

**R:** Dois pontos:

1. **Os packages sao a documentacao viva.** O nome do package (`pk_coparticipacao`),
   o nome das procedures (`pr_configura`), e os tipos (`t_resultado_efetivacao`)
   sao auto-documentaveis. Mesmo que o .md fique desatualizado, o codigo conta
   a historia.

2. **ADRs (Architecture Decision Records) sao permanentes.** As decisoes
   documentadas (ex: "COMMIT interno mantido ate Fase 3") nao ficam obsoletas --
   elas registram POR QUE uma decisao foi tomada naquele momento.

---

## 6. Perguntas sobre o Roadmap

### P: "Por que nao comecar pelo Core Domain?"

**R:** Porque o Core e o mais arriscado. Se erramos na Coparticipacao (Core),
impactamos faturamento. Se erramos no Log (Generic), impactamos um log.

A estrategia e:
1. Comecar pelos BCs de menor risco (Generic: Log, Validacao)
2. Ganhar confianca e refinar o processo
3. Avancar para os Supporting (Pessoa, Endereco, Filial)
4. Por ultimo, os Core (Empresa, Preco, Copart, Carencia)
5. Final: Orquestrador (BC-01)

**Analogia:** E como aprender a dirigir. Voce comeca no estacionamento vazio
(Generic), passa para ruas tranquilas (Supporting), e so depois entra na
avenida movimentada (Core).

---

### P: "Quanto tempo leva a Fase 1?"

**R:** 2-4 semanas, dependendo do time:

| Quick Win | Esforco | Dependencia |
|-----------|---------|-------------|
| pk_log_auditoria (30 blocos -> 1 chamada) | ~3 dias | Nenhuma |
| Unificar cursors cr_empresa_neg | ~2 dias | Nenhuma |
| pk_validacao_proposta (funcoes puras) | ~5 dias | Nenhuma |
| Testes de regressao | ~5 dias | Apos os 3 acima |

Todas as 3 extracooes podem ser feitas em paralelo por devs diferentes.

---

### P: "E se a ANS mudar uma regra no meio da refatoracao?"

**R:** Essa e justamente uma das vantagens. Se a mudanca for em Coparticipacao:

- **Sem refatoracao (hoje):** Voce abre a procedure de 5.000 linhas, procura onde
  esta a logica de coparticipacao (espalhada em ~500 linhas), faz a mudanca
  torcendo para nao impactar outra area, e testa manualmente tudo.

- **Com refatoracao (apos Fase 2):** Voce abre `pk_coparticipacao`, muda a regra
  no package de ~200 linhas, roda os testes unitarios daquele package, e faz
  deploy. O resto do sistema nao e afetado.

**A refatoracao NAO bloqueia mudancas de negocio -- ela FACILITA.**

---

### P: "A Fase 4 (Cloud) e obrigatoria?"

**R:** Nao. Cada fase e independente e entregavel. Podemos parar na Fase 2 ou
na Fase 3 e ja teremos um sistema muito melhor:

- **Parar na Fase 2:** 18 packages + procedure orquestradora. Ja temos separacao,
  testabilidade, e clareza. E o PL/SQL continua no Oracle.

- **Parar na Fase 3:** Orquestrador limpo + novo contrato de retorno. Excelente
  qualidade de codigo.

- **Fase 4 (Cloud):** So faz sentido se a empresa decidir migrar para Azure.
  E uma decisao estrategica, nao tecnica.

---

## 7. Cheat Sheet: Conceitos DDD Rapidos

Para consulta rapida durante perguntas:

| Conceito | Definicao em 1 frase | Exemplo nosso |
|----------|---------------------|---------------|
| **Bounded Context** | Area do negocio com regras proprias | Coparticipacao, Carencia, Precificacao |
| **Aggregate** | Grupo de dados que mudam juntos | EmpresaConveniada + 13 entidades filhas |
| **Entity** | Objeto com identidade unica | tb_empresa_conveniada (cd_empresa_conveniada) |
| **Value Object** | Objeto sem identidade, definido por valores | CNPJ, Endereco, CanalVenda |
| **Domain Service** | Logica que nao pertence a nenhuma entidade | GeracaoCodigoEmpresaService |
| **Repository** | Encapsula acesso a dados | EmpresaConveniadaRepository.criar() |
| **Domain Event** | Fato que aconteceu no dominio | EmpresaConveniadaCriada |
| **Factory** | Cria objetos complexos | EmpresaConveniadaFactory (~60 colunas) |
| **Specification** | Regra de validacao encapsulada | CnpjValidoSpec, VendedorAtivoSpec |
| **Anti-Corruption Layer** | Adaptador entre novo e legado | PropostaAdapter (cursor -> objetos) |
| **Ubiquitous Language** | Vocabulario compartilhado TI/Negocio | "Efetivar empresa" = INSERT tb_emp_conv |
| **Strangler Fig** | Migracao gradual sem desligar o antigo | Package por package, procedure como adapter |

---

## 8. Analogias Poderosas para Nao-Tecnicos

### Analogia 1: A Cozinha de Restaurante

**Hoje (monolito):** Um unico cozinheiro faz TUDO -- entrada, prato principal,
sobremesa, drinks. Se ele erra a sobremesa, pode atrasar a entrada do proximo
cliente. Se ele fica doente, o restaurante fecha.

**Com DDD (packages):** Cada estacao tem seu cozinheiro: um faz entradas, outro
faz pratos quentes, outro faz sobremesas. Se o da sobremesa erra, os outros
continuam. Se alguem falta, voce substitui so aquela estacao.

### Analogia 2: A Construcao Civil

**Hoje:** A planta da casa esta toda em 1 folha de papel de 3 metros. Se voce
quer mudar a cozinha, precisa desdobrar a planta inteira, achar onde esta a
cozinha, e rezar para nao riscar o banheiro sem querer.

**Com DDD:** Cada comodo tem sua propria planta. Quer mudar a cozinha? Abre a
planta da cozinha. O encanamento do banheiro nem aparece nessa planta.

### Analogia 3: O Corpo Humano

O corpo humano tem orgaos especializados: coracao bombeia sangue, pulmao
oxigena, rim filtra. Cada orgao tem suas regras internas (Bounded Context)
e se comunica com outros via sinais quimicos (Domain Events).

Se voce precisa tratar o rim, o cardiologista nao precisa estar na sala.
Hoje, nossa procedure e como se todos os orgaos fossem uma massa unica
-- para operar qualquer parte, voce precisa mexer em tudo.

---

## 9. Argumentos de Autoridade

Se alguem questionar a abordagem, voce pode citar:

### Livros:
- **"Domain-Driven Design"** (Eric Evans, 2003) -- O livro original, "blue book"
- **"Implementing Domain-Driven Design"** (Vaughn Vernon, 2013) -- O livro pratico, "red book"
- **"Learning Domain-Driven Design"** (Vlad Khononov, 2021) -- Mais acessivel e moderno
- **"Working Effectively with Legacy Code"** (Michael Feathers, 2004) -- Para a estrategia de refatoracao
- **"Refactoring"** (Martin Fowler, 2018) -- Tecnicas de refatoracao segura

### Padroes usados:
- **Strangler Fig Pattern** (Martin Fowler) -- Migracao gradual
- **Strategy Pattern** (Gang of Four) -- Para SIGO vs BITIX
- **Adapter Pattern** (Gang of Four) -- Para compatibilidade legado
- **Saga Pattern** (Hector Garcia-Molina, 1987) -- Para transacoes distribuidas

### Empresas que usam DDD:
- **Nubank** -- Modelagem DDD em Clojure para todo o dominio financeiro
- **iFood** -- BCs separados por dominio (pedido, pagamento, logistica)
- **Netflix** -- DDD para gestao de conteudo e billing
- **Itau Unibanco** -- Modernizacao do core banking com DDD
- **ThoughtWorks** -- Consultoria que popularizou DDD no Brasil

---

## 10. Anti-Padroes: O Que NAO Dizer

| NAO diga | Diga em vez disso |
|----------|-------------------|
| "O codigo atual e horrivel" | "O codigo atual cumpre seu papel ha 15+ anos, mas precisa evoluir" |
| "Precisamos reescrever tudo" | "Vamos modernizar gradualmente, sem desligar nada" |
| "DDD e a unica solucao" | "DDD e a abordagem mais adequada para esse nivel de complexidade" |
| "Vai levar 2 anos" | "A Fase 1 entrega valor em semanas. Cada fase e independente" |
| "O time precisa aprender DDD" | "O time precisa entender 5 conceitos basicos. O resto vem com a pratica" |
| "Isso e divida tecnica" | "Isso e uma oportunidade de melhorar a velocidade de entrega" |
| "Quem escreveu isso nao sabia o que fazia" | "A procedure foi construida incrementalmente ao longo de 15 anos" |
| "Microservicos resolvem tudo" | "Packages PL/SQL ja resolvem 80% do problema. Cloud vem depois" |

---

## Dicas Finais para a Apresentacao

1. **Comece pelo problema, nao pela solucao.** As pessoas precisam sentir a dor antes
   de aceitar o remedio. Mostre os exemplos concretos: o parsing fragil, os 30
   `WHEN OTHERS THEN NULL`, a falta de testes.

2. **Use analogias para nao-tecnicos.** POs e gerentes nao precisam entender
   Aggregate vs Entity. Eles precisam entender que hoje temos "1 cozinheiro para
   tudo" e vamos ter "1 cozinheiro por estacao".

3. **Mostre o codigo "antes e depois".** O slide da Fase 3 (procedure de 30 linhas)
   e poderoso. Qualquer pessoa consegue ler e entender.

4. **Enfatize que o sistema NUNCA para.** A maior preocupacao de gerentes e
   "e se der errado?". O Strangler Fig garante que o sistema funciona em todas
   as fases.

5. **Tenha os numeros na ponta da lingua:** 4.991 linhas, 18 BCs, 47 tabelas
   de escrita, 4 chamadores, 0 testes, 30 WHEN OTHERS.

6. **Nao entre em detalhes de DDD tatico** a menos que perguntem. A maioria quer
   saber o "quanto custa", "quanto tempo leva", "e se der errado". Os detalhes
   tecnicos sao para o time de desenvolvimento.

7. **Tenha o roadmap visual pronto.** O diagrama de evolucao (5.000 -> 4.500 ->
   packages -> 200 -> cloud) e muito eficaz.

---

*Guia preparado em: Fevereiro 2026*
*Projeto: Refatoracao DDD -- pr_cadastramento_empresa_prov*
