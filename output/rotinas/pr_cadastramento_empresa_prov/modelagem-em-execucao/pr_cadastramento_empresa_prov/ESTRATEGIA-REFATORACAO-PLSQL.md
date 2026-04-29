# Estratégia de Refatoração PL/SQL ? Preparação para Migração

## pr_cadastramento_empresa_prov — Strangler Fig em PL/SQL

> **Objetivo:** Refatorar a procedure monolítica de ~5.000 linhas **dentro do PL/SQL**,  
> organizando o código em packages por Bounded Context, para que a futura migração  
> para .NET 8 / microserviços seja uma **tradução mecânica** (package ? service).
>
> **Data:** 2026-03-11  
> **Referências:** `REGRAS-DE-NEGOCIO-POR-CONTEXTO.md`, `ddd-modelagem-dominio.md`

---

## 1. Princípio: Strangler Fig Pattern no PL/SQL

A ideia é **não reescrever** a procedure de uma vez. Em vez disso, extraímos blocos de código
para packages dedicados, um BC por vez, enquanto a procedure original vai "murchando" até
virar apenas um orquestrador fino que chama os packages.

```
 ANTES (monolito PL/SQL):                    DEPOIS (packages por BC):
 ??????????????????????????                  ??????????????????????????????
 ? pr_cadastramento_      ?                  ? pr_cadastramento_          ?
 ?    empresa_prov         ?                  ?    empresa_prov            ?
 ?                         ?                  ?  (orquestrador fino ~200L) ?
 ? ~5.000 linhas           ?                  ?                            ?
 ? 18 BCs misturados       ?    ?????????     ?  pk_validacao_proposta      ?
 ? 30+ blocos de log       ?                  ?  pk_pessoa_juridica         ?
 ? 47 tabelas              ?                  ?  pk_endereco_comunicacao    ?
 ? 33 validações           ?                  ?  pk_modelo_negocio          ?
 ? SQL inline              ?                  ?  pk_precificacao            ?
 ?                         ?                  ?  pk_empresa_conveniada      ?
 ??????????????????????????                  ?  pk_coparticipacao          ?
                                              ?  pk_log_auditoria           ?
                                              ?  pk_acesso_internet         ?
                                              ?  pk_integracao_odonto       ?
                                              ?  ... (18 packages)          ?
                                              ??????????????????????????????

                                              Cada package = 1 futuro microserviço
```

---

## 2. Arquitetura dos Packages PL/SQL

### 2.1 Estrutura de cada Package

Cada package segue uma **convenção padronizada** que facilita a futura tradução para C#:

```sql
CREATE OR REPLACE PACKAGE pk_validacao_proposta AS

  -- ???????????????????????????????????????????????????
  -- TYPES (equivalem a Records/DTOs no C#)
  -- ???????????????????????????????????????????????????
  TYPE t_resultado_validacao IS RECORD (
    fl_valido     BOOLEAN,
    cd_erro       NUMBER,
    ds_mensagem   VARCHAR2(500)
  );

  TYPE t_contexto_proposta IS RECORD (
    nu_controle           NUMBER,
    nu_cgc_cpf            VARCHAR2(20),
    nm_pessoa_razao_social VARCHAR2(100),
    cd_vendedor_plano     NUMBER,
    -- ... campos do cursor cr_empresa_internet
  );

  -- ???????????????????????????????????????????????????
  -- PROCEDURES PÚBLICAS (equivalem a métodos públicos no C#)
  -- ???????????????????????????????????????????????????

  -- Valida todos os campos da proposta (Camada 4 — 33 checagens)
  PROCEDURE pr_validar_proposta(
    p_contexto    IN  t_contexto_proposta,
    p_resultado   OUT t_resultado_validacao
  );

END pk_validacao_proposta;
/
```

### 2.2 Convenções para facilitar a migração

| Convenção PL/SQL | Equivalente C# futuro | Justificativa |
|---|---|---|
| `TYPE t_resultado_*` (RECORD) | `class ResultadoValidacao` (DTO) | Tradução direta de tipos |
| `TYPE t_contexto_*` (RECORD) | `class ContextoCadastro` (DTO) | Dados compartilhados entre BCs |
| Procedure com `OUT` tipado | Método com retorno tipado | Elimina parsing de strings |
| `RAISE_APPLICATION_ERROR` com código | `throw DomainException(code, msg)` | Exceções de domínio |
| Constantes no package spec | `enum` ou `static class` | Valores de domínio |
| Cursor encapsulado no package | `IRepository.ObterPor(...)` | Abstração de acesso a dados |
| `EXCEPTION WHEN` centralizado | `try/catch` no handler | Um ponto de captura |

---

## 3. Tipo Compartilhado: t_contexto_cadastro

O record compartilhado entre todos os packages substitui as ~70 variáveis locais soltas.

### 3.1 Origem dos dados — De onde vem cada campo?

Hoje a procedure funciona assim:

```
  ???????????????????????????????
  ? tb_empresa_internet         ?  ? Tabela de propostas (dados do formulário web)
  ?   SELECT * WHERE            ?
  ?   nu_controle = p_nu_controle?
  ?   AND fl_status IN (0, 8)   ?
  ???????????????????????????????
             ? cursor cr_empresa_internet
             ?
  ???????????????????????????????
  ? FOR st_e IN cr_empresa_     ?  ? Cada st_e contém TODOS os campos da proposta
  ?            internet LOOP    ?
  ?                             ?
  ?   st_e.nu_cgc_cpf           ?  ? Dados do formulário (vêm direto da tabela)
  ?   st_e.nm_pessoa_razao_social?
  ?   st_e.cd_vendedor_plano    ?
  ?   st_e.cd_modelo_negocio    ?
  ?   st_e.fl_coparticipacao    ?
  ?   st_e.cd_canal_venda       ?
  ?   ... (~70 colunas)         ?
  ???????????????????????????????
             ?
             ?
  ???????????????????????????????
  ? Variáveis locais derivadas  ?  ? Calculados DURANTE a execução
  ?                             ?
  ?   lcd_empresa  (gerado)     ?  ? fn_empresa_conveniada()
  ?   lcd_filial   (resolvido)  ?  ? Lookup em tb_area_venda
  ?   lcd_pessoa   (criado)     ?  ? INSERT em tb_pessoa
  ?   lcd_tabela   (criado)     ?  ? INSERT em tb_tabela_preco
  ?   wnu_controle_odonto       ?  ? COUNT em tb_odon_empresa_internet
  ?   wcd_empresa_plano         ?  ? Lookup por filial
  ?   ... (~20 variáveis)       ?
  ???????????????????????????????
```

O `t_contexto_cadastro` **unifica** esses dois grupos (dados do cursor + derivados) em um único record:

### 3.2 Definição do Package

```sql
CREATE OR REPLACE PACKAGE pk_tipos_cadastro AS

  -- ???????????????????????????????????????????????????
  -- Contexto compartilhado entre todos os packages
  -- Equivale ao ContextoCadastro (aggregate root state) no C#
  --
  -- FONTE DOS DADOS:
  --   Grupo 1 (INPUT):  Campos da tb_empresa_internet (cursor st_e)
  --   Grupo 2 (DERIVADOS): Calculados/gerados durante a execução
  -- ???????????????????????????????????????????????????
  TYPE t_contexto_cadastro IS RECORD (

    -- ??? GRUPO 1: INPUT (vindos de tb_empresa_internet / st_e) ???
    -- Identificadores da proposta
    nu_controle              NUMBER,            -- st_e.nu_controle (PK da proposta)
    nu_cgc_cpf               VARCHAR2(20),      -- st_e.nu_cgc_cpf
    nm_pessoa_razao_social   VARCHAR2(100),      -- st_e.nm_pessoa_razao_social
    nm_fantasia              VARCHAR2(100),      -- st_e.nm_fantasia
    cd_vendedor_plano        NUMBER,             -- st_e.cd_vendedor_plano
    fl_natureza_empresa      NUMBER,             -- st_e.fl_natureza_empresa
    nu_total_empregado       NUMBER,             -- st_e.nu_total_empregado
    dt_dia_pagamento         NUMBER,             -- st_e.dt_dia_pagamento
    ds_endereco_eletronico   VARCHAR2(200),      -- st_e.ds_endereco_eletronico
    nu_caepf                 NUMBER,             -- st_e.nu_caepf
    fl_coparticipacao        VARCHAR2(1),        -- st_e.fl_coparticipacao
    cd_canal_venda           NUMBER,             -- st_e.cd_canal_venda
    pc_desconto              NUMBER,             -- st_e.pc_desconto
    tp_operacao              VARCHAR2(1),        -- st_e.tp_operacao ('1'=inclusão)
    cd_area_venda            NUMBER,             -- st_e.cd_area_venda
    -- ... demais colunas de tb_empresa_internet

    -- ??? GRUPO 2: DERIVADOS (calculados/gerados na execução) ???
    -- São NULL na inicialização; preenchidos por cada package
    nu_controle_odonto       NUMBER,             -- COUNT tb_odon_empresa_internet
    cd_empresa               VARCHAR2(10),       -- fn_empresa_conveniada() (gerado)
    cd_pessoa                NUMBER,             -- INSERT/SELECT tb_pessoa (criado)
    cd_filial                VARCHAR2(5),        -- Lookup tb_area_venda (resolvido)
    cd_empresa_plano         NUMBER,             -- Lookup por filial (resolvido)
    cd_modelo_negocio        NUMBER,             -- NVL(st_e.cd_modelo_negocio, 1)
    fl_tabela_geral          VARCHAR2(1),        -- Flag tabela geral
    cd_tabela_saude          NUMBER,             -- cr_empresa_neg (resolvido)
    nu_controle_neg          NUMBER,             -- cr_empresa_neg.nu_controle
    cd_tabela                NUMBER,             -- INSERT tb_tabela_preco (criado)
    cd_tabela_agregado       NUMBER,             -- INSERT tb_tabela_preco (criado)
    cd_preco_plano           NUMBER,             -- Sequência (gerado)
    fl_origem_bitix          BOOLEAN,            -- cd_canal_venda IN (10,14,16)
    fl_affix                 BOOLEAN,            -- Flag affix derivado
    fl_empresa_nova          VARCHAR2(1),        -- 'S' default, 'N' se já existe
    constante_vl             NUMBER,             -- 1 - (pc_desconto / 100)
    cd_vendedor_original     NUMBER              -- Backup do vendedor original
  );

  -- Resultado padronizado para todas as operações
  TYPE t_resultado IS RECORD (
    fl_sucesso     BOOLEAN,
    cd_erro        NUMBER,
    ds_mensagem    VARCHAR2(1000),
    cd_empresa     VARCHAR2(10)
  );

  -- ???????????????????????????????????????????????????
  -- Função de inicialização do contexto
  -- ???????????????????????????????????????????????????

  -- Monta o contexto a partir do registro do cursor cr_empresa_internet
  FUNCTION fn_montar_contexto(
    p_st_e IN cr_empresa_internet%ROWTYPE
  ) RETURN t_contexto_cadastro;

END pk_tipos_cadastro;
/
```

### 3.3 Inicialização — fn_montar_contexto

