# -*- encoding: utf-8 -*-
# script: remover_emojis.ps1
# finalidade: Substitui emojis por tokens textuais em todos os .md do projeto
# quando executar: Sempre que novos arquivos .md forem adicionados ao projeto
# comando: .\scripts\remover_emojis.ps1

param(
    [switch]$DryRun   # Se presente, apenas exibe as substituicoes sem alterar arquivos
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---- Tabela de substitutos ----
$substitutos = [ordered]@{
    # Portabilidade
    "✅"       = '[OK]'
    "❌"       = '[ERRO]'
    "🟢"   = '[PORTAVEL]'
    "🟡"   = '[ADAPTAVEL]'
    "🔴"   = '[LEGADO-DEPENDENTE]'
    "🟣"   = '[LEGADO-DEPENDENTE]'
    # Risco MCP
    "🟢"   = '[LEITURA]'
    "🟡"   = '[ATENCAO]'
    # Miscelaneos comuns em .md
    "📋"   = '[REF]'
    "📎"   = '[REF]'
    "⚠"       = '[ATENCAO]'
    "ℹ"       = '[INFO]'
    "🚨"   = '[CRITICO]'
    "💡"   = '[DICA]'
    "📝"   = '[NOTA]'
    "🔍"   = '[BUSCA]'
    "💾"   = '[SALVAR]'
    "📂"   = '[PASTA]'
    "🔗"   = '[LINK]'
    "❤"       = '[REF]'
    "🤝"   = '[OK]'
    "👍"   = '[OK]'
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
