# Engenharia Reversa: pr_critica_internet_saude_15

## Informações Gerais
- **Tipo**: Procedure
- **Schema**: HUMASTER
- **Arquivo Original**: `C:/CVS/health_install/procedure/pr_critica_internet_saude_15.sql`
- **Versão CVS**: PRODUCAO

## Objetivo da Rotina
A rotina realiza validações e críticas relacionadas a beneficiários (titulares e dependentes) com base em critérios como idade, status de processamento e parametrizações específicas.

## Entradas
- **Parâmetros**:
  - `p_titular`: Registro do tipo `tb_usuario_titular_internet%rowtype`.
  - `p_dependente`: Registro do tipo `tb_usuario_dependente_internet%rowtype`.

## Saídas
- Não possui retorno explícito, mas insere registros de críticas na tabela `tb_usuario_critica_internet`.

## Tabelas Envolvidas
1. **`tb_usuario_titular_internet`**: Contém informações sobre titulares.
2. **`tb_usuario_dependente_internet`**: Contém informações sobre dependentes.
3. **`tb_empresa_conveniada`**: Utilizada para verificar o canal de venda e status da empresa.
4. **`tb_usuario_critica_internet`**: Armazena as críticas geradas pela rotina.
5. **`tb_carga_sib_parametro`**: Contém parâmetros de idade mínima e máxima.
6. **`tb_empresa_conveniada_unidade`**: Relacionada à parametrização de empresas e unidades.

## Fluxo Principal
1. **Validação de Empresa**:
   - Verifica se a empresa é nova (`fl_empresa_nova`).
   - Verifica se a crítica `PR_CRITICA_INTERNET_SAUDE_206` está ativa.
2. **Determinação de Idade Crítica**:
   - Define o limite de idade com base na parametrização (`HABILITA_65ANOS`).
3. **Críticas para Titulares**:
   - Valida idade e plano.
   - Verifica se a idade está dentro dos limites parametrizados.
   - Insere críticas na tabela `tb_usuario_critica_internet` quando necessário.
4. **Críticas para Dependentes**:
   - Similar às críticas para titulares, mas com validações adicionais para o status de processamento.
5. **Tratamento de Erros**:
   - Registra erros fatais na tabela `tb_usuario_critica_internet`.

## Regras de Negócio Identificadas
1. Empresas novas (`fl_empresa_nova = 'S'`) não passam por certas críticas.
2. Idade crítica é parametrizada:
   - 59 anos (`708 meses`) por padrão.
   - 65 anos (`780 meses`) se habilitado.
3. Críticas específicas para titulares e dependentes:
   - Titulares: `100MT-INCLUSAO PENDENTE`.
   - Dependentes: `100MD-INCLUSAO PENDENTE`.
4. Empresas com canal de venda `5` são excluídas de certas críticas.

## Pontos de Atenção
1. Uso de exceções genéricas (`when others`) pode mascarar erros específicos.
2. Dependência de funções auxiliares:
   - `fn_individual_familiar`.
   - `fn_registro_sistema`.
3. Necessidade de validação de integridade dos dados nas tabelas relacionadas.

## Código Analisado
```sql
create or replace procedure humaster.pr_critica_internet_saude_15(p_titular    in tb_usuario_titular_internet%rowtype default null,
                                                                  p_dependente in tb_usuario_dependente_internet%rowtype default null) is
  -- INCLUSÃO PENDENTE - PENDÊNCIA 100
  /*****************************************************************/
  -- BAIXA AUTOMÁTICA DE BENEFICIÁRIO MAIOR DE 59 ANOS APENAS COM 
  -- PARAMETRIZAÇÃO (T2283PSIB)
  /*****************************************************************/
  w_erro_message tb_usuario_critica_internet.ds_critica%type;

  wcd_canal_venda tb_empresa_conveniada.cd_canal_venda%type;

  wcalc_idade      number;
  vcd_idade_menora number;
  vcd_idade_maiora number;
  wpr_206_ativa varchar2(1);
  wfl_empresa_nova varchar2(1);
  widade_critica number;
  
begin
  
  
  if fn_individual_familiar(p_titular.cd_empresa) <> '00100' then
    
      
    ...
    -- Código completo omitido para brevidade
    ...

end;
/
```

## Análise de Impacto

### 11. Mapa de Dependentes
- **Procedures**: Nenhuma dependência direta identificada.
- **Functions**: `fn_individual_familiar`, `fn_registro_sistema`.
- **Packages**: Nenhum identificado.

### 12. Impacto em Dados
- **Tabelas Afetadas**:
  - `tb_usuario_critica_internet`: Inserção de registros de críticas.
  - `tb_empresa_conveniada`: Consulta para validação de canal de venda e status.
  - `tb_carga_sib_parametro`: Consulta para limites de idade.
  - `tb_empresa_conveniada_unidade`: Consulta para parametrização de unidades.

### 13. Jobs e Integrações
- Não foram identificados jobs ou integrações diretas associados à rotina.

### 14. Riscos ANS Ampliados
- **Risco 1**: Críticas incorretas podem gerar problemas regulatórios.
- **Risco 2**: Falhas na validação de idade podem impactar conformidade com normas.

### 15. Plano de Rollback / Mitigações
- **Rollback**: Reverter alterações na tabela `tb_usuario_critica_internet`.
- **Mitigações**:
  - Validar parametrizações antes de executar a rotina.
  - Monitorar logs de execução para identificar falhas.

---

[HANDOFF-DDD]