# Refatoracao DDD: pr_cadastramento_empresa_prov
## Apresentacao para Time Tecnico, POs e Gerentes de TI

---

# AGENDA

```
1. Por que refatorar? (O Problema)              ~10 min
2. O que e DDD e por que usamos?                ~10 min
3. O que foi feito (Modelagem)                  ~15 min
4. Como sera feito (Roadmap)                    ~10 min
5. Impacto no negocio e na operacao             ~10 min
6. Perguntas e Respostas                        ~15 min
                                         Total: ~70 min
```

---

# PARTE 1: POR QUE REFATORAR?

---

## O Cenario Atual

```
pr_cadastramento_empresa_prov
        |
        | 4.991 linhas PL/SQL
        | 1 procedure monolitica
        | 18 responsabilidades diferentes
        | 47 tabelas de escrita
        | 37+ tabelas de leitura
        | 70+ variaveis declaradas
        | 0 testes automatizados
        |
        v
    "Funciona... mas ninguem quer mexer"
```

---

## O Que Essa Procedure Faz?

Transforma uma **proposta comercial** de plano de saude PJ
em um **contrato efetivado** ("baixa").

```
  PROPOSTA (tb_empresa_internet)
  O vendedor cadastrou pelo TAFFIX ou BITIX
          |
          |  pr_cadastramento_empresa_prov
          |  (a "caixa preta" de 5.000 linhas)
          |
          v
  CONTRATO ATIVO (tb_empresa_conveniada)
  Empresa pode usar o plano de saude
  + pessoa juridica criada
  + tabela de preco configurada
  + coparticipacao definida
  + carencia comprada
  + acesso ao portal liberado
  + fidelizacao registrada
  + reembolso parametrizado
  + e-mail de boas-vindas enviado
```

---

## Os Problemas Reais (Dia a Dia)

### Para o Desenvolvedor:
- **Medo de mexer:** "Se eu mudar a linha 3.200, o que acontece na linha 4.800?"
- **Debug impossivel:** 5.000 linhas sem separacao logica
- **Sem testes:** Qualquer mudanca precisa de teste manual completo
- **Onboarding lento:** Desenvolvedor novo leva semanas para entender

### Para o PO / Negocio:
- **Demora na entrega:** Mudancas simples levam dias por medo de efeitos colaterais
- **Bugs silenciosos:** Erros engolidos por `WHEN OTHERS THEN NULL` (~30 ocorrencias)
- **Regras duplicadas:** Mesma validacao em 2+ lugares, com resultados diferentes
- **Rigidez:** "Nao da para mudar a coparticipacao sem mexer no codigo de carencia"

### Para o Gerente de TI:
- **Risco operacional:** 1 pessoa entende o codigo = Single Point of Failure
- **Custo crescente:** Cada feature nova custa mais que a anterior
- **Divida tecnica acumulada:** 15+ anos de patches incrementais
- **Bloqueio de modernizacao:** Impossivel migrar para cloud com esse monolito

---

## Exemplo Concreto: O Contrato de Retorno

**O que temos hoje:**

```sql
-- A procedure retorna isso:
p_erro_controle := 'procedimento efetuado para empresa ,' || cd_empresa;

-- E o chamador faz isso para extrair o codigo da empresa:
l_emp := substr(w_erro, instr(w_erro, ',') + 1);

-- Se der erro Oracle, retorna SQLERRM:
-- 'ORA-06502: PL/SQL: numeric or value error'
-- E o chamador tenta extrair cd_empresa do SQLERRM (!!)
-- Resultado: l_emp = ' numeric or value error'

-- A defesa? Checar se contem 'ORA-':
if instr(l_emp, 'ORA-') > 0 then l_emp := null;
```

**Resumo:** O chamador precisa *conhecer os bugs* do retorno para funcionar.

**4 chamadores independentes** usam exatamente o mesmo parsing fragil.

---

## Numeros que Importam

| Metrica | Valor | Impacto |
|---------|-------|---------|
| Linhas de codigo | 4.991 | Complexidade extrema |
| Responsabilidades misturadas | 18 | Violacao do SRP |
| Boilerplate de log repetido | ~360 linhas | 7% do codigo e copiar/colar |
| Cursors duplicados | 2 (identicos) | Manutencao dobrada |
| Tabelas afetadas | 84+ | Acoplamento massivo |
| Chamadores diretos | 4 | Todos com parsing fragil |
| Testes automatizados | 0 | Zero rede de seguranca |
| `WHEN OTHERS THEN NULL` | ~30 | Erros silenciados |

