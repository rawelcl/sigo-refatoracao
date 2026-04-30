# Catalogo de Objetos PL/SQL

> Atualizado em: [data atual]
> Fonte: Agente Eng. Reversa

---

## PR_CRITICA_INTERNET_SAUDE_15

| Atributo          | Valor                                                              |
|-------------------|--------------------------------------------------------------------|
| Tipo              | PROCEDURE                                                         |
| Schema            | HUMASTER                                                          |
| CVS               | C:\CVS\health_install\procedure\pr_critica_internet_saude_15.sql |
| Versao CVS        | PRODUCAO                                                          |
| Tamanho           | 200+ linhas                                                      |
| Status Producao   | VALID                                                             |
| Parametros IN     | p_titular, p_dependente                                          |
| Eng. Reversa      | [OK] `output/rotinas/pr_critica_internet_saude_15/rev-PRODUCAO/01-engenharia-reversa/reversa-pr_critica_internet_saude_15.md` |

**Responsabilidade:** Validacao de beneficiarios (titulares e dependentes) com base em criterios como idade, status de processamento e parametrizacoes especificas. Registra criticas em `tb_usuario_critica_internet`.

**Tabelas envolvidas:**
- `tb_usuario_titular_internet`
- `tb_usuario_dependente_internet`
- `tb_usuario_critica_internet`
- `tb_empresa_conveniada`
- `tb_carga_sib_parametro`
- `tb_empresa_conveniada_unidade`

**Regras de Negocio:**
- RN01: Validar idade critica.
- RN02: Registrar criticas.

**Dependencias externas:**
- Funcoes auxiliares:
  - `fn_individual_familiar`
  - `fn_registro_sistema`

**Riscos:**
- [ANS] Falha na validacao de idade pode levar a inclusao de beneficiarios fora dos limites regulatorios.
- Excecoes silenciosas (`WHEN OTHERS THEN NULL`) podem mascarar erros criticos.

---