A function `fn_montar_contexto` é o **ponto único de inicialização**. Ela faz a "ponte" entre
o cursor antigo (`st_e`) e o novo record tipado (`ctx`):

```sql
CREATE OR REPLACE PACKAGE BODY pk_tipos_cadastro AS

  FUNCTION fn_montar_contexto(
    p_st_e IN cr_empresa_internet%ROWTYPE
  ) RETURN t_contexto_cadastro IS
    v_ctx t_contexto_cadastro;
  BEGIN
    -- ??? GRUPO 1: Copia dados do cursor (input da proposta) ???
    v_ctx.nu_controle            := p_st_e.nu_controle;
    v_ctx.nu_cgc_cpf             := p_st_e.nu_cgc_cpf;
    v_ctx.nm_pessoa_razao_social := p_st_e.nm_pessoa_razao_social;
    v_ctx.nm_fantasia            := p_st_e.nm_fantasia;
    v_ctx.cd_vendedor_plano      := p_st_e.cd_vendedor_plano;
    v_ctx.fl_natureza_empresa    := p_st_e.fl_natureza_empresa;
    v_ctx.nu_total_empregado     := p_st_e.nu_total_empregado;
    v_ctx.dt_dia_pagamento       := p_st_e.dt_dia_pagamento;
    v_ctx.ds_endereco_eletronico := p_st_e.ds_endereco_eletronico;
    v_ctx.nu_caepf               := p_st_e.nu_caepf;
    v_ctx.fl_coparticipacao      := p_st_e.fl_coparticipacao;
    v_ctx.cd_canal_venda         := p_st_e.cd_canal_venda;
    v_ctx.pc_desconto            := p_st_e.pc_desconto;
    v_ctx.tp_operacao            := p_st_e.tp_operacao;
    v_ctx.cd_area_venda          := p_st_e.cd_area_venda;
    -- ... demais colunas

    -- ??? GRUPO 2: Inicializa derivados com defaults ???
    v_ctx.cd_empresa             := NULL;  -- será preenchido por fn_empresa_conveniada()
    v_ctx.cd_pessoa              := NULL;  -- será preenchido por pk_pessoa_juridica
    v_ctx.cd_filial              := NULL;  -- será preenchido por pk_filial_area_venda
    v_ctx.cd_empresa_plano       := 1;    -- default CAEPF
    v_ctx.cd_modelo_negocio      := NVL(p_st_e.cd_modelo_negocio, 1); -- default atacado
    v_ctx.fl_empresa_nova        := 'S';  -- default nova
    v_ctx.fl_origem_bitix        := p_st_e.cd_canal_venda IN (10, 14, 16);
    v_ctx.cd_vendedor_original   := p_st_e.cd_vendedor_plano; -- backup
    v_ctx.nu_controle_odonto     := 0;    -- será resolvido se log habilitado

    -- Constante de desconto
    IF NVL(p_st_e.pc_desconto, 0) > 0 THEN
      v_ctx.constante_vl := 1 - (p_st_e.pc_desconto / 100);
    ELSE
      v_ctx.constante_vl := 1;
    END IF;

    -- Resolve nu_controle_odonto (se log habilitado)
    IF NVL(fn_registro_sistema('FL_LOG_BAIXA_CONTROLE'), 'N') = 'S' THEN
      BEGIN
        SELECT COUNT(1)
          INTO v_ctx.nu_controle_odonto
          FROM tb_odon_empresa_internet od
         WHERE od.nu_controle_saude = p_st_e.nu_controle;
      EXCEPTION
        WHEN OTHERS THEN v_ctx.nu_controle_odonto := 0;
      END;
    END IF;

    RETURN v_ctx;
  END fn_montar_contexto;

END pk_tipos_cadastro;
/
```

### 3.4 Ciclo de vida do contexto

```
  ???????????????????????????????????????????????????????????????????
  ? FOR st_e IN cr_empresa_internet LOOP                           ?
  ?                                                                 ?
  ?   ? INICIALIZAÇÃO (fn_montar_contexto)                         ?
  ?   ctx := pk_tipos_cadastro.fn_montar_contexto(st_e);           ?
  ?   ?????????????????????????????????????????????                ?
  ?   ? ctx.nu_controle      = 12345  ? st_e      ?                ?
  ?   ? ctx.nu_cgc_cpf       = '123..'? st_e      ?                ?
  ?   ? ctx.cd_empresa       = NULL   ? aguardando ?                ?
  ?   ? ctx.cd_pessoa        = NULL   ? aguardando ?                ?
  ?   ? ctx.cd_filial        = NULL   ? aguardando ?                ?
  ?   ?????????????????????????????????????????????                ?
  ?                                                                 ?
  ?   ? VALIDAÇÃO (pk_validacao_proposta)                          ?
  ?   pk_validacao_proposta.pr_validar_campos(ctx);  -- lê ctx      ?
  ?                                                                 ?
  ?   ? ENRIQUECIMENTO (cada package preenche seu campo)           ?
  ?   ctx.cd_empresa := fn_empresa_conveniada();     -- preenche ?  ?
  ?   ctx.cd_filial  := pk_filial.fn_resolver(ctx);  -- preenche ?  ?
  ?   pk_modelo_negocio.pr_resolver(ctx);            -- preenche ?  ?
  ?   pk_pessoa_juridica.pr_criar(ctx);              -- preenche ?  ?
  ?   pk_precificacao.pr_criar(ctx);                 -- preenche ?  ?
  ?   ?????????????????????????????????????????????                ?
  ?   ? ctx.nu_controle      = 12345  ? imutável   ?                ?
  ?   ? ctx.nu_cgc_cpf       = '123..'? imutável   ?                ?
  ?   ? ctx.cd_empresa       = '00456'? preenchido ??                ?
  ?   ? ctx.cd_pessoa        = 78901  ? preenchido ??                ?
  ?   ? ctx.cd_filial        = '001'  ? preenchido ??                ?
  ?   ?????????????????????????????????????????????                ?
  ?                                                                 ?
  ?   ? USO (packages subsequentes lêem o ctx completo)            ?
  ?   pk_empresa_conveniada.pr_criar(ctx);  -- usa cd_empresa       ?
  ?   pk_endereco_comunicacao.pr_criar(ctx);-- usa cd_pessoa        ?
  ?   pk_coparticipacao.pr_criar(ctx);      -- usa cd_empresa       ?
  ?                                                                 ?
  ?   ? COMMIT                                                     ?
  ?   COMMIT;                                                       ?
  ?                                                                 ?
  ?   ? PÓS-COMMIT (usa ctx completo, falhas não causam rollback) ?
  ?   pk_integracao_odonto.pr_espelhar(ctx);                       ?
  ?   pk_notificacao_email.pr_enviar(ctx);                         ?
  ?                                                                 ?
  ? END LOOP;  ? ctx é descartado, novo st_e ? novo ctx            ?
  ???????????????????????????????????????????????????????????????????
```

