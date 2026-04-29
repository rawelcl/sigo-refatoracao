# Analise de Impacto: pr_efetiva_internet

> **Objetivo:** Analisar como a `pr_efetiva_internet` (2.290 linhas PL/SQL) sera impactada pela
> refatoracao DDD da `pr_cadastramento_empresa_prov`, considerando que a `pr_efetiva_internet`
> e a **procedure orquestradora/scheduler** que invoca a `pr_cadastramento_empresa_prov`.

---

## 1. O Papel da pr_efetiva_internet no Ecossistema

A `pr_efetiva_internet` e uma **procedure de batch/scheduler** que roda via DBMS_JOB ou DBMS_SCHEDULER.
Ela NAO e chamada por usuarios; e executada automaticamente em intervalos regulares para processar
filas de propostas pendentes.

### Anatomia da Procedure (2.290 linhas)

```
pr_efetiva_internet
|
|-- [BLOCO 1] Carregamento de parametros do sistema (linhas 1-55)
|     |-- fn_registro_sistema('FL_CRITICA_SAUDE_ODONTO')
|     |-- fn_registro_sistema('CD_EMPRESA_INDIVIDUAL_ODONTO_PURO')
|     |-- fn_registro_sistema('CHECA_VENDA_OD_PURO_FINALIZADA')
|     |-- fn_registro_sistema('HABILITA_65ANOS')
|
|-- [BLOCO 2] Baixa automatica PME ate 29 vidas (linhas 56-178)
|     |-- Loop: tb_empresa_digitada + tb_empresa_conveniada + tb_usuario_titular_internet
|     |-- Chama: pr_cadastramento_internet2()
|
|-- [BLOCO 3] Carga automatica PIM 3 a 29 vidas -- BLOCO PRINCIPAL (linhas 179-1860)
|     |-- Verifica tb_registro_sistema('MOVIMENTACAO_PIM_AUTOMATICO')
|     |-- Loop coligadas: fn_valida_coligada_baixa()
|     |-- Loop principal: tb_empresa_internet (propostas pendentes)
|     |   |-- Validacoes de elegibilidade (13 pendencias)
|     |   |-- Verificacao de criticas saude/odonto
|     |   |-- >>> CHAMA: pr_cadastramento_empresa_prov() <<<
|     |   |-- >>> CHAMA: pr_odon_cad_empresa_prov() <<<
|     |   |-- Pos-efetivacao: atualiza empresas, usuarios, pendencias
|     |   |-- Chama: pr_cadastramento_internet2() para usuarios
|     |   |-- Log em humaster.tb_log_baixa_controle
|
|-- [BLOCO 4] Carga automatica PIM somente Odonto (linhas 1861-1970)
|     |-- Loop: tb_odon_empresa_internet
|     |-- Chama: pr_critica_internet() + pr_cadastramento_internet2()
|
|-- [BLOCO 5] Processamento de inclusoes (cd_tipo_internet = 2) (linhas 1971-2060)
|     |-- Loop: tb_empresa_conveniada (so inclusao)
|     |-- Chama: pr_cadastramento_internet2()
|
|-- [BLOCO 6] Processamento completo (cd_tipo_internet = 1) (linhas 2061-2180)
|     |-- Loop: tb_empresa_conveniada (tudo)
|     |-- Chama: pr_cadastramento_internet2()
|
|-- [BLOCO 7] Processamento Individual/Familiar (linhas 2181-2260)
|     |-- Loop: tb_usuario_titular_internet (fn_individual_familiar = '00100')
|     |-- Chama: pr_critica_internet() + pr_cadastramento_internet2()
|
|-- [BLOCO 8] Integracao Odonto Agregado (linha 2261)
|     |-- Chama: pr_odon_Obrigacao_Agregado
|
|-- [BLOCO 9] Processamento BITIX (linhas 2262-2275)
|     |-- Chama: PR_COLIGA_EMPRESA_BITIX + PK_VENDA_JSON.pr_efetiva
|
|-- [BLOCO 10] Processamento Coligadas (linhas 2276-2290)
|     |-- Chama: pr_processa_empresa_coligada
```

---

## 2. Relacao Direta com a Modelagem DDD

### 2.1 Mapeamento: Blocos da pr_efetiva_internet x Bounded Contexts

