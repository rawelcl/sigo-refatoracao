# Proposta de Novo Contrato de Retorno: pr_cadastramento_empresa_prov

> **Objetivo:** Definir um contrato de retorno seguro, claro e intuitivo para a
> `pr_cadastramento_empresa_prov`, substituindo o retorno atual baseado em parsing de string.

---

## 1. Diagnostico do Contrato Atual

### 1.1 Assinatura Atual

```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
);
```

### 1.2 Problemas Identificados

**Problema 1: Nome do parametro e enganoso**

O parametro se chama `p_erro_controle`, sugerindo que retorna apenas erros.
Na realidade, retorna **sucesso OU erro** no mesmo campo:

```sql
-- SUCESSO (linha 4898):
p_erro_controle := 'procedimento efetuado para empresa ,' || lcd_empresa;

-- ERRO (linha 4942, dentro do EXCEPTION):
p_erro_controle := SQLERRM;

-- ERRO PARCIAL (linha 4967, empresa criada mas com erro posterior):
p_erro_controle := 'procedimento efetuado para empresa,' || lcd_empresa;

-- ANULACAO (linha 4985, apos registrar pendencia):
p_erro_controle := null;
```

**Problema 2: Parsing fragil via string**

Todos os 4 chamadores extraem o `cd_empresa` assim:

```sql
-- pr_efetiva_internet:
l_empresa_conveniada_saude := substr(p_return, instr(p_return, ',') + 1);

-- pk_venda_json (3 chamadas):
l_emp := substr(w_erro, instr(w_erro, ',') + 1);
```

Riscos:
- Se a mensagem contiver virgula adicional, o parsing quebra
- Se `p_erro_controle` for NULL, `substr` retorna NULL silenciosamente (sem erro, mas dado perdido)
- Se for SQLERRM (erro ORA-), o `substr` extrai lixo: `ORA-06502: PL/SQL: numeric or value error`
  -> apos a virgula, retorna `" numeric or value error"` como cd_empresa
- A `pr_efetiva_internet` **ja trata esse caso** (linha 1256): `if instr(l_empresa_conveniada_saude,'ORA-') > 0`
  -- ou seja, o chamador precisa conhecer os bugs do retorno!

**Problema 3: Semantica ambigua**

| Valor de p_erro_controle | Significado | Sucesso? | cd_empresa disponivel? |
|---|---|---|---|
| `'procedimento efetuado para empresa ,A1234'` | Empresa criada com sucesso | SIM | SIM (apos virgula) |
| `'ORA-00001: unique constraint violated'` | Erro de banco | NAO | NAO |
| `'procedimento efetuado para empresa,A1234'` | Erro parcial (empresa existe) | PARCIAL | SIM (apos virgula) |
| `NULL` | Erro registrado como pendencia | NAO | NAO |

O chamador nao tem como distinguir com seguranca entre sucesso e erro parcial.

**Problema 4: Espaco inconsistente antes da virgula**

```sql
-- Linha 4898 (sucesso):
'procedimento efetuado para empresa ,' || lcd_empresa   -- ESPACO antes da virgula

-- Linha 4967 (erro parcial):
'procedimento efetuado para empresa,' || lcd_empresa    -- SEM espaco antes da virgula
```

Isso nao afeta o parsing (a virgula e o delimitador), mas evidencia a falta de padronizacao.

### 1.3 Chamadores Afetados

| Chamador | Arquivo | Qtd Chamadas | Parsing |
|---|---|---|---|
| `pr_efetiva_internet` | `procedure/pr_efetiva_internet.sql` | 1 | `substr(p_return, instr(p_return, ',') + 1)` + checagem `ORA-` |
| `pk_venda_json.pr_efetiva` | `package_body/pk_venda_json.sql` | 1 | `substr(w_erro, instr(w_erro, ',') + 1)` |
| `pk_venda_json.pr_efetiva_pme` | `package_body/pk_venda_json.sql` | 1 | `substr(w_erro, instr(w_erro, ',') + 1)` |
| `pk_venda_json.pr_efetiva_coligada` | `package_body/pk_venda_json.sql` | 1 | `substr(w_erro, instr(w_erro, ',') + 1)` |

**Total: 4 chamadores**, todos com o mesmo padrao fragil.

---

