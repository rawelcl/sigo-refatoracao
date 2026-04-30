# Engenharia Reversa: pr_critica_internet_saude_15

## Informações Gerais
- **Objeto**: pr_critica_internet_saude_15
- **Tipo**: PROCEDURE
- **Schema**: HUMASTER
- **Tag CVS**: 1.4
- **Última Modificação**: 12 de setembro de 2024

## Resumo do Código
A procedure realiza críticas automáticas relacionadas a beneficiários, com foco em validações de idade e parametrizações específicas. As principais funcionalidades incluem:

- **Validação de idade**: Determina limites de idade para titulares e dependentes.
- **Parâmetros de empresa**: Verifica se a empresa é nova e se críticas específicas estão ativas.
- **Inserção de críticas**: Registra mensagens de erro ou pendências na tabela `tb_usuario_critica_internet`.

## Dependências Identificadas
### Tabelas
- `tb_usuario_titular_internet`
- `tb_usuario_dependente_internet`
- `tb_empresa_conveniada`
- `tb_critica_internet`
- `tb_carga_sib_parametro`
- `tb_empresa_conveniada_unidade`
- `tb_usuario_critica_internet`

### Funções
- `fn_individual_familiar`
- `fn_registro_sistema`

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

## Próximos Passos
1. Validar as regras de negócio com o time responsável.
2. Prosseguir para a modelagem DDD.

---
[HANDOFF-DDD]