| Bloco | Linhas | Bounded Contexts Tocados | Relacao com DDD |
|---|---|---|---|
| **BLOCO 1** (Parametros) | 1-55 | Nenhum (infraestrutura) | Feature Flags / Configuration Service |
| **BLOCO 2** (PME <=29) | 56-178 | BC-01, BC-02 | Orquestracao de propostas PME |
| **BLOCO 3** (PIM 3-29) | 179-1860 | **TODOS os 18 BCs** | **Orquestrador principal** -- e o caller da `pr_cadastramento_empresa_prov` |
| **BLOCO 4** (Odonto) | 1861-1970 | BC-13 (Integracao Odonto) | Fluxo paralelo odontologico |
| **BLOCO 5** (Inclusoes) | 1971-2060 | BC-01, BC-14 | Processamento de beneficiarios |
| **BLOCO 6** (Completo) | 2061-2180 | BC-01, BC-14 | Processamento completo de beneficiarios |
| **BLOCO 7** (Individual) | 2181-2260 | BC-01, BC-02, BC-14 | Fluxo individual/familiar |
| **BLOCO 8** (Agregado) | 2261 | BC-13 | Obrigacao do agregado odonto |
| **BLOCO 9** (BITIX) | 2262-2275 | BC-01, BC-06, BC-13 | Variante BITIX (Strategy Pattern) |
| **BLOCO 10** (Coligadas) | 2276-2290 | BC-06 | Processamento de grupos empresariais |

### 2.2 Chamadas Criticas (Dependencias Diretas)

```
pr_efetiva_internet
  |
  |-->> pr_cadastramento_empresa_prov(nu_controle, p_return)     [BLOCO 3, linha ~1230]
  |       |-- E a procedure sendo refatorada via DDD
  |       |-- Recebe: nu_controle (da proposta)
  |       |-- Retorna: p_return (mensagem com cd_empresa gerado)
  |
  |-->> pr_odon_cad_empresa_prov(nu_controle, cd_empresa, p_return_od) [BLOCO 3, linha ~1290]
  |       |-- Equivalente odontologico -- impactada indiretamente
  |
  |-->> pr_cadastramento_internet2(nu_controle)                  [BLOCOS 2,3,4,5,6,7]
  |       |-- Efetivacao de beneficiarios individuais
  |       |-- NAO e escopo direto da refatoracao DDD
  |
  |-->> pr_critica_internet(nu_controle, ...)                    [BLOCOS 3,4,7]
  |       |-- Validacao de criticas de beneficiarios
  |       |-- Mapeada como BC-02 (Validacao de Proposta)
  |
  |-->> pr_critica_empresa_internet_1(empresa_internet)          [BLOCO 3, pendencia 11]
  |       |-- Critica DIREX
  |
  |-->> fn_valida_coligada_baixa(proposta_mae)                   [BLOCO 3]
  |       |-- Validacao de coligadas -- BC-06
  |
  |-->> fn_checa_divergencia(nu_controle)                        [BLOCO 3, pendencia 12]
  |       |-- Checagem Neoway -- BC-02
  |
  |-->> PR_COLIGA_EMPRESA_BITIX / PK_VENDA_JSON.pr_efetiva       [BLOCO 9]
  |       |-- Processamento BITIX -- BC-06 (Strategy Pattern)
  |
  |-->> pr_processa_empresa_coligada                             [BLOCO 10]
  |       |-- Coligacao de empresas -- BC-06
  |
  |-->> pr_odon_Obrigacao_Agregado                               [BLOCO 8]
  |       |-- Obrigacao agregado odonto -- BC-13
  |
  |-->> PR_NAT_JURIDICA_ODON(nu_controle)                        [BLOCO 3]
         |-- Natureza juridica odonto -- BC-13
```

---

## 3. Identificacao de Responsabilidades Misturadas

A `pr_efetiva_internet` viola varios principios DDD e SOLID. Ela mistura **6 responsabilidades** distintas:

### 3.1 Responsabilidade 1: SELECAO DE PROPOSTAS (Query/Read Model)

**O que faz:** Consulta `tb_empresa_internet` buscando propostas pendentes de processamento.

```sql
for st_e in (select * from tb_empresa_internet i
             where i.tp_operacao = 1
             and fl_status_processamento in (1, 0, 8)
             and Fl_Sinaliza_Vidas_Ok = 'S')
```

**BC afetado:** BC-01 (Proposta e Orquestracao)  
**Na refatoracao DDD:** `PropostaRepository.findPendentes()`  
**Impacto:** BAIXO -- e apenas um SELECT, facilmente encapsulavel em um Repository.

### 3.2 Responsabilidade 2: VALIDACAO PRE-CADASTRO (13 pendencias)

**O que faz:** Executa 13 validacoes ANTES de chamar `pr_cadastramento_empresa_prov`:

