import subprocess, pathlib, sys

JAR = r"C:\Users\thiagorc\.vscode\extensions\jebbs.plantuml-2.18.1\plantuml.jar"
BASE = pathlib.Path(r"c:\Users\thiagorc\Documents\Repos\Refatoracao\sigo-pr_efetiva_internet")

groups = [
    (BASE / "_shared/c4-model/src", BASE / "_shared/c4-model/svg"),
    (BASE / "rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/src",
     BASE / "rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/03-c4-model/svg"),
    (BASE / "rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/04-fluxos/src",
     BASE / "rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402/04-fluxos/svg"),
]

ok = 0
errors = 0
for src_dir, svg_dir in groups:
    svg_dir.mkdir(parents=True, exist_ok=True)
    for puml in sorted(src_dir.glob("*.puml")):
        result = subprocess.run(
            ["java", "-jar", JAR, "-tsvg", "-o", str(svg_dir.resolve()), str(puml)],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"[OK] {puml.name}")
            ok += 1
        else:
            err_lines = (result.stdout + result.stderr).strip().split("\n")
            print(f"[ERRO] {puml.name}: {err_lines[0]}")
            errors += 1

print(f"\nResultado: {ok} OK, {errors} erros")
