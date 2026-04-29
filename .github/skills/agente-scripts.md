# Agente: Scripts

> Carregado pelo Claude Code quando a tarefa envolve criacao, execucao ou registro
> de scripts do projeto. As regras compartilhadas estao em `@CLAUDE.md`.

---

## Identidade

Atue como **Engenheiro de Automacao do Projeto**, responsavel por garantir que toda
acao repetivel ou em massa do projeto existe como script registrado, testado e
documentado. Voce elimina trabalho manual, reduz erros e garante que qualquer
membro do time consiga reproduzir qualquer operacao.

**Postura:** pragmatico e preventivo. Nenhuma acao em massa sem script. Nenhum script
sem cabecalho, encoding correto e registro no catalogo.

---

## Quando Este Agente Atua

- Usuario pede para criar um script
- Usuario executa uma acao repetivel que ainda nao tem script
- Usuario pede para listar, buscar ou atualizar scripts existentes
- Qualquer agente identifica uma acao que deveria ser automatizada

---

## Regra Inegociavel

```
Criar script ? Executar script ? Registrar no catalogo
```

Nunca executar alteracoes em massa sem script registrado.
Nunca criar script sem cabecalho padrao e encoding UTF-8 sem BOM.

---

## Estrutura do Diretorio `scripts/`

```
scripts/
??? catalogo-scripts.md         ? indice de todos os scripts (porta de entrada)
??? lib/
?   ??? utils.py                ? funcoes utilitarias compartilhadas
??? eng-reversa/                ? apoio ao processo de engenharia reversa
??? base-conhecimento/          ? manutencao e consulta da base de conhecimento
??? projeto/                    ? governanca e estrutura do projeto
```

Se qualquer pasta nao existir: criar automaticamente antes de salvar o script.

---

## Cabecalho Obrigatorio em Todo Script

```python
# ---------------------------------------------------------------------------
# Script  : [nome_do_script].py
# Objetivo: [descricao em uma linha]
# Agente  : [eng-reversa / base-conhecimento / projeto]
# Rotina  : [rotina de origem — ou "geral" se de uso amplo]
# Autor   : [nome]
# Data    : [data de criacao]
# Versao  : 1.0
# Encoding: UTF-8 sem BOM
# ---------------------------------------------------------------------------
# Uso     : python scripts/[subdir]/[nome].py [args]
# Exemplo : python scripts/projeto/criar-estrutura-rotina.py PR_EFETIVA_INTERNET
# ---------------------------------------------------------------------------
```

---

## Convencoes de Codigo

### Encoding — sempre explicito

```python
# CORRETO
with open(caminho, 'r', encoding='utf-8') as f:
    conteudo = f.read()

with open(caminho, 'w', encoding='utf-8') as f:
    f.write(conteudo)

# ERRADO — nunca omitir encoding
with open(caminho, 'r') as f:
    ...
```

### Saida Padrao — tokens textuais do projeto

```python
print("[OK] Estrutura criada em: rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1/")
print("[ATENCAO] Tag PRODUCAO nao encontrada para: PR_VALIDA_CONTRATO")
print("[BLOQUEADO] Objeto nao localizado no CVS: FN_CALCULA_CARENCIA")
print("[ERRO] Falha ao acessar: catalogo-objetos-plsql.md")
```

### Tratamento de Erros — sempre com sys.exit

```python
import sys

def main():
    try:
        executar()
    except FileNotFoundError as e:
        print(f"[ERRO] Arquivo nao encontrado: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERRO] Falha inesperada: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

---

## Scripts do Projeto — Prontos para Uso

### `scripts/projeto/criar-estrutura-rotina.py`

Cria a estrutura de pastas de uma nova rotina (ou nova versao) a partir do template.

```python
# ---------------------------------------------------------------------------
# Script  : criar-estrutura-rotina.py
# Objetivo: Cria estrutura de pastas para nova rotina ou nova versao
# Agente  : projeto
# Rotina  : geral
# Uso     : python scripts/projeto/criar-estrutura-rotina.py [OBJETO] [TIPO]
# Exemplo : python scripts/projeto/criar-estrutura-rotina.py PR_EFETIVA_INTERNET PROCEDURE
# ---------------------------------------------------------------------------
import os, sys, shutil
from datetime import date

TEMPLATE_DIR = "_templates/rotina-template"
ROTINAS_DIR  = "rotinas"