| Pendencia | Validacao | BC DDD |
|---|---|---|
| 1 | Nome invalido (ASSOC, CONDOM, SIND, INSTITUTO) | BC-02 |
| 2 | Localidade limitrofe (cidade/filial) | BC-05 |
| 3 | Vendedor x Filial (divergencia) | BC-05 |
| 4 | Dependente > 43 anos (tipo invalido) | BC-02 |
| 5 | Sobrinho > 23 anos | BC-02 |
| 6 / 13 | Titular/dependente > 59/65 anos | BC-02 |
| 7 | CPF invalido (titular ou dependente > 18 sem CPF) | BC-02 |
| 8 | Qtd vidas fora da faixa (< 1 ou > 29) | BC-02 |
| 10 | Vidas digitadas apos 6 dias | BC-02 |
| 11 | Critica DIREX (pr_critica_empresa_internet_1) | BC-02 |
| 12 | Divergencia Neoway (fn_checa_divergencia) | BC-02 |

**BC afetado:** BC-02 (Validacao de Proposta) + BC-05 (Filial)  
**Na refatoracao DDD:** Essas validacoes sao **Specifications** que DEVERIAM estar no `ValidacaoPropostaService`.

**IMPACTO CRITICO:** A `pr_efetiva_internet` faz validacoes que **DUPLICAM** parcialmente o que ja existe dentro
da `pr_cadastramento_empresa_prov`. Isso significa:
- Regras de negocio em **DOIS LUGARES**
- Risco de inconsistencia quando uma muda e a outra nao
- A refatoracao DDD precisa decidir: essas validacoes ficam no **Application Service** (orquestrador) ou no **Domain Service** (ValidacaoPropostaService)?

### 3.3 Responsabilidade 3: ORQUESTRACAO DA EFETIVACAO (Call to Core)

**O que faz:** Chama `pr_cadastramento_empresa_prov()` e `pr_odon_cad_empresa_prov()`.

```sql
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, p_return);
pr_odon_cad_empresa_prov(l_empresa_odon.nu_controle, l_empresa_conveniada_saude, p_return_od);
```

**BC afetado:** BC-01 (Orquestracao) -> todos os demais BCs  
**Na refatoracao DDD:** `EfetivarContratoEmpresaPJUseCase.executar(nuControle)`  
**Impacto:** ALTO -- a interface de chamada muda completamente.

**Contrato atual:**
```
IN:  nu_controle (number)
OUT: p_return (varchar2) -- formato: "mensagem,CD_EMPRESA"
```

**Contrato futuro (DDD):**
```
IN:  PropostaId (Value Object)
OUT: EfetivacaoResult { success, cdEmpresa, eventos[], erros[] }
```

### 3.4 Responsabilidade 4: POS-PROCESSAMENTO (After Commit)

**O que faz:** Apos `pr_cadastramento_empresa_prov` retornar, executa:

1. **Atualiza `tb_empresa_internet`** -- marca como processada (status 9)
2. **Atualiza `tb_empresa_conveniada`** -- marca FL_EMPRESA_NOVA = 'S'
3. **Migra codigos de empresa** -- de 'T' + nu_controle para cd_empresa definitivo
4. **Atualiza `tb_usuario_titular_internet`** -- muda cd_empresa provisorio -> definitivo
5. **Atualiza `tb_usuario_dependente_internet`** -- idem
6. **Cria pendencia_empresa** -- pendencia 1 (empresa nova)
7. **Efetiva usuarios** -- chama `pr_cadastramento_internet2` para cada titular
8. **Log** -- insere em `humaster.tb_log_baixa_controle`
9. **Fallback** -- se usuarios nao efetivados, marca empresa como pendente

**BCs afetados:** BC-01, BC-08, BC-14  
**Na refatoracao DDD:** Isso sao **Domain Events** que devem ser tratados assincronamente:
- `EmpresaConveniadaCriada` -> migrar codigos, criar pendencia
- `PropostaEfetivada` -> atualizar status da proposta
- `UsuarioAutorizadoParaBaixa` -> chamar efetivacao de usuarios

### 3.5 Responsabilidade 5: GESTAO DE CRITICAS (Pre-Commit Validation)

**O que faz:** Antes de chamar `pr_cadastramento_empresa_prov`, executa criticas de controle:

```sql
if nvl(wfl_critica,'N') = 'S' and st_e.cd_empresa is null then
  -- pr_critica_internet para saude
  -- pr_critica_internet para odonto
  -- Se tem criticas -> marca pendencia 9 -> NAO chama pr_cadastramento_empresa_prov
end if;
```

