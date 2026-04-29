# Decisoes de Design -- SIGO Refatoracao

> Atualizado em: 24/04/2026
> Fonte: Agentes DDD -- PR_EFETIVA_INTERNET + PK_VENDA_JSON + PR_CADASTRAMENTO_EMPRESA_PROV

Decisoes arquiteturais e de modelagem tomadas durante o processo de refatoracao.
Registrar aqui para evitar reabrir debates ja resolvidos.

---

## DD-CAD-01 -- Decomposicao em 12 packages por Bounded Context

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** Procedure monolitica de 5.025 linhas com 16 fases e 23 RNs distintas -- impossivel manter, testar ou evoluir.
**Decisao:** Decompor em 12 packages PL/SQL: pk_cad_orquestrador (Application Layer) + 11 packages de dominio alinhados aos Bounded Contexts BC-CAD-02..12. Interface publica mantida: mesmos parametros p_nu_controle/p_erro_controle.
**Alternativas consideradas:** Extrair por fases (descartado: fases nao refletem limite de dominio); package unico grande refatorado (descartado: nao elimina o acoplamento).
**Status:** [-] Pendente de implementacao.
**Referencia:** [ADR-74] ddd-modelagem-dominio.md DD-CAD-01.

---

## DD-CAD-02 -- TYPE RECORD t_contexto_cadastramento para context passing

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** 12 packages precisam compartilhar estado (nu_controle, lcd_empresa, canal, flags ANS etc.) sem uso de variaveis globais de package.
**Decisao:** Criar TYPE RECORD t_contexto_cadastramento no package orquestrador, passado IN OUT para todos os packages de dominio. Elimina estado global.
**Alternativas consideradas:** Variaveis globais (descartado: risco de corrupcao em sessoes concorrentes); parametros individuais (descartado: assinatura explosiva).
**Status:** [-] Pendente de implementacao.
**[ADR-AUSENTE]:** Nao existe ADR para padrao TYPE RECORD de contexto em PL/SQL. Sugerir criacao de ADR antes de implementar.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-02.

---

## DD-CAD-03 -- Manter interface publica -- Strangler Fig Fase 2

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** 5 rotinas chamadoras (PR_EFETIVA_INTERNET, PK_PIM, PR_BAIXA_EMPRESA_COLIGADA, PR_BAIXA_EMP_COLIGADA_SAUDE, PR_EFETIVA_BAIXA_COLIGADA) dependem da interface atual.
**Decisao:** pk_cad_orquestrador expoe os mesmos parametros p_nu_controle e p_erro_controle da procedure original. Chamadores nao precisam ser alterados na Fase 2.
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-03, [ADR-74].

---

## DD-CAD-04 -- Corrigir mascaramento de erro (p_erro_controle = NULL)

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** Handler WHEN OTHERS atribui p_erro_controle = NULL ao inves de SQLERRM, mascarando a origem de qualquer excecao.
**Decisao:** pk_log_auditoria sempre atribui SQLERRM ao p_erro_controle. NULL e reservado para sucesso. Log estruturado em tb_log_baixa_controle com SQLERRM + DBMS_UTILITY.FORMAT_ERROR_BACKTRACE.
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-04, reversa S04 [CRITICO].

---

## DD-CAD-05 -- Senha segura (aleatorio) em substituicao a senha deterministica

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** Senha de acesso gerada como SUBSTR(lcd_pessoa, 2, 6) -- totalmente deterministica e previsivel. Risco de seguranca critico [CRITICO].
**Decisao:** pk_cad_acesso_internet gera senha via DBMS_RANDOM.STRING com complexidade minima (maiuscula + minuscula + numerico + especial). Senha enviada ao titular por canal seguro (sem incluir no corpo do email de boas-vindas junto com CNPJ).
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-05.

---

## DD-CAD-06 -- Remover dados sensiveis do corpo do email de boas-vindas

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** Email de boas-vindas atual inclui CNPJ + senha em plaintext no corpo [CRITICO]. Violacao de privacidade e seguranca.
**Decisao:** pk_notificacao remove CNPJ e senha do corpo do email. Substitui por link de primeiro acesso com token de uso unico (TTL 24h). Dados de acesso entregues por canal separado (SMS ou portal seguro).
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-06.

---

