import os, re, glob

def replace_u_escapes(s):
    """Substitui \\uXXXX literais (4 hex digits) pelos caracteres Unicode reais."""
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)

def convert_cp1252_to_utf8(path):
    raw = open(path, 'rb').read()
    try:
        text = raw.decode('utf-8')
        n_lit = text.count(r'\u00')
        if n_lit > 0:
            fixed = replace_u_escapes(text)
            open(path, 'w', encoding='utf-8').write(fixed)
            return f'LIT-U fixado ({n_lit} escapes)'
        return 'OK (sem alteracao)'
    except UnicodeDecodeError:
        # CP1252 -> UTF-8
        text = raw.decode('cp1252')
        open(path, 'w', encoding='utf-8').write(text)
        return 'CP1252 -> UTF-8'

# Processar todos os .md do projeto
files = (
    ['CLAUDE.md'] +
    sorted(glob.glob('eng-reversa/**/*.md', recursive=True)) +
    sorted(glob.glob('instructions/**/*.md', recursive=True)) +
    sorted(glob.glob('knowledge/**/*.md', recursive=True)) +
    sorted(glob.glob('templates/**/*.md', recursive=True))
)

for f in files:
    if os.path.isfile(f):
        result = convert_cp1252_to_utf8(f)
        if result != 'OK (sem alteracao)':
            print(f'{result:30s} {f}')

print('--- Concluido ---')
