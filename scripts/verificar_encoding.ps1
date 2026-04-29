# -*- encoding: utf-8 -*-
# script: verificar_encoding.ps1
# finalidade: Verifica se todos os arquivos do projeto estao em UTF-8 sem BOM
# quando executar: Apos qualquer operacao de criacao/conversao de arquivos
# comando: .\scripts\verificar_encoding.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$problemas = @()
$ok = 0

$arquivos = Get-ChildItem -Recurse -Include '*.md','*.sql','*.prc','*.fnc','*.pks','*.pkb','*.ps1','*.py' |
    Where-Object { $_.FullName -notlike '*\.git\*' -and $_.FullName -notlike '*.bak' }

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