**BC afetado:** BC-02 (Validacao)  
**Na refatoracao DDD:** `ValidacaoPropostaService.validarCriticas(proposta)`  
**Impacto:** MEDIO -- e um gate de entrada que decide se a efetivacao acontece.

### 3.6 Responsabilidade 6: PROCESSAMENTO DE BENEFICIARIOS (Fora do escopo DDD)

**O que faz:** Nos blocos 4, 5, 6 e 7, processa beneficiarios individuais via `pr_cadastramento_internet2`.
Isso e um **dominio separado** ("Gestao de Beneficiarios") que nao faz parte da modelagem DDD da
`pr_cadastramento_empresa_prov`.

**Impacto:** INDIRETO -- a refatoracao da `pr_cadastramento_empresa_prov` nao afeta esses blocos diretamente,
mas a nova arquitetura pode exigir que eles tambem sejam modernizados.

---

## 4. Impactos Especificos da Refatoracao DDD

### 4.1 Impacto na Interface de Chamada

| Aspecto | Antes (Legado) | Depois (DDD Refatorado) |
|---|---|---|
| **Chamada** | `pr_cadastramento_empresa_prov(nu_controle, p_return)` | `EfetivarContratoUseCase.executar(propostaId)` |
| **Retorno** | `p_return VARCHAR2(200)` com formato `"msg,CD_EMPRESA"` | `EfetivacaoResult` (objeto tipado) |
| **Parsing do retorno** | `substr(p_return, instr(p_return, ',') + 1)` | `result.cdEmpresa` (acesso direto) |
| **Tratamento de erro** | `WHEN OTHERS THEN SQLERRM` | Exceptions tipadas + Domain Events |
| **Transacao** | `pr_cadastramento_empresa_prov` faz COMMIT interno | Transacao controlada pelo chamador (Unit of Work) |

### 4.2 Impacto na Logica de Validacao

A `pr_efetiva_internet` implementa **13 validacoes pre-cadastro** que sao um **subconjunto** das
21 Specifications do DDD. A refatoracao deve decidir:

**Opcao A -- Manter validacoes na pr_efetiva_internet (Strangler Pattern):**
- Menor impacto imediato
- Duplicacao de regras permanece
- Adequado para fase inicial (Quick Wins)

**Opcao B -- Mover validacoes para o Domain Service:**
- Elimina duplicacao
- `pr_efetiva_internet` apenas seleciona propostas e delega
- Exige que `ValidacaoPropostaService` aceite validacoes "pre-PIM"
- Recomendado para fases 2-3 do roadmap

**Opcao C -- Criar um Application Service "Scheduler":**
- Nova camada: `SchedulerApplicationService`
- `pr_efetiva_internet` vira um **thin wrapper** que apenas chama o Application Service
- Todas as regras ficam no dominio
- Adequado para fase final (Cloud)

### 4.3 Impacto no Fluxo Transacional

**Problema critico:** A `pr_efetiva_internet` faz multiplos COMMITs dentro do loop principal:

```
Loop proposta:
  COMMIT (apos pendencias)
  pr_cadastramento_empresa_prov() -- COMMIT interno
  COMMIT (apos migracao de codigos)
  COMMIT (apos atualizar usuarios)
  pr_cadastramento_internet2() -- COMMIT interno
  COMMIT (apos cada usuario)
```

Na modelagem DDD, o principio e:
> "Cada Aggregate define seu proprio boundary de consistencia. Uma transacao deve modificar
> apenas UM Aggregate."

**Impacto:** A refatoracao precisara implementar o **Saga Pattern** ou **Process Manager** para
coordenar as multiplas transacoes. A `pr_efetiva_internet` e o candidato natural para ser
o **Saga Orchestrator**.

---

## 5. Proposta de Refatoracao em Fases

### Fase 0 -- Documentacao (ATUAL)
- [x] Modelagem DDD da `pr_cadastramento_empresa_prov`
- [x] Analise de impacto na `pr_efetiva_internet` (este documento)
- [ ] Modelagem DDD da `pr_efetiva_internet` (nao requer modelagem completa, requer mapeamento)

### Fase 1 -- Strangler Fig (Adapter)

Criar um **adapter** que encapsula a nova interface sem alterar a `pr_efetiva_internet`:

```
pr_efetiva_internet (inalterada)
  |
  |-->> pr_cadastramento_empresa_prov(nu_controle, p_return)  -- MANTIDA
         |
         |-- Internamente refatorada em packages DDD
         |-- Interface publica preservada
         |-- p_return continua com formato "msg,CD_EMPRESA"
```