### 3.5 Equivalência com o código atual

| Código atual (procedure) | Novo (com packages) |
|---|---|
| `st_e.nu_cgc_cpf` | `ctx.nu_cgc_cpf` |
| `lcd_empresa := fn_empresa_conveniada()` | `ctx.cd_empresa := fn_empresa_conveniada()` |
| `lcd_pessoa` (variável solta) | `ctx.cd_pessoa` (campo do record) |
| `lcd_filial` (variável solta) | `ctx.cd_filial` (campo do record) |
| `wnu_controle_odonto` (variável solta) | `ctx.nu_controle_odonto` (campo do record) |
| `wcd_empresa_plano` (variável solta) | `ctx.cd_empresa_plano` (campo do record) |
| `constante_vl` (variável solta) | `ctx.constante_vl` (campo do record) |
| `wcd_vendedor_original` (variável solta) | `ctx.cd_vendedor_original` (campo do record) |
| ~70 variáveis locais espalhadas | 1 record `ctx` tipado e documentado |

---

## 4. Package de Log Centralizado (Primeiro a extrair)

O **BC-14** é o primeiro a ser extraído porque elimina ~396 linhas de boilerplate imediatamente:

```sql
CREATE OR REPLACE PACKAGE pk_log_auditoria AS

  -- Registra erro e faz raise (substitui 30+ blocos de 12 linhas)
  PROCEDURE pr_registra_e_rejeita(
    p_nu_controle        IN NUMBER,
    p_nu_controle_odonto IN NUMBER,
    p_mensagem           IN VARCHAR2,
    p_fl_status          IN VARCHAR2 DEFAULT '15'
  );

  -- Registra log sem raise (para eventos informativos)
  PROCEDURE pr_registra_log(
    p_nu_controle        IN NUMBER,
    p_nu_controle_odonto IN NUMBER,
    p_mensagem           IN VARCHAR2,
    p_fl_status          IN VARCHAR2
  );

  -- Registra pendência (exception handler global)
  PROCEDURE pr_registra_pendencia(
    p_nu_controle   IN NUMBER,
    p_mensagem      IN VARCHAR2
  );

END pk_log_auditoria;
/

CREATE OR REPLACE PACKAGE BODY pk_log_auditoria AS

  PROCEDURE pr_registra_log(
    p_nu_controle        IN NUMBER,
    p_nu_controle_odonto IN NUMBER,
    p_mensagem           IN VARCHAR2,
    p_fl_status          IN VARCHAR2
  ) IS
    v_cd_log NUMBER;
  BEGIN
    -- Guard removido: agora SEMPRE loga, independente de odonto
    -- (corrige RN-14.02 — log condicional a odonto)
    BEGIN
      SELECT NVL(MAX(cd_log), 0) + 1
        INTO v_cd_log
        FROM humaster.tb_log_baixa_controle;

      INSERT INTO humaster.tb_log_baixa_controle
        (cd_log, nu_controle, ds_observacao, fl_status)
      VALUES
        (v_cd_log, p_nu_controle, SUBSTR(p_mensagem, 1, 1024), p_fl_status);
    EXCEPTION
      WHEN OTHERS THEN NULL; -- log nunca falha o fluxo
    END;
  END pr_registra_log;

  PROCEDURE pr_registra_e_rejeita(
    p_nu_controle        IN NUMBER,
    p_nu_controle_odonto IN NUMBER,
    p_mensagem           IN VARCHAR2,
    p_fl_status          IN VARCHAR2 DEFAULT '15'
  ) IS
  BEGIN
    pr_registra_log(p_nu_controle, p_nu_controle_odonto, p_mensagem, p_fl_status);
    RAISE_APPLICATION_ERROR(-20201, p_mensagem);
  END pr_registra_e_rejeita;

  PROCEDURE pr_registra_pendencia(
    p_nu_controle   IN NUMBER,
    p_mensagem      IN VARCHAR2
  ) IS
  BEGIN
    INSERT INTO tb_pendencia_empresa_internet
      (nu_controle_pendencia, cd_pendencia, nu_controle, dt_status, ds_observacao, cd_operador)
    VALUES
      (sq_controle_pendencia.NEXTVAL, 9, p_nu_controle, SYSDATE, p_mensagem, 'HUMASTER');
    COMMIT; -- commit isolado para persistir pendência
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END pr_registra_pendencia;

END pk_log_auditoria;
/
```

