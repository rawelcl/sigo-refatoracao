# ??? Roadmap de Refatoração DDD - pr_cadastramento_empresa_prov

## ?? Visão Geral

| Métrica | Valor |
|---------|-------|
| **Linhas atuais** | ~5.000 |
| **Bounded Contexts** | 18 |
| **Tabelas afetadas** | 30+ |
| **Canais de entrada** | TAFFIX (Oracle Forms) e BITIX (Ferramenta de Vendas) |
| **Boilerplate repetido** | ~30 blocos de log (12 linhas cada = 360 linhas) |
| **Cursors duplicados** | 2 (cr_empresa_neg e cr_empresa_neg_bitix são idênticos) |
| **Variáveis declaradas** | 70+ |

> **Nota:** O vendedor/corretor cadastra propostas tanto pelo **TAFFIX** (tela interna Oracle Forms)
> quanto pelo **BITIX** (plataforma de vendas). Ambos os canais gravam na mesma tabela
> `tb_empresa_internet`, que é processada pela procedure `pr_cadastramento_empresa_prov`.
> Na lógica interna, o BITIX possui um caminho de parâmetros diferenciado (cursor
> `cr_empresa_neg_bitix` e resolução de coligadas BITIX).

---

## ?? Fase 1 - Quick Wins (PL/SQL - Sem mudança de arquitetura)

### 1.1 Extrair Log Genérico
**Impacto: Elimina ~360 linhas de boilerplate**

```sql
-- ANTES (repetido 30+ vezes):
if nvl(wnu_controle_odonto, 0) > 0 then
  wsql := substr(sqlerrm, 1, 500);
  begin
    select max(nvl(cb.cd_log, 0)) + 1 into wcd_log from humaster.tb_log_baixa_controle cb;
    insert into humaster.tb_log_baixa_controle (cd_log, nu_controle, ds_observacao, fl_status)
    values (wcd_log, st_e.nu_controle, 'mensagem aqui', '15');
  exception when others then null;
  end;
end if;
raise_application_error(-20201, 'mensagem aqui');

-- DEPOIS (1 linha):
pk_log_auditoria.pr_registra_erro(st_e.nu_controle, wnu_controle_odonto, 'mensagem aqui');
```

### 1.2 Unificar Cursors Duplicados
**cr_empresa_neg** e **cr_empresa_neg_bitix** são idênticos ? unificar.

### 1.3 Extrair Validações para Package
Criar `pk_validacao_proposta` com funções booleanas puras.

---

## ?? Fase 2 - Extração de Packages por Bounded Context

### Prioridade de extração (por risco e complexidade):

| # | Package | BC | Linhas estimadas | Risco | Prioridade |
|---|---------|----|-----------------:|-------|-----------|
| 1 | `pk_log_auditoria` | BC-14 | ~50 | ?? Baixo | P0 |
| 2 | `pk_validacao_proposta` | BC-02 | ~300 | ?? Baixo | P0 |
| 3 | `pk_filial_area_venda` | BC-05 | ~80 | ?? Baixo | P1 |
| 4 | `pk_pessoa_juridica` | BC-03 | ~100 | ?? Médio | P1 |
| 5 | `pk_endereco_comunicacao` | BC-04 | ~200 | ?? Médio | P1 |
| 6 | `pk_modelo_negocio` | BC-06 | ~150 | ?? Médio | P2 |
| 7 | `pk_precificacao` | BC-07 | ~250 | ?? Alto | P2 |
| 8 | `pk_empresa_conveniada` | BC-08 | ~400 | ?? Alto | P3 |
| 9 | `pk_coparticipacao` | BC-09 | ~200 | ?? Alto | P3 |
| 10 | `pk_carencia` | BC-10 | ~150 | ?? Médio | P3 |
| 11 | `pk_acesso_internet` | BC-12 | ~150 | ?? Médio | P4 |
| 12 | `pk_fidelizacao` | BC-11 | ~30 | ?? Baixo | P4 |
| 13 | `pk_reembolso` | BC-15 | ~100 | ?? Médio | P4 |
| 14 | `pk_minimo_contratual` | BC-16 | ~50 | ?? Baixo | P4 |
| 15 | `pk_integracao_odonto` | BC-13 | ~80 | ?? Médio | P4 |
| 16 | `pk_notificacao_email` | BC-17 | ~60 | ?? Baixo | P4 |
| 17 | `pk_desconto_pim` | BC-18 | ~50 | ?? Baixo | P4 |
| 18 | `pk_cadastramento_empresa` | BC-01 | ~200 | ?? Alto | P5 (final) |

### Estrutura alvo de cada package:
```
pk_<nome>/
??? pk_<nome>.pks          -- Especificação (interface pública)
??? pk_<nome>.pkb          -- Body (implementação)
??? test_pk_<nome>.sql     -- Testes unitários
```

---

## ?? Fase 3 - Procedure Refatorada (Orquestrador Limpo)

Após extração de todos os packages, a procedure principal ficará assim:

```sql
CREATE OR REPLACE PROCEDURE humaster.pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
) AS
    ctx pk_tipos_cadastro.t_contexto_cadastro;
BEGIN
    FOR st_e IN cr_empresa_internet(p_nu_controle) LOOP
        BEGIN
            -- 1. Inicializa contexto (Grupo 1: INPUT do cursor + Grupo 2: DERIVADOS com defaults)
            ctx := pk_tipos_cadastro.fn_montar_contexto(st_e);
            
            -- 2. Validações
            pk_validacao_proposta.pr_validar_campos(ctx);
            
            -- 3. Gerar código empresa
            ctx.cd_empresa := fn_empresa_conveniada();
            
            -- 4. Resolve filial e parâmetros
            ctx.cd_filial := pk_filial_area_venda.fn_resolver_filial(ctx);
            ctx.cd_empresa_plano := pk_filial_area_venda.fn_resolver_empresa_plano(ctx);
            pk_modelo_negocio.pr_resolver_modelo(ctx);
            
            -- 5. Pessoa jurídica
            pk_pessoa_juridica.pr_criar_pessoa(ctx);
            
            -- 6. Precificação
            pk_precificacao.pr_criar_tabela_preco(ctx);
            
            -- 7. Empresa conveniada
            pk_empresa_conveniada.pr_criar_empresa_conveniada(ctx);
            
            -- 8. Endereço e comunicação
            pk_endereco_comunicacao.pr_criar_endereco(ctx);
            pk_endereco_comunicacao.pr_criar_contato(ctx);
            pk_endereco_comunicacao.pr_criar_meios_comunicacao(ctx);
            
            -- 9. Coparticipação
            IF ctx.fl_coparticipacao = 'S' THEN
              pk_coparticipacao.pr_criar_controle_fator(ctx);
            END IF;
            
            -- 10. Carência
            pk_carencia.pr_criar_compra_carencia(ctx);
            
            -- 11. Acesso internet
            pk_acesso_internet.pr_criar_acesso(ctx);
            
            -- 12. Fidelização
            pk_fidelizacao.pr_criar_fidelizacao(ctx);
            
            -- 13. Reembolso
            pk_reembolso.pr_configurar_reembolso(ctx);
            
            -- 14. Mínimo contratual
            pk_minimo_contratual.pr_criar_minimo_contratual(ctx);
            pk_minimo_contratual.pr_criar_breakeven(ctx);
            
            COMMIT;
            
            -- 15. Integrações pós-commit (ACL — falhas não causam rollback)
            pk_integracao_odonto.pr_espelhar_odonto(ctx);
            pk_integracao_odonto.pr_super_simples(ctx);
            
            -- 16. Notificação por e-mail (BC-17)
            pk_notificacao_email.pr_enviar_efetivacao(ctx);
            
            -- 17. Desconto PIM/ADM (BC-18)
            pk_desconto_pim.pr_aplicar_desconto_pim(ctx);
            
            p_erro_controle := 'procedimento efetuado para empresa,' || ctx.cd_empresa;
            
        EXCEPTION
            WHEN OTHERS THEN
                ROLLBACK;
                p_erro_controle := SQLERRM;
                pk_log_auditoria.pr_registra_pendencia(ctx.nu_controle, p_erro_controle);
                p_erro_controle := NULL;
        END;
    END LOOP;
END pr_cadastramento_empresa_prov;
```

---

## ?? Fase 4 - Modernização (Stack Microsoft / Azure Cloud-Native)

### Stack de Tecnologia

| Camada | Tecnologia Microsoft |
|--------|---------------------|
| **Frontend** | React 18 + TypeScript |
| **Hosting Frontend** | Azure Static Web Apps |
| **API Gateway** | Azure API Management |
| **BFF** | ASP.NET Core 8 Minimal APIs |
| **Microserviços** | ASP.NET Core 8 Minimal APIs |
| **Orquestração (Saga)** | Azure Durable Functions |
| **Mensageria** | Azure Service Bus (Topics + Subscriptions) |
| **Autenticação** | Microsoft Entra ID (OAuth 2.0 / OpenID Connect) |
| **Banco de Dados** | Azure SQL Database (Database per Service) |
| **Banco Legado** | Oracle 19c+ (fase de transição) |
| **ORM** | Entity Framework Core |
| **Validação** | FluentValidation |
| **Mediator / CQRS** | MediatR |
| **Hosting Serviços** | Azure Container Apps |
| **Observabilidade** | Azure Application Insights + Azure Monitor |
| **Notificações** | Azure Communication Services |
| **CI/CD** | Azure DevOps Pipelines |
| **IaC** | Bicep / Terraform |

