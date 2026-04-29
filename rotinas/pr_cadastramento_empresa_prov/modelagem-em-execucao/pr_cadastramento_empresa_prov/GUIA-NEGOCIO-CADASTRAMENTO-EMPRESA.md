# Guia de Negócio: Cadastramento de Empresa Conveniada PJ

> **O que é este documento?**
> Este guia descreve, em linguagem de negócio, **o que acontece e por que acontece** durante o
> cadastramento de uma empresa conveniada no plano de saúde empresarial.
> Todo código técnico, número mágico e lógica interna foi traduzido para termos do negócio.
>
> **Processo descrito:** Efetivação de contrato de plano de saúde coletivo empresarial (PJ)
> **Procedure de origem:** `humaster.pr_cadastramento_empresa_prov` (~5.000 linhas PL/SQL)
> **Data:** 2026-03-12
> **Referência técnica:** `REGRAS-DE-NEGOCIO-POR-CONTEXTO.md`

---

## Sumário

1. [Visão Geral do Processo](#1-visão-geral-do-processo)
2. [Os Três Canais de Entrada](#2-os-três-canais-de-entrada)
3. [Etapa 1 — Triagem da Proposta (antes de entrar no cadastramento)](#3-etapa-1--triagem-da-proposta)
4. [Etapa 2 — Validação Completa da Proposta](#4-etapa-2--validação-completa-da-proposta)
5. [Etapa 3 — Cadastro da Pessoa Jurídica](#5-etapa-3--cadastro-da-pessoa-jurídica)
6. [Etapa 4 — Endereço e Contatos](#6-etapa-4--endereço-e-contatos)
7. [Etapa 5 — Determinação da Filial e Área de Venda](#7-etapa-5--determinação-da-filial-e-área-de-venda)
8. [Etapa 6 — Modelo Comercial e Segmentação de Canal](#8-etapa-6--modelo-comercial-e-segmentação-de-canal)
9. [Etapa 7 — Precificação e Tabela de Preços](#9-etapa-7--precificação-e-tabela-de-preços)
10. [Etapa 8 — Criação do Contrato da Empresa Conveniada](#10-etapa-8--criação-do-contrato-da-empresa-conveniada)
11. [Etapa 9 — Coparticipação e Franquias](#11-etapa-9--coparticipação-e-franquias)
12. [Etapa 10 — Carência e Compra de Carência](#12-etapa-10--carência-e-compra-de-carência)
13. [Etapa 11 — Fidelização Contratual](#13-etapa-11--fidelização-contratual)
14. [Etapa 12 — Reembolso e Livre Escolha](#14-etapa-12--reembolso-e-livre-escolha)
15. [Etapa 13 — Acesso ao Portal Internet](#15-etapa-13--acesso-ao-portal-internet)
16. [Etapa 14 — Mínimo Contratual e Ponto de Equilíbrio](#16-etapa-14--mínimo-contratual-e-ponto-de-equilíbrio)
17. [Etapa 15 — Confirmação e Encerramento da Transação (COMMIT)](#17-etapa-15--confirmação-e-encerramento-da-transação-commit)
18. [Etapa 16 — Ações Pós-Confirmação (Não Cancelam o Contrato)](#18-etapa-16--ações-pós-confirmação)
19. [O Que Acontece Quando Algo Dá Errado](#19-o-que-acontece-quando-algo-dá-errado)
20. [Regras Especiais por Tipo de Contrato](#20-regras-especiais-por-tipo-de-contrato)
21. [Glossário de Termos e Magic Numbers](#21-glossário-de-termos-e-magic-numbers)

---

## 1. Visão Geral do Processo

O cadastramento de uma empresa conveniada é o processo pelo qual **uma proposta de plano de saúde
coletivo empresarial aprovada se transforma em um contrato ativo** no sistema. Pense nele como a
formalização de um contrato que um corretor ou consultor trouxe para a operadora.

### O fluxo em uma linha

```
Proposta digitada ? Triagem automática ? Validação de dados ?
Cadastro da empresa e vínculos ? Confirmação ? Empresa ativa no sistema
```

### Características fundamentais do processo

- **Tudo ou nada:** O cadastramento é uma operação atômica. Se qualquer etapa falhar, tudo é
  desfeito automaticamente — a empresa não fica "meio cadastrada" no sistema.

- **Uma proposta por vez:** Cada execução processa uma única proposta. O sistema pode ser
  acionado para processar uma proposta específica ou varrer todas as pendentes.

- **Sequência obrigatória:** As etapas seguem uma ordem rígida. Não é possível criar a tabela de
  preços antes de saber qual filial e qual modelo comercial se aplica, por exemplo.

---

## 2. Os Três Canais de Entrada

As propostas chegam ao sistema por três caminhos distintos, e o comportamento do cadastramento
varia conforme o canal de origem:

### Canal TAFFIX — Digitação Interna

- **O que é:** Propostas digitadas internamente por operadores da administradora de benefícios,
  via sistema Oracle Forms.
- **Perfil:** Canal histórico, usado para contratos negociados diretamente com a operadora.
- **Regras exclusivas:** Permite sobrescrita da filial por um campo especial (`filial_modelo`),
  usado quando a proposta precisa ser alocada em uma filial diferente da área de venda do corretor.
- **Verificação Neoway:** Passa pela validação de inconsistência cadastral/fiscal do serviço Neoway.

### Canal BITIX — Plataforma do Corretor

- **O que é:** Propostas originadas na plataforma digital de vendas usada pelos corretores.
- **Perfil:** Canal digital moderno, com regras de negócio ligeiramente diferenciadas.
- **Regras exclusivas:**
  - Quando a data de início do contrato é igual ou anterior à data atual (contrato retroativo),
    o sistema **ajusta automaticamente a data de início para hoje**, evitando processar contratos
    com data no passado de forma incorreta.
  - A verificação de inconsistência Neoway **não ocorre dentro do cadastramento (`pr_cadastramento_empresa_prov`)
    nem dentro do orquestrador padrão (`pr_efetiva_internet`)** para este canal — mas **ocorre via
    rotinas exclusivas do `pk_venda_json`**, que é o orquestrador do canal BITIX.
    > **Como funciona na prática?**
    >
    > O fluxo da `pr_efetiva_internet` possui um bloco de verificação Neoway protegido por
    > `IF v_valida_emp_bitix = 0 THEN` (SACTI 1789837). Para BITIX, essa condição nunca é
    > verdadeira — o bloco **é pulado completamente**. Também a crítica de beneficiários
    > (`pr_critica_internet_saude_81`) exige `v_count_bitix = 0`, portanto igualmente não executa.
    >
    > No entanto, o `pk_venda_json` — orquestrador exclusivo do BITIX — executa sua **própria
    > rotina Neoway** independente:
    >
    > 1. **`PR_VE_DIVERGENCIA_NEOWAY`** — itera sobre todos os titulares e dependentes da proposta
    >    e chama `pr_verifica_divergencia` (processo 33), que por sua vez invoca
    >    `pk_neoway.fn_divergencia_neoway` para comparar CPF, nome e data de nascimento de cada
    >    beneficiário contra a base Neoway. Se houver divergência, grava
    >    `fl_status_processamento = '17'` no beneficiário. Controlada pelo parâmetro
    >    `PK_VENDA_JSON_EXECUTA_NEOWAY` e pelo parâmetro interno `PR_VE_DIVERGENCIA_NEOWAY_FLAG`.
    >
    > 2. **`fn_get_criticas_pendencias`** — portão que decide se o cadastramento será acionado.
    >    No modo `'N'` (usado na baixa T229B), a pendência 12 (empresa) é ignorada e apenas
    >    críticas de beneficiários são contadas. O cadastramento só é acionado se `COUNT_VALIDA = 0`.
    >
    > 3. **Pós-cadastramento** — se algum beneficiário ficou com `fl_status_processamento = '17'`,
    >    o fluxo POS registra o marcador via `pr_set_emp_fluxo_pos`, forçando a proposta para o
    >    **status 7** (fila de análise manual) ao invés do status 10 (aprovação automática). O
    >    contrato foi criado — apenas fica pendente de revisão manual da divergência Neoway.
    >
    > **Resumo:** O BITIX não é isento de Neoway — apenas usa **rotinas próprias**,
    > acionadas pelo `pk_venda_json`, que é o único responsável por toda a lógica Neoway
    > para este canal. A `pr_cadastramento_empresa_prov` e a `pr_efetiva_internet` **não
    > tocam em Neoway para BITIX**.
  - Descontos são sempre habilitados, mesmo que o modelo comercial não os defina explicitamente.

### Canal SIGO / WebHap — Portal Web do Corretor

- **O que é:** Propostas originadas no portal web de vendas para corretores da Hapvida SS.
- **Perfil:** Semelhante ao TAFFIX em termos de regras, mas gerado pelo portal.
- **Verificação Neoway:** Passa pela validação Neoway.

> **Identificação técnica do canal:** O campo `cd_operados = 'BITIX'` identifica o canal BITIX.
> Todos os demais são tratados como SIGO/TAFFIX.

---

## 3. Etapa 1 — Triagem da Proposta

> **Responsável:** Processo orquestrador externo (não faz parte do cadastramento em si)
> **O que acontece:** A proposta passa por três camadas de verificação antes de chegar ao cadastramento.

Antes de o cadastramento começar, o sistema de orquestração já realizou uma triagem rigorosa.
O cadastramento recebe apenas propostas que **já passaram por todas estas camadas**:

---

### Camada 1 — Filtro de Elegibilidade Básica

A proposta precisa satisfazer todos os critérios abaixo para ser considerada candidata ao processamento:

| Critério | Requisito | Explicação |
|---|---|---|
| Tipo de operação | Somente **inclusão de nova empresa** | O processo não trata alterações ou cancelamentos de contratos já existentes. |
| Status da proposta | **Digitada**, **Pendente (aguardando reprocessamento)** ou **Autorizada manualmente** | Propostas canceladas ou já processadas são ignoradas. |
| Beneficiários confirmados | **Sim** — flag de "vidas OK" marcada | A proposta só avança se todos os beneficiários foram digitados e confirmados. |
| Quantidade de vidas | Entre **1 e 29 beneficiários** | Este fluxo atende exclusivamente o segmento PME (Pequena e Média Empresa). Contratos com 30 ou mais vidas seguem outro fluxo. |
| Empresa ainda não cadastrada | **CNPJ sem contrato ativo** no sistema | Empresas que já possuem um contrato ativo não são reprocessadas (exceto ex-clientes cancelados, que podem ser reativados). |

---

### Camada 2 — Verificação de Pendências (13 verificações)

Se a proposta passou pelo filtro básico, o sistema verifica 13 condições de bloqueio. Qualquer
uma delas gera uma **pendência** e interrompe o processamento.

> **Nota sobre orquestradores:** As 13 pendências são verificadas pelo orquestrador
> `pr_efetiva_internet` (canais TAFFIX e SIGO). Para o canal **BITIX**, o orquestrador é o
> `pk_venda_json`, que possui comportamento diferenciado — em especial para a pendência 11
> (Neoway), conforme descrito na seção "Canal BITIX" acima.

| # | Pendência | O que verifica | O que acontece ao falhar |
|---|---|---|---|
| 1 | **Razão social suspeita** | Nomes que começam com "ASSOC", "CONDOM", "INSTITUTO" ou "SIND" sugerem entidades não elegíveis para o plano empresarial padrão (associações, condomínios, institutos, sindicatos). | Proposta bloqueada para revisão manual. |
| 2 | **Cidade fora da área de cobertura** | A cidade informada na proposta deve estar na área de atendimento da filial/operadora. | Proposta bloqueada — a operadora não atende aquela localidade. |
| 3 | **Corretor em filial errada** | O corretor que trouxe o contrato deve pertencer à filial que atende a cidade do contrato. Exceção: corretores cadastrados como "nacionais" podem atuar em qualquer filial. | Proposta bloqueada para revisão. |
| 4 | **Dependente com mais de 43 anos** | Dependentes acima de 43 anos só são aceitos se houver parametrização específica de "agregado" vigente para a faixa etária. | Proposta bloqueada para avaliação de enquadramento. |
| 5 | **Sobrinho com mais de 23 anos** | O plano aceita sobrinhos como dependentes apenas até os 23 anos, por definição regulatória. | Beneficiário não elegível na categoria "sobrinho". |
| 6 | **Beneficiário com 59 anos ou mais** | Por padrão, beneficiários com 59 anos ou mais não são aceitos. Quando a funcionalidade "limite de 65 anos" está habilitada, o limite sobe para 65 anos. | Proposta bloqueada para análise de risco. |
| 7 | **CPF inválido ou ausente** | CPF com dígito verificador incorreto ou ausente para maiores de 18 anos. | CPF deve ser corrigido ou inserido. |
| 8 | **Quantidade de vidas fora do esperado** | A contagem real de titulares e dependentes ativos deve estar entre 1 e 29 vidas. | Divergência entre o declarado e o contabilizado. |
| 9 | **Digitação tardia de beneficiários** | Beneficiários digitados mais de 6 dias após o cadastramento inicial da proposta. | Indica possível retroatividade indevida. |
| 10 | **Bloqueio por decisão da Diretoria (DIREX)** | Caso especial que bloqueia a proposta até aprovação de nível hierárquico superior. | Aguarda liberação manual. |
| 11 | **Inconsistência Neoway** | O serviço externo Neoway identificou divergências nos dados de CPF, nome ou data de nascimento de **beneficiários** (titulares ou dependentes) da proposta. **Não se aplica dentro da `pr_efetiva_internet` ao canal BITIX** (bloco protegido por `v_valida_emp_bitix = 0`, SACTI 1789837) — mas para BITIX a checagem ocorre via rotinas próprias do `pk_venda_json` (`PR_VE_DIVERGENCIA_NEOWAY`, processo 33). | Dados precisam ser corrigidos ou a divergência precisa ser justificada. |
| 12 | **Limite estendido de idade (65 anos)** | Quando o limite de 65 anos está ativo, proposta com titular de 65 anos ou mais gera pendência específica para controle. | Análise diferenciada. |
| 13 | **Críticas pendentes de beneficiários** | Há inconsistências de saúde ou odontológicas nos beneficiários que ainda não foram avaliadas e liberadas. Só ativo quando o controle de críticas está habilitado. | Aguarda liberação das críticas pelos analistas. |

---

### Camada 3 — Verificação de Críticas de Saúde

Última verificação antes do cadastramento. Executada apenas quando:
- O controle de críticas está **habilitado** no sistema, E
- A empresa ainda **não tem contrato ativo** (empresas reativadas pulam esta etapa)

O sistema verifica se há inconsistências clínicas ou odontológicas pendentes nos beneficiários que
não tenham sido avaliadas e liberadas por um analista. Se houver, a proposta é bloqueada.

---

## 4. Etapa 2 — Validação Completa da Proposta

> **Dentro do cadastramento**
> **O que acontece:** 33 verificações detalhadas dos campos da proposta. Qualquer falha cancela tudo.

Esta é a **primeira etapa real do cadastramento**. O sistema valida exaustivamente todos os dados
da proposta antes de criar qualquer registro. A lógica é "falha rápida" (*fail-fast*): ao primeiro
erro encontrado, o processamento é interrompido, o erro é registrado e tudo é desfeito.

### Sequência das 33 Verificações

#### Bloco A — Corretor e Empresa

| # | O que verifica | Regra de negócio |
|---|---|---|
| 1 | **Corretor cadastrado** | O código do corretor informado na proposta deve existir no cadastro de vendedores. |
| 2 | **CNPJ não está na lista de restrições** | O CNPJ da empresa não pode constar na lista de empresas com restrição vigente no período atual. |
| 3 | **Natureza jurídica informada** | É obrigatório declarar a natureza jurídica da empresa. |
| 4 | **Natureza jurídica válida** | A natureza deve ser uma das 10 opções aceitas: MEI, Individual, Limitada (Ltda), Sociedade Anônima (SA), Cooperativa, Filantrópica, PME, Associação, Condomínio ou Simples Nacional. |
| 5 | **Quantidade de beneficiários maior que zero** | É obrigatório ter ao menos 1 beneficiário contratado. |

#### Bloco B — Dados do CNPJ/CPF

| # | O que verifica | Regra de negócio |
|---|---|---|
| 6 | **CNPJ ou CPF informado** | O número do documento fiscal da empresa é obrigatório. |
| 7 | **Dígito verificador correto** | O CNPJ ou CPF deve ter os dígitos verificadores matematicamente válidos. O sistema aceita CNPJ, CPF ou CAEPF (Cadastro de Atividade Econômica da Pessoa Física, usado por MEI e produtor rural). |
| 8 | **CAEPF válido (quando CPF)** | Quando o documento é CPF, o CAEPF também deve ser informado e válido. O CAEPF é o registro obrigatório para pessoas físicas que exercem atividade econômica (MEI, produtor rural). |

#### Bloco C — Identificação da Empresa

| # | O que verifica | Regra de negócio |
|---|---|---|
| 9 | **Razão social informada** | A razão social é obrigatória. |
| 10 | **Razão social sem espaços duplos** | Não são permitidos dois espaços consecutivos na razão social (indica digitação incorreta). |
| 11 | **Nome fantasia informado** | O nome fantasia é sempre obrigatório. |
| 12 | **Nome fantasia sem espaços duplos** | Mesmo critério de qualidade que a razão social. |
| 13 | **Inscrição estadual sem espaços** | Quando informada, a inscrição estadual não pode conter espaços (nem simples). |

#### Bloco D — Endereço

| # | O que verifica | Regra de negócio |
|---|---|---|
| 14 | **CEP válido** (quando informado) | O CEP deve existir nas tabelas de referência dos Correios (tanto CEPs específicos de logradouros quanto CEPs genéricos de localidades). |
| 15 | **UF informada** | O estado é obrigatório. |
| 16 | **UF cadastrada no sistema** | O código da UF deve existir na tabela de estados do sistema. |
| 17 | **UF corresponde ao CEP** (quando ambos informados) | O estado informado deve ser o mesmo estado do CEP. Inconsistência indica digitação errada de um dos dois. |
| 18 | **Cidade informada** | A cidade é obrigatória. |
| 19 | **Cidade sem espaços duplos** | Critério de qualidade. |
| 20 | **Bairro sem espaços duplos** (quando informado) | Critério de qualidade — o bairro não é obrigatório, mas se informado, não pode ter espaços duplos. |
| 21 | **Tipo de logradouro válido** | O tipo de logradouro (Rua, Avenida, Travessa, Alameda, etc.) deve estar cadastrado na tabela de domínios do sistema. |
| 22 | **Logradouro informado** | O nome da rua/avenida é obrigatório. |
| 23 | **Logradouro sem espaços duplos** | Critério de qualidade. |
| 24 | **Complemento sem espaços duplos** (quando informado) | Critério de qualidade. |

#### Bloco E — Contato e Comunicação

| # | O que verifica | Regra de negócio |
|---|---|---|
| 25 | **E-mail sem espaços** (quando informado) | E-mails não podem conter nenhum espaço em branco. |
| 26 | **E-mail contém "@"** (quando informado) | Formato mínimo de e-mail válido. |
| 27 | **E-mail contém "."** (quando informado) | Formato mínimo de e-mail válido. |

#### Bloco F — Condições Comerciais

| # | O que verifica | Regra de negócio |
|---|---|---|
| 28 | **Dia de pagamento entre 1 e 30** | O dia de vencimento do contrato deve ser um dia válido do mês (1 a 30). O dia 31 não é aceito. Este valor determina o prazo para movimentação de beneficiários no portal. |
| 29 | **Validade do contrato informada** | A data de validade do contrato é obrigatória. |
| 30 | **Vigência mínima de 6 meses** (condicional) | Para contratos com natureza jurídica padrão e modelo comercial não-AFFIX, a validade do contrato deve ser de no mínimo 6 meses a partir do primeiro dia do mês atual. Exigência regulatória ANS. |

#### Bloco G — Responsável pela Empresa

| # | O que verifica | Regra de negócio |
|---|---|---|
| 31 | **Nome do contato informado** | É obrigatório informar o nome da pessoa de contato na empresa. |
| 32 | **Nome do contato sem espaços duplos** | Critério de qualidade. |
| 33 | **Cargo sem espaços duplos** (quando informado) | Critério de qualidade — o cargo é opcional, mas se informado, não pode ter espaços duplos. |

---

## 5. Etapa 3 — Cadastro da Pessoa Jurídica

> **O que acontece:** O sistema registra ou atualiza a entidade "Pessoa Jurídica" que será titular do contrato.

Antes de criar o contrato, o sistema precisa garantir que a empresa existe como **Pessoa** no
cadastro central. A lógica aqui é inteligente: não cria duplicatas.

### Como funciona

**Empresa nova no sistema:** O sistema gera um código único para a Pessoa (usando um número
sequencial com dígito verificador calculado automaticamente) e cria o registro.

**Empresa que já existia:** O sistema encontra o registro existente pelo CNPJ e atualiza os dados
cadastrais (razão social, nome fantasia, inscrição estadual). O código da Pessoa é mantido —
**o CNPJ nunca é alterado**.

### Tipo de Pessoa determinado pelo documento

- **CPF** ? Pessoa Física (usado por MEI e produtor rural que têm CAEPF)
- **CNPJ** ? Pessoa Jurídica (padrão para empresas)
- **CAEPF** ? Também tratado como Pessoa Jurídica para fins contratuais

### Por que o mesmo CNPJ pode existir em operadoras diferentes?

O sistema identifica a Pessoa pela combinação de **CNPJ + Operadora**. Isso permite que uma
empresa tenha, por exemplo, um contrato na Hapvida e outro na RN Saúde, sem conflito cadastral.
As operadoras são identificadas pelos códigos:
- **Operadora 1** ? Hapvida
- **Operadora 7** ? RN Saúde
- **Operadora 14** ? NDI SP

---

## 6. Etapa 4 — Endereço e Contatos

> **O que acontece:** O sistema registra o endereço comercial, os contatos e os meios de comunicação da empresa.

### Endereço comercial

O endereço informado na proposta é cadastrado como **endereço comercial** (tipo 2) da empresa.
Em seguida, o sistema cria o vínculo deste endereço com o contrato como **endereço de fatura**
(tipo 1) — o endereço para onde as cobranças serão enviadas.

**Regra especial para contratos AFFIX:** Neste tipo de contrato, o endereço não é criado. Em vez
disso, o sistema reutiliza o endereço da empresa contratante principal. Apenas o vínculo de fatura
é criado apontando para o endereço já existente.

### Contato responsável

O nome e cargo da pessoa de contato da empresa são registrados no sistema como responsável pelo contrato.

### Meios de comunicação

O sistema registra cada meio de comunicação informado na proposta. Os tipos aceitos são:

| Informação | Tipo no sistema |
|---|---|
| Telefone fixo | Telefone comercial |
| Fax | Fax comercial |
| Telex | Telex |
| Celular | **Dois registros são criados** (um para uso comercial, outro para contato pessoal — comportamento herdado do sistema legado) |
| Bip/Pager | Pager |
| Caixa postal | Caixa postal |
| E-mail | E-mail comercial |

> **Atenção:** O celular gera dois cadastros no sistema por razões históricas do sistema original.
> Apenas os meios de comunicação preenchidos são cadastrados — campos vazios são simplesmente ignorados.

---

## 7. Etapa 5 — Determinação da Filial e Área de Venda

> **O que acontece:** O sistema determina qual filial será responsável pelo contrato.

A filial é a unidade organizacional da operadora que é "dona" do contrato. Ela determina a operadora
(Hapvida, RN Saúde, NDI SP), as tabelas de preço disponíveis e as regras comerciais aplicáveis.

### Como a filial é determinada

O sistema segue uma hierarquia de prioridades para determinar a filial correta:

**1ª prioridade — Filial por modelo (TAFFIX):**
Se o canal for TAFFIX e existir uma filial específica associada ao modelo de contratação, ela
prevalece sobre tudo.

**2ª prioridade — Filial declarada na proposta:**
Se a proposta informar explicitamente uma filial, ela é usada diretamente.

**3ª prioridade — Filial do corretor (regra padrão):**
O sistema rastreia: Corretor ? Área de Venda ? Filial.
Cada corretor pertence a uma Área de Venda, e cada Área de Venda pertence a uma Filial.

> **Se nenhuma filial puder ser determinada**, o contrato é rejeitado. Não é possível processar
> um contrato sem filial definida.

---

## 8. Etapa 6 — Modelo Comercial e Segmentação de Canal

> **O que acontece:** O sistema busca o "pacote comercial" que define todas as condições do contrato.

### O que é o Modelo de Negócio?

O modelo de negócio é um conjunto de parâmetros que define exatamente como o contrato será
estruturado. Pense nele como um "template de contrato" pré-negociado para cada combinação de:
- Filial
- Natureza jurídica da empresa (PME, Simples, Ltda, etc.)
- Faixa de tamanho da empresa (quantidade de beneficiários)

### Como o sistema encontra o modelo correto?

O sistema busca um modelo que satisfaça todas estas condições simultaneamente. Se existirem
modelos com diferentes datas de vigência, o mais recente é usado. Se existir um modelo específico
para a filial e um genérico para "todas as filiais", o específico tem prioridade.

### SIGO vs BITIX: dois caminhos paralelos

Dependendo do canal de origem, o sistema busca o modelo em tabelas diferentes. Embora as regras
sejam as mesmas, o canal BITIX usa como referência a data de assinatura da proposta, enquanto o
canal SIGO/TAFFIX usa a data de início do contrato.

### Grupos empresariais (coligadas)

Se a empresa pertence a um grupo empresarial (matriz + filiais como coligadas), o sistema
**soma o total de vidas de todo o grupo** para determinar o modelo e o canal de venda. Isso pode
mudar completamente as condições do contrato:

- **Exemplo:** Uma filial do grupo com apenas 15 funcionários (sozinha seria canal PIM) pertence
  a um grupo com 80 funcionários no total ? o contrato é enquadrado como **PME**,
  com condições comerciais diferentes.

### Canais de venda e sua importância

O número total de beneficiários (real ou do grupo) determina em qual canal de venda o contrato
se enquadra:

| Faixa de Beneficiários | Canal | Segmento |
|---|---|---|
| 1 a 29 vidas | **Canal 1 — PIM** | Varejo / Pequena Empresa |
| 30 a 99 vidas | **Canal 2 — PME** | Média Empresa |
| 100 ou mais vidas | **Grandes Contas** | Grande Empresa |

> O canal determina quais regras de fidelização se aplicam, se há mínimo contratual, as
> condições de desconto e outras características do contrato.

### O que acontece se o modelo não for encontrado?

Se não existir nenhum modelo comercial cadastrado para a combinação filial + natureza +
quantidade de vidas, o contrato é **rejeitado** com o código de erro de modelo não encontrado.
O erro fica registrado para que a equipe comercial possa cadastrar o modelo faltante.

### O que o modelo define?

Ao encontrar o modelo, o sistema carrega aproximadamente 15 conjuntos de parâmetros, incluindo:
- Tabelas de preço e valores por plano
- Descontos progressivos por quantidade de usuários
- Franquias por plano
- Fatores de coparticipação
- Regras de carência
- Grupos e módulos de carência
- Regras de fidelização
- Isenções de coparticipação
- Parâmetros de internação

---

## 9. Etapa 7 — Precificação e Tabela de Preços

> **O que acontece:** O sistema cria ou reutiliza a tabela de preços que regerá o contrato.

### Tabela de preços principal

Para contratos padrão, o sistema cria uma tabela de preços exclusiva para a empresa, copiando
os valores do modelo comercial encontrado na etapa anterior.

A tabela recebe um nome automático no formato **"Tabela empresa XXXXX"** (onde XXXXX é parte
do código da empresa).

Os valores são calculados aplicando o percentual de desconto negociado:
- **Valor final = Valor de tabela × (1 - desconto%)**

Somente planos compatíveis com a opção de coparticipação escolhida são incluídos na tabela.
Exemplo: se o contrato é **sem coparticipação**, apenas os valores de planos sem coparticipação
são copiados.

### Tabela de preços para agregados

Se o contrato inclui **beneficiários agregados** (dependentes com regras diferenciadas, como
pais, sogros, etc.) e o modelo comercial define valores específicos para este perfil, uma segunda
tabela de preços é criada exclusivamente para os agregados.

### Descontos progressivos por quantidade de usuários

Quando o contrato prevê descontos por volume, o sistema registra a tabela de descontos
progressivos: quanto mais usuários utilizarem o plano, maior o desconto aplicado.

### Franquias por plano

Se o modelo comercial define franquias (valores fixos a serem pagos antes da coparticipação
incidir), elas são registradas por plano e período.

### Conformidade com a ANS — RN 279/309

O sistema verifica se o contrato deve ter uma **tabela especial para beneficiários que saem do plano**
(inativos). Esta é uma exigência regulatória da ANS (Resolução Normativa 279/309) que garante
que ex-beneficiários mantenham acesso ao plano por um período após a demissão. Se aplicável,
uma tabela de preços adicional é criada e vinculada ao contrato.

### Regra especial: Tabela compartilhada (contratos AFFIX)

Para contratos do modelo AFFIX, a tabela de preços **não é criada** — o contrato simplesmente
referencia a tabela já existente da administradora contratante. Isso garante que todos os
contratos AFFIX da mesma filial/administradora sejam reajustados de uma só vez.

---

## 10. Etapa 8 — Criação do Contrato da Empresa Conveniada

> **O que acontece:** O contrato em si é criado no sistema — o registro principal que representa o
> vínculo entre a empresa e a operadora.

### Geração do código da empresa

Antes de tudo, o sistema gera um **código único de 7 caracteres alfanuméricos** para a empresa
(ex: `ABC0001`). Este é o número de identificação do contrato em todo o sistema.

> **Curiosidade técnica:** O sistema tenta gerar este código até 10.001 vezes em caso de colisão
> antes de desistir — na prática, esse limite nunca é atingido.

### O registro do contrato (~60 campos)

O contrato da empresa conveniada é um registro com aproximadamente 60 informações, incluindo:

- Identificação da empresa (código da Pessoa, CNPJ, razão social)
- Filial responsável e operadora
- Tipo de plano, acomodação e tabela de preços
- Código do corretor
- Data de início e validade
- Quantidade de beneficiários contratados
- Natureza jurídica
- Canal de venda (PIM, PME, Grandes Contas)
- Status inicial: **Ativo** (todos os contratos são criados já ativos)
- Dia de pagamento convertido para a data real de vencimento
- Indicadores de conformidade com normas ANS

### Conversão do dia de pagamento

O dia de pagamento informado na proposta (1 a 30) é convertido para a data real de vencimento:

| Dia declarado | Data real de vencimento |
|---|---|
| Até 5 | Dia 5 do mês |
| 6 a 10 | Dia 10 do mês |
| 11 a 15 | Dia 15 do mês |
| 16 a 20 | Dia 20 do mês |
| 21 a 25 | Dia 25 do mês |

### Regra especial — Contrato BITIX com data retroativa

Se a data de início do contrato BITIX é igual ou anterior a hoje, o sistema ajusta:
- A data de início passa a ser **hoje**
- O processamento é registrado com **data de hoje**
- A referência de carência é calculada a partir de **hoje**
- A validade mínima do contrato é estendida para **12 meses a partir de hoje**

### Configurações adicionais do contrato

Após criar o registro principal, o sistema cria automaticamente:

1. **Unidade contratual padrão:** Todo contrato começa com a unidade de atendimento padrão
   (código 1). Unidades adicionais são configuradas manualmente após a efetivação.

2. **Parâmetros por tipo de usuário:** São definidos os parâmetros para 9 tipos de usuário
   (titular, dependente, agregado, etc.), especificando qual tabela de preços se aplica a cada um.

3. **Planos especiais:** Se o modelo comercial define planos com condições diferenciadas (ex:
   plano executivo, plano diferenciado por cargo), eles são vinculados neste momento.

4. **Natureza jurídica registrada:** A natureza jurídica é gravada com a data de início para
   permitir histórico de alterações futuras.

5. **Flags de conformidade ANS (RN 195):** Indicadores regulatórios obrigatórios são configurados
   conforme as normas da Agência Nacional de Saúde Suplementar.

6. **Modelo de reajuste:** A regra de reajuste anual do contrato é definida (qual índice de
   correção será aplicado na renovação).

7. **Registro de implantação:** Confirma que a empresa foi cadastrada automaticamente pelo
   processo de baixa de proposta.

8. **Comissão do consultor:** Se houver consultor de vendas associado ao contrato, sua comissão
   é registrada.

9. **CNPJ contratante (AFFIX):** Nos contratos AFFIX, o CNPJ da administradora contratante é
   vinculado ao contrato da empresa beneficiária.

### Histórico inicial para PME e Simples Nacional

Para empresas de natureza jurídica **PME** ou **Simples Nacional**, o sistema cria automaticamente
um registro de histórico com o tipo "Empresa Nova", para fins de rastreamento regulatório exigido
pela ANS.

---

## 11. Etapa 9 — Coparticipação e Franquias

> **O que acontece:** O sistema configura como o beneficiário participará dos custos de utilização
> do plano.

A coparticipação é o valor que o beneficiário paga no momento do atendimento, além do que a
operadora cobre. É regulamentada pela ANS e representa uma das partes mais complexas do contrato.

### Regras de coparticipação configuradas

O sistema define, a partir do modelo comercial:

**Quais atendimentos geram coparticipação:**
- Consultas em rede própria
- Consultas de retorno
- Atendimento de urgência
- Parto e puericultura
- Ginecologia/obstetrícia
- Odontologia (quando incluída)
- Medicina preventiva
- Segunda opinião médica
- Internações (com configurações específicas para PJ)

**Valores e percentuais:**
- Por faixa etária do beneficiário
- Por tipo de serviço
- Por período de utilização
- Com ou sem franquia (valor mínimo antes de a coparticipação incidir)

**Isenções:**
- Por tipo de beneficiário (ex: demitidos, aposentados, beneficiários com doenças crônicas)
- Por procedimento (ex: terapias especializadas como fisioterapia, fonoaudiologia)
- Por faixa etária (ex: crianças até X anos isentas)

### Empresas PME e Simples Nacional

Para estas naturezas jurídicas, a configuração de coparticipação tem uma particularidade:
o campo "cobra produto" é automaticamente definido como **Não cobra**, pois estes segmentos
têm tratamento diferenciado pela regulação.

### Regra especial — contratos AFFIX

O contrato AFFIX tem campos adicionais na configuração de coparticipação, incluindo o vínculo
com a empresa de cobrança responsável pelos valores.

### Regras de coparticipação: impacto regulatório

Esta é a seção com maior impacto regulatório do contrato. Erros na configuração podem gerar:
- Glosas (não pagamento) de procedimentos pela operadora
- Multas da ANS por cobrança indevida de beneficiários
- Processos judiciais por cobrança acima do contratado

Por isso, esta etapa representa a maior seção do código original (~1.300 linhas).

---

## 12. Etapa 10 — Carência e Compra de Carência

> **O que acontece:** O sistema configura os períodos de espera para uso dos serviços do plano.

### O que é carência?

Carência é o período que o beneficiário precisa aguardar, após a contratação, para ter direito
ao atendimento de determinados procedimentos. É regulamentada pela Lei 9.656/98 e pela
Resolução Normativa 162/2007 da ANS.

**Prazos máximos definidos pela ANS:**
- **24 horas** ? urgência e emergência (nenhum plano pode negar atendimento de urgência)
- **180 dias (6 meses)** ? internação
- **300 dias (10 meses)** ? parto
- **720 dias (24 meses)** ? doenças e lesões preexistentes

### Compra de carência

A "compra de carência" é a possibilidade de o contrato reduzir ou eliminar os prazos de carência
mediante pagamento de um percentual adicional. O sistema registra:

- Qual o percentual do valor de carência pago
- Quais grupos de procedimentos tiveram carência comprada
- Quais módulos de serviços têm carência reduzida
- Quais grupos odontológicos têm carência definida

A hierarquia de registros é:
```
Compra de Carência (o "lote")
  ??? Grupos de carência (tipo de procedimento e % pago)
  ??? Módulos de carência (serviços específicos e % pago)
  ??? Grupos odontológicos (procedimentos odonto e dias de carência)
```

---

## 13. Etapa 11 — Fidelização Contratual

> **O que acontece:** Para contratos do segmento PME, o sistema configura as regras de
> permanência mínima.

### Quem tem fidelização?

A fidelização **só se aplica ao Canal 2 — PME** (30 a 99 vidas). Contratos PIM e
Grandes Contas não têm fidelização configurada neste processo.

A justificativa comercial é que contratos de médias empresas envolvem condições e descontos
diferenciados que justificam uma exigência de permanência mínima.

### O que a fidelização define?

- **Período de fidelização:** calculado a partir da data de início do contrato, com um prazo
  fixo de **aproximadamente 2 anos e 9 meses** (1.000 dias).
- **Regras de multa:** o modelo comercial define a multa proporcional por cancelamento antecipado.
- **Faixas de admissão elegíveis:** beneficiários admitidos em determinado período estão sujeitos
  a regras específicas de fidelização.

> **Atenção:** A fidelização se aplica apenas a **planos de saúde e mistos**. Planos
> exclusivamente odontológicos são excluídos das regras de fidelização.

---

## 14. Etapa 12 — Reembolso e Livre Escolha

> **O que acontece:** Para planos com livre escolha, o sistema configura as condições de reembolso.

### O que é livre escolha?

Planos de livre escolha permitem que o beneficiário seja atendido por qualquer profissional de
saúde (não apenas os da rede credenciada) e solicite reembolso dos valores pagos à operadora.

### Como funciona a configuração

O sistema verifica, plano a plano, se aquele plano oferece livre escolha. Para cada plano com
livre escolha:

1. **Apaga** qualquer configuração de reembolso anterior (operação idempotente — garante que
   reprocessamentos não duplicam dados).
2. **Cria** as novas configurações copiando as regras padrão do plano:
   - Prazos e formas de pagamento do reembolso
   - Tabelas de referência de valores (ex: CBHPM, AMB)
   - Composição dos valores reembolsáveis (honorários, taxas, materiais)
   - Moeda de referência para cálculo (quando aplicável)

---

## 15. Etapa 13 — Acesso ao Portal Internet

> **O que acontece:** O sistema cria as credenciais de acesso da empresa ao portal online.

### Criação do acesso

O sistema gera um **código de acesso único** (via numeração sequencial) para a empresa no portal
de beneficiários.

**Geração da senha inicial:**
A senha é gerada automaticamente a partir dos últimos 6 dígitos do código interno da Pessoa.
Esta senha é enviada por e-mail para a empresa no momento da efetivação.

> ?? **Observação de segurança:** Atualmente, a senha inicial é enviada em texto claro no corpo
> do e-mail. Na modernização do sistema, isso deve ser substituído por um link de criação de senha.

### Serviços habilitados no portal

A empresa recebe acesso a **4 serviços do portal** automaticamente:

| Serviço | O que permite |
|---|---|
| **Serviço 7** — Movimentação | Incluir e excluir beneficiários online |
| **Serviço 12** | Consultas e relatórios |
| **Serviço 14** | Funcionalidades adicionais do portal |
| **Serviço 16** | Funcionalidades adicionais do portal |

### Prazo limite para movimentação

O prazo até quando a empresa pode incluir/excluir beneficiários no mês é determinado pelo
**dia de pagamento do contrato**:

| Dia de pagamento do contrato | Prazo para movimentação |
|---|---|
| Dia **5** | Até o dia **10** do mês |
| Qualquer outro dia | Até o dia **15** do mês |

Para todos os outros serviços (12, 14 e 16), o prazo é sempre o **dia 31** (sem restrição efetiva).

### Migração de código provisório para definitivo

Após a criação do acesso, o sistema atualiza os registros de beneficiários (titulares e
dependentes) que estavam vinculados ao número provisório de controle (formato `T + número`).
Esses registros passam a apontar para o **código definitivo** da empresa recém-criada.

### Regra especial — contratos AFFIX

Nos contratos AFFIX, além das configurações padrão, o sistema copia os **limites de acesso
e movimentação** da empresa contratante principal para o novo contrato. Isso garante que
a administradora mantenha controle uniforme sobre os limites de todos os contratos que gerencia.

---

## 16. Etapa 14 — Mínimo Contratual e Ponto de Equilíbrio

### Mínimo contratual

O mínimo contratual define a **receita mínima garantida** para a operadora durante a vigência do
contrato. Se a empresa reduzir o número de beneficiários abaixo do mínimo acordado, a operadora
faturará o mínimo mesmo assim.

**Quando é configurado:**
O sistema busca se existe parametrização de mínimo contratual ativa para o modelo comercial do
contrato. A parametrização deve estar vigente para o período do contrato.

**O que define:**
- Tipo de cálculo do mínimo (por quantidade de vidas, por valor de faturamento, etc.)
- Quantidade mínima de vidas contratadas
- Valor da multa por descumprimento
- Se comissão do corretor incide sobre o mínimo
- Tabela de preços de referência para o cálculo

**É opcional:** Se não existir parametrização de mínimo contratual para aquele modelo, o
contrato é criado normalmente sem esta cláusula, sem gerar erro ou pendência.

### Ponto de equilíbrio (Breakeven)

O sistema registra o **ponto de equilíbrio padrão de 70%** para todo contrato criado. Este
indicador é usado para monitoramento da relação entre receita e custo do contrato.

Significa que quando o custo de atendimento do contrato atingir 70% da receita, o contrato
está no "ponto de alerta" financeiro.

---

## 17. Etapa 15 — Confirmação e Encerramento da Transação (COMMIT)

> **O que acontece:** Tudo que foi feito até agora é **confirmado definitivamente** no banco de dados.

### O momento do COMMIT

Antes desta etapa, todas as operações existem apenas em memória/transação temporária. É aqui
que tudo é **gravado de forma permanente** no banco de dados.

Um último registro é criado **imediatamente antes** da confirmação: o **log de sucesso**, que
marca a proposta com status "Processada com sucesso" (código 9). Este registro serve como
prova de que o processamento ocorreu corretamente.

### Por que isso importa?

- **Antes do COMMIT:** qualquer erro ainda pode desfazer tudo.
- **Após o COMMIT:** o contrato existe. Erros nas etapas seguintes (pós-COMMIT) não desfazem o contrato.

---

## 18. Etapa 16 — Ações Pós-Confirmação

> **O que acontece:** Ações complementares que não fazem parte da transação principal.
> **Regra fundamental:** Falhas nestas etapas NÃO cancelam o contrato.

Após a confirmação do contrato, o sistema executa três ações complementares de forma autônoma:

---

### Desconto PIM/Administrativo

**Quando ocorre:** Apenas quando a funcionalidade "Desconto PIM Administrativo" está
**habilitada** no sistema (controlada por parâmetro configurável).

**O que faz:** Aplica descontos administrativos específicos para contratos PIM, verificando
também se existem parâmetros de cobrança que precisam ser configurados.

**Em caso de falha:** Silenciosa — o contrato permanece ativo.

---

### Notificação por E-mail

O sistema envia um e-mail de boas-vindas/confirmação para o endereço de e-mail da empresa,
informando:
- Código do contrato
- Razão social e CNPJ
- Endereço registrado
- Senha de acesso ao portal (em texto claro — ver observação de segurança na Etapa 13)

**A quem é enviado:**
- Atualmente: apenas para o e-mail da empresa informado na proposta.
- *(Código histórico indica que anteriormente era enviado também para o corretor e a concessionária.)*

**Qual template é usado:**

| Operadora | Template |
|---|---|
| **RN Saúde** (operadora 7) | E-mail em HTML com remetente `naoresponda-rnsaude@sh.srv.br` |
| **Hapvida** (operadoras 1, 2, 3...) | E-mail em texto simples com remetente `naoresponda@hapvida.com.br` |
| **NDI SP** (operadora 14) | **Nenhum e-mail é enviado** |

**Em caso de falha:** Silenciosa — o contrato permanece ativo, mas o e-mail não é reenviado.

---

### Integração Odontológica

O sistema verifica se deve espelhar o contrato de saúde para o sistema odontológico:

**Espelhamento automático:**
Executado quando existe parametrização automática de espelhamento configurada para a operadora
da empresa. A procedure `pr_odon_param_esp_empresa` replica os parâmetros do contrato de saúde
para o sistema odonto.

**Super Simples:**
Executado quando a empresa **não possui plano odontológico**. Neste caso, o sistema cria uma
configuração mínima de urgência odontológica para garantir atendimento básico.

**Controle do espelhamento:**
O espelhamento é controlado por um parâmetro do sistema (parâmetro 225). Quando o valor é 1,
o espelhamento está ligado; qualquer outro valor ou ausência do parâmetro desabilita o processo.

**Em caso de falha:** Silenciosa — o contrato de saúde permanece ativo.

---

## 19. O Que Acontece Quando Algo Dá Errado

### Antes da confirmação (durante o cadastramento)

Se qualquer erro ocorrer entre o início do cadastramento e a confirmação final:

1. **Todas as operações são desfeitas** (ROLLBACK completo).
2. Uma **pendência** é registrada para a proposta, descrevendo o erro encontrado.
3. A pendência recebe o código **9 — Erro de processamento**.
4. A proposta fica disponível para **reprocessamento automático** pelo sistema ou manual por um operador.

**Mensagem de erro com empresa parcialmente criada:**
Se o código da empresa chegou a ser gerado antes do erro, a mensagem de pendência incluirá
o código da empresa, facilitando a investigação e possível limpeza dos dados.

### Após a confirmação (ações pós-COMMIT)

Falhas nas ações de desconto, e-mail e integração odonto são **silenciosas** — não geram
pendência, não desfazem o contrato, não alertam o operador.

> ?? **Ponto de atenção para evolução do sistema:** Estas falhas silenciosas podem fazer com
> que contratos fiquem sem e-mail enviado ou sem espelhamento odonto sem que ninguém saiba.
> A modernização do sistema deve implementar tratamento adequado dessas falhas.

---

## 20. Regras Especiais por Tipo de Contrato

### Contratos AFFIX

Um contrato AFFIX é um contrato em que uma **administradora de benefícios** contrata o plano em
nome de uma empresa cliente, gerenciando o contrato em seu lugar.

As diferenças em relação a um contrato padrão são:

| Etapa | Comportamento AFFIX | Comportamento Padrão |
|---|---|---|
| Endereço | Reutiliza o endereço da administradora contratante | Cria endereço próprio |
| Tabela de preços | Reutiliza a tabela da administradora contratante | Cria tabela exclusiva |
| Coparticipação | Inclui vínculo com empresa de cobrança da coparticipação | Sem esse vínculo |
| Acesso portal | Copia limites da empresa contratante | Limites padrão |
| Dados do contrato | Registra CNPJ da contratante | Sem esse campo |
| Vigência | Não exige mínimo de 6 meses | Exige 6 meses (quando aplicável) |

### Contratos BITIX com data retroativa

Quando o corretor registra no sistema BITIX um contrato com data de início no passado:

- A data de início é automaticamente ajustada para **hoje**
- Todos os cálculos de datas (vencimento, carência, validade) são refeitos a partir de hoje
- O benefício retroativo não é aceito — o sistema não permite que beneficiários usufruam do
  plano antes da data de processamento

### Empresas PME e Simples Nacional

Estas naturezas jurídicas (códigos 6 e 9) têm tratamento diferenciado em duas etapas:

1. **Coparticipação:** O campo "cobra produto" é automaticamente marcado como "Não cobra",
   refletindo um tratamento regulatório diferenciado para este segmento.

2. **Histórico inicial:** Um registro de histórico "Empresa Nova" é criado automaticamente,
   exigido pelas normas ANS para rastreamento de contratos PME e Simples.

### Grupos empresariais (coligadas)

Quando a empresa pertence a um grupo:

- O **total de beneficiários do grupo inteiro** é usado para determinar o canal de venda
- Isso pode mudar completamente as condições comerciais aplicáveis
- O sistema consolida automaticamente os dados do grupo, tanto para SIGO quanto para BITIX

---

## 21. Glossário de Termos e Magic Numbers

### Termos de negócio

| Termo | Significado |
|---|---|
| **Empresa Conveniada** | A empresa que contratou o plano de saúde coletivo para seus funcionários |
| **Proposta** | O pedido de adesão ao plano, antes de ser aprovado e convertido em contrato |
| **Baixa de proposta** | O processo de converter uma proposta aprovada em contrato ativo |
| **Nu controle** | Número de identificação único da proposta durante o processo de análise |
| **AFFIX** | Modelo de contrato gerenciado por uma administradora de benefícios em nome de uma empresa |
| **SIGO** | Sistema de gestão da operadora |
| **BITIX** | Plataforma digital de vendas para corretores |
| **TAFFIX** | Sistema interno de digitação de propostas (Oracle Forms) |
| **Coparticipação** | Valor pago pelo beneficiário no momento do atendimento |
| **Carência** | Período de espera para utilização de determinados serviços do plano |
| **Compra de carência** | Pagamento adicional para reduzir ou eliminar períodos de carência |
| **Fidelização** | Cláusula de permanência mínima no contrato (aplica-se ao canal PME) |
| **Livre escolha** | Possibilidade de atendimento fora da rede credenciada, com reembolso |
| **Breakeven** | Ponto de equilíbrio financeiro do contrato (70% padrão) |
| **Mínimo contratual** | Receita mínima garantida independente do número de beneficiários ativos |
| **Canal de venda** | Segmentação por porte da empresa: PIM (1-29), PME (30-99), Grandes Contas (100+) |
| **Coligada** | Empresa pertencente a um grupo empresarial |
| **Modelo de negócio** | Conjunto de parâmetros comerciais pré-definidos para uma combinação de filial + natureza + faixa de vidas |
| **PIM** | Produto de inclusão de micro e pequenas empresas (até 29 vidas) |
| **CAEPF** | Cadastro de Atividade Econômica da Pessoa Física (MEI, produtor rural) |
| **RN** | Resolução Normativa da ANS |
| **ANS** | Agência Nacional de Saúde Suplementar |

---

### Códigos de Status de Proposta

| Código | Significado |
|---|---|
| **0** | Digitada (entrada inicial) — aguardando processamento |
| **1** | Pendente — aguardando reprocessamento após falha |
| **2** | Cancelada — não pode ser reprocessada |
| **8** | Autorizada manualmente — aprovada por analista para processamento |
| **9** | Processada com sucesso |
| **17** | Divergência Neoway nos beneficiários — `fl_status_processamento` gravado em titulares/dependentes pela `PR_VE_DIVERGENCIA_NEOWAY` (canal BITIX, processo 33). Quando detectado pelo `fn_get_pend_neoway`, redireciona a proposta para o **status 7** (fila de análise manual) após o cadastramento. |

---

### Códigos de Operadora (cd_empresa_plano)

| Código | Operadora |
|---|---|
| **1** | Hapvida |
| **7** | RN Saúde |
| **14** | NDI SP — Nota: **não recebe e-mail de boas-vindas** |

---

### Naturezas Jurídicas

| Código | Natureza | Observação |
|---|---|---|
| **0** | MEI — Microempreendedor Individual | |
| **1** | Individual / Empresário Individual | |
| **2** | Limitada (Ltda) | |
| **3** | Sociedade Anônima (SA) | |
| **4** | Cooperativa | |
| **5** | Filantrópica | |
| **6** | PME — Pequena e Média Empresa | Tem tratamento especial (histórico inicial + coparticipação diferenciada) |
| **7** | Associação | |
| **8** | Condomínio | |
| **9** | Simples Nacional | Tem tratamento especial (histórico inicial + coparticipação diferenciada) |

---

### Canais de Venda

| Código | Canal | Faixa de Vidas | Características |
|---|---|---|---|
| **1** | PIM — Varejo | 1 a 29 vidas | Sem fidelização neste processo |
| **2** | PME | 30 a 99 vidas | Com fidelização de ~1.000 dias |
| **NULL** | Grandes Contas | 100 ou mais vidas | Condições negociadas individualmente |

---

### Tipos de Endereço

| Código | Tipo |
|---|---|
| **1** | Endereço de fatura (para onde a cobrança é enviada) |
| **2** | Endereço comercial da empresa |

---

### Tipos de Meio de Comunicação

| Código | Tipo |
|---|---|
| **1** | Telefone fixo |
| **3** | Fax |
| **4** | Telex |
| **5** | Celular (comercial) |
| **6** | Bip/Pager |
| **7** | Caixa postal |
| **8** | Celular (pessoal) |
| **9** | E-mail |

---

### Serviços do Portal Internet

| Código | Serviço | Prazo limite |
|---|---|---|
| **7** | Movimentação de beneficiários | Dia 10 (quando vencimento=5) ou Dia 15 (demais) |
| **12** | Consultas e relatórios | Dia 31 (sem restrição efetiva) |
| **14** | Funcionalidades adicionais | Dia 31 (sem restrição efetiva) |
| **16** | Funcionalidades adicionais | Dia 31 (sem restrição efetiva) |

---

### Tipo de Acesso ao Portal

| Código | Tipo |
|---|---|
| **5** | Empresa Conveniada |

---

### Códigos de Assunto do Histórico

| Código | Assunto | Quando é gerado |
|---|---|---|
| **130** | Empresa Nova | Ao cadastrar empresa PME (natureza 6) ou Simples Nacional (natureza 9) |

---

### Códigos de Pendência

| Código | Significado |
|---|---|
| **9** | Erro no processamento — proposta disponível para reprocessamento |

---

### Códigos de Status no Log de Processamento

| Código | Significado |
|---|---|
| **15** | Erro durante a etapa de processamento |
| **9** | Processamento concluído com sucesso |

---

### Parâmetros do Sistema (Feature Flags)

| Parâmetro | Valor padrão | O que controla |
|---|---|---|
| `MOVIMENTACAO_PIM_AUTOMATICO` | S (ativo) | Se "N", desabilita todo o fluxo automático de processamento PIM |
| `HABILITA_65ANOS` | N (inativo) | Se "S", eleva o limite de idade para aceitação de beneficiários de 59 para 65 anos |
| `FL_CRITICA_SAUDE_ODONTO` | S (ativo) | Se "N", desabilita a verificação de críticas de beneficiários antes do cadastramento |
| `PENDENCIA_NEOWAY_PIM` | S (ativo) | Se "N", desabilita a verificação de inconsistência Neoway na `pr_efetiva_internet` (canal não BITIX). **Não afeta o canal BITIX**, cujo fluxo Neoway é controlado pelos parâmetros `PK_VENDA_JSON_EXECUTA_NEOWAY` e `PR_VE_DIVERGENCIA_NEOWAY_FLAG` dentro do `pk_venda_json`. |
| `FL_LOG_BAIXA_CONTROLE` | S (ativo) | Se "N", não registra logs de processamento |
| `FL_ATIVA_PIM_ADM` | N (inativo) | Se "S", aplica descontos administrativos PIM após a confirmação do contrato |
| `PK_VENDA_JSON_EXECUTA_NEOWAY` | S (ativo) | Controla se o `pk_venda_json` aciona `PR_VE_DIVERGENCIA_NEOWAY` para o canal BITIX. Se "N", a checagem Neoway exclusiva do BITIX é desabilitada. |
| `PR_VE_DIVERGENCIA_NEOWAY_FLAG` | S (ativo) | Controla a execução interna de `PR_VE_DIVERGENCIA_NEOWAY` (iteração por titulares/dependentes e chamada ao `pk_neoway.fn_divergencia_neoway`). Específico do canal BITIX. |
| `NEOWAY_STATUS_SERVICO` | 1 (ativo) | Flag que indica se o serviço externo Neoway está disponível (`'1'` = ativo). Verificado antes de qualquer chamada ao serviço. |

---

### Valores hardcoded com significado de negócio

| Valor | Contexto | Significado de negócio |
|---|---|---|
| **1.000 dias** | Fidelização PME | Prazo de fidelização padrão (~2 anos e 9 meses) |
| **70%** | Breakeven | Ponto de alerta financeiro: custo atingiu 70% da receita |
| **6 meses** | Vigência mínima | Prazo mínimo regulatório para validade do contrato |
| **10.001 tentativas** | Geração do código da empresa | Limite de tentativas antes de considerar falha no gerador de código |
| **1 a 29 vidas** | Canal PIM | Faixa de elegibilidade para o produto de micro/pequenas empresas |
| **30 a 99 vidas** | Canal PME | Faixa do segmento de médias empresas |
| **24h / 180d / 300d / 720d** | Carências ANS | Prazos máximos definidos pela Lei 9.656/98 e RN 162/2007 |
| **Parâmetro 225** | Integração Odonto | Código do parâmetro que liga/desliga o espelhamento automático para odontologia |
| **Assunto 130** | Histórico de empresa | Código do tipo de histórico "Empresa Nova" no cadastro de PME/Simples |
| **Pendência 9** | Tratamento de erros | Código universal de "erro de processamento" no log de pendências |

---

*Documento gerado em: 2026-03-12 | Atualizado em: 2026-03-12*
*Baseado em: `REGRAS-DE-NEGOCIO-POR-CONTEXTO.md` (18 contextos, 152 regras, ~5.000 linhas PL/SQL)*
*Complementado por: `IMPACTO-NEOWAY-POR-CANAL.md`, `FLUXO-PROCESSAMENTO-PROPOSTA-T229B.md`*
*Procedure analisada: `humaster.pr_cadastramento_empresa_prov`*
