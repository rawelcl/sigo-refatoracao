import pathlib

def join_continuation(content):
    lines = content.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.rstrip().endswith(',') and i+1 < len(lines) and lines[i+1].strip().startswith('"'):
            result.append(line.rstrip() + ' ' + lines[i+1].strip())
            i += 2
        else:
            result.append(line)
            i += 1
    return '\n'.join(result)

base = pathlib.Path('c:/Users/thiagorc/Documents/Repos/Refatoracao/sigo-pr_efetiva_internet/rotinas/pr_cadastramento_empresa_prov/rev-PRODUCAO-20260402')
for f in base.rglob('*.puml'):
    content = f.read_text(encoding='utf-8')
    fixed = join_continuation(content)
    if fixed != content:
        f.write_text(fixed, encoding='utf-8')
        print('Corrigido:', f.name)
    else:
        print('Sem mudancas:', f.name)
