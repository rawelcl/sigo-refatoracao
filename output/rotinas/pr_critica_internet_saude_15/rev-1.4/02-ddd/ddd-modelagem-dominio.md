# Modelagem DDD: pr_critica_internet_saude_15

## Contexto do Domínio
- **Bounded Context**: Gestão de Críticas de Beneficiários.
- **Descrição**: Este contexto é responsável por validar e registrar críticas relacionadas a beneficiários (titulares e dependentes) com base em regras de negócio específicas, como idade e parametrizações de empresas conveniadas.

## Agregados e Entidades
### Agregado: Beneficiario
- **Entidade Raiz**: Beneficiario
  - **Atributos**:
    - `nu_controle` (Identificador único)
    - `tp_operacao` (Tipo de operação)
    - `dt_nascimento` (Data de nascimento)
    - `cd_empresa` (Código da empresa conveniada)
    - `cd_plano` (Código do plano de saúde)

### Agregado: Critica
- **Entidade Raiz**: Critica
  - **Atributos**:
    - `ds_critica` (Descrição da crítica)
    - `ds_campo` (Campo relacionado à crítica)
    - `nu_controle` (Referência ao beneficiário)

## Regras de Negócio
1. **Validação de Idade**:
   - Titulares e dependentes com idade acima de 59 ou 65 anos (dependendo da parametrização) são criticados.
   - Verifica se a idade está dentro de um intervalo permitido, baseado em parâmetros da empresa.

2. **Críticas Específicas**:
   - Empresas novas e críticas desativadas são tratadas de forma diferenciada.
   - Registra mensagens de erro em casos de falha.

3. **Inserção de Pendências**:
   - Registra pendências na tabela `tb_usuario_critica_internet` com mensagens específicas.

## Pontos de Atenção
- **Exceções**: O tratamento de erros utiliza `when others`, o que pode mascarar problemas específicos.
- **Parâmetros Faltantes**: Algumas críticas dependem de parametrizações externas (`HABILITA_65ANOS`).
- **Riscos ANS**: Validações de idade podem impactar conformidade regulatória.

---
[HANDOFF-BACKLOG]