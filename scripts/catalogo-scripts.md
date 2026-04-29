# Catalogo de Scripts -- Projeto SIGO Refatoracao

> Porta de entrada para todos os scripts do projeto.
> Atualizar sempre que um script for criado ou modificado.
> Encoding: UTF-8 sem BOM

---

## Indice

| Script | Agente | Rotina | Status | Descricao |
|---|---|---|---|---|
| `scripts/projeto/gerar-svg.py` | projeto | geral | [OK] | Gera SVGs a partir de .puml em estrutura canonica (`src/svg/`) |
| `scripts/projeto/organizar-e-gerar-svg.py` | projeto | geral | [OK] | Move .puml para `src/`, cria `svg/` e gera SVGs (suporta legado sem `src/`) |

---

## Detalhes

---

### `scripts/projeto/gerar-svg.py`

**Objetivo:** Gera arquivos SVG a partir de .puml. Espera estrutura canonica (`src/` e `svg/`).
**Agente:** projeto
**Rotina:** geral
**Data:** --
**Versao:** 1.0

**Uso:**
```
python scripts/projeto/gerar-svg.py [ARQUIVO.puml | PASTA-SRC | PASTA-VERSAO]
```

**Exemplos:**
```
# Arquivo unico
python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/03-c4-model/src/c4-2-container-as-is.puml

# Pasta src/ direta
python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014/03-c4-model/src

# Rotina completa (varre 03-c4-model/src e 04-fluxos/src)
python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-20251014
```

**Pre-requisitos:** `pip install plantuml` (ou `tools/plantuml.jar` + Java)
**Observacao:** Nao move arquivos. Se os .puml estiverem fora de `src/`, usar `organizar-e-gerar-svg.py`.

---

### `scripts/projeto/organizar-e-gerar-svg.py`

**Objetivo:** Move .puml soltos para `src/`, cria `svg/` e gera todos os SVGs. Suporta rotinas ainda nao organizadas na estrutura canonica.
**Agente:** projeto
**Rotina:** geral
**Data:** 17/04/2026
**Versao:** 1.0

**Uso:**
```
python scripts/projeto/organizar-e-gerar-svg.py [PASTA-VERSAO] [ESCOPO]
```

**Escopos disponiveis:**
| Escopo | Pastas processadas |
|---|---|
| `completo` (default) | `03-c4-model/` + `04-fluxos/` |
| `c4` | `03-c4-model/` apenas |
| `fluxos` | `04-fluxos/` apenas |

**Exemplos:**
```
# Completo (C4 + fluxos)
python scripts/projeto/organizar-e-gerar-svg.py rotinas/pk_venda_json/rev-PRODUCAO-20260402

# Apenas C4
python scripts/projeto/organizar-e-gerar-svg.py rotinas/pk_venda_json/rev-PRODUCAO-20260402 c4

# Apenas fluxos
python scripts/projeto/organizar-e-gerar-svg.py rotinas/pk_venda_json/rev-PRODUCAO-20260402 fluxos
```

**Pre-requisitos:** `pip install plantuml`
**Comportamento de migracao:** Se `.puml` estiver diretamente em `03-c4-model/` (sem `src/`), o script move o arquivo para `03-c4-model/src/` antes de gerar o SVG. Rotinas ja organizadas sao processadas diretamente de `src/`.

**Execucoes registradas:**
| Data | Rotina | Versao | Escopo | Resultado |
|---|---|---|---|---|
| 17/04/2026 | pk_venda_json | rev-PRODUCAO-20260402 | completo | [OK] 5/5 SVGs gerados |