## 2. Proposta de Novo Contrato

### 2.1 Opcao A: TYPE RECORD (Recomendada)

Criar um TYPE RECORD em um package de tipos, retornando um objeto estruturado:

```sql
-- Package de tipos (pk_types_efetivacao ou pk_efetivacao_types)
CREATE OR REPLACE PACKAGE pk_efetivacao_types AS

    -- Status da efetivacao
    C_STATUS_SUCESSO          CONSTANT VARCHAR2(1) := 'S';
    C_STATUS_ERRO             CONSTANT VARCHAR2(1) := 'E';
    C_STATUS_PARCIAL          CONSTANT VARCHAR2(1) := 'P';

    -- Record de retorno
    TYPE t_resultado_efetivacao IS RECORD (
        fl_status           VARCHAR2(1),          -- 'S'=Sucesso, 'E'=Erro, 'P'=Parcial
        cd_empresa          VARCHAR2(7),           -- Codigo da empresa gerada (NULL se erro)
        cd_empresa_odonto   VARCHAR2(7),           -- Codigo da empresa odonto (NULL se nao houver)
        nu_controle         NUMBER,                -- nu_controle processado
        ds_mensagem         VARCHAR2(2000),         -- Mensagem descritiva
        ds_erro             VARCHAR2(4000),         -- SQLERRM se houver erro (NULL se sucesso)
        cd_erro             NUMBER,                 -- SQLCODE se houver erro (0 se sucesso)
        fl_empresa_existia  VARCHAR2(1),           -- 'S' se empresa ja existia, 'N' se criada nova
        fl_pendencia        VARCHAR2(1)            -- 'S' se gerou pendencia, 'N' se nao
    );

END pk_efetivacao_types;
/
```

**Nova assinatura da procedure:**

```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_resultado     OUT pk_efetivacao_types.t_resultado_efetivacao
);
```

**Uso no chamador (pr_efetiva_internet):**

```sql
-- ANTES (fragil):
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, p_return);
l_empresa_conveniada_saude := substr(p_return, instr(p_return, ',') + 1);
if instr(l_empresa_conveniada_saude,'ORA-') > 0 then
    l_empresa_conveniada_saude := null;
end if;

-- DEPOIS (seguro):
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, v_resultado);
IF v_resultado.fl_status = pk_efetivacao_types.C_STATUS_SUCESSO THEN
    l_empresa_conveniada_saude := v_resultado.cd_empresa;
ELSE
    l_empresa_conveniada_saude := null;
    -- Erro disponivel em v_resultado.ds_erro
END IF;
```

**Vantagens:**
- Zero ambiguidade: `fl_status` separa sucesso de erro
- Acesso direto: `cd_empresa` sem parsing
- Diagnostico: `ds_erro` e `cd_erro` para debugging
- Extensivel: novos campos sem quebrar chamadores
- Type-safe: compilador PL/SQL valida tipos

**Desvantagens:**
- Exige criar um package de tipos (mas e boa pratica)
- Todos os 4 chamadores precisam ser alterados

---

### 2.2 Opcao B: Multiplos Parametros OUT

Manter a procedure com multiplos parametros OUT individuais:

```sql
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle     IN  NUMBER,
    p_cd_empresa      OUT VARCHAR2,       -- Codigo da empresa gerada
    p_fl_status       OUT VARCHAR2,       -- 'S'=Sucesso, 'E'=Erro
    p_ds_mensagem     OUT VARCHAR2,       -- Mensagem descritiva
    p_ds_erro         OUT VARCHAR2        -- SQLERRM se houver erro
);
```

**Uso no chamador:**

```sql
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, l_cd_empresa, l_status, l_msg, l_erro);
IF l_status = 'S' THEN
    l_empresa_conveniada_saude := l_cd_empresa;
END IF;
```

**Vantagens:**
- Nao exige package de tipos
- Simples de implementar
- Cada campo tem seu proprio parametro

**Desvantagens:**
- Poluicao da assinatura (muitos parametros)
- Se precisar de mais informacoes no futuro, precisa alterar a assinatura de novo
- Todos os 4 chamadores precisam ser alterados

---

### 2.3 Opcao C: Adapter/Facade (Compatibilidade total)

Manter a assinatura original E criar uma nova versao sobrecarregada:

```sql
-- VERSAO LEGADO (mantida para compatibilidade):
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
);

-- VERSAO NOVA (tipada):
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_resultado     OUT pk_efetivacao_types.t_resultado_efetivacao
);
```

A versao legado internamente chamaria a nova e converteria o resultado:

```sql
-- Implementacao do adapter legado:
PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
) IS
    v_resultado pk_efetivacao_types.t_resultado_efetivacao;
BEGIN
    -- Chama a versao nova
    pr_cadastramento_empresa_prov(p_nu_controle, v_resultado);

    -- Converte para formato legado
    IF v_resultado.fl_status = 'S' THEN
        p_erro_controle := 'procedimento efetuado para empresa ,' || v_resultado.cd_empresa;
    ELSIF v_resultado.fl_status = 'P' THEN
        p_erro_controle := 'procedimento efetuado para empresa,' || v_resultado.cd_empresa;
    ELSE
        p_erro_controle := v_resultado.ds_erro;
    END IF;
END;
```

**Vantagens:**
- Zero impacto nos chamadores existentes
- Migracao gradual: cada chamador migra quando quiser
- Mantida ate que todos os chamadores migrem

**Desvantagens:**
- Duplicacao temporaria de assinatura
- O overload em PL/SQL exige que ambas estejam no mesmo package (nao funciona em procedures standalone sobrecarregadas)

---

### 2.4 Opcao D: Hibrida (Recomendada para migracao segura)

Combinar Opcao A + Opcao C: criar a nova versao com TYPE RECORD dentro de um package,
e manter a procedure standalone como adapter.

```
FASE 1: Criar o package com a nova versao
---------------------------------------------
pk_efetivacao_types        -- tipos
pk_efetivacao_empresa      -- nova logica refatorada
  .efetivar(nu_controle)   -- retorna t_resultado_efetivacao

FASE 2: Adapter na procedure standalone
---------------------------------------------
pr_cadastramento_empresa_prov(p_nu_controle, p_erro_controle)
  |-- Chama pk_efetivacao_empresa.efetivar(p_nu_controle)
  |-- Converte t_resultado_efetivacao -> p_erro_controle (formato legado)

FASE 3: Migrar chamadores um a um
---------------------------------------------
pr_efetiva_internet       -> migra para pk_efetivacao_empresa.efetivar()
pk_venda_json.pr_efetiva  -> migra para pk_efetivacao_empresa.efetivar()
...

FASE 4: Aposentar a procedure standalone
---------------------------------------------
pr_cadastramento_empresa_prov -> deprecated / removida
```

---

## 3. Recomendacao Final

### Opcao recomendada: D (Hibrida) com TYPE RECORD

**Justificativa:**

1. **Seguranca:** TYPE RECORD e type-safe; impossivel confundir cd_empresa com mensagem de erro
2. **Clareza:** `fl_status = 'S'` e inequivoco; `substr(p_return, instr(p_return, ',') + 1)` nao e
3. **Compatibilidade:** Adapter mantido na Fase 1, migrado gradualmente
4. **Extensibilidade:** Adicionar `cd_empresa_odonto`, `fl_pendencia` etc. sem quebrar ninguem
5. **Alinhamento DDD:** O TYPE RECORD e, em PL/SQL, o equivalente ao `EfetivacaoResult` (Value Object)

### 3.1 Definicao Detalhada do TYPE RECORD

