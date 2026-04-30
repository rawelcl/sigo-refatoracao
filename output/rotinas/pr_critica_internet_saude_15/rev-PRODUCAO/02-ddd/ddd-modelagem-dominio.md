# Modelagem DDD: pr_critica_internet_saude_15

**Baseado em:** reversa-pr_critica_internet_saude_15.md (rev-PRODUCAO)
**Data:** [data atual]
**ADRs consultadas:** [ADR-AUSENTE]

---

## 0. Raciocínio Estratégico da Modelagem

### Por que DDD para esta rotina?
A rotina `pr_critica_internet_saude_15` acumula responsabilidades relacionadas à validação de beneficiários e registro de críticas. A modelagem DDD permite isolar essas responsabilidades em agregados e serviços de domínio, preparando a rotina para uma futura migração para microsserviços.

### Estratégia DDD aplicada
**Abordagem escolhida:** Strategic e Tactical DDD

**Justificativa:** Esta rotina possui complexidade suficiente para justificar a modelagem estratégica (identificação de Bounded Contexts) e tática (definição de agregados, entidades e serviços).

**Padrão de decomposição:** Strangler Fig

**Justificativa do padrão:** Este padrão permite uma transição incremental, isolando novas funcionalidades em componentes refatorados enquanto o legado continua operacional.

---

## 1. Bounded Context

### Identificação do contexto
**Contexto:** Beneficiário

**Raciocínio de identificação:**
A rotina opera diretamente sobre beneficiários (titulares e dependentes), validando dados e registrando críticas. Isso a posiciona no contexto de Beneficiário, que trata de regras e validações relacionadas a pessoas vinculadas a contratos.

**Descrição do contexto:**
O contexto de Beneficiário abrange o cadastro, validação e movimentação de pessoas vinculadas a contratos de saúde.

### Relação com outros contextos
| Contexto Relacionado | Tipo de Relação | Raciocínio |
|-----------------------|-----------------|-----------|
| Comercial            | Downstream      | A rotina consome dados de propostas comerciais para validar beneficiários. |
| Regulatorio          | Upstream        | As críticas geradas podem ser consumidas para fins de conformidade regulatória. |

---

## 2. Linguagem Ubíqua

### Novos termos identificados
| Termo do Domínio | Definição de Negócio | Termo Técnico Atual (a eliminar) | BC |
|-------------------|----------------------|-----------------------------------|----|
| Crítica           | Validação de dados do beneficiário que pode bloquear o processamento. | tb_usuario_critica_internet | Beneficiário |
| Titular Internet  | Beneficiário titular cadastrado via canal digital. | tb_usuario_titular_internet | Beneficiário |
| Dependente Internet | Dependente de titular cadastrado via canal digital. | tb_usuario_dependente_internet | Beneficiário |

---

## 3. Agregados

### Agregado: Beneficiário
**Aggregate Root:** Titular Internet

**Entidades do Agregado:**
| Entidade           | Identidade de Negócio | Tabela Oracle |
|--------------------|-----------------------|---------------|
| Titular Internet   | cd_titular           | tb_usuario_titular_internet |
| Dependente Internet | cd_dependente        | tb_usuario_dependente_internet |

**Value Objects do Agregado:**
| Value Object | Atributos | Regra de Validação |
|--------------|-----------|--------------------|
| FaixaEtaria  | idade_min, idade_max | idade_min < idade_max |

---

## 4. Domain Services

| Service               | Responsabilidade                                      | Entidades Envolvidas |
|-----------------------|------------------------------------------------------|-----------------------|
| ValidacaoBeneficiario | Validar idade e status de beneficiários.             | Titular, Dependente   |
| RegistroCriticas      | Registrar críticas na tabela de críticas.            | Titular, Dependente   |

---

## 5. Domain Events

| Evento                | Quando é Disparado                                   | Dados do Evento |
|-----------------------|------------------------------------------------------|------------------|
| CriticaRegistrada     | Após registro de uma crítica bem-sucedida.           | id_critica, tipo |

---

## 6. Repositórios

| Repositório           | Aggregate Root       | Operações |
|-----------------------|----------------------|-----------|
| BeneficiarioRepository | Titular Internet     | save, findById |

---

## 7. Mapa RN → DDD

| ID RN | Descrição da Regra | Conceito DDD         | Onde Vive |
|-------|---------------------|----------------------|-----------|
| RN01  | Validar idade crítica | Domain Service      | ValidacaoBeneficiario |
| RN02  | Registrar críticas    | Domain Service      | RegistroCriticas |

---

## 8. Decisões de Design

| #   | Decisão                          | ADR de Referência | Opções Avaliadas | Escolha | Raciocínio Detalhado |
|-----|----------------------------------|-------------------|------------------|---------|----------------------|
| DD01 | Extrair constantes              | [ADR-AUSENTE]     | Inline/Arquivo   | Arquivo | Facilita manutenção e reutilização. |
| DD02 | Isolar regras de negócio        | [ADR-AUSENTE]     | Inline/Service   | Service | Permite reutilização e desacoplamento. |

---

## 9. Pendências com o PO

| #   | Pendência                         | Decisão Bloqueada | Impacto de Não Resolver |
|-----|-----------------------------------|-------------------|-------------------------|
| P01 | Context Map ausente               | Identificação de relações entre contextos | Pode levar a inconsistências na modelagem. |
| P02 | ADRs não consultadas              | Fundamentação de decisões de design | Decisões podem estar desalinhadas com padrões globais. |

---

[HANDOFF-BACKLOG]