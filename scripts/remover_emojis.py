# -*- coding: utf-8 -*-
# remover_emojis.py - substitui emojis por tokens textuais em todos os .md do projeto
# Usa \uXXXX para manter este arquivo ASCII puro
import os, glob

# Tabela: (codepoint, token_textual)
SUBSTITUTOS = [
    ('\u2705', '[OK]'),          # check verde
    ('\u274c', '[ERRO]'),        # X vermelho
    ('\U0001f7e2', '[PORTAVEL]'),       # circulo verde
    ('\U0001f7e1', '[ADAPTAVEL]'),      # circulo amarelo
    ('\U0001f534', '[LEGADO-DEPENDENTE]'),  # circulo vermelho
    ('\U0001f7e3', '[LEGADO-DEPENDENTE]'),  # circulo roxo
    ('\u26a0', '[ATENCAO]'),     # aviso
    ('\U0001f6a8', '[CRITICO]'),        # sirene
    ('\U0001f4cb', '[REF]'),            # clipboard
    ('\U0001f4ce', '[REF]'),            # paperclip
    ('\U0001f517', '[REF]'),            # link
    ('\u2139', '[INFO]'),        # informacao
    ('\U0001f4a1', '[DICA]'),           # lampada
    ('\U0001f4dd', '[NOTA]'),           # nota
    ('\U0001f50d', '[BUSCA]'),          # lupa
    ('\U0001f4be', '[SALVAR]'),         # disquete
    ('\U0001f4c2', '[PASTA]'),          # pasta
    ('\U0001f44d', '[OK]'),             # joinha
    ('\U0001f91d', '[OK]'),             # handshake
    ('\u2764', '[REF]'),         # coracao
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

padroes_dirs = ['instructions', 'knowledge', 'templates', 'eng-reversa']
arquivos_raiz = ['CLAUDE.md']

arquivos = []
for d in padroes_dirs:
    dp = os.path.join(ROOT, d)
    if os.path.isdir(dp):
        for f in glob.glob(os.path.join(dp, '**', '*.md'), recursive=True):
            arquivos.append(f)
for a in arquivos_raiz:
    p = os.path.join(ROOT, a)
    if os.path.isfile(p):
        arquivos.append(p)

alterados = 0
total_subst = 0

for caminho in arquivos:
    with open(caminho, 'r', encoding='utf-8') as f:
        original = f.read()

    texto = original
    subst = 0
    for emoji, token in SUBSTITUTOS:
        if emoji in texto:
            n = texto.count(emoji)
            texto = texto.replace(emoji, token)
            nome = os.path.basename(caminho)
            print(f'  {nome}: U+{ord(emoji):04X} -> {token} ({n}x)')
            subst += n

    if texto != original:
        # backup
        with open(caminho + '.bak', 'wb') as f:
            f.write(open(caminho, 'rb').read())
        with open(caminho, 'w', encoding='utf-8') as f:
            f.write(texto)
        alterados += 1
        total_subst += subst

print(f'\n--- Resultado ---')
print(f'Arquivos alterados  : {alterados}')
print(f'Total substituicoes : {total_subst}')
