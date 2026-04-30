# Análise de Impacto: pr_critica_internet_saude_15

## Impactos Identificados
### Tabelas
1. **tb_usuario_titular_internet**:
   - Utilizada para validar informações do titular.
2. **tb_usuario_dependente_internet**:
   - Utilizada para validar informações do dependente.
3. **tb_empresa_conveniada**:
   - Verifica se a empresa é nova e obtém o canal de venda.
4. **tb_critica_internet**:
   - Determina se críticas específicas estão ativas.
5. **tb_carga_sib_parametro** e **tb_empresa_conveniada_unidade**:
   - Usadas para validar intervalos de idade permitidos.
6. **tb_usuario_critica_internet**:
   - Armazena as críticas geradas.

### Funções
1. **fn_individual_familiar**:
   - Determina o tipo de plano (individual ou familiar).
2. **fn_registro_sistema**:
   - Verifica parametrizações globais do sistema.

### Riscos e Dependências
- **Riscos ANS**: Validações de idade podem impactar conformidade regulatória.
- **Dependências Externas**: Parametrizações como `HABILITA_65ANOS` devem ser validadas.

---

# Backlog: pr_critica_internet_saude_15

## Épicos
1. **Validação de Beneficiários**
   - Implementar regras de validação de idade e críticas específicas.

## Features
1. **Validação de Idade**
   - Criticar beneficiários fora do intervalo permitido.
2. **Críticas Específicas**
   - Tratar empresas novas e críticas desativadas.
3. **Inserção de Pendências**
   - Registrar críticas na tabela `tb_usuario_critica_internet`.

## User Stories
### US01: Validar Idade de Titulares
- **Como**: Sistema de críticas
- **Quero**: Validar se a idade do titular está dentro do intervalo permitido
- **Para**: Garantir conformidade com as regras de negócio.

### US02: Validar Idade de Dependentes
- **Como**: Sistema de críticas
- **Quero**: Validar se a idade do dependente está dentro do intervalo permitido
- **Para**: Garantir conformidade com as regras de negócio.

### US03: Registrar Críticas
- **Como**: Sistema de críticas
- **Quero**: Registrar mensagens de erro ou pendências na tabela de críticas
- **Para**: Notificar problemas encontrados.

---
[WORKFLOW-CONCLUIDO]