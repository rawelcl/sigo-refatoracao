# Referencia: Scripts como Ativos do Projeto

## Objetivo

Scripts sao **ativos permanentes e rastreados** do projeto de refatoracao. Toda acao automatizavel — criacao de estruturas de pastas, extracao de dados, validacao de artefatos, manutencao da base de conhecimento — deve existir como script registrado, nao como acao manual efemera.

**Regra inegociavel:** criar script ? executar script ? registrar no catalogo.

---

## Estrutura do Diretorio `scripts/`

```
scripts/
??? catalogo-scripts.md         ? indice de todos os scripts (obrigatorio)
??? lib/
?   ??? utils.py                ? funcoes utilitarias compartilhadas entre scripts
??? eng-reversa/                ? apoio ao processo de engenharia reversa
?   ??? extrair-objetos-cvs.py  ? recupera codigo de objetos do CVS
?   ??? listar-dependencias.py  ? consulta dba_dependencies para mapear dependentes
?   ??? validar-tag-producao.py ? verifica se tag PRODUCAO existe para um objeto
??? base-conhecimento/          ? manutencao e consulta da base de conhecimento
?   ??? buscar-objeto.py        ? busca um objeto no catalogo-objetos-plsql.md
?   ??? buscar-tabela.py        ? busca uma tabela no catalogo-tabelas.md
?   ??? listar-pendencias.py    ? lista [ATENCAO] e [BLOQUEADO] em aberto
?   ??? exportar-metricas.py    ? gera relatorio de metricas do projeto
??? projeto/                    ? governanca e estrutura do projeto
    ??? criar-estrutura-rotina.py ? cria a estrutura de pastas a partir do template
    ??? validar-estrutura.py    ? verifica se a estrutura de uma rotina esta correta
    ??? gerar-relatorio-status.py ? gera relatorio de status de todas as rotinas
```

---

## `catalogo-scripts.md` — Registro Obrigatorio

Todo script deve ser registrado neste arquivo imediatamente apos ser criado ou atualizado.

```markdown
# Catalogo de Scripts

Ultima atualizacao: [data]
Total de scripts: [N]

## Scripts de Eng. Reversa

| Script | Localizacao | Objetivo | Rotina de Origem | Data | Status |
|---|---|---|---|---|---|
| extrair-objetos-cvs.py | scripts/eng-reversa/ | Recupera codigo do CVS com verificacao de tag | Projeto geral | [data] | [OK] |

## Scripts de Base de Conhecimento

| Script | Localizacao | Objetivo | Rotina de Origem | Data | Status |
|---|---|---|---|---|---|
| buscar-objeto.py | scripts/base-conhecimento/ | Busca objeto no catalogo por nome parcial | Projeto geral | [data] | [OK] |

## Scripts de Projeto / Governanca

| Script | Localizacao | Objetivo | Rotina de Origem | Data | Status |
|---|---|---|---|---|---|
| criar-estrutura-rotina.py | scripts/projeto/ | Cria estrutura de pastas de nova rotina | Projeto geral | [data] | [OK] |
```

---

## Convencoes de Codigo

### Cabecalho Obrigatorio

Todo script deve iniciar com este cabecalho (UTF-8, sem acentos no cabecalho):

```python
# ---------------------------------------------------------------------------
# Script  : [nome_do_script].py
# Objetivo: [descricao do que o script faz em uma linha]
# Rotina  : [rotina de origem — ou "projeto" se de uso geral]
# Autor   : [nome]
# Data    : [data de criacao]
# Versao  : [N.N]
# Encoding: UTF-8 sem BOM
# ---------------------------------------------------------------------------
# Uso: python scripts/[subdir]/[nome_do_script].py [args]
# Exemplo: python scripts/eng-reversa/listar-dependencias.py PR_EFETIVA_INTERNET
# ---------------------------------------------------------------------------
```

### Encoding

```python
# CORRETO — abertura de arquivo com encoding explicito
with open(caminho, 'r', encoding='utf-8') as f:
    conteudo = f.read()

with open(caminho, 'w', encoding='utf-8') as f:
    f.write(conteudo)

# ERRADO — nunca usar open() sem encoding em scripts do projeto
with open(caminho, 'r') as f:   # pode ler CP1252 no Windows
    ...
```

### Tratamento de Erros