## DD-CAD-07 -- Eliminar WHEN OTHERS THEN NULL em todos os blocos

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** ~80 blocos WHEN OTHERS THEN NULL ao longo de 5.025 linhas mascaram silenciosamente erros de INSERT, UPDATE e chamadas de procedure.
**Decisao:** Todos os blocos de excecao devem: (1) logar SQLERRM + contexto em tb_log_baixa_controle; (2) propagar ou retornar codigo de erro explicito para o orquestrador decidir ROLLBACK. WHEN OTHERS THEN NULL e proibido na arquitetura refatorada.
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-07.

---

## DD-CAD-08 -- Substituir MAX(cd_empresa)+1 por SEQUENCE Oracle

**Data:** 21/04/2026
**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Contexto:** Geracao de cd_empresa via MAX(cd_empresa)+1 e race condition classica -- insegura em concorrencia.
**Decisao:** Criar SEQUENCE sq_cd_empresa (ou reutilizar existente). pk_cad_empresa_conveniada usa sq_cd_empresa.NEXTVAL. Eliminacao da vulnerabilidade de duplicidade de chave em processamento paralelo.
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md DD-CAD-08.

---

## DD-01 -- Contrato tipado para pr_cadastramento_empresa_prov

**Data:** 17/04/2026 (criacao) | **Atualizacao:** 24/04/2026 (alinhamento ao contrato canonico da modelagem em execucao)
**Contexto:** RN-T01 -- Parsing fragil via substr/instr em `w_erro/p_erro_controle` OUT VARCHAR2 (`'procedimento efetuado para empresa,' || cd_empresa`). 4 chamadores afetados (TAFFIX, BITIX, EI, VJ).

**Decisao canonica (Opcao D Hibrida):** adotada pela modelagem em execucao de `pr_cadastramento_empresa_prov` em `output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/pr_cadastramento_empresa_prov/ESTRATEGIA-REFATORACAO-PLSQL.md` e `apresentacao/APRESENTACAO-REFATORACAO-DDD.md`.

- **Fase 1-2 (packages + orquestrador interno):** a assinatura publica permanece `(p_nu_controle IN NUMBER, p_erro_controle OUT VARCHAR2)` -- retrocompatibilidade total com TAFFIX, BITIX, EI, VJ. Internamente, o novo package `pk_cadastramento_empresa` orquestra 18 packages via `t_contexto_cadastro IN OUT` (RECORD compartilhado).
- **Fase 3 (PL/SQL to-be canonico):** nova assinatura `(p_nu_controle IN NUMBER, p_resultado OUT pk_efetivacao_types.t_resultado_efetivacao)`. A procedure legado permanece como **Adapter/Facade**, chamando a nova e traduzindo o RECORD para a string legado. Chamadores migram gradualmente.
- **Fase 4 (microsservico):** API REST com DTO JSON / CommandHandler `Result<CdEmpresa>` via Azure Durable Functions (Saga Pattern).

**Contrato canonico `t_resultado_efetivacao` (Fase 3):**

```sql
TYPE t_resultado_efetivacao IS RECORD (
    fl_status      VARCHAR2(1),      -- 'S'=Sucesso, 'E'=Erro, 'P'=Parcial
    cd_empresa     VARCHAR2(7),      -- codigo direto, sem parsing
    ds_mensagem    VARCHAR2(2000),
    ds_etapa_erro  VARCHAR2(30),     -- ONDE falhou ('COPARTICIPACAO', 'PRECIFICACAO', ...)
    cd_sqlcode     NUMBER,
    ds_sqlerrm     VARCHAR2(4000)
);
```

**Alternativas consideradas e descartadas:**
- (A) TYPE RECORD puro -- quebra os 4 chamadores simultaneamente; rejeitado.
- (B) Multiplos parametros OUT (`p_cd_empresa, p_status, p_mensagem`) -- proposta original do EI; rejeitada por poluir assinatura e ainda quebrar chamadores. **Esta e a proposta que EI e VJ originalmente documentaram e que foi SUPERSEDED por esta DD-01 atualizada.**
- (C) Overload PL/SQL -- nao funciona em procedure standalone; rejeitado.
- Manter parsing + documentar -- risco critico de falha silenciosa; rejeitado.