### Impacto imediato na procedure

**Antes** (12 linhas por validação × 30+ ocorrências):
```sql
-- critica vendedor do plano
begin
  select 1 into l_aux from tb_vendedor_plano where cd_vendedor_plano = st_e.cd_vendedor_plano;
exception
  when no_data_found then
    if nvl(wnu_controle_odonto, 0) > 0 then
      wsql := substr(sqlerrm, 1, 500);
      begin
        select max(nvl(cb.cd_log, 0)) + 1 into wcd_log from humaster.tb_log_baixa_controle cb;
        insert into humaster.tb_log_baixa_controle (cd_log, nu_controle, ds_observacao, fl_status)
        values (wcd_log, st_e.nu_controle, 'vendedor nao cadastrado ou nao ativo', '15');
      exception when others then null;
      end;
    end if;
    raise_application_error(-20201, 'vendedor nao cadastrado ou nao ativo');
end;
```

**Depois** (3 linhas):
```sql
-- critica vendedor do plano
begin
  select 1 into l_aux from tb_vendedor_plano where cd_vendedor_plano = ctx.cd_vendedor_plano;
exception
  when no_data_found then
    pk_log_auditoria.pr_registra_e_rejeita(ctx.nu_controle, ctx.nu_controle_odonto,
      'vendedor nao cadastrado ou nao ativo');
end;
```

**Resultado:** ~360 linhas eliminadas da procedure só com esta extração.

---

## 5. Package de Validação (Segundo a extrair)

```sql
CREATE OR REPLACE PACKAGE pk_validacao_proposta AS

  PROCEDURE pr_validar_campos(
    p_ctx IN pk_tipos_cadastro.t_contexto_cadastro
  );
  -- Se inválido, faz raise via pk_log_auditoria

END pk_validacao_proposta;
/

CREATE OR REPLACE PACKAGE BODY pk_validacao_proposta AS

  -- ?????????????????????????????????????????????
  -- Helpers privados (eliminam boilerplate)
  -- ?????????????????????????????????????????????
  PROCEDURE validar_obrigatorio(
    p_ctx    IN pk_tipos_cadastro.t_contexto_cadastro,
    p_valor  IN VARCHAR2,
    p_msg    IN VARCHAR2
  ) IS
  BEGIN
    IF p_valor IS NULL THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto, p_msg);
    END IF;
  END;

  PROCEDURE validar_sem_espaco_duplo(
    p_ctx    IN pk_tipos_cadastro.t_contexto_cadastro,
    p_valor  IN VARCHAR2,
    p_campo  IN VARCHAR2
  ) IS
  BEGIN
    IF p_valor IS NOT NULL AND INSTR(p_valor, '  ') > 0 THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'espacos duplos em ' || p_campo || ' nao permitido');
    END IF;
  END;

  -- ?????????????????????????????????????????????
  -- Validação principal — ordem corrigida
  -- ?????????????????????????????????????????????
  PROCEDURE pr_validar_campos(
    p_ctx IN pk_tipos_cadastro.t_contexto_cadastro
  ) IS
    l_aux NUMBER;
  BEGIN
    -- SP01: CNPJ obrigatório (AGORA ANTES do modelo de negócio)
    validar_obrigatorio(p_ctx, p_ctx.nu_cgc_cpf, 'obrigatorio informar cnpj');

    -- SP01: CNPJ dígito verificador
    IF NOT pk_administracao.fn_check_cic(p_ctx.nu_cgc_cpf) IN (1, 2, 3) THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'digito de controle cnpj/cpf incorreto');
    END IF;

    -- SP01: CNPJ lista negra (SEM WHEN OTHERS — corrige issue #2)
    SELECT COUNT(*) INTO l_aux
      FROM tb_pessoa_lista_negra
     WHERE SYSDATE BETWEEN dt_inicial AND dt_final
       AND nu_cpf_cnpj = p_ctx.nu_cgc_cpf;
    IF l_aux > 0 THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'cnpj contem restricao no sistema');
    END IF;

    -- SP21: CAEPF (se CPF)
    IF pk_administracao.fn_check_cic(p_ctx.nu_cgc_cpf) = 1
       AND fn_check_caepf(NVL(p_ctx.nu_caepf, 0)) = 0 THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'numero CAEPF incorreto');
    END IF;

    -- SP02: Vendedor
    BEGIN
      SELECT 1 INTO l_aux
        FROM tb_vendedor_plano
       WHERE cd_vendedor_plano = p_ctx.cd_vendedor_plano;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        pk_log_auditoria.pr_registra_e_rejeita(
          p_ctx.nu_controle, p_ctx.nu_controle_odonto,
          'vendedor nao cadastrado ou nao ativo');
    END;

    -- SP04: Natureza empresa
    validar_obrigatorio(p_ctx, TO_CHAR(p_ctx.fl_natureza_empresa),
      'obrigatorio informar a natureza da empresa');
    IF p_ctx.fl_natureza_empresa NOT IN (0,1,2,3,4,5,6,7,8,9) THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'escolha natureza empresa valida');
    END IF;

    -- SP05: Total empregados
    IF NVL(p_ctx.nu_total_empregado, 0) = 0 THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'necessario informar quantidade beneficiarios contratados.');
    END IF;

    -- SP19: Razão social
    validar_obrigatorio(p_ctx, p_ctx.nm_pessoa_razao_social,
      'obrigatorio informar a razao social');
    validar_sem_espaco_duplo(p_ctx, p_ctx.nm_pessoa_razao_social, 'razao social');

    -- SP06: Nome fantasia
    validar_obrigatorio(p_ctx, p_ctx.nm_fantasia,
      'obrigatorio informar um nome de fantasia');
    validar_sem_espaco_duplo(p_ctx, p_ctx.nm_fantasia, 'nome de fantasia');

    -- ... (demais validações seguem o mesmo padrão)

    -- SP16: Dia pagamento
    IF NVL(p_ctx.dt_dia_pagamento, 0) NOT BETWEEN 1 AND 30 THEN
      pk_log_auditoria.pr_registra_e_rejeita(
        p_ctx.nu_controle, p_ctx.nu_controle_odonto,
        'dia pagamento dever estar na faixa 01-30');
    END IF;

    -- SP15: E-mail (validação melhorada)
    IF p_ctx.ds_endereco_eletronico IS NOT NULL THEN
      IF INSTR(p_ctx.ds_endereco_eletronico, ' ') > 0
         OR INSTR(p_ctx.ds_endereco_eletronico, '@') = 0
         OR INSTR(p_ctx.ds_endereco_eletronico, '.') = 0 THEN
        pk_log_auditoria.pr_registra_e_rejeita(
          p_ctx.nu_controle, p_ctx.nu_controle_odonto,
          'endereco eletronico nao valido');
      END IF;
    END IF;

  END pr_validar_campos;

END pk_validacao_proposta;
/
```