```python
import sys

def main():
    try:
        # logica principal
        pass
    except FileNotFoundError as e:
        print(f"[ERRO] Arquivo nao encontrado: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERRO] Falha inesperada: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### Saida Padrao (stdout)

Use os tokens textuais do projeto nas mensagens de saida:

```python
print("[OK] Estrutura criada em: rotinas/pr_efetiva_internet/")
print("[ATENCAO] Tag PRODUCAO nao encontrada para: PR_VALIDA_CONTRATO")
print("[BLOQUEADO] Objeto nao localizado no CVS: FN_CALCULA_CARENCIA")
print("[ERRO] Falha ao acessar: catalogo-objetos-plsql.md")
```

---

## Templates de Scripts Recorrentes

### Template: Criar Estrutura de Nova Rotina (com Versionamento)

```python
# ---------------------------------------------------------------------------
# Script  : criar-estrutura-rotina.py
# Objetivo: Cria estrutura de pastas para nova rotina ou nova versao de rotina
# Rotina  : Projeto geral
# Uso     : python scripts/projeto/criar-estrutura-rotina.py [NOME_ROTINA] [TAG_CVS]
# Exemplo : python scripts/projeto/criar-estrutura-rotina.py pr_efetiva_internet PRODUCAO-3.0.0
# ---------------------------------------------------------------------------
import os
import sys
import shutil

TEMPLATE_DIR = "_templates/rotina-template"
ROTINAS_DIR  = "rotinas"
README_ROTINA_TEMPLATE = "_templates/README-rotina.md"

def criar_estrutura(nome_rotina, tag_cvs):
    pasta_rotina  = os.path.join(ROTINAS_DIR, nome_rotina.lower())
    pasta_versao  = os.path.join(pasta_rotina, f"rev-{tag_cvs}")
    readme_rotina = os.path.join(pasta_rotina, "README-rotina.md")

    # Criar pasta raiz da rotina se nao existir
    if not os.path.exists(pasta_rotina):
        os.makedirs(pasta_rotina)
        print(f"[OK] Criado: {pasta_rotina}")
    else:
        print(f"[OK] Pasta da rotina ja existe: {pasta_rotina}")

    # Criar README-rotina.md se nao existir
    if not os.path.exists(readme_rotina):
        conteudo = f"""# Historico de Versoes: {nome_rotina.upper()}

| Versao (Tag CVS) | Data de Inicio | Data de Conclusao | Analista | Etapas | Status |
|---|---|---|---|---|---|
| rev-{tag_cvs} | [data] | — | [nome] | E0 | [EM-CURSO] |

## Versao Ativa
**Subpasta:** `rev-{tag_cvs}/`
**Motivo desta versao:** [primeira analise / descrever o que mudou no codigo legado]
"""
        with open(readme_rotina, 'w', encoding='utf-8') as f:
            f.write(conteudo)
        print(f"[OK] Criado: {readme_rotina}")

    # Criar subpasta de versao
    if os.path.exists(pasta_versao):
        print(f"[ATENCAO] Versao ja existe: {pasta_versao}")
        print(f"[ATENCAO] Para continuar a analise desta versao, use a pasta existente.")
        return

    shutil.copytree(TEMPLATE_DIR, pasta_versao)
    print(f"[OK] Criado: {pasta_versao}")
    print(f"\n[OK] Proximos passos:")
    print(f"     1. Confirmar tag '{tag_cvs}' no CVS")
    print(f"     2. Consultar base: _shared/base-conhecimento/indice.md")
    print(f"     3. Atualizar README-rotina.md com data de inicio e analista")
    print(f"     4. Iniciar Etapa 1 (Eng. Reversa)")

def main():
    if len(sys.argv) < 3:
        print("[ERRO] Uso: python criar-estrutura-rotina.py [NOME_ROTINA] [TAG_CVS]")
        print("[ERRO] Exemplo: python criar-estrutura-rotina.py pr_efetiva_internet PRODUCAO-3.0.0")
        sys.exit(1)
    criar_estrutura(sys.argv[1], sys.argv[2])

if __name__ == '__main__':
    main()
```

---

### Template: Listar Dependencias Oracle

```python
# ---------------------------------------------------------------------------
# Script  : listar-dependencias.py
# Objetivo: Consulta dba_dependencies e lista objetos que dependem de uma rotina
# Rotina  : Apoio geral a eng. reversa
# Uso     : python scripts/eng-reversa/listar-dependencias.py [NOME_OBJETO]
# Requer  : cx_Oracle instalado; variaveis de ambiente DB_USER, DB_PASS, DB_DSN
# ---------------------------------------------------------------------------
import cx_Oracle
import os
import sys

