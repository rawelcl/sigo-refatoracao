"""
Atualiza referencias textuais de `rotinas/...` (ou `rotinas\\...`) para
`output/rotinas/...` em arquivos do projeto.

- Aplica somente quando `rotinas` aparece como inicio de path (precedido por
  separador, aspas, parenteses, colchetes, espaco ou inicio de linha) e
  seguido por `/` ou `\\`.
- Nao reescreve quando ja esta `output/rotinas/` ou `output\\rotinas\\`.
- Pula diretorios: .git, .venv, output (dados ja migrados nao precisam de
  modificacao no path proprio; mas referencias DENTRO dos .md em output sao
  reescritas tambem).
- Extensoes processadas: .md, .py, .puml, .ps1, .txt, .yaml, .yml, .json, .html
- SVGs sao ignorados (binario-ish e ja existem com referencias antigas embutidas
  via PUML; serao regerados pelos scripts).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {".git", ".venv", "venv", "__pycache__", "node_modules"}
EXTS = {".md", ".py", ".puml", ".ps1", ".txt", ".yaml", ".yml", ".json", ".html", ".svg", ".xml"}

# Match `rotinas/` ou `rotinas\` apenas quando NAO precedido por `output/` ou
# `output\`. Usa um lookbehind que checa que os 7 chars anteriores nao sao
# "output/" nem "output\\".
PATTERN = re.compile(r"(?<!output/)(?<!output\\)\brotinas(?P<sep>[/\\])")


def should_process(path: Path) -> bool:
    if path.suffix.lower() not in EXTS:
        return False
    parts = set(p.name for p in path.parents)
    if SKIP_DIRS & parts:
        return False
    # Nao reescrever este proprio script
    if path.name == "migrar_path_rotinas.py":
        return False
    return True


def transform(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        count += 1
        sep = m.group("sep")
        # Mantem o mesmo separador que o original
        return f"output{sep}rotinas{sep}"

    new_text = PATTERN.sub(repl, text)
    return new_text, count


def main() -> None:
    total_files = 0
    total_subs = 0
    changed_files: list[tuple[Path, int]] = []

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if not should_process(path):
            continue
        encoding_used = None
        original = None
        for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
            try:
                original = path.read_text(encoding=enc)
                encoding_used = enc
                break
            except UnicodeDecodeError:
                continue
            except OSError:
                break
        if original is None:
            continue
        new_text, n = transform(original)
        total_files += 1
        if n > 0:
            # Reescreve no MESMO encoding original para nao quebrar arquivos
            # que ainda nao migraram para UTF-8.
            path.write_text(new_text, encoding=encoding_used)
            changed_files.append((path.relative_to(ROOT), n))
            total_subs += n

    print(f"Arquivos analisados : {total_files}")
    print(f"Arquivos alterados  : {len(changed_files)}")
    print(f"Total de substituicoes: {total_subs}")
    print()
    for rel, n in changed_files:
        print(f"  [{n:>3}] {rel}")


if __name__ == "__main__":
    main()
