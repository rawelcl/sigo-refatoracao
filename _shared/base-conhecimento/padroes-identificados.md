# Padroes Identificados

> Atualizado em: 21/04/2026
> Fonte: Agente Eng. Reversa -- PR_EFETIVA_INTERNET + PR_CADASTRAMENTO_EMPRESA_PROV

---

## PADRAO-01: WHEN OTHERS THEN NULL (Excecao Silenciosa)

**Frequencia:** 50+ ocorrencias em PR_EFETIVA_INTERNET
**Impacto:** Alto -- erros sao perdidos silenciosamente; impossibilita diagnostico

```sql
-- Anti-padrao tipico:
begin
  pr_cadastramento_internet2(st_reg.nu_controle);
exception
  when others then null; -- erro perdido silenciosamente
end;
```

**Recomendacao:** Substituir por log estruturado + reraise se critico.

---

## PADRAO-02: Motor de Pendencias Repetido (stp1..stp13)

**Frequencia:** 13 loops com mesmo padrao INSERT em PR_EFETIVA_INTERNET
**Impacto:** Alto -- ~500 linhas de codigo duplicado; manutencao critica

```sql
-- Padrao repetido 13 vezes:
for stp_N in (select * from tb_tp_pend_empresa_internet
               where cd_pendencia = N and fl_status = 1) loop
  IF <condicao_N> THEN
    COUNT_PENDENCIAS := 1;
    INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (...) VALUES (...);
    if l_empresa_odon.nu_controle is not null then
      INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (...) VALUES (...);
    end if;
  END IF;
end loop;
```

**Recomendacao:** Extrair para `pk_pendencia_pim.pr_avaliar_pendencia(p_cd_pendencia, p_condicao, ...)`.

---

## PADRAO-05: Codigo Triplicado em Rotinas de Efetivacao

**Rotinas:** PK_VENDA_JSON -- pr_efetiva / pr_efetiva_baixa_manual / pr_efetiva_baixa_manual_emp
**Frequencia:** ~85% de codigo identico entre as tres rotinas
**Impacto:** Alto -- qualquer correcao de bug precisa ser replicada em tres lugares

```sql
-- Padrao presente nas tres rotinas:
IF COUNT_VALIDA = 0 THEN
  pr_cadastramento_empresa_prov(st_e.nu_controle, w_erro);
  l_emp := substr(w_erro, instr(w_erro, ',') + 1);
  ... -- mesmas 300+ linhas de codigo
END IF;
```

**Recomendacao:** Extrair logica comum para rotina privada `pr_efetiva_empresa_core(p_nu_controle, p_revalidar, p_origem)`. As tres rotinas publicas delegam para ela.

---

## PADRAO-06: Estado Global de Package Mutavel

**Rotinas:** PK_VENDA_JSON -- 15 variaveis G_* declaradas na spec do package
**Frequencia:** Unico -- mas impacta todas as chamadas do package
**Impacto:** Critico em cenarios de concorrencia (JOB paralelo + integracao BITIX simultanea)

```sql
-- Declaradas na spec -- estado compartilhado:
G_PROVISORIO         varchar2(20);
G_PROVISORIO_CRITICA varchar2(25);
G_PROPOSTA           varchar2(50);
-- ... 12 outras variaveis globais
```

**Recomendacao:** Converter para variaveis locais passadas como parametro ou encapsuladas em RECORD TYPE.

---

## PADRAO-07: Funcao com Efeito Colateral de Escrita

**Rotina:** PK_VENDA_JSON.fn_get_criticas_pendencias
**Frequencia:** 1 rotina confirmada
**Impacto:** Alto -- UPDATE invisivel dentro de funcao de consulta pode causar atualizacoes nao intencionais

```sql
-- Dentro de funcao de consulta:
IF (v_retorno > 0) and (p_valida_nao_coligada = 'S') THEN
  UPDATE TB_PROPOSTA_VENDA PR SET PR.FL_STATUS = 9
   WHERE PR.NU_CONTROLE = p_nu_controle;
  COMMIT;
END IF;
```

**Recomendacao:** Separar em: funcao fn_get_criticas_pendencias (somente leitura) + procedure pr_aplicar_status_critica (efeitos).

---

## PADRAO-03: Log de Baixa Duplicado

**Frequencia:** ~10 ocorrencias em PR_EFETIVA_INTERNET
**Impacto:** Medio -- codigo duplicado; race condition no SELECT MAX+1

```sql
-- Padrao duplicado ~10 vezes:
begin
  select max(nvl(cb.cd_log,0))+1 into wcd_log
  from humaster.tb_log_baixa_controle cb;
exception when others then wcd_log := null; end;

begin
  insert into humaster.tb_log_baixa_controle(cd_log, nu_controle, ds_observacao, fl_status)
  values(wcd_log, st_e.nu_controle, 'mensagem', '0');
  commit;
exception when others then null; end;
```