---

# PARTE 2: O QUE E DDD E POR QUE USAMOS?

---

## DDD em 1 Slide

**Domain-Driven Design** e uma abordagem de desenvolvimento de software
que coloca o **dominio do negocio** no centro de todas as decisoes tecnicas.

```
+-------------------------------------------------+
|  TRADICIONAL             |  DDD                  |
|--------------------------|------------------------|
|  Comecar pelo banco      |  Comecar pelo negocio  |
|  Pensar em tabelas       |  Pensar em processos   |
|  Codigo tecnico          |  Codigo que fala        |
|  "Funciona"              |  "Funciona E e claro"  |
|  Desenvolvedor decide    |  Negocio + Dev decidem  |
+-------------------------------------------------+
```

**Criador:** Eric Evans (livro "Domain-Driven Design", 2003)

**Usado por:** Netflix, Uber, Nubank, iFood, grandes bancos, operadoras de saude

---

## Por Que DDD Para Este Caso?

DDD e recomendado quando:

| Criterio | Nosso Caso | Aplica? |
|----------|-----------|---------|
| Dominio complexo | Efetivacao de contratos PJ de saude | SIM |
| Regras de negocio intrincadas | Coparticipacao, carencia, modelo negocio | SIM |
| Multiplos especialistas de negocio | Comercial, financeiro, regulatorio | SIM |
| Sistema legado a ser modernizado | PL/SQL monolitico de 15+ anos | SIM |
| Necessidade de evolucao continua | Novas regras ANS, novos canais | SIM |

**DDD NAO e recomendado para:**
- CRUDs simples (nao e o nosso caso)
- Sistemas descartaveis
- Equipes muito pequenas sem acesso ao negocio

---

## Os Conceitos-Chave do DDD (Para Nao-Tecnicos)

### Linguagem Ubiqua
> "Todo mundo fala a mesma lingua: negocio e TI."

| Sem DDD (TI fala) | Com DDD (todos falam) |
|---|---|
| "INSERT na tb_empresa_conveniada" | "Efetivar Empresa Conveniada" |
| "Rodar o cursor cr_empresa_neg" | "Resolver o Modelo de Negocio" |
| "Chamar fn_empresa_conveniada" | "Gerar Codigo da Empresa" |
| "Fazer substr do p_return" | "Consultar Resultado da Efetivacao" |

### Bounded Context (Contexto Delimitado)
> "Cada area do negocio tem suas proprias regras e vocabulario."

A procedure tem **18 areas** diferentes misturadas em 1 arquivo.
Na refatoracao, cada area vira um **package independente**.

### Aggregate (Agregado)
> "Um grupo de objetos que mudam juntos e protegem suas regras."

Exemplo: **Empresa Conveniada** e sua raiz. Quando criamos uma empresa,
SEMPRE criamos junto: unidade contratual, parametros, natureza, flags.
Nunca criamos uma unidade contratual "solta" sem empresa.

---

## Mapa de Contextos: Visao de Negocio

```
+-------------------------------------------------------------------+
|              DOMINIO: Gestao de Contratos PJ de Saude             |
|                                                                    |
|  CORE (Diferencial Competitivo = Investimento Alto)               |
|  +-----------------------------------------------------------+    |
|  | Efetivacao de Contrato     | Precificacao e Modelo Comerc. |   |
|  | (a "baixa" da empresa)     | (quanto cada empresa paga)    |   |
|  +-----------------------------------------------------------+    |
|  | Regulamentacao (ANS)       |                                |   |
|  | (coparticipacao + carencia)|                                |   |
|  +-----------------------------------------------------------+    |
|                                                                    |
|  SUPPORTING (Necessario, nao e diferencial = Investimento Medio)  |
|  +-----------------------------------------------------------+    |
|  | Cadastro PJ | Estrutura Comercial | Termos Contratuais    |   |
|  | (CNPJ)      | (filial, vendedor)   | (fidel., reembolso)  |   |
|  +-----------------------------------------------------------+    |
|  | Validacao de Proposta      | Integracao Odonto             |   |
|  +-----------------------------------------------------------+    |
|                                                                    |
|  GENERIC (Problema comum = Investimento Baixo, usar prateleira)   |
|  +-----------------------------------------------------------+    |
|  | Acesso/Portal | Auditoria/Log | Notificacao (e-mail)      |   |
|  +-----------------------------------------------------------+    |
+-------------------------------------------------------------------+
```