def listar_dependencias(nome_objeto):
    user = os.environ.get('DB_USER')
    pwd  = os.environ.get('DB_PASS')
    dsn  = os.environ.get('DB_DSN')

    if not all([user, pwd, dsn]):
        print("[BLOQUEADO] Variaveis DB_USER, DB_PASS e DB_DSN nao configuradas")
        sys.exit(1)

    conn = cx_Oracle.connect(user, pwd, dsn)
    cur  = conn.cursor()

    sql = """
        SELECT owner, name, type
        FROM   dba_dependencies
        WHERE  referenced_name = UPPER(:nome)
          AND  referenced_type IN ('PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY')
        ORDER BY type, name
    """
    cur.execute(sql, nome=nome_objeto.upper())
    rows = cur.fetchall()

    if not rows:
        print(f"[OK] Nenhum dependente encontrado para: {nome_objeto}")
    else:
        print(f"[OK] Dependentes de {nome_objeto.upper()} ({len(rows)} encontrados):\n")
        for owner, name, obj_type in rows:
            print(f"  {obj_type:20} {owner}.{name}")

    cur.close()
    conn.close()

def main():
    if len(sys.argv) < 2:
        print("[ERRO] Uso: python listar-dependencias.py [NOME_OBJETO]")
        sys.exit(1)
    listar_dependencias(sys.argv[1])

if __name__ == '__main__':
    main()
```

---

### Template: Buscar Objeto na Base de Conhecimento

```python
# ---------------------------------------------------------------------------
# Script  : buscar-objeto.py
# Objetivo: Busca um objeto PL/SQL no catalogo da base de conhecimento
# Rotina  : Apoio geral — base de conhecimento
# Uso     : python scripts/base-conhecimento/buscar-objeto.py [NOME_PARCIAL]
# ---------------------------------------------------------------------------
import sys

CATALOGO = "_shared/base-conhecimento/catalogo-objetos-plsql.md"

def buscar_objeto(termo):
    try:
        with open(CATALOGO, 'r', encoding='utf-8') as f:
            linhas = f.readlines()
    except FileNotFoundError:
        print(f"[BLOQUEADO] Catalogo nao encontrado: {CATALOGO}")
        sys.exit(1)

    encontrados = []
    capturando  = False
    bloco       = []

    for linha in linhas:
        if linha.startswith("## ") and termo.upper() in linha.upper():
            capturando = True
            bloco = [linha]
        elif linha.startswith("## ") and capturando:
            encontrados.append("".join(bloco))
            capturando = False
            bloco = []
        elif capturando:
            bloco.append(linha)

    if capturando and bloco:
        encontrados.append("".join(bloco))

    if not encontrados:
        print(f"[ATENCAO] Nenhum objeto encontrado para: '{termo}'")
        print(f"[REF] Verificar: {CATALOGO}")
    else:
        print(f"[OK] {len(encontrados)} objeto(s) encontrado(s):\n")
        for bloco in encontrados:
            print(bloco)
            print("---")

def main():
    if len(sys.argv) < 2:
        print("[ERRO] Uso: python buscar-objeto.py [NOME_PARCIAL]")
        sys.exit(1)
    buscar_objeto(sys.argv[1])

if __name__ == '__main__':
    main()
```

---

### Template: Listar Pendencias Abertas

```python
# ---------------------------------------------------------------------------
# Script  : listar-pendencias.py
# Objetivo: Lista todas as pendencias abertas da base de conhecimento
# Rotina  : Apoio geral — base de conhecimento
# Uso     : python scripts/base-conhecimento/listar-pendencias.py [--tipo ATENCAO|BLOQUEADO|CRITICO]
# ---------------------------------------------------------------------------
import sys

PENDENCIAS = "_shared/base-conhecimento/pendencias-abertas.md"