```sql
CREATE OR REPLACE PACKAGE pk_efetivacao_types AS

    -----------------------------------------------------------------
    -- Constantes de Status
    -----------------------------------------------------------------
    C_SUCESSO           CONSTANT VARCHAR2(1) := 'S';  -- Empresa criada/efetivada com sucesso
    C_ERRO              CONSTANT VARCHAR2(1) := 'E';  -- Falha na efetivacao
    C_PARCIAL           CONSTANT VARCHAR2(1) := 'P';  -- Empresa criada mas com erro em etapa posterior

    -----------------------------------------------------------------
    -- Constantes de Etapa (onde ocorreu o erro)
    -----------------------------------------------------------------
    C_ETAPA_VALIDACAO       CONSTANT VARCHAR2(30) := 'VALIDACAO';
    C_ETAPA_PESSOA          CONSTANT VARCHAR2(30) := 'PESSOA_JURIDICA';
    C_ETAPA_EMPRESA         CONSTANT VARCHAR2(30) := 'EMPRESA_CONVENIADA';
    C_ETAPA_TABELA_PRECO    CONSTANT VARCHAR2(30) := 'TABELA_PRECO';
    C_ETAPA_COPARTICIPACAO  CONSTANT VARCHAR2(30) := 'COPARTICIPACAO';
    C_ETAPA_CARENCIA        CONSTANT VARCHAR2(30) := 'CARENCIA';
    C_ETAPA_ENDERECO        CONSTANT VARCHAR2(30) := 'ENDERECO';
    C_ETAPA_ACESSO          CONSTANT VARCHAR2(30) := 'ACESSO_INTERNET';
    C_ETAPA_FIDELIZACAO     CONSTANT VARCHAR2(30) := 'FIDELIZACAO';
    C_ETAPA_REEMBOLSO       CONSTANT VARCHAR2(30) := 'REEMBOLSO';
    C_ETAPA_MINIMO          CONSTANT VARCHAR2(30) := 'MINIMO_CONTRATUAL';
    C_ETAPA_ODONTO          CONSTANT VARCHAR2(30) := 'INTEGRACAO_ODONTO';
    C_ETAPA_NOTIFICACAO     CONSTANT VARCHAR2(30) := 'NOTIFICACAO';
    C_ETAPA_POS_COMMIT      CONSTANT VARCHAR2(30) := 'POS_COMMIT';

    -----------------------------------------------------------------
    -- Record de Resultado da Efetivacao
    -----------------------------------------------------------------
    TYPE t_resultado_efetivacao IS RECORD (
        -- Identificacao
        nu_controle          NUMBER,               -- Controle processado
        cd_empresa           VARCHAR2(7),           -- Codigo empresa saude gerada (NULL se erro antes da criacao)
        cd_empresa_odonto    VARCHAR2(7),           -- Codigo empresa odonto gerada (NULL se nao houver)
        cd_pessoa            NUMBER,                -- Codigo pessoa juridica criada/atualizada

        -- Status
        fl_status            VARCHAR2(1),           -- 'S'=Sucesso, 'E'=Erro, 'P'=Parcial
        fl_empresa_nova      VARCHAR2(1),           -- 'S'=Criada nova, 'N'=Reefetivada (empresa ja existia pendente)
        fl_pendencia_gerada  VARCHAR2(1),           -- 'S'=Gerou pendencia, 'N'=Nao

        -- Detalhes do resultado
        ds_mensagem          VARCHAR2(2000),        -- Mensagem legivel para log/debug
        ds_etapa_erro        VARCHAR2(30),          -- Etapa onde ocorreu o erro (NULL se sucesso)

        -- Informacoes de erro
        cd_sqlcode           NUMBER,                -- SQLCODE do erro (0 se sucesso)
        ds_sqlerrm           VARCHAR2(4000),        -- SQLERRM do erro (NULL se sucesso)

        -- Metadados do processamento
        cd_filial            VARCHAR2(3),           -- Filial resolvida
        cd_modelo_negocio    NUMBER,                -- Modelo de negocio utilizado
        cd_canal_venda       NUMBER,                -- Canal: 1=PIM, 2=Middle, NULL=outros
        cd_tabela_preco      NUMBER,                -- Tabela de preco criada
        dt_processamento     DATE                   -- Data/hora do processamento
    );

    -----------------------------------------------------------------
    -- Funcoes utilitarias
    -----------------------------------------------------------------

    -- Cria resultado de sucesso
    FUNCTION sucesso(
        p_nu_controle     IN NUMBER,
        p_cd_empresa      IN VARCHAR2,
        p_cd_pessoa       IN NUMBER    DEFAULT NULL,
        p_fl_empresa_nova IN VARCHAR2  DEFAULT 'S',
        p_cd_filial       IN VARCHAR2  DEFAULT NULL,
        p_cd_modelo_neg   IN NUMBER    DEFAULT NULL,
        p_cd_canal_venda  IN NUMBER    DEFAULT NULL,
        p_cd_tabela_preco IN NUMBER    DEFAULT NULL,
        p_ds_mensagem     IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao;

    -- Cria resultado de erro
    FUNCTION erro(
        p_nu_controle   IN NUMBER,
        p_cd_empresa    IN VARCHAR2  DEFAULT NULL,
        p_ds_etapa      IN VARCHAR2  DEFAULT NULL,
        p_cd_sqlcode    IN NUMBER    DEFAULT SQLCODE,
        p_ds_sqlerrm    IN VARCHAR2  DEFAULT SQLERRM,
        p_ds_mensagem   IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao;

    -- Cria resultado parcial (empresa criada, mas com erro em etapa posterior)
    FUNCTION parcial(
        p_nu_controle   IN NUMBER,
        p_cd_empresa    IN VARCHAR2,
        p_ds_etapa_erro IN VARCHAR2,
        p_cd_sqlcode    IN NUMBER    DEFAULT SQLCODE,
        p_ds_sqlerrm    IN VARCHAR2  DEFAULT SQLERRM,
        p_ds_mensagem   IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao;

    -- Verifica se resultado e sucesso
    FUNCTION is_sucesso(p_resultado IN t_resultado_efetivacao) RETURN BOOLEAN;

    -- Verifica se resultado tem empresa criada (sucesso ou parcial)
    FUNCTION has_empresa(p_resultado IN t_resultado_efetivacao) RETURN BOOLEAN;

    -- Converte para formato legado (compatibilidade com chamadores existentes)
    FUNCTION to_legado(p_resultado IN t_resultado_efetivacao) RETURN VARCHAR2;

END pk_efetivacao_types;
/
```