---

# PARTE 3: O QUE FOI FEITO (MODELAGEM)

---

## Artefatos Produzidos

| Artefato | Conteudo | Paginas |
|----------|----------|---------|
| **Modelagem DDD** | 18 BCs, 9 Aggregates, 30 Entities, 18 VOs, 15 Services, 21 Specifications, 20 Events, 9 Factories, 18 Repositories | 1.035 linhas |
| **Diagramas C4** | 7 diagramas PlantUML (Contexto, Container AS-IS, Container TO-BE, Componente, Landscape) | 7 arquivos |
| **Context Map** | Mapa de relacionamentos entre BCs (DSL + Visual) | 2 arquivos |
| **Fluxo de Execucao** | Diagrama sequencial completo | 1 arquivo |
| **Analise de Impacto** | Impacto na pr_efetiva_internet (2.290 linhas) | 665 linhas |
| **Proposta Contrato** | Redesign do contrato de retorno (TYPE RECORD) | 750 linhas |
| **Roadmap** | 4 fases de migracao com riscos e mitigacoes | 268 linhas |

**Total de documentacao produzida: ~2.700 linhas** de analise tecnica + diagramas.

---

## Os 18 Bounded Contexts Identificados

```
 #  | Bounded Context                | Tipo        | Package Alvo
----+--------------------------------+-------------+------------------------
 01 | Proposta e Orquestracao        | CORE        | pk_cadastramento_empresa
 02 | Validacao de Proposta          | SUPPORTING  | pk_validacao_proposta
 03 | Pessoa Juridica (CNPJ)         | SUPPORTING  | pk_pessoa_juridica
 04 | Endereco e Comunicacao         | SUPPORTING  | pk_endereco_comunicacao
 05 | Filial e Area de Venda         | SUPPORTING  | pk_filial_area_venda
 06 | Modelo de Negocio              | CORE        | pk_modelo_negocio
 07 | Precificacao (Tab. Preco)      | CORE        | pk_precificacao
 08 | Empresa Conveniada             | CORE        | pk_empresa_conveniada
 09 | Coparticipacao                 | CORE        | pk_coparticipacao
 10 | Carencia e Compra de Carencia  | CORE        | pk_carencia
 11 | Fidelizacao Contratual         | SUPPORTING  | pk_fidelizacao
 12 | Acesso Internet / Portal       | GENERIC     | pk_acesso_internet
 13 | Integracao Odontologica        | SUPPORTING  | pk_integracao_odonto
 14 | Auditoria e Log                | GENERIC     | pk_log_auditoria
 15 | Reembolso / Livre Escolha      | SUPPORTING  | pk_reembolso
 16 | Minimo Contratual / Breakeven  | SUPPORTING  | pk_minimo_contratual
 17 | Notificacao (E-mail)           | GENERIC     | pk_notificacao_email
 18 | Desconto e PIM                 | SUPPORTING  | pk_desconto_pim
```

---

## Os 9 Aggregates (Unidades de Consistencia)

```
 Aggregate               | Tabela Raiz                    | Filhos  | BC
--------------------------+--------------------------------+---------+-----
 EmpresaConveniada        | tb_empresa_conveniada          | 13      | 08
 PessoaJuridica           | tb_pessoa                      | 4       | 03
 TabelaPreco              | tb_preco_plano                 | 3       | 07
 Coparticipacao           | tb_controle_fator_empresa      | 7       | 09
 CompraCarencia           | tb_compra_carencia             | 3       | 10
 AcessoInternet           | tb_acesso_internet             | 2       | 12
 FidelizacaoEmpresa       | tb_fidelizacao_empresa         | 0       | 11
 ReembolsoEmpresa         | (virtual - 4 sub-tabelas)      | 4       | 15
 MinimoContratual         | tb_empresa_minimo_contratual   | 0       | 16
```

**Aggregate = grupo de dados que SEMPRE muda junto.**
Se voce cria uma Empresa Conveniada, SEMPRE cria junto a Unidade Contratual,
os Parametros, as Flags, o Historico, etc. Nunca separadamente.

---

## Fluxo de Dominio: A Jornada de uma Proposta

