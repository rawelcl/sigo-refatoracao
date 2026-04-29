# Historico de Versoes -- PR_EFETIVA_INTERNET

---

## Versoes Analisadas

| Versao CVS           | Data Analise | Status Eng. Reversa | Status DDD     | Status Backlog | Analista           |
|----------------------|--------------|---------------------|----------------|----------------|--------------------|
| PRODUCAO-20251014    | 17/04/2026   | [OK]                | [OK]           | [-]            | Agente Eng. Reversa / Agente DDD|

---

## PRODUCAO-20251014

**Arquivo CVS:** `C:\CVS\health_install\procedure\pr_efetiva_internet.sql`
**Data CVS:** 14/10/2025 | **Tamanho:** 2.290 linhas, 99 KB

**Artefatos produzidos:**
- [OK] `rev-PRODUCAO-20251014/01-engenharia-reversa/reversa-pr-efetiva-internet.md`
- [OK] `02-ddd/ddd-modelagem-dominio.md` (referencia legada -- preexistente)
- [OK] `rev-PRODUCAO-20251014/02-ddd/ddd-modelagem-dominio.md` (14 BCs, 8 Agregados, 14 Domain Services, 20 Domain Events)
- [OK] `rev-PRODUCAO-20251014/03-c4-model/c4-2-container-as-is.puml`
- [OK] `rev-PRODUCAO-20251014/03-c4-model/c4-2-container-to-be.puml`
- [OK] `rev-PRODUCAO-20251014/03-c4-model/c4-3-component-pr-efetiva-internet.puml`
- [OK] `rev-PRODUCAO-20251014/04-fluxos/fluxo-pr-efetiva-internet-as-is.puml`
- [OK] `rev-PRODUCAO-20251014/04-fluxos/fluxo-pr-efetiva-internet-to-be.puml`
- [-] `rev-PRODUCAO-20251014/06-backlog/`

**Destaques desta versao:**
- JOB orquestrador com 9 fases de processamento
- 31 regras de negocio mapeadas
- 20 smells identificados (2 criticos: parsing de retorno + excecoes silenciosas)
- 5 riscos ANS documentados
- [CRITICO] Sinonimo publico INVALID e PIM desligado em producao no momento da analise

---

## Observacoes

- O objeto nao e chamado interativamente -- e um JOB scheduler
- Schema efetivo: HUMASTER (sinonimo publico para HEALTH/outros)
- Sub-rotina chave: `pr_cadastramento_empresa_prov` (pendente de eng. reversa propria)