def resolver_tag_cvs(objeto, tipo):
    """Resolucao automatica da ultima tag PRODUCAO no CVS."""
    bases = {
        'PROCEDURE': r'C:\CVS\health_install\procedure',
        'FUNCTION' : r'C:\CVS\health_install\function',
        'PACKAGE'  : r'C:\CVS\health_install\package',
    }
    base = bases.get(tipo.upper())
    if not base:
        print(f"[ERRO] Tipo desconhecido: {tipo}")
        sys.exit(1)
    # Listar versoes com tag PRODUCAO e retornar a mais recente
    caminho_obj = os.path.join(base, objeto.lower())
    if not os.path.isdir(caminho_obj):
        print(f"[BLOQUEADO] Objeto nao encontrado no CVS: {caminho_obj}")
        sys.exit(1)
    tags = sorted([d for d in os.listdir(caminho_obj) if d.startswith('PRODUCAO')], reverse=True)
    if not tags:
        print(f"[BLOQUEADO] Nenhuma tag PRODUCAO encontrada para: {objeto}")
        sys.exit(1)
    return tags[0]

def criar_readme_rotina(pasta_rotina, objeto, tag):
    readme = os.path.join(pasta_rotina, "README-rotina.md")
    if os.path.exists(readme):
        return
    conteudo = f"""# Historico de Versoes: {objeto.upper()}

| Versao (Tag CVS) | Data de Inicio | Data de Conclusao | Analista | Etapas | Status |
|---|---|---|---|---|---|
| rev-{tag} | {date.today()} | — | — | E0 | [EM-CURSO] |

## Versao Ativa
**Subpasta:** `rev-{tag}/`
**Motivo desta versao:** primeira analise
"""
    with open(readme, 'w', encoding='utf-8') as f:
        f.write(conteudo)
    print(f"[OK] Criado: {readme}")

def criar_estrutura(objeto, tipo):
    tag          = resolver_tag_cvs(objeto, tipo)
    pasta_rotina = os.path.join(ROTINAS_DIR, objeto.lower())
    pasta_versao = os.path.join(pasta_rotina, f"rev-{tag}")

    os.makedirs(pasta_rotina, exist_ok=True)
    criar_readme_rotina(pasta_rotina, objeto, tag)

    if os.path.exists(pasta_versao):
        print(f"[ATENCAO] Versao ja existe: {pasta_versao}")
        return

    shutil.copytree(TEMPLATE_DIR, pasta_versao)
    print(f"[OK] Criado: {pasta_versao}")
    print(f"[OK] Tag CVS resolvida: {tag}")
    print(f"\n[OK] Proximos passos:")
    print(f"     1. Consultar base: _shared/base-conhecimento/indice.md")
    print(f"     2. Iniciar eng. reversa com: @.github/skills/agente-eng-reversa.md")

def main():
    if len(sys.argv) < 3:
        print("[ERRO] Uso: python criar-estrutura-rotina.py [OBJETO] [TIPO]")
        sys.exit(1)
    criar_estrutura(sys.argv[1], sys.argv[2])

if __name__ == '__main__':
    main()
```

---

### `scripts/projeto/validar-estrutura.py`

Valida se a estrutura de uma versao de rotina esta correta.

```python
# ---------------------------------------------------------------------------
# Script  : validar-estrutura.py
# Objetivo: Verifica estrutura de pastas de uma versao de rotina
# Agente  : projeto
# Rotina  : geral
# Uso     : python scripts/projeto/validar-estrutura.py [OBJETO] [TAG]
# Exemplo : python scripts/projeto/validar-estrutura.py PR_EFETIVA_INTERNET PRODUCAO-2.4.1
# ---------------------------------------------------------------------------
import os, sys

PASTAS = [
    "01-engenharia-reversa",
    "02-ddd",
    "03-c4-model/src", "03-c4-model/svg",
    "04-fluxos/src",   "04-fluxos/svg",
    "05-analise-impacto",
    "06-backlog",
]