**Impacto na pr_efetiva_internet:** ZERO  
**Risco:** MINIMO  
**Prazo:** Implementavel nas fases 1-2 do roadmap existente

### Fase 2 -- Extracao de Validacoes

Mover as 13 validacoes de pendencia para packages DDD:

```
pr_efetiva_internet
  |
  |-- ANTES: 13 validacoes inline (600+ linhas)
  |-- DEPOIS: pk_validacao_proposta.validar_pre_pim(nu_controle, resultado)
  |
  |-- IF resultado.valido THEN
  |     pr_cadastramento_empresa_prov(nu_controle, p_return)
  |-- ELSE
  |     -- registrar pendencias
  |-- END IF
```

**Impacto na pr_efetiva_internet:** MEDIO (reducao de ~600 linhas)  
**Risco:** MEDIO (regras de negocio movidas)  

### Fase 3 -- Pos-Processamento como Events

Extrair o pos-processamento (migracao de codigos, efetivacao de usuarios) para event handlers:

```
pr_efetiva_internet
  |
  |-->> EfetivarContratoUseCase.executar(nu_controle)
  |       |-- Retorna: EfetivacaoResult
  |
  |-->> IF result.sucesso THEN
  |       -- Os Domain Events ja foram publicados:
  |       -- EmpresaConveniadaCriada -> handler migra codigos
  |       -- PropostaEfetivada -> handler atualiza status
  |       -- UsuariosPendentes -> handler chama pr_cadastramento_internet2
```

**Impacto na pr_efetiva_internet:** ALTO (reducao de ~800 linhas)  
**Risco:** ALTO (mudanca de paradigma transacional)  

### Fase 4 -- Thin Wrapper / Cloud

A `pr_efetiva_internet` se torna um thin wrapper PL/SQL que:
1. Seleciona propostas pendentes (`PropostaRepository.findPendentes`)
2. Para cada uma, publica um evento em uma fila (AQ ou Service Bus)
3. O processamento real acontece em Workers independentes

```
pr_efetiva_internet (thin wrapper)
  |
  |-- FOR proposta IN findPendentes() LOOP
  |     DBMS_AQ.ENQUEUE('EFETIVACAO_QUEUE', proposta.nu_controle);
  |-- END LOOP;

[Worker / Azure Function]
  |-->> EfetivarContratoUseCase.executar(nu_controle)
```

**Impacto na pr_efetiva_internet:** TOTAL (reescrita completa)  
**Risco:** ALTO (nova infraestrutura)  

---

## 6. Mapeamento de Tabelas: pr_efetiva_internet x DDD

### 6.1 Tabelas que a pr_efetiva_internet LE (SELECT)

| Tabela | Uso na pr_efetiva_internet | BC DDD | Read Model |
|---|---|---|---|
| `tb_empresa_internet` | Loop principal: propostas pendentes | BC-01 | PropostaReadModel |
| `tb_empresa_digitada` | Baixa automatica PME | BC-01 | -- |
| `tb_empresa_conveniada` | Verificar status, tipo internet | BC-08 | EmpresaConveniadaReadModel |
| `tb_usuario_titular_internet` | Contagem de vidas, status | BC-01 | -- |
| `tb_usuario_dependente_internet` | Contagem de vidas, idade | BC-01 | -- |
| `tb_vendedor_plano` | Resolver filial do vendedor | BC-05 | VendedorReadModel |
| `tb_area_venda` / `_cfg` | Vendedor nacional, filial | BC-05 | AreaVendaReadModel |
| `tb_localidade_limitrofe` | Validacao de localidade | BC-05 | -- |
| `tb_tp_pend_empresa_internet` | Tipos de pendencia ativos | BC-14 | -- |
| `tb_pessoa` | Ex-cliente (wexiste_ex_cliente) | BC-03 | PessoaReadModel |
| `tb_modelo_empresa` | Baixa automatica (fl_baixa_automatica) | BC-06 | -- |
| `tb_empresa_coligada` | Coligadas pendentes | BC-06 | ColigadaReadModel |
| `tb_odon_empresa_internet` | Empresa odonto vinculada | BC-13 | OdontoReadModel |
| `tb_empresa_neg` | Parametrizacao de agregados | BC-06 | ModeloNegocioReadModel |
| `tb_empresa_agregado` | Dependentes tipo agregado | BC-06 | -- |
| `tb_registro_sistema` | Feature flags | Infraestrutura | -- |
| `tb_proposta_venda` | Status da proposta | BC-01 | -- |
| `tb_pendencia_empresa_internet` | Checagem de pendencias existentes | BC-14 | -- |
| `tb_odon_param_vendedor_pim` | Parametros vendedor odonto | BC-13 | -- |
| `tb_pendencia` | Pendencia Neoway | BC-02 | -- |
| `tb_filial` | Resolver filial | BC-05 | FilialReadModel |
| `tb_endereco_pessoa` | Cidade do contrato | BC-04 | -- |
| `tb_usuario` | Verificar usuario ja ativo | -- | -- |
| `tb_usuario_critica_internet` | Criticas existentes | BC-02 | -- |
| `tb_critica_liberada` | Criticas isentadas | BC-02 | -- |