```
  [1] Proposta Recebida (nu_controle)
       |
  [2] Validar Proposta (21 regras)  --> Se invalida: PENDENCIA --> FIM
       |
  [3] Resolver Filial (vendedor -> area -> filial)
       |
  [4] Resolver Modelo de Negocio (filial + natureza + empregados)
       |
  [5] Gerar Codigo da Empresa (fn_empresa_conveniada)
       |                        ^
       |                        | Antes: gerava ANTES de validar (desperdicava codigos)
       |                        | Agora: gera SO APOS validar (DDD corrigiu a ordem)
       |
  [6] Criar/Atualizar Pessoa Juridica
       |
  [7] Criar Tabela de Preco
       |
  [8] Criar Empresa Conveniada  <-- ENTIDADE CENTRAL
       |
  [9] Configurar Coparticipacao
       |
  [10] Configurar Fidelizacao (se 30-99 vidas)
       |
  [11] Cadastrar Endereco + Meios de Comunicacao
       |
  [12] Configurar Carencia
       |
  [13] Configurar Reembolso (se livre escolha)
       |
  [14] Criar Acesso Internet (portal)
       |
  [15] Minimo Contratual (se parametrizado)
       |
  [16] COMMIT
       |
  [17] Enviar e-mail de boas-vindas
       |
  [18] Aplicar descontos PIM
       |
  [19] Espelhamento Odonto
       |
  CONTRATO ATIVO
```

---

## Decisao de Modelagem: Correcao da Ordem de Execucao

### Legado (codigo atual):

```
Linha ~240: Gerar codigo da empresa  <-- ANTES de validar!
Linha ~280: Iniciar validacoes
Linha ~960: Fim das validacoes
            Se falhou, a empresa ja consumiu um codigo da sequence
```

**Problema:** Se a proposta e invalida (ex: CNPJ bloqueado), o sistema
ja gastou um numero da sequence `fn_empresa_conveniada`.
Com o volume de propostas rejeitadas, temos **gaps** na numeracao.

### DDD (proposta):

```
Passo 2: Validar proposta (fail fast)
         Se invalida -> retorna imediatamente -> ZERO desperdicio
Passo 5: Gerar codigo SO APOS validar com sucesso
```

**Ganho:** Numeros sequenciais sem gaps, logica mais clara.

---

## Decisao de Modelagem: Strategy Pattern (SIGO vs BITIX)

O codigo atual tem **2 caminhos paralelos** quase identicos:

```
-- Cursor SIGO:
cursor cr_empresa_neg (filial, natureza, empregados)...

-- Cursor BITIX:
cursor cr_empresa_neg_bitix (filial, natureza, empregados)...
-- SAO IDENTICOS! Mesmas colunas, mesma logica.
```

**Decisao DDD:** Unificar via **Strategy Pattern**.

```
IOrigemPropostaStrategy
   |-- SigoStrategy    (resolve coligada via tb_empresa_coligada)
   |-- BitixStrategy   (resolve coligada via tb_empresa_coligada_bitx)
```

**Ganho:** Elimina duplicacao; futuras origens (ex: app mobile) entram como nova Strategy.

---

## Redesign do Contrato de Retorno

### De (fragil):

```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2  -- <-- sucesso E erro no mesmo campo
);
-- Retorno sucesso: 'procedimento efetuado para empresa ,A1234'
-- Retorno erro:    'ORA-06502: PL/SQL: numeric or value error'
-- Retorno parcial: 'procedimento efetuado para empresa,A1234' (sem espaco!)
-- Retorno nulo:    NULL (apos pendencia)
```

### Para (seguro):

```sql
TYPE t_resultado_efetivacao IS RECORD (
    fl_status           VARCHAR2(1),      -- 'S'=Sucesso, 'E'=Erro, 'P'=Parcial
    cd_empresa          VARCHAR2(7),       -- Codigo direto, sem parsing
    ds_mensagem         VARCHAR2(2000),    -- Mensagem legivel
    ds_etapa_erro       VARCHAR2(30),      -- ONDE falhou (ex: 'COPARTICIPACAO')
    cd_sqlcode          NUMBER,            -- Codigo Oracle do erro
    ds_sqlerrm          VARCHAR2(4000)     -- Mensagem Oracle do erro
);
```

### Impacto: Zero na Fase 1 (Adapter mantido)

---

# PARTE 4: COMO SERA FEITO (ROADMAP)

---

## Estrategia: Strangler Fig Pattern