**Impacto nos consumidores:**
- **EI (PR_EFETIVA_INTERNET)**: DS03 EfetivacaoEmpresaService + MIG-09 atualizados. Parsing `substr(p_return, instr(p_return, ',') + 1)` permanece ate Fase 3 entrar em producao.
- **VJ (PK_VENDA_JSON x3 call sites: pr_efetiva, pr_efetiva_pme, pr_efetiva_coligada)**: Decisao de Design + MIG-VJ-10 atualizados. Mesmo parsing permanece ate Fase 3.
- **TAFFIX / BITIX**: zero impacto nas Fases 1-2; migracao opcional apos Fase 3.

**Status:** [EM-CURSO] Fase 1-2 em andamento na sprint de refatoracao de pr_cadastramento_empresa_prov. Fase 3 (RECORD canonico) no backlog PL/SQL daquela rotina.

**Referencia:**
- `output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/pr_cadastramento_empresa_prov/ESTRATEGIA-REFATORACAO-PLSQL.md`
- `output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/pr_cadastramento_empresa_prov/apresentacao/APRESENTACAO-REFATORACAO-DDD.md`
- `output/rotinas/pr_cadastramento_empresa_prov/modelagem-em-execucao/pr_cadastramento_empresa_prov/c4-model/c4-3-component-orquestrador.puml`
- RN-T01 em `catalogo-regras-negocio.md`
- Conflito 5 RESOLVIDO em `_shared/analise-comparativa-ddd-ei-vj.md`

---

## DD-05 -- VJ (PK_VENDA_JSON) deve ser completamente desacoplado de EI (PR_EFETIVA_INTERNET)

**Data:** 24/04/2026
**Escopo:** PK_VENDA_JSON + PR_EFETIVA_INTERNET
**Contexto:** No AS-IS, PR_EFETIVA_INTERNET e o unico acionador de PK_VENDA_JSON.pr_efetiva em producao (linhas 2267-2275 do CVS EI). VJ nao tem scheduler proprio -- depende do EI para executar. Isso cria acoplamento de ciclo de vida: EI e VJ nao podem ser deployados, escalados ou mantidos de forma independente.
**Decisao:** [OK] DECIDIDO PELO USUARIO (24/04/2026) -- VJ deve ser TOTALMENTE desacoplado de EI. A chamada direta EI->VJ e REJEITADA para o TO-BE. VJ deve ter seu proprio scheduler (DBMS_JOB/DBMS_SCHEDULER no PL/SQL to-be; Azure Function Timer Trigger no microsservico), sem nenhuma dependencia de execucao de PR_EFETIVA_INTERNET.
**Alternativas rejeitadas:** Opcao (a) -- manter chamada direta EI->VJ -- DESCARTADA. Opcao (c) -- evento de dominio ADR-02 -- DESCARTADA: VJ nao precisa de evento para disparar, scheduler proprio e suficiente.
**Impacto:** PR_EFETIVA_INTERNET to-be nao deve conter nenhuma chamada a PK_VENDA_JSON. O bloco COLIGADA_EMPRESA_BITIX (linhas 2267-2275 do CVS EI) deve ser removido na refatoracao.
**Ordem de implementacao:** [CRITICO] O scheduler de PK_VENDA_JSON.pr_efetiva (DBMS_JOB/DBMS_SCHEDULER) deve ser criado e validado em producao ANTES do deploy do EI refatorado. O EI eh atualmente o unico acionador do VJ -- remover o bloco sem scheduler ativo interrompe o processamento BITIX em producao. Esta task pertence a sprint de refatoracao do EI, nao a sprint do VJ. [REF A9 -- pendencias-abertas.md]
**Status:** [OK] Decisao completa -- VJ com scheduler proprio. Implementar na sprint de refatoracao do EI.
**Referencia:** Conflito 10 -- _shared/analise-comparativa-ddd-ei-vj.md; pendencia A8 -- pendencias-abertas.md; A-TO-BE-01 -- ddd-modelagem-dominio.md (EI).

---

## DD-02 -- Separar ACL BITIX do dominio de efetivacao

**Data:** 17/04/2026
**Contexto:** PK_VENDA_JSON mistura integracao JSON (ACL) com logica de efetivacao de dominio.
**Decisao:** Criar BITIXAdapterService (ACL: deserializar, persistir staging, retornar resposta) separado de EfetivacaoService (dominio: efetivar empresa + beneficiarios).
**Alternativas consideradas:** Manter no mesmo package (descartado: viola SRP e impossibilita reuso da logica de efetivacao por outros canais).
**Impacto:** EfetivacaoService pode ser compartilhado com PR_EFETIVA_INTERNET, eliminando duplicacao entre canais.
**Status:** [-] Pendente de implementacao.
**Referencia:** ddd-modelagem-dominio.md PK_VENDA_JSON secao 8 (ACL).

