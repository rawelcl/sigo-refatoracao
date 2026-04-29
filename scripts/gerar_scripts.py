# -*- coding: ascii -*-
# Gerador de scripts do projeto sigo-fmb
# Usa \uXXXX para manter este arquivo ASCII puro e evitar problemas de encoding
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_utf8(filename, content):
    path = os.path.join(BASE, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Criado: {filename} ({os.path.getsize(path)} bytes)')

# ============================================================
# remover_emojis.ps1
# ============================================================
REMOVER_EMOJIS = """\
# -*- encoding: utf-8 -*-
# script: remover_emojis.ps1
# finalidade: Substitui emojis por tokens textuais em todos os .md do projeto
# quando executar: Sempre que novos arquivos .md forem adicionados ao projeto
# comando: .\\scripts\\remover_emojis.ps1

param(
    [switch]$DryRun   # Se presente, apenas exibe as substituicoes sem alterar arquivos
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---- Tabela de substitutos ----
$substitutos = [ordered]@{
    # Portabilidade
    "\u2705"       = '[OK]'
    "\u274C"       = '[ERRO]'
    "\U0001F7E2"   = '[PORTAVEL]'
    "\U0001F7E1"   = '[ADAPTAVEL]'
    "\U0001F534"   = '[LEGADO-DEPENDENTE]'
    "\U0001F7E3"   = '[LEGADO-DEPENDENTE]'
    # Risco MCP
    "\U0001F7E2"   = '[LEITURA]'
    "\U0001F7E1"   = '[ATENCAO]'
    # Miscelaneos comuns em .md
    "\U0001F4CB"   = '[REF]'
    "\U0001F4CE"   = '[REF]'
    "\u26A0"       = '[ATENCAO]'
    "\u2139"       = '[INFO]'
    "\U0001F6A8"   = '[CRITICO]'
    "\U0001F4A1"   = '[DICA]'
    "\U0001F4DD"   = '[NOTA]'
    "\U0001F50D"   = '[BUSCA]'
    "\U0001F4BE"   = '[SALVAR]'
    "\U0001F4C2"   = '[PASTA]'
    "\U0001F517"   = '[LINK]'
    "\u2764"       = '[REF]'
    "\U0001F91D"   = '[OK]'
    "\U0001F44D"   = '[OK]'
}

# ---- Escopo de arquivos ----
$padroes = @('*.md')
$diretorios = @('instructions', 'knowledge', 'templates', 'eng-reversa')
$arquivosRaiz = @('CLAUDE.md')

$todosArquivos = @()
foreach ($dir in $diretorios) {
    if (Test-Path $dir) {
        $todosArquivos += Get-ChildItem -Path $dir -Recurse -Include $padroes
    }
}
foreach ($arq in $arquivosRaiz) {
    if (Test-Path $arq) { $todosArquivos += Get-Item $arq }
}

$arquivosAlterados = 0
$totalSubstituicoes = 0

foreach ($arquivo in $todosArquivos) {
    $conteudo = [System.IO.File]::ReadAllText($arquivo.FullName, [System.Text.Encoding]::UTF8)
    $original = $conteudo
    $subst = 0

    foreach ($emoji in $substitutos.Keys) {
        $token = $substitutos[$emoji]
        if ($conteudo.Contains($emoji)) {
            $ocorrencias = ([regex]::Matches($conteudo, [regex]::Escape($emoji))).Count
            $conteudo = $conteudo.Replace($emoji, $token)
            Write-Host "  $($arquivo.Name) : '$emoji' -> '$token' ($ocorrencias x)"
            $subst += $ocorrencias
        }
    }

    if ($conteudo -ne $original) {
        $arquivosAlterados++
        $totalSubstituicoes += $subst
        if (-not $DryRun) {
            # Backup .bak
            $bakPath = $arquivo.FullName + '.bak'
            [System.IO.File]::WriteAllBytes($bakPath, [System.IO.File]::ReadAllBytes($arquivo.FullName))
            # Salvar UTF-8 sem BOM
            $encUtf8 = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($arquivo.FullName, $conteudo, $encUtf8)
        }
    }
}

$modo = if ($DryRun) { '(DRY RUN - nenhum arquivo alterado)' } else { '' }
Write-Host ""
Write-Host "--- Resultado $modo ---"
Write-Host "Arquivos alterados  : $arquivosAlterados"
Write-Host "Total substituicoes : $totalSubstituicoes"
"""

# ============================================================
# corrigir_encoding.ps1
# ============================================================
CORRIGIR_ENCODING = """\
# -*- encoding: utf-8 -*-
# script: corrigir_encoding.ps1
# finalidade: Converte arquivos CP1252/Latin-1 para UTF-8 sem BOM
# quando executar: Sempre que novos arquivos vierem de outro ambiente ou CVS
# comando: .\\scripts\\corrigir_encoding.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$enc1252   = [System.Text.Encoding]::GetEncoding(1252)
$encUtf8   = New-Object System.Text.UTF8Encoding($false)
$convertidos = 0

$arquivos = Get-ChildItem -Recurse -Include '*.md','*.sql','*.prc','*.fnc','*.pks','*.pkb','*.ps1','*.py','*.txt' |
    Where-Object { $_.FullName -notlike '*\\.git\\*' -and $_.FullName -notlike '*\\.bak' }

foreach ($arquivo in $arquivos) {
    $bytes = [System.IO.File]::ReadAllBytes($arquivo.FullName)
    if ($bytes.Count -lt 2) { continue }

    # Detectar UTF-16 LE (FF FE)
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $texto = [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Count - 2)
        [System.IO.File]::WriteAllText($arquivo.FullName, $texto, $encUtf8)
        Write-Host "UTF-16 LE -> UTF-8: $($arquivo.Name)"
        $convertidos++
        continue
    }

    # Detectar UTF-8 BOM (EF BB BF) - remover BOM
    if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $texto = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Count - 3)
        [System.IO.File]::WriteAllText($arquivo.FullName, $texto, $encUtf8)
        Write-Host "BOM removido: $($arquivo.Name)"
        $convertidos++
        continue
    }

    # Verificar se tem bytes ISO-8859-1 isolados (nao sequencia UTF-8 valida)
    $ehISO = $false
    for ($i = 0; $i -lt [Math]::Min($bytes.Count, 500); $i++) {
        if ($bytes[$i] -ge 0xC0 -and $bytes[$i] -le 0xFF) {
            if ($i + 1 -lt $bytes.Count) {
                $prox = $bytes[$i + 1]
                if (-not ($prox -ge 0x80 -and $prox -le 0xBF)) {
                    $ehISO = $true; break
                }
            }
        }
    }

    if ($ehISO) {
        $texto = [System.IO.File]::ReadAllText($arquivo.FullName, $enc1252)
        [System.IO.File]::WriteAllText($arquivo.FullName, $texto, $encUtf8)
        Write-Host "CP1252 -> UTF-8: $($arquivo.Name)"
        $convertidos++
    }
}

Write-Host ""
Write-Host "--- Resultado ---"
Write-Host "Arquivos convertidos: $convertidos"
"""

# ============================================================
# verificar_encoding.ps1
# ============================================================
VERIFICAR_ENCODING = """\
# -*- encoding: utf-8 -*-
# script: verificar_encoding.ps1
# finalidade: Verifica se todos os arquivos do projeto estao em UTF-8 sem BOM
# quando executar: Apos qualquer operacao de criacao/conversao de arquivos
# comando: .\\scripts\\verificar_encoding.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$problemas = @()
$ok = 0

$arquivos = Get-ChildItem -Recurse -Include '*.md','*.sql','*.prc','*.fnc','*.pks','*.pkb','*.ps1','*.py' |
    Where-Object { $_.FullName -notlike '*\\.git\\*' -and $_.FullName -notlike '*.bak' }

foreach ($arquivo in $arquivos) {
    $bytes = [System.IO.File]::ReadAllBytes($arquivo.FullName)
    if ($bytes.Count -lt 2) { $ok++; continue }

    # BOM UTF-16 LE
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $problemas += [PSCustomObject]@{ Arquivo = $arquivo.Name; Problema = 'UTF-16 LE (BOM FF FE)' }
        continue
    }
    # BOM UTF-8
    if ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $problemas += [PSCustomObject]@{ Arquivo = $arquivo.Name; Problema = 'UTF-8 com BOM (EF BB BF)' }
        continue
    }
    # Bytes ISO-8859-1 isolados
    $ehISO = $false
    for ($i = 0; $i -lt [Math]::Min($bytes.Count, 500); $i++) {
        if ($bytes[$i] -ge 0xC0 -and $bytes[$i] -le 0xFF) {
            if ($i + 1 -lt $bytes.Count -and -not ($bytes[$i+1] -ge 0x80 -and $bytes[$i+1] -le 0xBF)) {
                $ehISO = $true; break
            }
        }
    }
    if ($ehISO) {
        $problemas += [PSCustomObject]@{ Arquivo = $arquivo.Name; Problema = 'CP1252 / Latin-1' }
        continue
    }

    $ok++
}

Write-Host ""
Write-Host "--- Resultado ---"
Write-Host "Arquivos OK         : $ok"
Write-Host "Arquivos com problema: $($problemas.Count)"
if ($problemas.Count -gt 0) {
    Write-Host ""
    $problemas | Format-Table -AutoSize
    exit 1
} else {
    Write-Host "Todos os arquivos estao em UTF-8 sem BOM."
    exit 0
}
"""

# ============================================================
# aplicar_padrao_projeto.ps1
# ============================================================
APLICAR_PADRAO = """\
# -*- encoding: utf-8 -*-
# script: aplicar_padrao_projeto.ps1
# finalidade: Orquestrador - aplica toda a sequencia de padronizacao do projeto
# quando executar: Sempre que novos arquivos forem adicionados de outro ambiente
# comando: .\\scripts\\aplicar_padrao_projeto.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== Aplicando padrao do projeto sigo-fmb ==="
Write-Host ""

# 1. Remover emojis
Write-Host "--- Passo 1/3: Remover emojis ---"
& .\\scripts\\remover_emojis.ps1
Write-Host ""

# 2. Corrigir encoding
Write-Host "--- Passo 2/3: Corrigir encoding ---"
& .\\scripts\\corrigir_encoding.ps1
Write-Host ""

# 3. Verificar encoding (validacao final)
Write-Host "--- Passo 3/3: Verificar encoding ---"
& .\\scripts\\verificar_encoding.ps1
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "=== Padronizacao concluida com sucesso ==="
} else {
    Write-Host "=== ATENCAO: Problemas de encoding restantes - verifique acima ==="
    exit 1
}
"""

# Escrever todos os scripts
write_utf8('scripts/remover_emojis.ps1', REMOVER_EMOJIS)
write_utf8('scripts/corrigir_encoding.ps1', CORRIGIR_ENCODING)
write_utf8('scripts/verificar_encoding.ps1', VERIFICAR_ENCODING)
write_utf8('scripts/aplicar_padrao_projeto.ps1', APLICAR_PADRAO)

print('--- Todos os scripts criados ---')