```
  Fase 0 (Atual):     |################################| 5.000 linhas
                       |    TUDO em 1 procedure         |

  Fase 1 (Quick Wins): |################################| ~4.500 linhas
                       | -360 linhas de log repetido    |
                       | Cursors unificados             |
                       | Risco: MINIMO                  |

  Fase 2 (Packages):  |###|###|###|###|###|###|###|###| 18 packages
                       | Cada BC vira um package         |
                       | Procedure vira orquestrador      |
                       | Risco: MEDIO                     |

  Fase 3 (Orquestr.):  |##|                              ~200 linhas
                       | Procedure limpa, so orquestra    |
                       | Novo contrato de retorno         |
                       | Risco: ALTO (muda interface)     |

  Fase 4 (Cloud):      Microservicos .NET + Azure
                       | Saga via Azure Durable Functions |
                       | Service Bus para eventos         |
                       | Risco: ALTO (nova stack)         |
```

**Principio:** A cada fase, o sistema continua funcionando.
Nunca "desligamos tudo para refazer".

---

## Fase 1: Quick Wins (Semanas)

**Objetivo:** Reduzir ruido sem mudar comportamento.

| Acao | Linhas eliminadas | Risco |
|------|------------------:|-------|
| Extrair log generico (pk_log_auditoria) | ~360 | Minimo |
| Unificar cursors cr_empresa_neg | ~150 | Minimo |
| Extrair validacoes puras (pk_validacao_proposta) | ~300 | Baixo |

**Impacto nos chamadores:** ZERO  
**Testes necessarios:** Regressao simples (mesmo comportamento)

---

## Fase 2: Packages por BC (Meses)

**Objetivo:** Separar responsabilidades em packages independentes.

| Prioridade | Package | BC | Complexidade |
|------------|---------|-----|-------------|
| P0 | pk_log_auditoria | BC-14 | Baixa |
| P0 | pk_validacao_proposta | BC-02 | Baixa |
| P1 | pk_filial_area_venda | BC-05 | Baixa |
| P1 | pk_pessoa_juridica | BC-03 | Media |
| P2 | pk_modelo_negocio | BC-06 | Media |
| P2 | pk_precificacao | BC-07 | Alta |
| P3 | pk_empresa_conveniada | BC-08 | Alta |
| P3 | pk_coparticipacao | BC-09 | Alta |
| P4 | Demais 8 packages | Outros | Variada |
| P5 | pk_cadastramento_empresa (orquestrador) | BC-01 | Alta |

**Resultado:** Procedure de 5.000 linhas vira orquestrador de ~200 linhas.

---

## Fase 3: Orquestrador Limpo (Meses)

**A procedure final sera assim:**

```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_resultado     OUT pk_efetivacao_types.t_resultado_efetivacao
) AS
    v_ctx pk_cadastramento_empresa.t_contexto_cadastro;
BEGIN
    v_ctx := pk_cadastramento_empresa.fn_inicializa_contexto(p_nu_controle);
    pk_validacao_proposta.pr_valida_completa(v_ctx);
    pk_filial_area_venda.pr_resolve_filial(v_ctx);
    pk_modelo_negocio.pr_resolve_parametros(v_ctx);
    pk_pessoa_juridica.pr_cria_ou_atualiza(v_ctx);
    pk_precificacao.pr_cria_tabelas_preco(v_ctx);
    pk_empresa_conveniada.pr_cria_empresa(v_ctx);
    pk_coparticipacao.pr_configura(v_ctx);
    pk_carencia.pr_configura(v_ctx);
    pk_endereco_comunicacao.pr_cadastra(v_ctx);
    pk_acesso_internet.pr_configura(v_ctx);
    pk_fidelizacao.pr_configura(v_ctx);
    pk_reembolso.pr_configura(v_ctx);
    pk_minimo_contratual.pr_configura(v_ctx);
    COMMIT;
    pk_notificacao_email.pr_envia_efetivacao(v_ctx);
    pk_desconto_pim.pr_aplica_desconto(v_ctx);
    pk_integracao_odonto.pr_integra(v_ctx);
    p_resultado := pk_efetivacao_types.sucesso(v_ctx);
EXCEPTION
    WHEN OTHERS THEN
        pk_cadastramento_empresa.pr_trata_erro(v_ctx, p_resultado);
END;
```

**De 5.000 linhas para ~30 linhas legiveis.**
Qualquer desenvolvedor novo entende o fluxo em 5 minutos.

---

## Fase 4: Cloud / Azure (Trimestres)