---

## DD-03 -- Rotina central unica de efetivacao (eliminar codigo triplicado)

**Data:** 17/04/2026
**Contexto:** PK_VENDA_JSON tem tres rotinas com ~85% de codigo identico: pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp.
**Decisao:** Extrair pr_efetiva_core(p_nu_controle, p_origem, p_modo) como rotina privada central. As tres rotinas publicas se tornam fachadas que chamam pr_efetiva_core com os parametros corretos.
**Alternativas consideradas:** Manter as tres (descartado: qualquer bug precisa de 3 correcoes; historico de divergencias entre as versoes).
**Impacto:** Reduzir de ~1.600 linhas triplicadas para ~600 linhas na rotina central + ~30 linhas por fachada.
**Status:** [-] Pendente de implementacao.
**Referencia:** reversa-pk-venda-json.md S02, S07.

---

## DD-04 -- Separar fn_get_criticas_pendencias (CQS)

**Data:** 17/04/2026
**Contexto:** fn_get_criticas_pendencias executa UPDATE fl_status=9 como efeito colateral (violacao de CQS).
**Decisao:** Separar em: (a) fn_get_criticas_pendencias (funcao: apenas leitura, retorna count) + (b) pr_aplicar_status_erro(p_nu_controle) (procedure: aplica UPDATE fl_status=9 quando necessario).
**Alternativas consideradas:** Adicionar flag p_aplicar_status IN BOOLEAN DEFAULT FALSE (descartado: ainda viola CQS semanticamente).
**Impacto:** Todos os chamadores precisam decidir explicitamente se querem aplicar o status de erro.
**Status:** [-] Pendente de implementacao.
**Referencia:** RN-T02, catalogo-regras-negocio.md DD-04.

---

## DD-05 -- Eliminar estado global de package (variaveis de spec)

**Data:** 17/04/2026
**Contexto:** 15 variaveis globais declaradas na spec de PK_VENDA_JSON sao compartilhadas entre chamadas. Risco critico de corrupcao em sessoes concorrentes.
**Decisao:** Converter todas as variaveis globais para variaveis locais das procedures que as utilizam. Passar por parametro entre rotinas privadas quando necessario.
**Alternativas consideradas:** Context variable Oracle (descartado: complexidade sem ganho; variaveis locais sao suficientes).
**Impacto:** Refatoracao interna do package sem alteracao de interface publica.
**Status:** [-] Pendente de implementacao.
**Referencia:** reversa-pk-venda-json.md S04.

---

## DD-06 -- Bounded Contexts de PR_EFETIVA_INTERNET como referencia canonica

**Data:** 17/04/2026
**Contexto:** BC-EI-01 a BC-EI-14 definidos no DDD de PR_EFETIVA_INTERNET cobrem a maioria dos subdominios do fluxo de efetivacao das origens WEBHAP/TAFFIX. PK_VENDA_JSON introduce novos contextos especificos da origem BITIX (BC-VJ-01 a BC-VJ-10).
**Decisao:** Manter BCs separados por rotina mas referenciar via [REF] quando um BC de PK_VENDA_JSON e extensao de um BC de PR_EFETIVA_INTERNET (ex: BC-EI-14 -> BC-VJ-01).
**Alternativas consideradas:** Mapa global unificado (adiado para apos analise de todas as rotinas).
**Status:** [OK] Aplicado no ddd-modelagem-dominio.md de PK_VENDA_JSON.

---

## DD-07 -- Nomes de Domain Events em ingles (ADR-18)

