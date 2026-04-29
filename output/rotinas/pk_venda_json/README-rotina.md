# Historico de Versoes -- PK_VENDA_JSON

---

## Versoes Analisadas

| Versao CVS           | Data Analise | Status Eng. Reversa | Status DDD | Status Backlog | Analista           |
|----------------------|--------------|---------------------|------------|----------------|--------------------|
| PRODUCAO-20260402    | 17/04/2026   | [OK]                | [OK]       | [-]            | Agente DDD         |

---

## PRODUCAO-20260402

**Arquivo CVS (spec):** `C:\CVS\health_install\package\pk_venda_json.sql`
**Arquivo CVS (body):** `C:\CVS\health_install\package_body\pk_venda_json.sql`
**Data CVS:** 02/04/2026 | **Tamanho body:** 6.334 linhas, 275 KB

**Artefatos produzidos:**
- [OK] `rev-PRODUCAO-20260402/01-engenharia-reversa/reversa-pk-venda-json.md`
- [OK] `rev-PRODUCAO-20260402/02-ddd/ddd-modelagem-dominio.md`
- [OK] `rev-PRODUCAO-20260402/03-c4-model/src/` (5 diagramas: as-is, to-be, to-be-fase3, landscape, component)
- [OK] `rev-PRODUCAO-20260402/03-c4-model/svg/` (5 SVGs gerados)
- [OK] `rev-PRODUCAO-20260402/04-fluxos/src/` (fluxo as-is + to-be)
- [OK] `rev-PRODUCAO-20260402/04-fluxos/svg/` (2 SVGs gerados)
- [OK] `_shared/c4-model/src/c4-1-system-context.puml` (atualizado)
- [-] `rev-PRODUCAO-20260402/05-analise-impacto/`
- [-] `rev-PRODUCAO-20260402/06-backlog/`

**Destaques desta versao:**
- Package responsavel pela integracao JSON do sistema BITIX e efetivacao automatica POS
- 12 rotinas internas (11 publicas + 1 privada)
- Motor de criticas/pendencias com 3 modos de validacao
- Codigo triplicado: pr_efetiva / pr_efetiva_baixa_manual / pr_efetiva_baixa_manual_emp
- Estado global de package (15 variaveis G_*) -- risco de concorrencia
- Herda [CRITICO] de PR_EFETIVA_INTERNET: parsing fragil de retorno pr_cadastramento_empresa_prov
