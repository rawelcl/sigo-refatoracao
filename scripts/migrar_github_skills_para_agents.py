"""Substitui referencias .github/skills/ -> .github/agents/ em todo o projeto."""
from __future__ import annotations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {".git", ".venv", "venv", "__pycache__", "node_modules"}
EXTS = {".md", ".py", ".puml", ".ps1", ".txt", ".yaml", ".yml", ".json", ".html", ".svg", ".xml"}


def main() -> None:
    total = 0
    changed: list[tuple[str, int]] = []
    subs = 0
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue
        if SKIP & {x.name for x in p.parents}:
            continue
        if p.name == "migrar_github_skills_para_agents.py":
            continue
        orig = None
        enc_used = None
        for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
            try:
                orig = p.read_text(encoding=enc)
                enc_used = enc
                break
            except UnicodeDecodeError:
                continue
            except OSError:
                break
        if orig is None:
            continue
        new = orig.replace(".github/skills", ".github/agents").replace(".github\\skills", ".github\\agents")
        n = orig.count(".github/skills") + orig.count(".github\\skills")
        total += 1
        if n > 0 and new != orig:
            p.write_text(new, encoding=enc_used)
            changed.append((str(p.relative_to(ROOT)), n))
            subs += n
    print(f"Arquivos analisados: {total}")
    print(f"Arquivos alterados : {len(changed)}")
    print(f"Substituicoes      : {subs}")
    for rel, n in changed:
        print(f"  [{n:>3}] {rel}")


if __name__ == "__main__":
    main()