---

## 6. Todos os 18 Packages — Spec e Mapeamento

| # | Package PL/SQL | BC | Procedures Principais | Futuro C# Service |
|---|---|---|---|---|
| 1 | `pk_tipos_cadastro` | — | Types/Records compartilhados | `ContextoCadastro.cs`, DTOs |
| 2 | `pk_log_auditoria` | BC-14 | `pr_registra_e_rejeita`, `pr_registra_log`, `pr_registra_pendencia` | `IAuditService` |
| 3 | `pk_validacao_proposta` | BC-02 | `pr_validar_campos` | `IValidacaoPropostaService` + 21 Specifications |
| 4 | `pk_pessoa_juridica` | BC-03 | `pr_criar_pessoa`, `pr_atualizar_pessoa` | `IPessoaJuridicaService` |
| 5 | `pk_endereco_comunicacao` | BC-04 | `pr_criar_endereco`, `pr_criar_contato`, `pr_criar_meios_comunicacao` | `IEnderecoService` |
| 6 | `pk_filial_area_venda` | BC-05 | `fn_resolver_filial`, `fn_resolver_empresa_plano` | `IFilialService` |
| 7 | `pk_modelo_negocio` | BC-06 | `fn_resolver_modelo_sigo`, `fn_resolver_modelo_bitix` | `IModeloNegocioStrategy` |
| 8 | `pk_precificacao` | BC-07 | `pr_criar_tabela_preco`, `pr_criar_valor_plano` | `IPrecificacaoService` |
| 9 | `pk_empresa_conveniada` | BC-08 | `pr_criar_empresa_conveniada`, `pr_criar_unidade`, `pr_criar_parametros` | `IEmpresaConveniadaService` |
| 10 | `pk_coparticipacao` | BC-09 | `pr_criar_controle_fator`, `pr_criar_terapias`, `pr_criar_isencoes` | `ICoparticipacaoService` |
| 11 | `pk_carencia` | BC-10 | `pr_criar_compra_carencia`, `pr_criar_grupos_modulos` | `ICarenciaService` |
| 12 | `pk_fidelizacao` | BC-11 | `pr_criar_fidelizacao` | `IFidelizacaoService` |
| 13 | `pk_acesso_internet` | BC-12 | `pr_criar_acesso`, `pr_criar_controles`, `pr_atualizar_provisorios` | `IAcessoPortalService` |
| 14 | `pk_integracao_odonto` | BC-13 | `pr_espelhar_odonto`, `pr_super_simples` | `IOdontologiaService` (ACL) |
| 15 | `pk_reembolso` | BC-15 | `pr_configurar_reembolso` | `IReembolsoService` |
| 16 | `pk_minimo_contratual` | BC-16 | `pr_criar_minimo_contratual`, `pr_criar_breakeven` | `IMinimoContratualService` |
| 17 | `pk_notificacao_email` | BC-17 | `pr_enviar_efetivacao` | `INotificacaoService` |
| 18 | `pk_desconto_pim` | BC-18 | `pr_aplicar_desconto_pim` | `IDescontoPimService` |

---

## 7. Procedure Orquestradora Refatorada (~200 linhas)

Após extrair os 18 packages, a `pr_cadastramento_empresa_prov` vira um orquestrador fino:

```sql
CREATE OR REPLACE PROCEDURE pr_cadastramento_empresa_prov(
  p_nu_controle   IN NUMBER,
  p_erro_controle  OUT VARCHAR2
) IS
  ctx  pk_tipos_cadastro.t_contexto_cadastro;
  res  pk_tipos_cadastro.t_resultado;
BEGIN

  -- ???????????????????????????????????????????????
  -- LOOP: Para cada proposta elegível
  -- ???????????????????????????????????????????????
  FOR st_e IN cr_empresa_internet(p_nu_controle) LOOP
    BEGIN
      -- Popula contexto a partir do cursor
      ctx := pk_tipos_cadastro.fn_montar_contexto(st_e);

      -- ??? CAMADA 4: Validação de Campos ???
      pk_validacao_proposta.pr_validar_campos(ctx);

      -- ??? BC-01: Gerar código empresa ???
      ctx.cd_empresa := fn_empresa_conveniada();

      -- ??? BC-05: Resolver filial ???
      ctx.cd_filial := pk_filial_area_venda.fn_resolver_filial(ctx);
      ctx.cd_empresa_plano := pk_filial_area_venda.fn_resolver_empresa_plano(ctx);

      -- ??? BC-06: Resolver modelo de negócio ???
      pk_modelo_negocio.pr_resolver_modelo(ctx);

      -- ??? BC-03: Criar/atualizar pessoa jurídica ???
      pk_pessoa_juridica.pr_criar_pessoa(ctx);

      -- ??? BC-07: Criar tabela de preço ???
      pk_precificacao.pr_criar_tabela_preco(ctx);

      -- ??? BC-08: Criar empresa conveniada ???
      pk_empresa_conveniada.pr_criar_empresa_conveniada(ctx);

      -- ??? BC-04: Endereço e comunicação ???
      pk_endereco_comunicacao.pr_criar_endereco(ctx);
      pk_endereco_comunicacao.pr_criar_contato(ctx);
      pk_endereco_comunicacao.pr_criar_meios_comunicacao(ctx);

      -- ??? BC-09: Coparticipação ???
      IF ctx.fl_coparticipacao = 'S' THEN
        pk_coparticipacao.pr_criar_controle_fator(ctx);
      END IF;

      -- ??? BC-10: Carência ???
      pk_carencia.pr_criar_compra_carencia(ctx);

      -- ??? BC-11: Fidelização ???
      pk_fidelizacao.pr_criar_fidelizacao(ctx);

      -- ??? BC-12: Acesso internet ???
      pk_acesso_internet.pr_criar_acesso(ctx);

      -- ??? BC-15: Reembolso ???
      pk_reembolso.pr_configurar_reembolso(ctx);

      -- ??? BC-16: Mínimo contratual e breakeven ???
      pk_minimo_contratual.pr_criar_minimo_contratual(ctx);
      pk_minimo_contratual.pr_criar_breakeven(ctx);

      -- ???????????????????????????????????????????????
      -- COMMIT — ponto único de transação
      -- ???????????????????????????????????????????????
      COMMIT;

      -- ??? Pós-COMMIT (falhas não causam rollback) ???

      -- BC-13: Integração odontológica (ACL)
      pk_integracao_odonto.pr_espelhar_odonto(ctx);
      pk_integracao_odonto.pr_super_simples(ctx);

      -- BC-17: Notificação e-mail
      pk_notificacao_email.pr_enviar_efetivacao(ctx);

      -- BC-18: Desconto PIM
      pk_desconto_pim.pr_aplicar_desconto_pim(ctx);

      -- Resultado
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
/
```

---

## 8. Ordem de Extração (Roadmap)

A extração segue uma ordem que maximiza valor e minimiza risco:

### Fase 0 — Infraestrutura (semana 1)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 1 | `pk_tipos_cadastro` | Types compartilhados — pré-requisito para todos | 0 linhas removidas |
| 2 | `pk_log_auditoria` | Elimina ~396 linhas de boilerplate imediato | -396 linhas |

### Fase 1 — Validação (semana 2)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 3 | `pk_validacao_proposta` | 33 validações concentradas, corrige ordem | -700 linhas |
| 4 | `pk_filial_area_venda` | Resolução de filial (pré-requisito para modelo) | -80 linhas |

### Fase 2 — Modelo e Preço (semana 3-4)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 5 | `pk_modelo_negocio` | Separação SIGO/BITIX (Strategy prep) | -400 linhas |
| 6 | `pk_precificacao` | Tabelas de preço, valor plano, franquia | -350 linhas |
| 7 | `pk_pessoa_juridica` | Criação/update tb_pessoa | -100 linhas |

### Fase 3 — Core do Contrato (semana 5-7)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 8 | `pk_empresa_conveniada` | INSERT principal (~60 colunas) + unidade + parametros | -800 linhas |
| 9 | `pk_endereco_comunicacao` | Endereço, contato, meios comunicação | -300 linhas |
| 10 | `pk_coparticipacao` | Fatores, terapias, isenções, internação PJ | -400 linhas |

### Fase 4 — Complementos (semana 8-9)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 11 | `pk_carencia` | Compra de carência, grupos, módulos | -200 linhas |
| 12 | `pk_fidelizacao` | Fidelização contratual | -50 linhas |
| 13 | `pk_acesso_internet` | Acesso portal, controles, provisório?definitivo | -250 linhas |
| 14 | `pk_reembolso` | DELETE+INSERT 4 sub-tabelas | -200 linhas |

### Fase 5 — Pós-COMMIT e ACL (semana 10)

| # | Package | Motivo | Impacto |
|---|---------|--------|---------|
| 15 | `pk_integracao_odonto` | ACL — separa domínio odonto | -100 linhas |
| 16 | `pk_minimo_contratual` | Mínimo contratual + breakeven | -80 linhas |
| 17 | `pk_notificacao_email` | E-mail Hapvida vs RN Saúde | -120 linhas |
| 18 | `pk_desconto_pim` | Desconto PIM | -30 linhas |

### Resultado acumulado

```
Fase 0: 5.000 ? 4.604 linhas (-396)   ?????????? 8%
Fase 1: 4.604 ? 3.824 linhas (-780)   ?????????? 24%
Fase 2: 3.824 ? 2.974 linhas (-850)   ?????????? 41%
Fase 3: 2.974 ? 1.474 linhas (-1500)  ?????????? 71%
Fase 4: 1.474 ?  774 linhas (-700)    ?????????? 85%
Fase 5:   774 ?  ~200 linhas (-574)   ?????????? 96%

Procedure final: ~200 linhas (orquestrador puro)
```

---

## 9. Estratégia de Testes

### 9.1 Testes no PL/SQL (garantia durante refatoração)

Cada package é testável isoladamente via utPLSQL:

```sql
CREATE OR REPLACE PACKAGE ut_pk_validacao_proposta AS
  -- %suite(Validação de Proposta)

  -- %test(CNPJ nulo deve rejeitar)
  PROCEDURE test_cnpj_nulo_rejeita;

  -- %test(CNPJ lista negra deve rejeitar)
  PROCEDURE test_cnpj_lista_negra_rejeita;

  -- %test(Vendedor inexistente deve rejeitar)
  PROCEDURE test_vendedor_inexistente_rejeita;

  -- %test(Proposta válida deve passar)
  PROCEDURE test_proposta_valida_passa;

END ut_pk_validacao_proposta;
/
```

### 9.2 Testes como contrato para migração

Os testes PL/SQL servem como **especificação executável** para os testes C#:

```
  utPLSQL                          xUnit (.NET)
  ????????????????????????         ????????????????????????????
  ? test_cnpj_nulo_      ?  ????   ? CnpjNulo_DeveRejeitar()  ?
  ?   rejeita             ?         ?                          ?
  ? test_cnpj_lista_     ?  ????   ? CnpjListaNegra_Deve      ?
  ?   negra_rejeita       ?         ?   Rejeitar()             ?
  ? test_vendedor_       ?  ????   ? VendedorInexistente_Deve ?
  ?   inexistente_rejeita ?         ?   Rejeitar()             ?
  ????????????????????????         ????????????????????????????
  (tradução mecânica de testes)
```

---

## 10. Como a Migração para C# Fica Mecânica

Quando chegar a hora de migrar, cada package PL/SQL vira um service C#:

```
  PL/SQL (hoje)                      C# (.NET 8) (futuro)
  ?????????????????????              ?????????????????????????????
  pk_tipos_cadastro                  ? ContextoCadastro.cs (record)
  pk_log_auditoria                   ? AuditService : IAuditService
  pk_validacao_proposta              ? ValidacaoPropostaService
                                       + 21 classes Specification
  pk_pessoa_juridica                 ? PessoaJuridicaService
  pk_endereco_comunicacao            ? EnderecoService
  pk_filial_area_venda               ? FilialService
  pk_modelo_negocio                  ? ModeloNegocioFactory
                                       + SigoStrategy
                                       + BitixStrategy
  pk_precificacao                    ? PrecificacaoService
  pk_empresa_conveniada              ? EmpresaConveniadaService
  pk_coparticipacao                  ? CoparticipacaoService
  pk_carencia                        ? CarenciaService
  pk_fidelizacao                     ? FidelizacaoService
  pk_acesso_internet                 ? AcessoPortalService
  pk_integracao_odonto               ? ContratoEfetivadoEventHandler (ACL)
                                       (via Azure Service Bus)
  pk_reembolso                       ? ReembolsoService
  pk_minimo_contratual               ? MinimoContratualService
  pk_notificacao_email               ? ContratoEfetivadoEmailHandler
                                       (via Azure Service Bus)
  pk_desconto_pim                    ? DescontoPimEventHandler
                                       (via Azure Service Bus)

  pr_cadastramento_empresa_prov      ? CadastrarEmpresaCommandHandler
  (orquestrador ~200 linhas)           (MediatR pipeline)
```

### Regras de tradução

| PL/SQL | C# |
|---|---|
| `PROCEDURE pr_xxx(p_ctx IN t_contexto)` | `Task HandleAsync(ContextoCadastro ctx)` |
| `SELECT INTO ... FROM ... WHERE` | `await _repository.ObterPorAsync(...)` |
| `INSERT INTO tabela VALUES (...)` | `_context.Tabela.Add(new Entidade {...})` |
| `RAISE_APPLICATION_ERROR(-20201, msg)` | `throw new DomainException(msg)` |
| `EXCEPTION WHEN NO_DATA_FOUND` | `?? throw` ou `.FirstOrDefault()` |
| `COMMIT` | `await _unitOfWork.SaveChangesAsync()` |
| `NVL(campo, default)` | `campo ?? default` |
| `DECODE(x, 1, 'A', 2, 'B')` | `x switch { 1 => "A", 2 => "B" }` |
| Package spec (types) | Interface + DTOs |
| Package body (lógica) | Classe de implementação |

---

## 11. Princípios de Segurança na Refatoração

| # | Princípio | Descrição |
|---|-----------|-----------|
| 1 | **Zero mudança de comportamento** | Cada extração de package deve produzir exatamente o mesmo resultado. Testes de regressão antes e depois. |
| 2 | **Um package por vez** | Nunca extrair dois packages simultaneamente. Commit/deploy por package. |
| 3 | **Manter procedure original compilando** | A procedure original pode ser compilada a qualquer momento, mesmo durante a refatoração. |
| 4 | **Sinônimos para retrocompatibilidade** | Se algum outro código chama diretamente a procedure, manter sinônimos. |
| 5 | **Feature flag por package** | Cada package pode ser habilitado/desabilitado via `fn_registro_sistema('FK_PKG_xxx')`. |
| 6 | **Rollback plan** | Se um package causar problema, reverter para o código inline na procedure. |

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| `REGRAS-DE-NEGOCIO-POR-CONTEXTO.md` | 152 regras de negócio por BC (fonte das validações) |
| `ddd-modelagem-dominio.md` | Modelagem DDD (Entities, VOs, Aggregates, Services) |
| `README-refatoracao.md` | Roadmap geral de refatoração |

---

*Documento gerado em: 2026-03-11*  
*Procedure analisada: `humaster.pr_cadastramento_empresa_prov` (~5.000 linhas PL/SQL)*  
*Packages alvo: 18 + 1 (tipos) = 19 packages*  
*Resultado: procedure de ~200 linhas orquestradora + packages testáveis e migráveis*