**Recomendacao:** Extrair para `pk_log_baixa_pim.pr_registra(p_nu_controle, p_mensagem, p_status)`.
[ATENCAO] Race condition: sem sequence exclusiva para CD_LOG. Dois jobs paralelos podem gerar o mesmo CD_LOG.

---

## PADRAO-04: Parsing de Retorno via String

**Frequencia:** 4 chamadores de pr_cadastramento_empresa_prov
**Impacto:** Critico -- extrai cd_empresa de mensagem texto; fragil

```sql
-- Em pr_efetiva_internet (e pk_venda_json):
l_empresa_conveniada_saude := substr(p_return, instr(p_return, ',') + 1);
-- Tratamento de ORA- via string:
if instr(l_empresa_conveniada_saude,'ORA-') > 0 then
  l_empresa_conveniada_saude := null;
end if;
```

**Recomendacao:** Refatorar contrato de pr_cadastramento_empresa_prov para retornar cd_empresa em parametro OUT dedicado. Ver `proposta-novo-contrato-retorno.md`.

---

## PADRAO-05: Duplicacao Saude/Odonto (~40% do Bloco PIM)

**Frequencia:** Todo o bloco PIM (Fase 2)
**Impacto:** Alto -- manutencao dobrada; inconsistencias entre saude e odonto

**Descricao:** Toda logica de validacao e efetivacao e replicada para odonto usando `l_empresa_odon.*` em paralelo com `st_e.*`. As variaveis `l_qtd_vidas_od`, `l_qtd_vidas_mais_6_od`, `p_return_od`, etc. espelham as de saude.

**Recomendacao:** Abstrair em record type `t_empresa_pim` e processar saude e odonto com a mesma logica parametrizada.

---

## PADRAO-06: Reset Manual de Variaveis por Iteracao

**Frequencia:** 1 bloco com ~25 atribuicoes em PR_EFETIVA_INTERNET
**Impacto:** Medio -- propenso a esquecimento de reset; ~25 variaveis globais

```sql
-- Reset manual a cada iteracao do loop:
l_verifica_adm := 0; l_localidade_limitrofe := 0;
l_nome_inv := 0; l_verifica_vendedor := 0;
-- ... mais 21 variaveis
```

**Recomendacao:** Encapsular em `TYPE t_ctx_efetivacao IS RECORD (...)` e inicializar com `ctx := NULL;`.

---

## PADRAO-07: Outer Join Pre-ANSI

**Frequencia:** ~5 ocorrencias em PR_EFETIVA_INTERNET
**Impacto:** Baixo -- funcional mas nao padrao moderno

```sql
-- Pre-ANSI:
where d.nu_controle(+) = t.nu_controle
-- ANSI equivalente:
LEFT JOIN tb_usuario_dependente_internet d ON d.nu_controle = t.nu_controle
```

**Recomendacao:** Migrar para LEFT JOIN padrao ANSI nas refatoracoes futuras.

---

## PADRAO-08: Logica de Negocio Controlada por Tabela de Parametros

**Frequencia:** tb_tp_pend_empresa_internet com fl_status
**Impacto:** Positivo -- permite desativar validacoes sem deploy

**Descricao:** O sistema usa `fl_status = 1` em `tb_tp_pend_empresa_internet` para ativar/desativar cada tipo de pendencia. Permite ajuste operacional sem alteracao de codigo.

[ATENCAO] Pendencias 2, 4, 6 e 10 estao desativadas em producao. Validacoes de localidade limitrofe, dependente > 43 anos, titular >= 59 anos e digitacao > 6 dias nao executam atualmente.

---

## PADRAO-09: God Procedure (Rotina Monolitica Acima de 3000 Linhas)

**Rotinas confirmadas:** PR_CADASTRAMENTO_EMPRESA_PROV (5025 linhas, 40+ tabelas)
**Impacto:** Alto -- impossibilita testes unitarios, manutencao arriscada, depurar exige leitura integral

**Descricao:** A procedure concentra: validacao de CNPJ, gestao de pessoa, criacao de contrato, tabela de precos, acesso internet, envio de email, parametrizacao de coparticipacao, reembolso, odonto e fidelizacao em um unico bloco PL/SQL.

**Recomendacao:** Decompor por dominio: pr_cad_empresa_pessoa, pr_cad_empresa_contrato, pr_cad_empresa_preco, pr_cad_empresa_acesso, pr_cad_empresa_copart, pr_cad_empresa_reembolso.

---

## PADRAO-10: Senha Derivada Deterministicamente (Risco Seguranca)

**Rotinas confirmadas:** PR_CADASTRAMENTO_EMPRESA_PROV
**Impacto:** Alto -- senha de acesso internet previsivel

```sql
-- Senha = ultimos 6 digitos do cd_pessoa (previsivel se cd_pessoa for sequencial)
pk_administracao.fn_encripta(
  substr(to_char(lcd_pessoa), (length(lcd_pessoa) - 5), 6),
  1, 10)
```

**Recomendacao:** Substituir por geracao de senha aleatoria criptograficamente segura (DBMS_CRYPTO ou equivalente).

---

## PADRAO-11: COMMIT Dentro de Loop de Processamento

