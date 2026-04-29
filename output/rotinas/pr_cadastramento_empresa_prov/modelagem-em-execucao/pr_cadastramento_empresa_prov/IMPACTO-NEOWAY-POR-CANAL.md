# Impacto da Neoway por Canal de Acionamento da Proposta

> **Objetivo deste documento**
> Esclarecer, de forma objetiva, **se e como a Neoway pode impedir ou permitir** o acionamento
> da `pr_cadastramento_empresa_prov` dependendo do **canal de entrada** da proposta e do
> **tipo de operador** (BITIX ou não BITIX).
>
> **Canais analisados:** `T229B` · `pr_efetiva_internet` · `pk_venda_json`
> **Procedure alvo:** `humaster.pr_cadastramento_empresa_prov`
> **Data:** 2026-03-12

---

## Sumário

1. [Visão Geral da Arquitetura Neoway](#1-visão-geral-da-arquitetura-neoway)
2. [Onde a Neoway Atua — Mapa de Camadas](#2-onde-a-neoway-atua--mapa-de-camadas)
3. [Canal T229B](#3-canal-t229b)
4. [Canal pr\_efetiva\_internet](#4-canal-pr_efetiva_internet)
5. [Canal pk\_venda\_json (BITIX)](#5-canal-pk_venda_json-bitix)
6. [Tabela Consolidada de Decisão](#6-tabela-consolidada-de-decisão)
7. [Cenários Práticos](#7-cenários-práticos)
8. [Glossário Técnico](#8-glossário-técnico)

---

## 1. Visão Geral da Arquitetura Neoway

A Neoway é um serviço externo de **certificação e higienização de dados cadastrais de pessoas
físicas** (beneficiários). No contexto do processamento de propostas PJ, ela atua em
**uma única camada** — a validação dos **beneficiários** (titulares e dependentes) —
por meio de dois executores distintos dependendo do canal:

| Executor | Canal | O que faz | Onde grava o resultado |
|----------|-------|-----------|----------------------|
| `pr_critica_internet_saude_81` | `pr_efetiva_internet` | Compara nome, CPF e data de nascimento do beneficiário contra a base Neoway e Hapvida. Insere crítica `081vi-...` se divergir. | `tb_usuario_critica_internet` |
| `PR_VE_DIVERGENCIA_NEOWAY` | `pk_venda_json` | Itera por todos os titulares e dependentes da proposta, chama `pr_verifica_divergencia` (processo 33) que invoca `pk_neoway.fn_divergencia_neoway` para checar CPF/nome. Se divergir, grava `fl_status_processamento = '17'` no beneficiário. | `tb_usuario_titular_internet.fl_status_processamento` / `tb_usuario_dependente_internet.fl_status_processamento` |

> ?? **Correção importante:** Não existe "validação de dados cadastrais da empresa" pela Neoway.
> A Neoway valida **dados de pessoas físicas** (beneficiários). O `cd_pendencia = 12` na
> `tb_pendencia_empresa_internet` é uma **pendência de empresa** gerada pelo orquestrador
> (`fn_checa_divergencia` / `pr_efetiva_internet`) como consequência da divergência detectada
> nos beneficiários, mas a validação em si recai sobre CPF, nome e data de nascimento das pessoas.

> **Ponto central:** A `pr_cadastramento_empresa_prov` em si **não contém nenhuma referência à
> Neoway**. O bloqueio — quando existe — é sempre decidido pelo **orquestrador** antes de acionar
> o cadastramento.

---

## 2. Onde a Neoway Atua — Mapa de Camadas

```
???????????????????????????????????????????????????????????????????????
?  ENTRADA DA PROPOSTA                                                ?
?                                                                     ?
?   T229B ??????????????????????????????????????????????????????????? ?
?   pr_efetiva_internet ????????????????????????????????????????????? ?
?   pk_venda_json (BITIX) ??????????????????????????????????????????? ?
???????????????????????????????????????????????????????????????????????
                           ?
         ??????????????????????????????????????
         ?                                    ?
         ? pr_efetiva_internet                ? pk_venda_json
         ?                                    ?
         ?                                    ?
???????????????????????             ????????????????????????????
? pr_critica_internet ?             ? PR_VE_DIVERGENCIA_NEOWAY ?
? _saude_81           ?             ?                          ?
?                     ?             ? Itera titulares e deps.  ?
? Verifica:           ?             ? ? pr_verifica_divergencia?
?  CPF, nome,         ?             ?   (pcd_processo = 33)    ?
?  data nascimento    ?             ? ? pk_neoway.             ?
?  de cada benef.     ?             ?   fn_divergencia_neoway  ?
?                     ?             ?                          ?
? BITIX ? PULADO      ?             ? Controlada por parâmetro ?
? Outros ? executa    ?             ? PR_VE_DIVERGENCIA_       ?
???????????????????????             ? NEOWAY_FLAG              ?
           ?                        ????????????????????????????
           ?                                    ?
           ?  Se divergência                    ? Se divergência
           ?                                    ?
  tb_usuario_critica_internet        fl_status_processamento = '17'
  (crítica 081vi-...)                em titular / dependente
           ?                                    ?
           ??????????????????????????????????????
                            ?
             ???????????????????????????????
             ?  PORTÃO DO ORQUESTRADOR     ?
             ?                             ?
             ?  pr_efetiva_internet:       ?
             ?    COUNT_PENDENCIAS = 0?    ?
             ?  pk_venda_json:             ?
             ?    COUNT_VALIDA = 0?        ?
             ?    (fn_get_criticas_        ?
             ?     pendencias)             ?
             ???????????????????????????????
                            ?
             ???????????????????????????????
             ? SIM                         ? NÃO
             ?                             ?
pr_cadastramento_empresa_prov         BLOQUEADO
     é acionada                  (status 1, 7, 9 ou pendente)
```

---

## 3. Canal T229B

### O que é o T229B?

T229B é a **origem identificadora** de propostas geradas pelos pontos comerciais externos (ex:
corretores, parceiros). A baixa dessas propostas pode ocorrer de forma **automática** quando o
`pk_venda_json` processa a fila de status 6.

### Como a Neoway se comporta neste canal

O `pk_venda_json` possui uma procedure interna chamada `pr_efetiva_baixa_manual`, que ao ser
invocada para origem `T229B` passa **`p_revalidar_pendencias = 'N'`** (modo de não revalidação).

```sql
-- pk_venda_json — pr_efetiva_baixa_manual (linha ~1227)
if (fn_get_confopera_emp(st_e.nu_controle) = 0) or
   (p_revalidar_pendencias = 'N') -- vem 'N' quando eh executada pela baixa automatica T229B
 then
  IF l_emp IS NOT NULL THEN
    update tb_proposta_venda set fl_status = 7 ...  -- "caminho feliz do PRE"
  END IF;
```

E o portão de acionamento usa a mesma flag:

```sql
COUNT_VALIDA := fn_get_criticas_pendencias(st_e.nu_controle, 'N');

IF COUNT_VALIDA = 0 THEN
    humaster.pr_cadastramento_empresa_prov(st_e.nu_controle, w_erro);
END IF;
```

### O que `fn_get_criticas_pendencias` conta no modo `'N'`?

No modo `'N'`, a função conta **apenas críticas de beneficiários** (`tb_usuario_critica_internet`).
As pendências de empresa — incluindo **`cd_pendencia = 12` (divergência Neoway da empresa)** —
são **deliberadamente ignoradas**.

### Impacto por tipo de operador

| Tipo | Crítica de beneficiário (Neoway CPF/nome) | Pendência empresa (cd_pendencia=12) | `pr_cadastramento_empresa_prov` é acionada? |
|------|------------------------------------------|-------------------------------------|---------------------------------------------|
| **BITIX** | Não gerada (`pr_critica_internet_saude_81` pulada) | Não gerada (SACTI 1789837) | ? **SIM** — COUNT_VALIDA = 0 |
| **Não BITIX** | Gerada se houver divergência | **Ignorada** no modo `'N'` | ? **SIM**, desde que não haja crítica de beneficiário |

> ?? **Atenção:** Para T229B/não BITIX, a pendência Neoway da empresa (cd_pendencia=12) **não
> bloqueia** o cadastramento porque é filtrada pelo modo `'N'`. Apenas críticas de beneficiário
> (nome/CPF divergente) podem bloquear.

---

## 4. Canal pr\_efetiva\_internet

### O que é a pr\_efetiva\_internet?

É o **orquestrador principal** do fluxo padrão de propostas PME (Pequenas e Médias Empresas).
Processa a fila de propostas em status de espera e decide se aciona o cadastramento.

### Variável de controle: `COUNT_PENDENCIAS`

Declarada como `COUNT_PENDENCIAS NUMBER := 0` (linha ~219), esta variável é o **portão único**
que decide se `pr_cadastramento_empresa_prov` será chamada:

```sql
-- pr_efetiva_internet — linha ~982 e ~1234
IF COUNT_PENDENCIAS = 0 THEN
    -- ...verifica críticas de beneficiários (wqt_critica_sd)...
    if nvl(wqt_critica_sd, 0) = 0 then
        pr_cadastramento_empresa_prov(ST_E.NU_CONTROLE, p_return);
    end if;
END IF;
```

### Como a Neoway contribui para `COUNT_PENDENCIAS`

#### Para NÃO BITIX (fluxo completo)

```sql
-- pr_efetiva_internet — linhas ~908 a ~960 (SACTI 1789837)
IF v_valida_emp_bitix = 0 THEN   -- somente para não BITIX
    if nvl(fn_registro_sistema('PENDENCIA_NEOWAY_PIM'), 'S') = 'S' then
        vfl_divergencia := fn_checa_divergencia(st_e.nu_controle);
        if vfl_divergencia = 'S' then
            count_pendencias := 1;   -- BLOQUEIA
            insert into tb_pendencia_empresa_internet
              (cd_pendencia = 12, ...);
        end if;
    end if;
END IF;
```

`fn_checa_divergencia` verifica se **algum beneficiário** da proposta possui registro em
`tb_vi_divergencia_neoway` com `fl_status = '1'` (divergência ativa de CPF/nome). Ou seja:
a função não valida dados da empresa — ela detecta se **alguma pessoa** da proposta está com
divergência Neoway pendente. Confirmada a divergência, o orquestrador grava `cd_pendencia = 12`
na `tb_pendencia_empresa_internet` como marcador de bloqueio da proposta.

Se o parâmetro `PENDENCIA_NEOWAY_PIM` estiver ativo (`'S'`) e houver divergência detectada,
a proposta recebe `COUNT_PENDENCIAS = 1` e o cadastramento **não é acionado**.

#### Para BITIX

O bloco inteiro de verificação Neoway da empresa é protegido por `IF v_valida_emp_bitix = 0 THEN`,
logo **para BITIX o bloco nunca executa** — `COUNT_PENDENCIAS` permanece 0 por este motivo.

A crítica de beneficiário (`pr_critica_internet_saude_81`) também **não é executada** para BITIX
(condição `v_count_bitix = 0` exigida na procedure).

### Impacto por tipo de operador

| Tipo | Camada empresa (fn_checa_divergencia) | Camada beneficiário (pr_critica_81) | `pr_cadastramento_empresa_prov` é acionada? |
|------|---------------------------------------|-------------------------------------|---------------------------------------------|
| **BITIX** | Pulada (SACTI 1789837) | Pulada (`v_count_bitix = 0`) | ? **SIM** — COUNT_PENDENCIAS = 0, COUNT_CRITICA = 0 |
| **Não BITIX — sem divergência** | Executada, sem divergência | Executada, sem crítica | ? **SIM** |
| **Não BITIX — divergência empresa** | `count_pendencias := 1` | Executada | ? **NÃO** — portão COUNT_PENDENCIAS bloqueado |
| **Não BITIX — crítica beneficiário** | Pode passar | `wqt_critica_sd > 0` | ? **NÃO** — portão interno bloqueado |
| **Não BITIX — param NEOWAY_PIM = 'N'** | Pulada (parâmetro off) | Executada normalmente | ? **SIM** (se sem crítica de beneficiário) |

---

## 5. Canal pk\_venda\_json (BITIX)

### O que é o pk\_venda\_json?

É o **orquestrador exclusivo do canal BITIX** (integração com o sistema Bitrix). Gerencia todo o
ciclo de vida da proposta BITIX, desde a recepção do JSON até o cadastramento.

### Portão de acionamento

Idêntico ao padrão, mas com sua própria instância de `COUNT_VALIDA` e sua própria chamada a
`fn_get_criticas_pendencias`:

```sql
-- pk_venda_json — linhas ~376, ~876 e ~1362 (três procedures diferentes do package)
COUNT_VALIDA := fn_get_criticas_pendencias(st_e.nu_controle, p_revalidar_pendencias);

IF COUNT_VALIDA = 0 THEN
    humaster.pr_cadastramento_empresa_prov(st_e.nu_controle, w_erro);
END IF;
```

### Verificação Neoway própria do pk\_venda\_json — `PR_VE_DIVERGENCIA_NEOWAY`

O package chama `PR_VE_DIVERGENCIA_NEOWAY` quando o parâmetro `PK_VENDA_JSON_EXECUTA_NEOWAY`
está ativo e já existe registro de divergência pendente (`fl_status = '1'`) na
`tb_vi_divergencia_neoway`:

```sql
-- pk_venda_json — linhas ~5463 a ~5482
v_ativa_NEOWAY := fn_registro_sistema('PK_VENDA_JSON_EXECUTA_NEOWAY');

IF v_ativa_NEOWAY = 'S' THEN
    SELECT COUNT(1) INTO V_VALIDA_NEOWAY
      FROM tb_vi_divergencia_neoway
     WHERE nu_controle = PNU_CONTROLE AND fl_status = '1';

    IF V_VALIDA_NEOWAY = 1 THEN
        HUMASTER.PR_VE_DIVERGENCIA_NEOWAY(PNU_CONTROLE);
    END IF;
END IF;
```

#### O que `PR_VE_DIVERGENCIA_NEOWAY` faz de fato

Controlada pelo parâmetro `PR_VE_DIVERGENCIA_NEOWAY_FLAG`, a procedure **itera sobre todos os
titulares e dependentes** da proposta e chama `pr_verifica_divergencia` com `pcd_processo = 33`
para cada um:

```sql
-- pr_ve_divergencia_neoway.sql
if nvl(fn_registro_sistema('PR_VE_DIVERGENCIA_NEOWAY_FLAG'), 'N') = 'S' then
    for tit in (select ti.nu_controle from tb_usuario_titular_internet ti
                 where ti.cd_empresa = 'T' || pnu_controle) loop
        -- valida o titular
        pr_verifica_divergencia(pnu_controle, 0, 33, 0, 'N', vfl_status_processamento);
        -- valida cada dependente do titular
        for dep in (select di.nu_controle_dep from tb_usuario_dependente_internet di
                     where di.nu_controle = tit.nu_controle) loop
            pr_verifica_divergencia(tit.nu_controle, dep.nu_controle_dep, 33, 0, 'N', vfl_status_processamento);
        end loop;
    end loop;
end if;
```

`pr_verifica_divergencia` por sua vez:
1. Verifica o status do serviço Neoway (`NEOWAY_STATUS_SERVICO = '1'`)
2. Chama `pk_neoway.fn_divergencia_neoway` para comparar CPF, nome e data de nascimento do beneficiário contra a base Neoway
3. Se divergência confirmada (`vfl_divergencia = 'S'`): grava `fl_status_processamento = '17'` no titular/dependente e atualiza `tb_vi_divergencia_neoway`
4. Se sem divergência: limpa o registro em `tb_vi_divergencia_neoway`

Portanto, `PR_VE_DIVERGENCIA_NEOWAY` **não valida dados da empresa** — ela verifica se os
**CPFs e nomes dos beneficiários** da proposta estão divergentes na base Neoway, marcando-os
com status `'17'` quando há problema.

### Como `fn_get_criticas_pendencias` trata a Neoway por modo

| Modo (`p_revalidar_pendencias`) | Conta cd_pendencia=12 (Neoway empresa)? | Conta crítica de beneficiário? | Usado quando |
|---------------------------------|-----------------------------------------|-------------------------------|-------------|
| `'N'` | **Não** | Sim | Baixa automática T229B |
| `'E'` | **Sim** | Sim | Baixa POS manual em modo exceção |
| `'S'` (padrão) | **Sim** | Sim | Revalidação completa |

### `fn_get_pend_neoway` — detecção de status 17 nos beneficiários

Dentro de `fn_get_criticas_pendencias`, após contabilizar as pendências, há registro adicional
no fluxo POS:

```sql
-- Detecta se algum titular ou dependente tem fl_status_processamento = '17'
function fn_get_pend_neoway(p_nu_controle number) return number is
begin
    select 1 into v_retorno
      from (select 1 from tb_usuario_titular_internet
             where fl_status_processamento = '17'
               and cd_empresa = 'T' || p_nu_controle
               and rownum < 2
            union
            select 1 from tb_usuario_dependente_internet
             where fl_status_processamento = '17'
               and cd_empresa = 'T' || p_nu_controle
               and rownum < 2);
    return v_retorno;
end;
```

Se `fn_get_pend_neoway = 1`, o fluxo POS registra o marcador **17** via `pr_set_emp_fluxo_pos`,
o que impede que a proposta receba **status 10** (aprovação automática), forçando-a para o
**status 7** (fila de análise manual). O cadastramento em si, porém, **já ocorreu** — o status 7
é atribuído *após* o retorno de `pr_cadastramento_empresa_prov`.

### Impacto por tipo de operador e modo

| Tipo | Modo | Neoway empresa (cd_pendencia=12) | Neoway beneficiário (status 17) | `pr_cadastramento_empresa_prov` é acionada? | Status final |
|------|------|-----------------------------------|---------------------------------|----------------------------------------------|-------------|
| **BITIX** | `'N'` | Ignorada | Não conta no portão | ? **SIM** | 7 (se teve Neoway no fluxo POS) ou 10 |
| **BITIX** | `'E'` | **Conta** (bloqueia) | Conta | ? **NÃO** se houver | — |
| **BITIX** | `'S'` | **Conta** (bloqueia) | Conta | ? **NÃO** se houver | — |
| **Não BITIX** | `'N'` | Ignorada | Não conta no portão | ? **SIM** (se sem crítica benef.) | 7 ou 10 |
| **Não BITIX** | `'E'`/`'S'` | **Conta** (bloqueia) | Conta | ? **NÃO** se houver | — |

---

## 6. Tabela Consolidada de Decisão

> Leitura: cada linha representa um cenário. A coluna final indica se `pr_cadastramento_empresa_prov`
> é acionada.

| # | Canal | Operador | Parâmetro NEOWAY ativo? | Divergência empresa? | Crítica beneficiário? | Resultado |
|---|-------|----------|------------------------|----------------------|-----------------------|-----------|
| 1 | T229B / pk_venda_json modo `'N'` | BITIX | Qualquer | Qualquer | **Não** (pulada) | ? Acionada |
| 2 | T229B / pk_venda_json modo `'N'` | Não BITIX | Qualquer | **Sim** (ignorada no modo `'N'`) | **Não** | ? Acionada |
| 3 | T229B / pk_venda_json modo `'N'` | Não BITIX | Qualquer | Qualquer | **Sim** | ? Bloqueada |
| 4 | pr_efetiva_internet | BITIX | Qualquer | **Pulada** (SACTI 1789837) | **Pulada** | ? Acionada |
| 5 | pr_efetiva_internet | Não BITIX | **Não** (`PENDENCIA_NEOWAY_PIM = 'N'`) | Ignorada | **Não** | ? Acionada |
| 6 | pr_efetiva_internet | Não BITIX | **Sim** | **Sim** | Qualquer | ? Bloqueada (COUNT_PENDENCIAS = 1) |
| 7 | pr_efetiva_internet | Não BITIX | **Sim** | **Não** | **Não** | ? Acionada |
| 8 | pr_efetiva_internet | Não BITIX | **Sim** | **Não** | **Sim** | ? Bloqueada (wqt_critica_sd > 0) |
| 9 | pk_venda_json modo `'E'`/`'S'` | BITIX | **Sim** | **Sim** | Qualquer | ? Bloqueada (COUNT_VALIDA > 0) |
| 10 | pk_venda_json modo `'E'`/`'S'` | BITIX | **Sim** | **Não** | **Não** | ? Acionada |

---

## 7. Cenários Práticos

### Cenário A — Proposta BITIX processada automaticamente (caminho feliz)

```
pk_venda_json recebe proposta BITIX em status 6
  ?
  ?? pr_critica_internet_saude_81 ? PULADA (v_count_bitix > 0)
  ?? Neoway empresa (pr_efetiva_internet) ? PULADA (SACTI 1789837)
  ?? fn_get_criticas_pendencias(nu_controle, 'N') ? COUNT_VALIDA = 0
  ?
  ??? pr_cadastramento_empresa_prov é ACIONADA ?
        ?
        ?? após retorno: fn_get_pend_neoway verifica se algum benef. tem status 17
             ?? status 17 presente ? fl_status = 7 (fila manual) + observação 'NEOWAY'
             ?? sem status 17 ? fl_status = 10 (aprovação automática) [se POS configurado]
```

### Cenário B — Proposta não BITIX no pr\_efetiva\_internet com empresa em divergência Neoway

```
pr_efetiva_internet processa proposta não BITIX
  ?
  ?? v_valida_emp_bitix = 0 (não BITIX)
  ?? PENDENCIA_NEOWAY_PIM = 'S' (parâmetro ativo)
  ?? fn_checa_divergencia(nu_controle) ? 'S' (empresa em divergência)
  ?     ?? count_pendencias := 1
  ?     ?? INSERT tb_pendencia_empresa_internet (cd_pendencia = 12)
  ?
  ?? IF COUNT_PENDENCIAS = 0 ? FALSE
       ??? pr_cadastramento_empresa_prov NÃO é acionada ?
             Proposta fica aguardando resolução da divergência
```

### Cenário C — Proposta não BITIX na T229B com empresa em divergência Neoway

```
pk_venda_json (origem T229B) processa proposta não BITIX
  ?
  ?? fn_get_criticas_pendencias(nu_controle, 'N') ? modo 'N'
  ?     ?? cd_pendencia = 12 (Neoway empresa) NÃO É CONTADA
  ?     ?? críticas de beneficiários são checadas
  ?          ?? nenhuma crítica presente ? COUNT_VALIDA = 0
  ?
  ??? pr_cadastramento_empresa_prov é ACIONADA ?
        (a pendência Neoway da empresa existe mas é deliberadamente ignorada neste fluxo)
```

### Cenário D — Proposta BITIX reprocessada em modo `'E'` (baixa POS manual)

```
pk_venda_json pr_efetiva_baixa_manual (modo 'E', revalidar pendencias)
  ?
  ?? PK_VENDA_JSON_EXECUTA_NEOWAY = 'S'
  ?? tb_vi_divergencia_neoway tem registro fl_status='1' para a proposta
  ?? PR_VE_DIVERGENCIA_NEOWAY executada:
  ?     ?? pr_verifica_divergencia (processo 33) para cada titular/dependente
  ?          ?? pk_neoway.fn_divergencia_neoway detecta divergência de CPF/nome
  ?               ?? fl_status_processamento := '17' gravado no beneficiário
  ?
  ?? fn_get_criticas_pendencias(nu_controle, 'E')
  ?     ?? fn_get_pend_neoway = 1 (há benef. com status 17)
  ?     ?? cd_pendencia = 12 É CONTADA ? COUNT_VALIDA = 1
  ?
  ?? IF COUNT_VALIDA = 0 ? FALSE
       ??? pr_cadastramento_empresa_prov NÃO é acionada ?
             (mesmo sendo BITIX, no modo 'E' a divergência de beneficiário bloqueia)
```

---

## 8. Glossário Técnico

| Termo / Objeto | Descrição |
|---------------|-----------|
| `pr_critica_internet_saude_81` | Procedure usada pelo `pr_efetiva_internet`. Valida nome, CPF e data de nascimento de cada beneficiário contra a base Neoway e Hapvida. Insere crítica `081vi-...` se divergir. **Não é executada para BITIX.** |
| `PR_VE_DIVERGENCIA_NEOWAY` | Procedure usada pelo `pk_venda_json`. Itera por todos os titulares e dependentes da proposta e chama `pr_verifica_divergencia` (processo 33) para cada um. Se houver divergência de CPF/nome na Neoway, grava `fl_status_processamento = '17'` no beneficiário. **Não valida dados da empresa.** |
| `pr_verifica_divergencia` | Procedure intermediária chamada por `PR_VE_DIVERGENCIA_NEOWAY`. Invoca `pk_neoway.fn_divergencia_neoway` para comparar dados do beneficiário com a base Neoway. Atualiza `tb_vi_divergencia_neoway` e grava status `'17'` no beneficiário em caso de divergência. |
| `pk_neoway.fn_divergencia_neoway` | Função do package Neoway que realiza a consulta efetiva à base Neoway. Retorna `'S'` se CPF/nome/data de nascimento divergem. |
| `pr_efetiva_internet` | Orquestrador do fluxo padrão PME. Controla `COUNT_PENDENCIAS` que protege a chamada a `pr_cadastramento_empresa_prov`. |
| `pk_venda_json` | Package orquestrador do canal BITIX. Usa `fn_get_criticas_pendencias` como portão e possui verificação Neoway própria via `PR_VE_DIVERGENCIA_NEOWAY`. |
| `fn_checa_divergencia` | Função usada pela `pr_efetiva_internet`. Verifica se algum beneficiário da proposta possui registro ativo (`fl_status = '1'`) em `tb_vi_divergencia_neoway`. Retorna `'S'` se sim. |
| `fn_get_pend_neoway` | Função do `pk_venda_json` que retorna 1 se algum beneficiário tem `fl_status_processamento = '17'` (divergência Neoway ativa). |
| `fn_get_criticas_pendencias` | Função do `pk_venda_json` que soma críticas de beneficiários + pendências de empresa conforme o modo (`'N'`, `'E'` ou `'S'`). |
| `tb_vi_divergencia_neoway` | Tabela que registra histórico de divergências Neoway por beneficiário. `fl_status = '1'` = divergência ativa. `fl_status = '3'` = liberado pelo cadastro. |
| `cd_pendencia = 12` | Código de pendência na `tb_pendencia_empresa_internet`. Gerado pelo orquestrador quando detecta divergência Neoway em beneficiários da proposta. Representa bloqueio a nível de empresa. |
| `fl_status_processamento = '17'` | Status gravado no titular ou dependente quando `pr_verifica_divergencia` detecta divergência de CPF/nome na Neoway. É o sinal que `fn_get_pend_neoway` detecta. |
| `COUNT_PENDENCIAS` | Variável local da `pr_efetiva_internet`. Valor 0 = passa; valor > 0 = bloqueia o cadastramento. |
| `COUNT_VALIDA` | Variável local do `pk_venda_json`. Valor 0 = passa; valor > 0 = bloqueia o cadastramento. |
| `PENDENCIA_NEOWAY_PIM` | Parâmetro de sistema que liga/desliga a checagem Neoway de beneficiários na `pr_efetiva_internet`. |
| `PK_VENDA_JSON_EXECUTA_NEOWAY` | Parâmetro de sistema que liga/desliga a chamada a `PR_VE_DIVERGENCIA_NEOWAY` no `pk_venda_json`. |
| `PR_VE_DIVERGENCIA_NEOWAY_FLAG` | Parâmetro interno que liga/desliga o processamento dentro da própria `PR_VE_DIVERGENCIA_NEOWAY`. |
| `SACTI 1789837` | Demanda que determinou a isenção do BITIX da crítica Neoway de beneficiários na `pr_efetiva_internet`. |
| `p_revalidar_pendencias = 'N'` | Modo de baixa automática T229B: ignora pendências de empresa (`cd_pendencia = 12`), conta apenas críticas de beneficiários. |
| Status **7** | Proposta enviada para **fila de análise manual** (não cadastrada automaticamente). |
| Status **10** | Proposta enviada para **aprovação automática final** (fluxo POS, sem pendências). |
| BITIX | Operador/canal de venda integrado via Bitrix. No `pr_efetiva_internet`, é isento da validação Neoway de beneficiários (SACTI 1789837). No `pk_venda_json`, a isenção depende do modo de revalidação. |