**Data:** 17/04/2026
**Contexto:** ADR-18 exige que todo payload e nome de topico de broker seja em ingles, padrao `hap-{context}-{nome-topico}` (kebab-case, passado). Os Domain Events de PR_EFETIVA_INTERNET estao documentados em portugues.
**Decisao:** Manter documentacao em portugues para legibilidade do dominio (conforme ADR-21: business terms em portugues). Adicionar coluna "Topico ADR-18 (EN)" na tabela de Domain Events com os nomes de topico em ingles para uso na implementacao do microsservico.
**Alternativas consideradas:** Renomear tudo para ingles (descartado: perde legibilidade para equipe de negocio em contexto legado).
**ADR de Referencia:** [REF ADR-18 -- Mensageria] [REF ADR-21 -- Linguagem Onipresente]
**Impacto:** Todos os 14 eventos de PR_EFETIVA_INTERNET tem topicos ADR-18 definidos na Secao 5 do ddd-modelagem-dominio.md. Broker recomendado: Azure Service Bus para eventos criticos (DE05/06/08/09), RabbitMQ para DE13. **Atualizacao 24/04/2026:** Aplicado tambem a PK_VENDA_JSON (Secao 5 reprojetada) -- 14 eventos DE-VJ-01..14, contexto `hap-ins-bitix-{evento}`, publisher/subscribers BC-VJ-XX, payload camelCase EN. Broker recomendado: Azure Service Bus para eventos criticos (DE-VJ-01/02/03/04/05/08/13), RabbitMQ para auxiliares (DE-VJ-07/09/10). [REF Conflito 4 -- _shared/analise-comparativa-ddd-ei-vj.md]
**Status:** [OK] Aplicado na revisao de 17/04/2026. Estendido a PK_VENDA_JSON em 24/04/2026.

---

## DD-08 -- Repositorios: interface no dominio, implementacao na infraestrutura (ADR-22)

**Data:** 17/04/2026
**Contexto:** ADR-22 exige que repositorios sejam interfaces abstratas no dominio, com implementacoes na camada de infraestrutura, garantindo agnosticismo de banco de dados.
**Decisao:** Separar explicitamente interface de repositorio (dominio) de implementacao (infra). Em PL/SQL to-be: SPEC do package = interface, BODY = implementacao. Na migracao para microsservico: interfaces IRepository no dominio, implementacoes EF Core/Dapper na infra.
**ADR de Referencia:** [REF ADR-22 -- Padrao Repositorio]
**Impacto:** Todos os 18 repositorios de PR_EFETIVA_INTERNET documentados na Secao 6 do ddd-modelagem-dominio.md. Nota de [ADR-AUSENTE] para CQRS (ADR-03): operacoes read/write ainda misturadas -- lacuna a enderecar.
**Status:** [OK] Nota adicionada no ddd-modelagem-dominio.md. Implementacao pendente.

---

## DD-09 -- [ADR-AUSENTE] CQRS para repositorios PL/SQL

**Data:** 17/04/2026
**Contexto:** ADR-03 exige segregacao Command/Query (CQRS): comandos nao tem retorno; queries retornam projections/DTOs. Os repositorios de PR_EFETIVA_INTERNET misturam operacoes de leitura (find*, contar*) e escrita (inserir, atualizar). A ADR-03 nao cobre explicitamente PL/SQL.
**Decisao:** Registrar como [ADR-AUSENTE]. Para a refatoracao PL/SQL to-be: continuar com repositorios unificados mas documentar a separacao logica (procedures vs functions). Para o microsservico futuro: separar em ReadRepository (QueryService, retorna projections) e WriteRepository (persiste agregados), conforme ADR-03.
**ADR de Referencia:** [ADR-AUSENTE] -- Propor criacao de ADR para contratos de API PL/SQL / CQRS em contexto legado.
**Status:** [ATENCAO] Lacuna de ADR identificada. Necessario criar ADR cobrindo CQRS em contexto PL/SQL legado antes da implementacao do to-be.

---

## DD-10 -- Pontos de migracao futura (MIG-01..MIG-15) para PR_EFETIVA_INTERNET

**Data:** 17/04/2026
**Contexto:** CLAUDE.md exige que cada refatoracao prepare o modelo para migracao futura para microsservico, sinalizando com [MIGRACAO].
**Decisao:** Documentar 15 pontos de atencao de migracao (MIG-01..MIG-15) na Secao 13 do ddd-modelagem-dominio.md. Cada ponto mapeia padrao Oracle legado para equivalente em microsservico C#/.NET8.
**ADR de Referencia:** [REF ADR-01] [REF ADR-02] [REF ADR-03] [REF ADR-05] [REF ADR-16] [REF ADR-17] [REF ADR-22] [REF ADR-74]
**Principais pontos:** CURSOR->paginacao EF Core (MIG-01), BULK COLLECT->BulkUpdate (MIG-02), fn_registro_sistema->Azure App Config (MIG-03), DBMS_JOB->Azure Function Timer Trigger (MIG-04), COMMIT parcial->Unit of Work (MIG-05), MAX+1->ULID (MIG-06), Domain Events->Service Bus/RabbitMQ (MIG-07).
**Status:** [OK] Secao 13 adicionada no ddd-modelagem-dominio.md em 17/04/2026.