### 3.2 Implementacao do Package Body

```sql
CREATE OR REPLACE PACKAGE BODY pk_efetivacao_types AS

    FUNCTION sucesso(
        p_nu_controle     IN NUMBER,
        p_cd_empresa      IN VARCHAR2,
        p_cd_pessoa       IN NUMBER    DEFAULT NULL,
        p_fl_empresa_nova IN VARCHAR2  DEFAULT 'S',
        p_cd_filial       IN VARCHAR2  DEFAULT NULL,
        p_cd_modelo_neg   IN NUMBER    DEFAULT NULL,
        p_cd_canal_venda  IN NUMBER    DEFAULT NULL,
        p_cd_tabela_preco IN NUMBER    DEFAULT NULL,
        p_ds_mensagem     IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao IS
        v_r t_resultado_efetivacao;
    BEGIN
        v_r.nu_controle         := p_nu_controle;
        v_r.cd_empresa          := p_cd_empresa;
        v_r.cd_pessoa           := p_cd_pessoa;
        v_r.fl_status           := C_SUCESSO;
        v_r.fl_empresa_nova     := p_fl_empresa_nova;
        v_r.fl_pendencia_gerada := 'N';
        v_r.ds_mensagem         := NVL(p_ds_mensagem, 'Empresa ' || p_cd_empresa || ' efetivada com sucesso');
        v_r.ds_etapa_erro       := NULL;
        v_r.cd_sqlcode          := 0;
        v_r.ds_sqlerrm          := NULL;
        v_r.cd_filial           := p_cd_filial;
        v_r.cd_modelo_negocio   := p_cd_modelo_neg;
        v_r.cd_canal_venda      := p_cd_canal_venda;
        v_r.cd_tabela_preco     := p_cd_tabela_preco;
        v_r.dt_processamento    := SYSDATE;
        RETURN v_r;
    END;

    FUNCTION erro(
        p_nu_controle   IN NUMBER,
        p_cd_empresa    IN VARCHAR2  DEFAULT NULL,
        p_ds_etapa      IN VARCHAR2  DEFAULT NULL,
        p_cd_sqlcode    IN NUMBER    DEFAULT SQLCODE,
        p_ds_sqlerrm    IN VARCHAR2  DEFAULT SQLERRM,
        p_ds_mensagem   IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao IS
        v_r t_resultado_efetivacao;
    BEGIN
        v_r.nu_controle         := p_nu_controle;
        v_r.cd_empresa          := p_cd_empresa;
        v_r.fl_status           := C_ERRO;
        v_r.fl_empresa_nova     := 'N';
        v_r.fl_pendencia_gerada := 'S';
        v_r.ds_mensagem         := NVL(p_ds_mensagem, 'Erro na etapa ' || p_ds_etapa || ': ' || p_ds_sqlerrm);
        v_r.ds_etapa_erro       := p_ds_etapa;
        v_r.cd_sqlcode          := p_cd_sqlcode;
        v_r.ds_sqlerrm          := p_ds_sqlerrm;
        v_r.dt_processamento    := SYSDATE;
        RETURN v_r;
    END;

    FUNCTION parcial(
        p_nu_controle   IN NUMBER,
        p_cd_empresa    IN VARCHAR2,
        p_ds_etapa_erro IN VARCHAR2,
        p_cd_sqlcode    IN NUMBER    DEFAULT SQLCODE,
        p_ds_sqlerrm    IN VARCHAR2  DEFAULT SQLERRM,
        p_ds_mensagem   IN VARCHAR2  DEFAULT NULL
    ) RETURN t_resultado_efetivacao IS
        v_r t_resultado_efetivacao;
    BEGIN
        v_r.nu_controle         := p_nu_controle;
        v_r.cd_empresa          := p_cd_empresa;
        v_r.fl_status           := C_PARCIAL;
        v_r.fl_empresa_nova     := 'S';
        v_r.fl_pendencia_gerada := 'S';
        v_r.ds_mensagem         := NVL(p_ds_mensagem, 'Empresa ' || p_cd_empresa || ' criada com erro na etapa ' || p_ds_etapa_erro);
        v_r.ds_etapa_erro       := p_ds_etapa_erro;
        v_r.cd_sqlcode          := p_cd_sqlcode;
        v_r.ds_sqlerrm          := p_ds_sqlerrm;
        v_r.dt_processamento    := SYSDATE;
        RETURN v_r;
    END;

    FUNCTION is_sucesso(p_resultado IN t_resultado_efetivacao) RETURN BOOLEAN IS
    BEGIN
        RETURN p_resultado.fl_status = C_SUCESSO;
    END;

    FUNCTION has_empresa(p_resultado IN t_resultado_efetivacao) RETURN BOOLEAN IS
    BEGIN
        RETURN p_resultado.cd_empresa IS NOT NULL;
    END;

    FUNCTION to_legado(p_resultado IN t_resultado_efetivacao) RETURN VARCHAR2 IS
    BEGIN
        IF p_resultado.fl_status IN (C_SUCESSO, C_PARCIAL) AND p_resultado.cd_empresa IS NOT NULL THEN
            RETURN 'procedimento efetuado para empresa ,' || p_resultado.cd_empresa;
        ELSIF p_resultado.ds_sqlerrm IS NOT NULL THEN
            RETURN p_resultado.ds_sqlerrm;
        ELSE
            RETURN p_resultado.ds_mensagem;
        END IF;
    END;

END pk_efetivacao_types;
/
```

