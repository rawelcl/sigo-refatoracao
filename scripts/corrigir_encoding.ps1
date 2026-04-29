# -*- encoding: utf-8 -*-
# script: corrigir_encoding.ps1
# finalidade: Converte arquivos CP1252/Latin-1 para UTF-8 sem BOM
# quando executar: Sempre que novos arquivos vierem de outro ambiente ou CVS
# comando: .\scripts\corrigir_encoding.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$enc1252   = [System.Text.Encoding]::GetEncoding(1252)
$encUtf8   = New-Object System.Text.UTF8Encoding($false)
$convertidos = 0

$arquivos = Get-ChildItem -Recurse -Include '*.md','*.sql','*.prc','*.fnc','*.pks','*.pkb','*.ps1','*.py','*.txt' |
    Where-Object { $_.FullName -notlike '*\.git\*' -and $_.FullName -notlike '*\.bak' }

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