```
????????????????????????????????????????????????????????????
?              Azure API Management (Gateway)              ?
?              Microsoft Entra ID (Autenticação)           ?
????????????????????????????????????????????????????????????
?Valida- ?Pessoa ?Filial?Modelo?Preço ?Empre-?Copar-?Carên-?
?ção     ?Juríd. ?      ?Negóc.?      ?sa    ?ticip.?cia   ?
?(.NET)  ?(.NET) ?(.NET)?(.NET)?(.NET)?Conv. ?(.NET)?(.NET)?
?        ?       ?      ?      ?      ?(.NET)?      ?      ?
????????????????????????????????????????????????????????????
?          Azure Service Bus (Topics + Subscriptions)      ?
????????????????????????????????????????????????????????????
?     Azure SQL Database (per Service) + Oracle (legado)   ?
????????????????????????????????????????????????????????????
          ?                                    ?
  Azure Application Insights          Azure Container Apps
  (Distributed Tracing)               (Hosting dos Serviços)
```

### Eventos de domínio sugeridos (Azure Service Bus Topics):
- `proposta-validada` ? `PropostaValidadaEvent`
- `filial-resolvida` ? `FilialResolvidaEvent`
- `parametros-negocio-resolvidos` ? `ParametrosNegocioResolvidosEvent`
- `pessoa-criada` ? `PessoaCriadaEvent` / `PessoaAtualizadaEvent`
- `tabela-preco-criada` ? `TabelaPrecoCriadaEvent`
- `empresa-conveniada-criada` ? `EmpresaConveniadaCriadaEvent`
- `coparticipacao-configurada` ? `CoparticipacaoConfiguradaEvent`
- `carencia-configurada` ? `CarenciaConfiguradaEvent`
- `acesso-internet-criado` ? `AcessoInternetCriadoEvent`
- `integracao-odonto-realizada` ? `IntegracaoOdontoRealizadaEvent`

> **Padrão**: Cada evento será publicado como um **Azure Service Bus Topic**, com
> subscriptions para cada serviço consumidor. Serialização em **System.Text.Json**
> com schema versionado (CloudEvents spec).

---

## ?? Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `context-map-cadastramento-empresa.cml` | Context Map DSL (Context Mapper) |
| `context-map-cadastramento-empresa.puml` | Diagrama visual do Context Map (PlantUML) |
| `fluxo-execucao-cadastramento.puml` | Fluxo de execução sequencial (PlantUML) |
| `ddd-modelagem-dominio.md` | Modelagem DDD completa (18 BCs, Aggregates, Entities, VOs, Services, Events) |
| `ESTRATEGIA-REFATORACAO-PLSQL.md` | Estratégia de refatoração PL/SQL (Strangler Fig, 18 packages, fn_montar_contexto, roadmap de extração) |
| `README-refatoracao.md` | Este documento (roadmap) |

### ?? Diagramas C4 Model (`c4-model/`)

| Arquivo | Nível C4 | Descrição |
|---------|----------|-----------|
| `c4-1-system-context.puml` | **Nível 1 - Contexto** | Visão geral do sistema e atores externos |
| `c4-2-container-as-is.puml` | **Nível 2 - Container (AS-IS)** | Arquitetura atual: monólito PL/SQL |
| `c4-2-container-to-be.puml` | **Nível 2 - Container (TO-BE Fase 2)** | Arquitetura alvo: packages DDD PL/SQL |
| `c4-2-container-to-be-fase3.puml` | **Nível 2 - Container (TO-BE Fase 3)** | Arquitetura futura: microserviços + eventos |
| `c4-3-component-orquestrador.puml` | **Nível 3 - Componente** | Detalhamento do orquestrador + todos os packages |
| `c4-3-component-validacao.puml` | **Nível 3 - Componente** | Detalhamento de pk_validacao_proposta |
| `c4-landscape-evolucao.puml` | **Landscape** | Visão comparativa das 3 fases de evolução |

### Como visualizar os diagramas:
1. Instalar extensão **PlantUML** no VS Code
2. Abrir arquivo `.puml` ? `Alt+D` para preview
3. Ou usar https://www.plantuml.com/plantuml/uml/ (online)
4. Ou usar https://www.planttext.com/ (preview em tempo real)

---

## ?? Riscos Identificados

1. **Acoplamento transacional**: Toda a procedure roda em uma única transação com COMMIT no final. Ao separar em serviços, será necessário implementar **Saga Pattern via Azure Durable Functions** com compensação automática.
2. **Lógica SIGO vs BITIX**: Dois caminhos paralelos que deveriam ser unificados via Strategy Pattern.
3. **Tratamento de erros inconsistente**: Muitos `WHEN OTHERS THEN NULL` que engolem erros silenciosamente.
4. **Dependência circular com odonto**: O log verifica controles odonto, que são processados em paralelo.
5. **Código morto**: Vários blocos comentados que devem ser removidos na refatoração.
6. **Migração de dados Oracle ? Azure SQL Database**: Requer planejamento cuidadoso de compatibilidade de tipos, sequences ? IDENTITY, e PL/SQL ? T-SQL/EF Core.
7. **Conectividade Oracle legado**: Durante a transição, os microserviços .NET precisarão acessar o Oracle HUMASTER via **Oracle.ManagedDataAccess.Core** ou **Azure Data Gateway**.