def validar(objeto, tag):
    base    = os.path.join("rotinas", objeto.lower())
    versao  = os.path.join(base, f"rev-{tag}")
    readme  = os.path.join(base, "README-rotina.md")
    erros   = 0

    for path, label in [(base, "Pasta da rotina"), (versao, "Pasta da versao"), (readme, "README-rotina.md")]:
        if os.path.exists(path):
            print(f"[OK] {path}")
        else:
            print(f"[ATENCAO] Ausente: {path}")
            erros += 1

    for pasta in PASTAS:
        caminho = os.path.join(versao, pasta)
        if os.path.isdir(caminho):
            print(f"[OK] {caminho}")
        else:
            print(f"[ATENCAO] Ausente: {caminho}")
            erros += 1

    print()
    if erros == 0:
        print(f"[OK] Estrutura de '{objeto} / rev-{tag}' esta correta.")
    else:
        print(f"[ATENCAO] {erros} item(ns) ausente(s).")

def main():
    if len(sys.argv) < 3:
        print("[ERRO] Uso: python validar-estrutura.py [OBJETO] [TAG]")
        sys.exit(1)
    validar(sys.argv[1], sys.argv[2])

if __name__ == '__main__':
    main()
```

---

### `scripts/base-conhecimento/buscar-objeto.py`

Busca um objeto PL/SQL na base de conhecimento por nome parcial.

```python
# ---------------------------------------------------------------------------
# Script  : buscar-objeto.py
# Objetivo: Busca objeto PL/SQL no catalogo da base de conhecimento
# Agente  : base-conhecimento
# Rotina  : geral
# Uso     : python scripts/base-conhecimento/buscar-objeto.py [NOME_PARCIAL]
# ---------------------------------------------------------------------------
import sys

CATALOGO = "_shared/base-conhecimento/catalogo-objetos-plsql.md"

def buscar(termo):
    try:
        with open(CATALOGO, 'r', encoding='utf-8') as f:
            conteudo = f.read()
    except FileNotFoundError:
        print(f"[BLOQUEADO] Catalogo nao encontrado: {CATALOGO}")
        sys.exit(1)

    blocos     = conteudo.split("\n## ")[1:]
    encontrados = [b for b in blocos if termo.upper() in b.upper()]

    if not encontrados:
        print(f"[ATENCAO] Nenhum objeto encontrado para: '{termo}'")
    else:
        print(f"[OK] {len(encontrados)} objeto(s) encontrado(s):\n")
        for b in encontrados:
            print(f"## {b.split(chr(10))[0].strip()}\n")

def main():
    if len(sys.argv) < 2:
        print("[ERRO] Uso: python buscar-objeto.py [NOME_PARCIAL]")
        sys.exit(1)
    buscar(sys.argv[1])

if __name__ == '__main__':
    main()
```

---

### `scripts/base-conhecimento/listar-pendencias.py`

Lista todas as pendencias abertas, com filtro opcional por tipo.

```python
# ---------------------------------------------------------------------------
# Script  : listar-pendencias.py
# Objetivo: Lista pendencias abertas da base de conhecimento
# Agente  : base-conhecimento
# Rotina  : geral
# Uso     : python scripts/base-conhecimento/listar-pendencias.py [--tipo ATENCAO|BLOQUEADO|CRITICO]
# ---------------------------------------------------------------------------
import sys

ARQUIVO = "_shared/base-conhecimento/pendencias-abertas.md"

def listar(filtro=None):
    try:
        with open(ARQUIVO, 'r', encoding='utf-8') as f:
            conteudo = f.read()
    except FileNotFoundError:
        print(f"[BLOQUEADO] Arquivo nao encontrado: {ARQUIVO}")
        sys.exit(1)

    blocos  = conteudo.split("\n## ")[1:]
    abertas = [b for b in blocos
               if ("Status:** Aberto" in b or "Status:** Em andamento" in b)
               and (not filtro or f"[{filtro}]" in b)]

    if not abertas:
        print("[OK] Nenhuma pendencia aberta encontrada.")
        return

    print(f"[ATENCAO] {len(abertas)} pendencia(s) aberta(s):\n")
    for b in abertas:
        linhas = b.split("\n")
        titulo = linhas[0].strip()
        rotina = next((l.split("**Rotina:**")[1].strip() for l in linhas if "**Rotina:**" in l), "N/A")
        tipo   = next((l.split("**Tipo:**")[1].strip() for l in linhas if "**Tipo:**" in l), "N/A")
        print(f"  [{tipo}] {titulo} | Rotina: {rotina}")

    print(f"\n[REF] Detalhes em: {ARQUIVO}")

def main():
    filtro = None
    if "--tipo" in sys.argv:
        idx = sys.argv.index("--tipo")
        if idx + 1 < len(sys.argv):
            filtro = sys.argv[idx + 1].upper()
    listar(filtro)

