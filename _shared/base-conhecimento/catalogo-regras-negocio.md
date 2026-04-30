# Catalogo de Regras de Negocio -- Transversais

> Atualizado em: [data atual]
> Fonte: Agentes DDD -- PR_CRITICA_INTERNET_SAUDE_15

---

## RN01 -- Validar idade critica

**Rotinas afetadas:** PR_CRITICA_INTERNET_SAUDE_15
**Descricao:** Beneficiarios (titulares e dependentes) devem ter idade dentro dos limites parametrizados.
- Padrao: 59 anos (708 meses).
- Excecao: 65 anos (780 meses) se habilitado.
**Evidencia:** reversa-pr_critica_internet_saude_15.md

---

## RN02 -- Registrar criticas

**Rotinas afetadas:** PR_CRITICA_INTERNET_SAUDE_15
**Descricao:** Criticas sao registradas na tabela `tb_usuario_critica_internet` para inconsistencias detectadas.
**Evidencia:** reversa-pr_critica_internet_saude_15.md

---