### 6.2 Tabelas que a pr_efetiva_internet ESCREVE (INSERT/UPDATE/DELETE)

| Tabela | Operacao | Motivo | BC DDD |
|---|---|---|---|
| `tb_pendencia_empresa_internet` | INSERT | Registrar pendencias (1-13) | BC-14 |
| `tb_pendencia_empresa_internet` | DELETE | Limpar pendencias anteriores | BC-14 |
| `tb_empresa_internet` | UPDATE | Status processamento (1,9), cd_empresa | BC-01 |
| `tb_empresa_conveniada` | UPDATE | FL_EMPRESA_NOVA, FL_STATUS, DS_OBSERVACAO | BC-08 |
| `tb_usuario_titular_internet` | UPDATE | cd_empresa, fl_status_processamento, dt_inicio | BC-01 |
| `tb_usuario_dependente_internet` | UPDATE | cd_empresa, fl_status_processamento, dt_inicio | BC-01 |
| `tb_pendencia_empresa` | DELETE/INSERT | Pendencia da empresa efetivada | BC-14 |
| `tb_odon_empresa_internet` | UPDATE | cd_empresa, fl_status_processamento | BC-13 |
| `tb_usuario` | UPDATE | fl_status_usuario, DS_OBSERVACAO | -- |
| `tb_compra_carencia` | UPDATE | dias_adm_especial = 30 | BC-10 |
| `tb_proposta_venda` | UPDATE | fl_status = 9 (com critica) | BC-01 |
| `humaster.tb_log_baixa_controle` | INSERT | Log do processo | BC-14 |
| `tb_usuario_critica_internet` | INSERT | Criticas de erro | BC-02 |

---

## 7. Riscos e Mitigacoes

### 7.1 Risco: Mudanca na Interface de Retorno

**Descricao:** Se `pr_cadastramento_empresa_prov` mudar o formato de `p_return`, a `pr_efetiva_internet`
quebra no parsing:

```sql
l_empresa_conveniada_saude := substr(p_return, instr(p_return, ',') + 1);
```

**Mitigacao:** Manter o contrato de `p_return` como **Adapter** (Anti-Corruption Layer) ate que
a `pr_efetiva_internet` tambem seja refatorada.

### 7.2 Risco: Transacao e Consistencia

**Descricao:** A `pr_efetiva_internet` faz COMMIT apos cada etapa. Se a `pr_cadastramento_empresa_prov`
refatorada mudar o boundary transacional (ex: Unit of Work sem COMMIT interno), a `pr_efetiva_internet`
pode ter dados inconsistentes.

**Mitigacao:** Na Fase 1 (Strangler), a `pr_cadastramento_empresa_prov` refatorada DEVE manter
o COMMIT interno. So remover na Fase 3+ quando a `pr_efetiva_internet` tambem for refatorada.

### 7.3 Risco: Duplicacao de Validacoes

**Descricao:** As 13 pendencias da `pr_efetiva_internet` se sobrepoem parcialmente com as
21 Specifications do DDD.

| Validacao pr_efetiva_internet | Specification DDD | Sobreposicao |
|---|---|---|
| Pendencia 1 (nome invalido) | SP-03 (NomeSocialSpec) | PARCIAL |
| Pendencia 2 (localidade) | SP-09 (LocalidadeLimitrofeSpec) | TOTAL |
| Pendencia 3 (vendedor x filial) | SP-08 (VendedorFilialSpec) | TOTAL |
| Pendencia 4 (dep > 43 anos) | SP-11 (IdadeDependenteSpec) | TOTAL |
| Pendencia 5 (sobrinho > 23) | SP-12 (SobrinhoIdadeSpec) | TOTAL |
| Pendencia 6/13 (> 59/65 anos) | SP-10 (IdadeTitularSpec) | TOTAL |
| Pendencia 7 (CPF invalido) | SP-04 (CpfValidoSpec) | TOTAL |
| Pendencia 8 (qtd vidas) | SP-05 (FaixaVidasSpec) | TOTAL |
| Pendencia 10 (vidas > 6 dias) | SP-13 (PrazoDigitacaoSpec) | TOTAL |
| Pendencia 11 (DIREX) | SP-14 (CriticaDirexSpec) | TOTAL |
| Pendencia 12 (Neoway) | SP-15 (DivergenciaNeowaySpec) | TOTAL |

