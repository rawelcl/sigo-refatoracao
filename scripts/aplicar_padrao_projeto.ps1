# -*- encoding: utf-8 -*-
# script: aplicar_padrao_projeto.ps1
# finalidade: Orquestrador - aplica toda a sequencia de padronizacao do projeto
# quando executar: Sempre que novos arquivos forem adicionados de outro ambiente
# comando: .\scripts\aplicar_padrao_projeto.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== Aplicando padrao do projeto sigo-fmb ==="
Write-Host ""

# 1. Remover emojis
Write-Host "--- Passo 1/3: Remover emojis ---"
& .\scripts\remover_emojis.ps1
Write-Host ""

# 2. Corrigir encoding
Write-Host "--- Passo 2/3: Corrigir encoding ---"
& .\scripts\corrigir_encoding.ps1
Write-Host ""

# 3. Verificar encoding (validacao final)
Write-Host "--- Passo 3/3: Verificar encoding ---"
& .\scripts\verificar_encoding.ps1
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "=== Padronizacao concluida com sucesso ==="
} else {
    Write-Host "=== ATENCAO: Problemas de encoding restantes - verifique acima ==="
    exit 1
}