if __name__ == '__main__':
    main()
```

---

### `scripts/projeto/gerar-relatorio-status.py`

Gera relatorio de status de todas as rotinas do projeto.

```python
# ---------------------------------------------------------------------------
# Script  : gerar-relatorio-status.py
# Objetivo: Gera relatorio de status de todas as rotinas refatoradas
# Agente  : projeto
# Rotina  : geral
# Uso     : python scripts/projeto/gerar-relatorio-status.py
# ---------------------------------------------------------------------------
import os, sys
from datetime import date

ROTINAS_DIR = "rotinas"
ETAPAS      = ["01-engenharia-reversa", "02-ddd", "03-c4-model",
               "04-fluxos", "05-analise-impacto", "06-backlog"]

def status_etapa(pasta_versao, etapa):
    return "[OK]" if os.path.isdir(os.path.join(pasta_versao, etapa)) and \
           any(os.scandir(os.path.join(pasta_versao, etapa))) else "[-]"

def gerar():
    if not os.path.isdir(ROTINAS_DIR):
        print(f"[BLOQUEADO] Diretorio nao encontrado: {ROTINAS_DIR}")
        sys.exit(1)

    linhas = [
        f"# Relatorio de Status — Projeto de Refatoracao SIGO",
        f"Gerado em: {date.today()}\n",
        "| Rotina | Versao | E1 | E2 | E3 | E4 | E5 | E6 | Status |",
        "|--------|--------|:--:|:--:|:--:|:--:|:--:|:--:|--------|",
    ]

    for rotina in sorted(os.listdir(ROTINAS_DIR)):
        pasta_rotina = os.path.join(ROTINAS_DIR, rotina)
        if not os.path.isdir(pasta_rotina):
            continue
        versoes = sorted([v for v in os.listdir(pasta_rotina) if v.startswith("rev-")], reverse=True)
        if not versoes:
            linhas.append(f"| {rotina} | — | [-] | [-] | [-] | [-] | [-] | [-] | Sem versao |")
            continue
        versao_ativa = versoes[0]
        pasta_versao = os.path.join(pasta_rotina, versao_ativa)
        cols = [status_etapa(pasta_versao, e) for e in ETAPAS]
        concluida = all(c == "[OK]" for c in cols)
        status = "Concluida" if concluida else "Em andamento"
        linhas.append(f"| {rotina} | {versao_ativa} | {' | '.join(cols)} | {status} |")

    relatorio = "\n".join(linhas)
    print(relatorio)

    saida = "relatorio-status.md"
    with open(saida, 'w', encoding='utf-8') as f:
        f.write(relatorio)
    print(f"\n[OK] Relatorio salvo em: {saida}")

if __name__ == '__main__':
    gerar()
```

---

## `catalogo-scripts.md` — Template Inicial

```markdown
# Catalogo de Scripts
Ultima atualizacao: [data]

## Projeto / Governanca

| Script | Localizacao | Objetivo | Data | Status |
|---|---|---|---|---|
| criar-estrutura-rotina.py | scripts/projeto/ | Cria estrutura de pastas para nova rotina | [data] | [OK] |
| validar-estrutura.py | scripts/projeto/ | Valida estrutura de pastas de uma versao | [data] | [OK] |
| gerar-relatorio-status.py | scripts/projeto/ | Gera relatorio de status de todas as rotinas | [data] | [OK] |

## Base de Conhecimento

| Script | Localizacao | Objetivo | Data | Status |
|---|---|---|---|---|
| buscar-objeto.py | scripts/base-conhecimento/ | Busca objeto PL/SQL no catalogo | [data] | [OK] |
| listar-pendencias.py | scripts/base-conhecimento/ | Lista pendencias abertas | [data] | [OK] |

## Eng. Reversa

| Script | Localizacao | Objetivo | Data | Status |
|---|---|---|---|---|
```

---

## Retroalimentacao ao Criar um Script

Apos criar e registrar qualquer script:

```
[ ] Script salvo na subpasta correta (eng-reversa / base-conhecimento / projeto)
[ ] Cabecalho padrao preenchido
[ ] Encoding UTF-8 sem BOM garantido em todos os open()
[ ] Testado manualmente antes de registrar
[ ] Registrado em scripts/catalogo-scripts.md
[ ] _shared/base-conhecimento/indice.md atualizado (Scripts registrados: N+1)
```