---

## 4. Como Migrar a pr_cadastramento_empresa_prov

### 4.1 Passo 1: Criar o package `pk_efetivacao_types` (acima)

### 4.2 Passo 2: Alterar os pontos de atribuicao na pr_cadastramento_empresa_prov

No codigo atual existem **5 pontos** onde `p_erro_controle` recebe valor:

```
Ponto 1 (linha ~4898): SUCESSO
  p_erro_controle := 'procedimento efetuado para empresa ,' || lcd_empresa;

Ponto 2 (linha ~4942): ERRO (EXCEPTION)
  p_erro_controle := SQLERRM;

Ponto 3 (linha ~4967): PARCIAL (empresa existe mas houve erro posterior)
  p_erro_controle := 'procedimento efetuado para empresa,' || lcd_empresa;

Ponto 4 (linha ~4983): Registra pendencia com p_erro_controle na ds_observacao

Ponto 5 (linha ~4985): Anula
  p_erro_controle := null;
```

**Mapeamento para o novo contrato:**

```sql
-- Ponto 1: SUCESSO
p_resultado := pk_efetivacao_types.sucesso(
    p_nu_controle     => p_nu_controle,
    p_cd_empresa      => lcd_empresa,
    p_cd_pessoa       => lcd_pessoa,
    p_cd_filial       => lcd_filial,
    p_cd_modelo_neg   => wcd_modelo_negocio,
    p_cd_canal_venda  => wcd_canal_venda,
    p_cd_tabela_preco => lcd_tabela
);

-- Ponto 2: ERRO (EXCEPTION)
p_resultado := pk_efetivacao_types.erro(
    p_nu_controle => p_nu_controle,
    p_cd_empresa  => lcd_empresa,  -- pode ser NOT NULL se empresa ja foi criada
    p_ds_etapa    => pk_efetivacao_types.C_ETAPA_POS_COMMIT  -- ou a etapa real
);

-- Ponto 3: PARCIAL (empresa criada com erro posterior)
p_resultado := pk_efetivacao_types.parcial(
    p_nu_controle   => p_nu_controle,
    p_cd_empresa    => lcd_empresa,
    p_ds_etapa_erro => pk_efetivacao_types.C_ETAPA_POS_COMMIT
);

-- Ponto 4: Registra pendencia com resultado na ds_observacao
INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (..., DS_OBSERVACAO, ...)
VALUES (..., p_resultado.ds_mensagem, ...);

-- Ponto 5: Anulacao nao e mais necessaria (resultado ja e auto-descritivo)
```

