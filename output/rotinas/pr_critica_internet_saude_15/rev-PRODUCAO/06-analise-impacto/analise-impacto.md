# Análise de Impacto: pr_critica_internet_saude_15

**Baseado em:** ddd-modelagem-dominio.md (rev-PRODUCAO)
**Data:** [data]

---

## Resumo
A rotina `pr_critica_internet_saude_15` realiza validações críticas para titulares e dependentes, registrando inconsistências em uma tabela de críticas. A refatoração proposta isola responsabilidades e prepara o código para futura migração para microsserviços.

---

## Impactos Identificados

### 1. Tabelas Envolvidas
- **`tb_usuario_titular_internet`**: Leitura de dados do titular.
- **`tb_usuario_dependente_internet`**: Leitura de dados do dependente.
- **`tb_usuario_critica_internet`**: Escrita de críticas geradas.
- **`tb_empresa_conveniada`**: Validação de status da empresa.
- **`tb_carga_sib_parametro`**: Consulta de parâmetros de idade.

### 2. Regras de Negócio
- **RN01**: Validar idade crítica.
- **RN02**: Registrar críticas.

### 3. Dependências Externas
- Funções auxiliares:
  - `fn_individual_familiar`
  - `fn_registro_sistema`

### 4. Riscos
- **[ANS]** Falha na validação de idade pode levar à inclusão de beneficiários fora dos limites regulatórios.
- Exceções silenciosas (`WHEN OTHERS THEN NULL`) podem mascarar erros críticos.

---

## Recomendações
1. Substituir exceções genéricas por tratamento específico e log estruturado.
2. Validar integridade dos dados antes de registrar críticas.
3. Isolar lógica de validação em Domain Services para facilitar testes e manutenção.

---

[HANDOFF-BACKLOG]