**Rotinas confirmadas:** PR_CADASTRAMENTO_EMPRESA_PROV (linha ~2368)
**Impacto:** Alto -- impossibilita rollback completo em caso de erro posterior no loop; cria janelas de inconsistencia

```sql
-- COMMIT dentro do FOR LOOP:
for st_e in cr_empresa_internet loop
  -- ... 4700 linhas de processamento ...
  commit; -- linha ~2368: commit parcial antes de concluir todos os registros
end loop;
```

**Recomendacao:** Mover o COMMIT para fora do loop, ou redesenhar para transacoes independentes e explicitas por registro.

---

## PR_CADASTRAMENTO_EMPRESA_PROV -- Smells Adicionais Identificados no DDD

### PADRAO-CAD-01: MAX+1 para Geracao de Chave (Race Condition)

**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Impacto:** Critico em concorrencia -- duplicidade de cd_empresa possivel

```sql
-- Anti-padrao:
SELECT MAX(cd_empresa) + 1 INTO lcd_empresa FROM tb_empresa_conveniada;
```

**Recomendacao:** Substituir por SEQUENCE sq_cd_empresa.NEXTVAL. Ver DD-CAD-08.

---

### PADRAO-CAD-02: Email com Dados Sensiveis em Plaintext

**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Impacto:** Critico -- CNPJ + senha de acesso transmitidos em corpo de email sem criptografia

**Recomendacao:** Remover CNPJ e senha do corpo do email. Usar link de primeiro acesso com token. Ver DD-CAD-06.

---

### PADRAO-CAD-03: Acoplamento Direto com ~40 Tabelas

**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Impacto:** Alto -- procedure acessa diretamente ~40 tabelas sem camada de repositorio

**Recomendacao:** Introduzir Repositories (EmpresaConveniadaRepository, PessoaJuridicaRepository etc.) por Aggregate Root. Ver DD-CAD-01.

---

### PADRAO-CAD-04: Validacao de Documento Duplicada (CNPJ/CPF/CAEPF)

**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV e PR_EFETIVA_INTERNET
**Impacto:** Medio -- logica de validacao de documento repetida; risco de divergencia

**Recomendacao:** Centralizar em ACL ValidacaoDocumento (BC-CAD-02). Ver catalogo-regras-negocio RN04.

---

### PADRAO-CAD-05: Staging sem Limpeza Garantida

**Rotina:** PR_CADASTRAMENTO_EMPRESA_PROV
**Impacto:** Medio -- tb_empresa_internet (staging) pode ficar com registros orphaos em caso de erro partial

**Recomendacao:** Garantir UPDATE fl_status_processamento para status de erro em todos os caminhos de excecao. Ver DD-CAD-04.

---

## Padroes de Dominio (Conceituais)

### PADRAO-DOMINIO-01: Taxonomia TIPO vs ORIGEM de Proposta

> Adicionado em: 24/04/2026 | Fonte: esclarecimento de negocio com PO durante refinamento EI/VJ | [REF DD-11]

**Contexto:** Durante a modelagem inicial, os termos \"canal PIM\" e \"canal BITIX\" foram usados como se designassem a mesma dimensao. Isso gerou confusao em BC-EI-14, no Conflito 1 da analise comparativa e em diversas notas MIG.

**Padrao correto (obrigatorio em todos os artefatos novos):**\n\nToda proposta tem duas dimensoes ORTOGONAIS:\n\n| Dimensao | Define | Valores | Campo tecnico |\n|---|---|---|---|\n| **TIPO/PRODUTO** | Porte, produto e fluxo de negocio | PIM (=SS), PME, Individual, Odonto | `nu_total_empregado`, modelo de negocio |\n| **ORIGEM/FERRAMENTA** | Ferramenta que digitou a proposta; define qual rotina efetiva | BITIX, WEBHAP, TAFFIX | `cd_operados` ('BITIX', 'WEBHAP', 'PONTO') |\n\n**Regra de efetivacao:** a rotina de efetivacao e determinada pela ORIGEM:\n- Origem BITIX -> PK_VENDA_JSON\n- Origem WEBHAP / TAFFIX (PONTO) / demais -> PR_EFETIVA_INTERNET\n\n**Anti-padroes a eliminar:**\n- \"canal PIM vs canal BITIX\" (mistura as duas dimensoes -- PIM e tipo, BITIX e origem)\n- \"EI processa PIM\" (errado: EI processa origens WEBHAP/TAFFIX, que podem digitar propostas PIM ou PME)\n- \"VJ e do canal PME\" (errado: VJ e da origem BITIX, que pode digitar propostas PIM ou PME)\n- Tratar TAFFIX como sinonimo de WEBHAP (sao ferramentas distintas com `cd_operados` distintos)\n\n**Recomendacao:** Em toda nova documentacao, usar sempre \"origem X\" ou \"tipo Y\". Nunca \"canal\" isolado. Aggregates que particionem logicamente tabelas compartilhadas devem citar explicitamente o valor de `cd_operados` que os delimita.\n