### 4.3 Passo 3: Adapter para compatibilidade legado

Manter a procedure standalone como wrapper:

```sql
-- Procedure standalone (ADAPTER para compatibilidade):
CREATE OR REPLACE PROCEDURE pr_cadastramento_empresa_prov(
    p_nu_controle   IN  NUMBER,
    p_erro_controle OUT VARCHAR2
) AS
    v_resultado pk_efetivacao_types.t_resultado_efetivacao;
BEGIN
    -- Chama a nova versao dentro do package
    pk_efetivacao_empresa.efetivar(p_nu_controle, v_resultado);

    -- Converte para formato legado
    p_erro_controle := pk_efetivacao_types.to_legado(v_resultado);
END;
/
```

---

## 5. Como Migrar os Chamadores

### 5.1 pr_efetiva_internet (Bloco 3)

```sql
-- =============================================
-- ANTES (linhas 1230-1262):
-- =============================================
pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, p_return);
-- ... (exception handler) ...
if nvl(wfl_log_baixa_pim,'N') = 'S' and wnu_controle_odonto is not null then
    l_empresa_conveniada_saude := substr(nvl(st_e.cd_empresa,substr(p_return, instr(p_return, ',') + 1)),1,5);
    if instr(l_empresa_conveniada_saude,'ORA-') > 0 then
        l_empresa_conveniada_saude := null;
    else
        l_empresa_conveniada_saude := nvl(st_e.cd_empresa,substr(p_return, instr(p_return, ',') + 1));
    end if;
else
    l_empresa_conveniada_saude := nvl(st_e.cd_empresa,substr(p_return, instr(p_return, ',') + 1));
end if;

-- =============================================
-- DEPOIS:
-- =============================================
DECLARE
    v_resultado pk_efetivacao_types.t_resultado_efetivacao;
BEGIN
    pk_efetivacao_empresa.efetivar(ST_E.NU_CONTROLE, v_resultado);

    IF pk_efetivacao_types.has_empresa(v_resultado) THEN
        l_empresa_conveniada_saude := NVL(st_e.cd_empresa, v_resultado.cd_empresa);
    ELSE
        l_empresa_conveniada_saude := NULL;
        -- Log do erro
        INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET
            (NU_CONTROLE_PENDENCIA, CD_PENDENCIA, NU_CONTROLE, DT_STATUS, DS_OBSERVACAO, CD_OPERADOR)
        VALUES
            (SQ_CONTROLE_PENDENCIA.NEXTVAL, 9, ST_E.NU_CONTROLE, SYSDATE,
             v_resultado.ds_mensagem, 'HUMASTER');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback: nao deveria chegar aqui com o novo contrato
        l_empresa_conveniada_saude := NULL;
END;
```

### 5.2 pk_venda_json (3 chamadas, mesmo padrao)

```sql
-- =============================================
-- ANTES (mesmo padrao nas 3 chamadas):
-- =============================================
humaster.pr_cadastramento_empresa_prov(st_e.nu_controle, w_erro);
l_emp := substr(w_erro, instr(w_erro, ',') + 1);

-- =============================================
-- DEPOIS:
-- =============================================
pk_efetivacao_empresa.efetivar(st_e.nu_controle, v_resultado);
l_emp := v_resultado.cd_empresa;  -- Direto, sem parsing
```