**Mitigacao:** Na Fase 2, migrar todas as validacoes para `pk_validacao_proposta` e chamar de um unico lugar.

### 7.4 Risco: Feature Flags e Variantes

**Descricao:** A `pr_efetiva_internet` usa feature flags do `fn_registro_sistema` que alteram
o comportamento das validacoes:
- `HABILITA_65ANOS` -- muda limite de idade (59 vs 65 anos)
- `FL_CRITICA_SAUDE_ODONTO` -- habilita criticas pre-cadastro
- `PENDENCIA_NEOWAY_PIM` -- habilita checagem Neoway
- `MOVIMENTACAO_PIM_AUTOMATICO` -- desabilita todo o bloco PIM

**Mitigacao:** Encapsular feature flags em um `FeatureFlagService` que os Domain Services consultam.

---

## 8. Classificacao DDD da pr_efetiva_internet

### Na terminologia DDD, a pr_efetiva_internet e:

| Conceito DDD | Mapeamento |
|---|---|
| **Application Service** | SIM -- orquestra o use case de efetivacao em batch |
| **Infrastructure** | SIM -- e acionada por scheduler (DBMS_JOB) |
| **Saga Orchestrator** | SIM (futuro) -- coordena multiplas transacoes |
| **Process Manager** | SIM -- controla o fluxo de estados da proposta |

### Ela NAO e:
- NAO e um Domain Service (tem logica de infraestrutura/batch)
- NAO e um Repository (embora faca queries)
- NAO e um Aggregate (nao tem identidade propria)

### Classificacao recomendada:

```
Camada: APPLICATION / INFRASTRUCTURE
Tipo:   ScheduledBatchProcessor (Application Service com trigger de Infrastructure)
Padrao: Saga Orchestrator + Anti-Corruption Layer
```

---

## 9. Decisoes Arquiteturais (ADRs Necessarias)

### ADR-01: Manter contrato de p_return na Fase 1
- **Status:** Proposta
- **Decisao:** A `pr_cadastramento_empresa_prov` refatorada DEVE manter a assinatura
  `(nu_controle IN NUMBER, p_return OUT VARCHAR2)` e o formato `"mensagem,CD_EMPRESA"`.
- **Motivo:** A `pr_efetiva_internet` (2.290 linhas) nao sera alterada na Fase 1.
- **Consequencia:** Adapter pattern com facade mantendo o contrato legado.

### ADR-02: Validacoes pre-PIM ficam na pr_efetiva_internet ate Fase 2
- **Status:** Proposta
- **Decisao:** As 13 validacoes de pendencia permanecem na `pr_efetiva_internet` ate a Fase 2.
- **Motivo:** Mover agora aumenta escopo e risco. As validacoes ja funcionam.
- **Consequencia:** Duplicacao temporaria aceita.

### ADR-03: COMMIT interno mantido ate Fase 3
- **Status:** Proposta
- **Decisao:** A `pr_cadastramento_empresa_prov` refatorada mantera COMMIT interno.
- **Motivo:** A `pr_efetiva_internet` depende de dados commitados entre etapas.
- **Consequencia:** Unit of Work verdadeiro so na Fase 3.

### ADR-04: Feature Flags centralizados em FeatureFlagService
- **Status:** Proposta
- **Decisao:** Criar `pk_feature_flag` que encapsula `fn_registro_sistema`.
- **Motivo:** Ambas as procedures usam as mesmas flags; centralizar evita divergencia.
- **Consequencia:** Impacto em ambas as procedures, mas sem mudanca de comportamento.

---

## 10. Diagrama de Dependencia