---

## DD-11 -- Taxonomia de proposta: TIPO (Produto) vs ORIGEM (Ferramenta de Venda)

**Data:** 24/04/2026
**Escopo:** Projeto inteiro (dicionarios, DDDs, C4, analise comparativa, decisoes futuras)
**Contexto:** Uso inicial incorreto de "canal PIM vs canal BITIX" como dicotomia. Esclarecimento do PO identificou que PIM, PME, Individual e Odonto sao TIPOS (produtos/porte da proposta) e BITIX, WEBHAP, TAFFIX sao ORIGENS (ferramentas de venda onde a proposta foi digitada). As duas dimensoes sao ortogonais: uma proposta PIM pode vir de WEBHAP ou BITIX; uma proposta PME idem.
**Decisao:**
1. Estabelecer duas dimensoes ortogonais em toda a documentacao: **TIPO/PRODUTO** (PIM=SS, PME, Individual, Odonto) x **ORIGEM/FERRAMENTA** (BITIX, WEBHAP, TAFFIX).
2. Valores confirmados de `cd_operados`: BITIX='BITIX', WEBHAP='WEBHAP', TAFFIX='PONTO'.
3. A ESCOLHA DA ROTINA DE EFETIVACAO e determinada pela ORIGEM, nao pelo TIPO: PK_VENDA_JSON efetiva propostas de origem BITIX; PR_EFETIVA_INTERNET efetiva propostas das demais origens (WEBHAP, TAFFIX/PONTO, etc.).
4. Proibir o uso de expressoes "canal PIM" ou "canal BITIX" em artefatos novos. Usar "origem X" ou "tipo Y".
5. TAFFIX nao e o mesmo que WEBHAP: TAFFIX e ferramenta usada por Administradoras de Beneficios e gera contratos por adesao (`cd_operados='PONTO'`).
**Alternativas consideradas:** Manter "canal" como guarda-chuva para ambas dimensoes (descartado: gerou modelagem errada em Conflito 1 e BC-EI-14).
**ADR de Referencia:** [REF ADR-21 -- Linguagem Onipresente]
**Impacto:** Atualizados `_shared/dicionario-siglas.md` (nova secao 2), `_shared/dicionario-dominio.md` (bloco [CONCEITO] + entradas Origem BITIX/WEBHAP/TAFFIX e Tipo PIM/PME), `_shared/analise-comparativa-ddd-ei-vj.md` (Conflito 1 rebaixado de CRITICO para MEDIA; Conflito 2 rebaixado para BAIXA), DDDs EI e VJ, C4 de sistema context, `catalogo-objetos-plsql.md`, `catalogo-tabelas.md`. A10 e A11 criadas em `pendencias-abertas.md` (A10 RESOLVIDA; A11 requer inventario de demais origens em producao).
**Status:** [OK] Aplicado em 24/04/2026.

---

## DD-12 -- Retroalimentacao continua da base de conhecimento (Regra Meta)

**Data:** 24/04/2026
**Escopo:** Processo de trabalho -- todos os agentes
**Contexto:** Durante a sessao de refinamento EI/VJ, o usuario trouxe sucessivas regras de negocio (scheduler proprio VJ, remocao de BITIX do EI, taxonomia Tipo vs Origem, produtores disjuntos de fl_status=17) que precisaram ser propagadas para diversos artefatos. Identificou-se risco de perda de contexto se o agente nao retroalimentar a base imediatamente.
**Decisao:** Sempre que uma nova regra/orientacao for trazida pelo usuario e impactar decisoes ou documentacao ja criada, o agente DEVE antes de encerrar a interacao:
1. Consolidar a regra no catalogo apropriado (regras, decisoes, padroes, pendencias) ou no dicionario.
2. Propagar para todos os artefatos afetados (DDDs, C4, fluxos, analises).
3. Atualizar `indice.md` com data da retroalimentacao.
4. Registrar resolucao em `pendencias-abertas.md` quando aplicavel.
**Impacto:** Esta regra esta registrada em `indice.md` (secao "REGRA META") e em `CLAUDE.md` (secao de Principios Universais).
**Status:** [OK] Aplicado em 24/04/2026.
