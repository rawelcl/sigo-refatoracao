# ---------------------------------------------------------------------------
# Script  : gerar-svg.py
# Objetivo: Gera arquivo SVG a partir de um ou mais arquivos .puml
# Agente  : projeto
# Rotina  : geral
# Autor   : —
# Data    : —
# Versao  : 1.0
# Encoding: UTF-8 sem BOM
# ---------------------------------------------------------------------------
# Uso     : python scripts/projeto/gerar-svg.py [ARQUIVO.puml | PASTA]
#
# Exemplos:
#   Arquivo unico:
#     python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1/03-c4-model/src/c4-2-container-as-is.puml
#
#   Pasta inteira (todos os .puml dentro de src/):
#     python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1/03-c4-model/src
#
#   Rotina completa (C4 + fluxos de uma vez):
#     python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1
#
# Prerequisitos:
#   - Java instalado e disponivel no PATH
#   - plantuml.jar presente em tools/plantuml.jar (ou configurar PLANTUML_JAR abaixo)
#   - Alternativa: PlantUML instalado via pip: pip install plantuml
# ---------------------------------------------------------------------------

import os
import sys
import subprocess
import shutil
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------

# Caminho para o plantuml.jar — ajustar se necessario
PLANTUML_JAR = os.environ.get("PLANTUML_JAR", "tools/plantuml.jar")

# Pastas que contem arquivos .puml dentro de uma rotina
PASTAS_SRC = [
    "03-c4-model/src",
    "04-fluxos/src",
]

# ---------------------------------------------------------------------------
# Utilitarios
# ---------------------------------------------------------------------------

def resolver_pasta_svg(puml_path: Path) -> Path:
    """Dado um .puml em src/, retorna a pasta svg/ correspondente."""
    svg_dir = puml_path.parent.parent / "svg"
    svg_dir.mkdir(parents=True, exist_ok=True)
    return svg_dir


def verificar_plantuml() -> str:
    """
    Verifica qual metodo de execucao do PlantUML esta disponivel.
    Retorna: 'jar' | 'pip' | None
    """
    # Tentar via JAR
    if os.path.isfile(PLANTUML_JAR):
        java = shutil.which("java")
        if java:
            return "jar"

    # Tentar via pip (plantuml)
    try:
        import plantuml  # noqa
        return "pip"
    except ImportError:
        pass

    return None


def gerar_svg_jar(puml_path: Path, svg_dir: Path) -> bool:
    """Gera SVG usando plantuml.jar via Java."""
    cmd = [
        "java", "-jar", PLANTUML_JAR,
        "-tsvg",
        "-o", str(svg_dir.resolve()),
        str(puml_path.resolve()),
    ]
    resultado = subprocess.run(cmd, capture_output=True, text=True)
    return resultado.returncode == 0


def gerar_svg_pip(puml_path: Path, svg_dir: Path) -> bool:
    """Gera SVG usando a biblioteca plantuml do pip."""
    from plantuml import PlantUML
    servidor = PlantUML(url="http://www.plantuml.com/plantuml/svg/")
    svg_path = svg_dir / (puml_path.stem + ".svg")
    try:
        with open(puml_path, "r", encoding="utf-8") as f:
            conteudo = f.read()
        svg_conteudo = servidor.processes(conteudo)
        with open(svg_path, "wb") as f:
            f.write(svg_conteudo)
        return True
    except Exception:
        return False


def gerar_svg(puml_path: Path, metodo: str) -> bool:
    """Gera o SVG para um arquivo .puml."""
    svg_dir = resolver_pasta_svg(puml_path)
    svg_path = svg_dir / (puml_path.stem + ".svg")

    if metodo == "jar":
        ok = gerar_svg_jar(puml_path, svg_dir)
    elif metodo == "pip":
        ok = gerar_svg_pip(puml_path, svg_dir)
    else:
        return False

    if ok and svg_path.exists():
        print(f"[OK] SVG gerado: {svg_path}")
        return True
    else:
        print(f"[ERRO] Falha ao gerar SVG para: {puml_path}")
        return False


# ---------------------------------------------------------------------------
# Resolucao de alvos
# ---------------------------------------------------------------------------

def coletar_pumls(alvo: Path) -> list:
    """
    Dado um caminho (arquivo .puml, pasta src/ ou pasta de versao),
    retorna lista de Paths de arquivos .puml a processar.
    """
    pumls = []

    if alvo.is_file() and alvo.suffix == ".puml":
        pumls.append(alvo)

    elif alvo.is_dir():
        # Verificar se e uma pasta src/ direta
        diretos = list(alvo.glob("*.puml"))
        if diretos:
            pumls.extend(diretos)
        else:
            # Tratar como pasta de versao — varrer PASTAS_SRC
            for sub in PASTAS_SRC:
                src = alvo / sub
                if src.is_dir():
                    pumls.extend(src.glob("*.puml"))

    return sorted(pumls)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print("[ERRO] Uso: python gerar-svg.py [ARQUIVO.puml | PASTA]")
        print()
        print("  Exemplos:")
        print("    python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1/03-c4-model/src/c4-2-container-as-is.puml")
        print("    python scripts/projeto/gerar-svg.py rotinas/pr_efetiva_internet/rev-PRODUCAO-2.4.1")
        sys.exit(1)

    alvo = Path(sys.argv[1])

    if not alvo.exists():
        print(f"[ERRO] Caminho nao encontrado: {alvo}")
        sys.exit(1)

    # Verificar PlantUML
    metodo = verificar_plantuml()
    if not metodo:
        print("[ATENCAO] PlantUML nao localizado no ambiente.")
        print(f"          JAR esperado em : {PLANTUML_JAR}")
        print("          Alternativa pip : pip install plantuml")
        print("          Geracao manual  : java -jar plantuml.jar -tsvg -o [pasta-svg] [arquivo.puml]")
        sys.exit(1)

    print(f"[OK] PlantUML disponivel via: {metodo}")

    # Coletar arquivos .puml
    pumls = coletar_pumls(alvo)

    if not pumls:
        print(f"[ATENCAO] Nenhum arquivo .puml encontrado em: {alvo}")
        sys.exit(0)

    print(f"[OK] {len(pumls)} arquivo(s) .puml encontrado(s)\n")

    # Gerar SVGs
    sucesso  = 0
    falha    = 0

    for puml in pumls:
        if gerar_svg(puml, metodo):
            sucesso += 1
        else:
            falha += 1

    # Relatorio final
    print()
    print(f"[OK] Concluido: {sucesso} SVG(s) gerado(s)" + (f" | [ATENCAO] {falha} falha(s)" if falha else ""))

    if falha:
        sys.exit(1)


if __name__ == "__main__":
    main()