```
                    SCHEDULER (DBMS_JOB)
                          |
                          v
              +---------------------------+
              |   pr_efetiva_internet      |
              |   (Saga Orchestrator)      |
              |   2.290 linhas PL/SQL      |
              +---------------------------+
                |    |    |    |    |
                |    |    |    |    +-->> pr_odon_Obrigacao_Agregado
                |    |    |    +------>> PR_COLIGA_EMPRESA_BITIX
                |    |    |    +------>> PK_VENDA_JSON.pr_efetiva
                |    |    |    +------>> pr_processa_empresa_coligada
                |    |    |
                |    |    +-->> pr_critica_internet
                |    |    +-->> pr_critica_empresa_internet_1
                |    |    +-->> fn_checa_divergencia
                |    |    +-->> fn_valida_coligada_baixa
                |    |
                |    +-->> pr_cadastramento_internet2 (beneficiarios)
                |
                v
    +-----------------------------------------+
    |   pr_cadastramento_empresa_prov          |  <-- SENDO REFATORADA (DDD)
    |   (EfetivarContratoEmpresaPJUseCase)     |
    |   4.991 linhas PL/SQL                    |
    |                                          |
    |   18 Bounded Contexts                    |
    |   9 Aggregates                           |
    |   47 tabelas de escrita                  |
    +-----------------------------------------+
                |
                v
    +-----------------------------------------+
    |   pr_odon_cad_empresa_prov               |  <-- IMPACTO INDIRETO
    |   (Integracao Odontologica)              |
    |   BC-13                                  |
    +-----------------------------------------+
```

---

## 11. Checklist de Impacto por Fase do Roadmap

### Fase 1: Quick Wins (Packages de Leitura)
- [ ] Verificar se Read Models usados pela `pr_efetiva_internet` sao os mesmos criados nos packages
- [ ] Garantir que `pk_validacao_proposta` (se criado) nao conflita com validacoes inline
- [ ] Manter assinatura de `pr_cadastramento_empresa_prov` intacta
- **Impacto na pr_efetiva_internet:** NENHUM

### Fase 2: Packages de Escrita + Domain Services
- [ ] Migrar 13 validacoes de pendencia para `pk_validacao_proposta.validar_pre_pim()`
- [ ] Alterar `pr_efetiva_internet` para chamar o package em vez de validar inline
- [ ] Testar que todas as pendencias continuam sendo registradas corretamente
- [ ] Verificar feature flags centralizados
- **Impacto na pr_efetiva_internet:** MEDIO (~600 linhas removidas, 1 chamada de package adicionada)

### Fase 3: Orquestrador + Saga
- [ ] Extrair pos-processamento (migracao de codigos, efetivacao de usuarios) para event handlers
- [ ] Implementar Saga Pattern para coordenar transacoes
- [ ] Alterar `pr_efetiva_internet` para usar novo `EfetivacaoResult`
- [ ] Remover COMMIT interno da `pr_cadastramento_empresa_prov`
- [ ] Alterar parsing de `p_return` para usar objeto tipado
- **Impacto na pr_efetiva_internet:** ALTO (~800 linhas removidas, nova interface)

### Fase 4: Cloud / Async
- [ ] Substituir loop principal por ENQUEUE em fila (AQ ou Service Bus)
- [ ] Criar Workers/Azure Functions para processamento
- [ ] `pr_efetiva_internet` se torna thin wrapper de ~50 linhas
- **Impacto na pr_efetiva_internet:** TOTAL (reescrita)

---

## 12. Conclusao

A `pr_efetiva_internet` e a **camada de aplicacao/infraestrutura** que ativa a `pr_cadastramento_empresa_prov`.
Na refatoracao DDD:

1. **Fase 1 (Quick Wins):** Impacto ZERO -- a interface publica e preservada via Adapter.
2. **Fase 2 (Domain Services):** Impacto MEDIO -- validacoes migram para packages.
3. **Fase 3 (Orquestracao):** Impacto ALTO -- novo contrato, Saga Pattern.
4. **Fase 4 (Cloud):** Impacto TOTAL -- `pr_efetiva_internet` vira thin wrapper.

A estrategia recomendada e **Strangler Fig Pattern**: cada fase reduz a `pr_efetiva_internet` gradualmente,
sem quebrar o funcionamento atual. Na Fase 1, ela nao muda. Na Fase 4, ela tem ~50 linhas.

```
EVOLUCAO DA PR_EFETIVA_INTERNET:

Fase 0 (Atual):    |################################| 2.290 linhas (tudo monolitico)
Fase 1 (Adapter):  |################################| 2.290 linhas (sem mudanca)
Fase 2 (Services): |#####################|           1.690 linhas (validacoes extraidas)
Fase 3 (Saga):     |###########|                       890 linhas (pos-processamento extraido)
Fase 4 (Cloud):    |##|                                 50 linhas (thin wrapper + fila)
```

---

*Documento gerado em: Fevereiro 2026*  
*Procedure analisada: `pr_efetiva_internet` -- 2.290 linhas*  
*Procedure dependente: `pr_cadastramento_empresa_prov` -- 4.991 linhas*  
*Repositorio: Hapvida.Sigo.Health.Plsql*
