# ---------------------------------------------------------------------------
# Script  : organizar-e-gerar-svg.py
# Objetivo: Move .puml para src/, cria svg/ e gera SVGs de uma rotina
# Agente  : projeto
# Rotina  : geral
# Autor   : Agente Scripts
# Data    : 17/04/2026
# Versao  : 1.0
# Encoding: UTF-8 sem BOM
# ---------------------------------------------------------------------------
# Uso     : python scripts/projeto/organizar-e-gerar-svg.py [PASTA-VERSAO] [ESCOPO]
# Escopo  : completo (default) | c4 | fluxos
#
# Exemplos:
#   python scripts/projeto/organizar-e-gerar-svg.py output/rotinas/pk_venda_json/rev-PRODUCAO-20260402
#   python scripts/projeto/organizar-e-gerar-svg.py output/rotinas/pk_venda_json/rev-PRODUCAO-20260402 c4
#   python scripts/projeto/organizar-e-gerar-svg.py output/rotinas/pk_venda_json/rev-PRODUCAO-20260402 fluxos
#
# Comportamento:
#   1. Detecta .puml em 03-c4-model/ e 04-fluxos/ (legado -- sem src/)
#   2. Move para 03-c4-model/src/ e 04-fluxos/src/ respectivamente
#   3. Cria 03-c4-model/svg/ e 04-fluxos/svg/ se nao existirem
#   4. Gera SVGs usando plantuml (pip) via servidor remoto
#   5. Rotinas ja organizadas (src/ existente) sao processadas diretamente
# ---------------------------------------------------------------------------

import sys
import shutil
from pathlib import Path

try:
    from plantuml import PlantUML
except ImportError:
    print("[ERRO] Biblioteca plantuml nao instalada. Execute: pip install plantuml")
    sys.exit(1)

SERVIDOR_PLANTUML = "http://www.plantuml.com/plantuml/svg/"

# Mapeamento: pasta base -> escopo
PASTAS_ESCOPO = {
    "completo": ["03-c4-model", "04-fluxos"],
    "c4":       ["03-c4-model"],
    "fluxos":   ["04-fluxos"],
}


# ---------------------------------------------------------------------------
# Organizacao da estrutura
# ---------------------------------------------------------------------------

def organizar_pasta(pasta_base: Path) -> tuple[Path, Path]:
    """
    Garante que src/ e svg/ existam dentro de pasta_base.
    Move qualquer .puml diretamente em pasta_base para src/.
    Retorna (src_dir, svg_dir).
    """
    src_dir = pasta_base / "src"
    svg_dir = pasta_base / "svg"
    src_dir.mkdir(parents=True, exist_ok=True)
    svg_dir.mkdir(parents=True, exist_ok=True)

    # Mover .puml soltos (legado)
    movidos = 0
    for puml in sorted(pasta_base.glob("*.puml")):
        destino = src_dir / puml.name
        if not destino.exists():
            shutil.move(str(puml), str(destino))
            print(f"[OK] Movido para src/: {puml.name}")
            movidos += 1
        else:
            print(f"[ATENCAO] Ja existe em src/, nao movido: {puml.name}")

    if movidos == 0 and not list(src_dir.glob("*.puml")):
        print(f"[ATENCAO] Nenhum .puml encontrado em: {pasta_base}")

    return src_dir, svg_dir


# ---------------------------------------------------------------------------
# Geracao de SVG
# ---------------------------------------------------------------------------

def gerar_svg(puml_path: Path, svg_dir: Path, servidor: PlantUML) -> bool:
    """Gera SVG para um arquivo .puml e salva em svg_dir."""
    svg_path = svg_dir / (puml_path.stem + ".svg")
    try:
        conteudo = puml_path.read_text(encoding="utf-8")
        resultado = servidor.processes(conteudo)
        svg_path.write_bytes(resultado)
        print(f"[OK] {puml_path.name} -> {svg_path.name}")
        return True
    except Exception as e:
        print(f"[ERRO] {puml_path.name}: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print("[ERRO] Uso: python organizar-e-gerar-svg.py [PASTA-VERSAO] [ESCOPO]")
        print("       ESCOPO: completo (default) | c4 | fluxos")
        sys.exit(1)

    pasta_versao = Path(sys.argv[1])
    escopo = sys.argv[2].lower() if len(sys.argv) >= 3 else "completo"

    if not pasta_versao.is_dir():
        print(f"[ERRO] Pasta de versao nao encontrada: {pasta_versao}")
        sys.exit(1)

    if escopo not in PASTAS_ESCOPO:
        print(f"[ERRO] Escopo invalido: '{escopo}'. Use: completo | c4 | fluxos")
        sys.exit(1)

    print(f"[OK] Rotina   : {pasta_versao.parent.name}")
    print(f"[OK] Versao   : {pasta_versao.name}")
    print(f"[OK] Escopo   : {escopo}")
    print(f"[OK] Servidor : {SERVIDOR_PLANTUML}")
    print()

    servidor = PlantUML(url=SERVIDOR_PLANTUML)
    sucesso = 0
    falha = 0

    for pasta_nome in PASTAS_ESCOPO[escopo]:
        pasta_base = pasta_versao / pasta_nome
        if not pasta_base.is_dir():
            print(f"[ATENCAO] Pasta nao encontrada, ignorada: {pasta_base}")
            continue

        print(f"--- {pasta_nome} ---")
        src_dir, svg_dir = organizar_pasta(pasta_base)

        pumls = sorted(src_dir.glob("*.puml"))
        if not pumls:
            print(f"[ATENCAO] Nenhum .puml em src/: {src_dir}")
            continue

        for puml in pumls:
            if gerar_svg(puml, svg_dir, servidor):
                sucesso += 1
            else:
                falha += 1
        print()

    msg_falha = f" | [ATENCAO] {falha} falha(s)" if falha else ""
    print(f"[OK] Concluido: {sucesso} SVG(s) gerado(s){msg_falha}")

    if falha:
        sys.exit(1)


if __name__ == "__main__":
    main()