def listar_pendencias(filtro_tipo=None):
    try:
        with open(PENDENCIAS, 'r', encoding='utf-8') as f:
            conteudo = f.read()
    except FileNotFoundError:
        print(f"[BLOQUEADO] Arquivo nao encontrado: {PENDENCIAS}")
        sys.exit(1)

    blocos  = conteudo.split("\n## ")[1:]  # pula cabecalho
    abertas = []

    for bloco in blocos:
        if "Status:** Aberto" in bloco or "Status:** Em andamento" in bloco:
            if filtro_tipo and f"[{filtro_tipo}]" not in bloco:
                continue
            abertas.append(bloco)

    if not abertas:
        print("[OK] Nenhuma pendencia aberta encontrada.")
        return

    print(f"[ATENCAO] {len(abertas)} pendencia(s) aberta(s):\n")
    for bloco in abertas:
        titulo = bloco.split("\n")[0].strip()
        # extrair rotina
        rotina = "N/A"
        for linha in bloco.split("\n"):
            if "**Rotina:**" in linha:
                rotina = linha.split("**Rotina:**")[1].strip()
                break
        print(f"  ## {titulo}  |  Rotina: {rotina}")

    print(f"\n[REF] Detalhes completos em: {PENDENCIAS}")

def main():
    filtro = None
    if "--tipo" in sys.argv:
        idx = sys.argv.index("--tipo")
        if idx + 1 < len(sys.argv):
            filtro = sys.argv[idx + 1].upper()
    listar_pendencias(filtro)

if __name__ == '__main__':
    main()
```

---

### Template: Validar Estrutura de Rotina

```python
# ---------------------------------------------------------------------------
# Script  : validar-estrutura.py
# Objetivo: Verifica se a estrutura de pastas de uma versao de rotina esta correta
# Rotina  : Projeto geral
# Uso     : python scripts/projeto/validar-estrutura.py [NOME_ROTINA] [TAG_CVS]
# Exemplo : python scripts/projeto/validar-estrutura.py pr_efetiva_internet PRODUCAO-3.0.0
# ---------------------------------------------------------------------------
import os
import sys

PASTAS_ESPERADAS = [
    "01-engenharia-reversa",
    "02-ddd",
    "03-c4-model/src",
    "03-c4-model/svg",
    "04-fluxos/src",
    "04-fluxos/svg",
    "05-analise-impacto",
    "06-backlog",
]

def validar(nome_rotina, tag_cvs):
    pasta_rotina = os.path.join("rotinas", nome_rotina.lower())
    pasta_versao = os.path.join(pasta_rotina, f"rev-{tag_cvs}")
    readme       = os.path.join(pasta_rotina, "README-rotina.md")

    if not os.path.isdir(pasta_rotina):
        print(f"[BLOQUEADO] Pasta da rotina nao encontrada: {pasta_rotina}")
        sys.exit(1)

    if not os.path.isfile(readme):
        print(f"[ATENCAO] Ausente: {readme}")
    else:
        print(f"[OK] {readme}")

    if not os.path.isdir(pasta_versao):
        print(f"[BLOQUEADO] Versao nao encontrada: {pasta_versao}")
        print(f"[ATENCAO] Execute: python criar-estrutura-rotina.py {nome_rotina} {tag_cvs}")
        sys.exit(1)

    erros = 0
    for pasta in PASTAS_ESPERADAS:
        caminho = os.path.join(pasta_versao, pasta)
        if os.path.isdir(caminho):
            print(f"[OK] {caminho}")
        else:
            print(f"[ATENCAO] Ausente: {caminho}")
            erros += 1

    print()
    if erros == 0:
        print(f"[OK] Estrutura de '{nome_rotina} / rev-{tag_cvs}' esta correta.")
    else:
        print(f"[ATENCAO] {erros} pasta(s) ausente(s) em '{nome_rotina} / rev-{tag_cvs}'.")

def main():
    if len(sys.argv) < 3:
        print("[ERRO] Uso: python validar-estrutura.py [NOME_ROTINA] [TAG_CVS]")
        print("[ERRO] Exemplo: python validar-estrutura.py pr_efetiva_internet PRODUCAO-3.0.0")
        sys.exit(1)
    validar(sys.argv[1], sys.argv[2])

if __name__ == '__main__':
    main()
```

---

## Checklist de Entrega de um Script

```
[ ] Cabecalho padrao preenchido (nome, objetivo, rotina, autor, data, versao)
[ ] Encoding UTF-8 sem BOM garantido em todos os open()
[ ] Tratamento de erros com sys.exit(1) em falhas
[ ] Mensagens de saida usando tokens textuais [OK], [ERRO], [ATENCAO], etc.
[ ] Script testado manualmente antes de registrar
[ ] Registrado em scripts/catalogo-scripts.md com localizacao e objetivo
[ ] Salvo na subpasta correta (eng-reversa / base-conhecimento / projeto)
```