| Camada | Tecnologia |
|--------|-----------|
| API Gateway | Azure API Management |
| Microservicos | ASP.NET Core 8 |
| Orquestracao | Azure Durable Functions (Saga Pattern) |
| Mensageria | Azure Service Bus (Domain Events) |
| Banco de dados | Azure SQL Database (per Service) |
| Observabilidade | Azure Application Insights |
| Autenticacao | Microsoft Entra ID |
| CI/CD | Azure DevOps Pipelines |

---

# PARTE 5: IMPACTO NO NEGOCIO

---

## Beneficios por Stakeholder

### Para o Desenvolvedor:
| Antes | Depois |
|-------|--------|
| 5.000 linhas para entender | 18 packages independentes |
| Debug cego | Cada package testavel isoladamente |
| Medo de mexer | Mudanca segura e localizada |
| Semanas de onboarding | Horas de onboarding por package |

### Para o PO / Negocio:
| Antes | Depois |
|-------|--------|
| "Leva 2 semanas" | "Leva 2 dias (e so nesse package)" |
| "Nao sei o impacto" | "Impacto isolado no BC-09 (Coparticipacao)" |
| Bugs cascata | Falha localizada e diagnosticavel |
| Sem metricas | Rastreabilidade por etapa (ds_etapa_erro) |

### Para o Gerente de TI:
| Antes | Depois |
|-------|--------|
| 1 pessoa entende tudo | Equipe inteira pode contribuir |
| Risco operacional alto | Risco distribuido por package |
| Impossivel modernizar | Caminho claro ate a cloud |
| Custo crescente de manutencao | Custo decrescente com cada fase |

---

## Metricas de Sucesso

| Indicador | Baseline (Hoje) | Meta Fase 2 | Meta Fase 4 |
|-----------|-----------------|-------------|-------------|
| Tempo de onboarding | ~3 semanas | ~3 dias | ~1 dia |
| Tempo para fix simples | ~5 dias | ~1 dia | ~4 horas |
| Cobertura de testes | 0% | 60% | 90%+ |
| Tempo de deploy | Manual | Semi-automatico | CI/CD completo |
| Incidentes por mudanca | Alto (nao medido) | -50% | -90% |
| Linhas na procedure | 4.991 | ~200 | 0 (microservicos) |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Regressao funcional | Media | Alto | Testes de regressao antes de cada fase |
| Mudanca no boundary transacional | Baixa | Alto | COMMIT interno mantido ate Fase 3 |
| Resistencia do time | Media | Medio | Treinamento DDD + Quick Wins visiveis |
| Escopo crescente | Alta | Medio | Cada fase e entregavel independente |
| Dependencia da pr_efetiva_internet | Baixa | Alto | Adapter pattern na Fase 1 |

---

## Cronograma Macro

```
          Q1 2026        Q2 2026         Q3 2026       Q4 2026       2027+
         +-----------+  +------------+  +-----------+ +-----------+ +------+
Fase 1:  |##  Quick  |  |            |  |           | |           | |      |
         |## Wins    |  |            |  |           | |           | |      |
         +-----------+  +------------+  +-----------+ +-----------+ +------+
                        |## Packages |  |           | |           | |      |
Fase 2:                 |##   DDD    |  |## Contin. | |           | |      |
                        +------------+  +-----------+ +-----------+ +------+
                                                      |## Orques- | |      |
Fase 3:                                               |## trador  | |      |
                                                      +-----------+ +------+
                                                                    |Cloud |
Fase 4:                                                             |Azure |
                                                                    +------+
```

---

# FIM DA APRESENTACAO

## Material de Referencia

| Documento | Caminho |
|-----------|---------|
| Modelagem DDD completa | `docs/refatoracao/pr_cadastramento_empresa_prov/ddd-modelagem-dominio.md` |
| Diagramas C4 | `docs/refatoracao/pr_cadastramento_empresa_prov/c4-model/` |
| Context Map | `docs/refatoracao/pr_cadastramento_empresa_prov/context-map-*.puml` |
| Analise de Impacto | `docs/refatoracao/pr_efetiva_internet/analise-impacto-pr-efetiva-internet.md` |
| Proposta Novo Contrato | `docs/refatoracao/pr_efetiva_internet/proposta-novo-contrato-retorno.md` |
| Roadmap | `docs/refatoracao/pr_cadastramento_empresa_prov/README-refatoracao.md` |

---

*Apresentacao preparada em: Fevereiro 2026*
*Autor: Time de Arquitetura*
*Projeto: Refatoracao DDD -- pr_cadastramento_empresa_prov*