---

## 6. Comparacao das Opcoes

| Criterio | A (Record) | B (Multiplos OUT) | C (Overload) | D (Hibrida) |
|---|---|---|---|---|
| **Clareza** | Excelente | Boa | Boa | Excelente |
| **Seguranca** | Excelente | Boa | Boa | Excelente |
| **Extensibilidade** | Excelente | Fraca | Boa | Excelente |
| **Impacto nos chamadores** | Alto (4 chamadores) | Alto (4 chamadores) | Nenhum (adapter) | Nenhum (fase 1) |
| **Complexidade** | Media | Baixa | Media | Media |
| **Alinhamento DDD** | Alto (Value Object) | Baixo | Medio | Alto |
| **Migracao gradual** | Nao | Nao | Sim | **Sim** |
| **Risco** | Medio | Baixo | Baixo | **Minimo** |

**Vencedora: Opcao D (Hibrida)** -- combina o melhor das opcoes A e C.

---

## 7. Cronograma de Migracao

```
Fase 1 (Quick Wins):
  [x] Criar pk_efetivacao_types (spec + body)
  [x] Criar pk_efetivacao_empresa com logica refatorada
  [x] Manter pr_cadastramento_empresa_prov como adapter
  Impacto chamadores: ZERO

Fase 2 (Migracao):
  [ ] Migrar pk_venda_json (3 chamadas) -> pk_efetivacao_empresa.efetivar()
  [ ] Migrar pr_efetiva_internet (1 chamada) -> pk_efetivacao_empresa.efetivar()
  [ ] Testes de regressao por chamador

Fase 3 (Deprecacao):
  [ ] Marcar pr_cadastramento_empresa_prov standalone como DEPRECATED
  [ ] Manter por 1 ciclo de release para garantir rollback
  [ ] Remover procedure standalone
```

---

## 8. Exemplo Completo de Uso do Novo Contrato

```sql
-- ===============================================================
-- Exemplo: Como o chamador trabalha com o novo contrato
-- ===============================================================
DECLARE
    v_resultado pk_efetivacao_types.t_resultado_efetivacao;
BEGIN
    -- Chama a efetivacao
    pk_efetivacao_empresa.efetivar(12345, v_resultado);

    -- Verifica resultado
    CASE v_resultado.fl_status
        WHEN pk_efetivacao_types.C_SUCESSO THEN
            DBMS_OUTPUT.PUT_LINE('Empresa criada: ' || v_resultado.cd_empresa);
            DBMS_OUTPUT.PUT_LINE('Filial: ' || v_resultado.cd_filial);
            DBMS_OUTPUT.PUT_LINE('Tabela: ' || v_resultado.cd_tabela_preco);

        WHEN pk_efetivacao_types.C_PARCIAL THEN
            DBMS_OUTPUT.PUT_LINE('Empresa criada com pendencia: ' || v_resultado.cd_empresa);
            DBMS_OUTPUT.PUT_LINE('Erro na etapa: ' || v_resultado.ds_etapa_erro);
            DBMS_OUTPUT.PUT_LINE('Detalhe: ' || v_resultado.ds_sqlerrm);

        WHEN pk_efetivacao_types.C_ERRO THEN
            DBMS_OUTPUT.PUT_LINE('Falha na efetivacao');
            DBMS_OUTPUT.PUT_LINE('Etapa: ' || v_resultado.ds_etapa_erro);
            DBMS_OUTPUT.PUT_LINE('SQLCODE: ' || v_resultado.cd_sqlcode);
            DBMS_OUTPUT.PUT_LINE('SQLERRM: ' || v_resultado.ds_sqlerrm);
    END CASE;

    -- Informacoes de diagnostico sempre disponiveis
    DBMS_OUTPUT.PUT_LINE('Processado em: ' || TO_CHAR(v_resultado.dt_processamento, 'DD/MM/YYYY HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('Mensagem: ' || v_resultado.ds_mensagem);
END;
/
```

---

*Documento gerado em: Fevereiro 2026*  
*Relacionado a: `analise-impacto-pr-efetiva-internet.md`*  
*Procedure: `pr_cadastramento_empresa_prov` -- 4 chamadores identificados*
