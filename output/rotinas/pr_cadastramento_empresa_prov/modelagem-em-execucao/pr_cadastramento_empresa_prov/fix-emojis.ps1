$base = "c:\Users\thiagorc\Documents\Repos\Refatoracao\refatoracao\pr_cadastramento_empresa_prov"
$files = @(
  "$base\README-refatoracao.md",
  "$base\REGRAS-DE-NEGOCIO-POR-CONTEXTO.md",
  "$base\Backlog\BACKLOG-EPICO-FEATURES-USERSTORIES.md",
  "$base\Backlog\BACKLOG-EPICO-FEATURES-USERSTORIES-PLSQL.md"
)

$replacements = @(
  # Titulos de secao
  @('# ??? Roadmap', '# Roadmap'),
  @('## ??? EPICO', '## EPICO'),
  @('## ??? Visao Geral', '## Visao Geral'),

  # Features
  @('## ?? FEATURE 01', '## FEATURE 01'),
  @('## ?? FEATURE 02', '## FEATURE 02'),
  @('## ?? FEATURE 03', '## FEATURE 03'),
  @('## ?? FEATURE 04', '## FEATURE 04'),
  @('## ?? FEATURE 05', '## FEATURE 05'),
  @('## ?? FEATURE 06', '## FEATURE 06'),
  @('## ?? FEATURE 07', '## FEATURE 07'),
  @('## ?? FEATURE 08', '## FEATURE 08'),
  @('## ?? FEATURE 09', '## FEATURE 09'),
  @('## ?? FEATURE 10', '## FEATURE 10'),

  # Fases
  @('## ?? Fase 1', '## Fase 1'),
  @('## ?? Fase 2', '## Fase 2'),
  @('## ?? Fase 3', '## Fase 3'),
  @('## ?? Fase 4', '## Fase 4'),

  # Secoes
  @('## ?? Arquivos Criados', '## Arquivos Criados'),
  @('## ?? Riscos Identificados', '## Riscos Identificados'),
  @('## ?? Referencias', '## Referencias'),
  @('## ?? Criterios', '## Criterios'),
  @('### ??? Diagramas', '### Diagramas'),

  # Riscos na tabela
  @('?? Baixo', 'Baixo'),
  @('?? Medio', 'Medio'),
  @('?? Alto', 'Alto'),

  # Tree
  @('???', '|--'),

  # Notas e alertas
  @('??? **Escopo:**', '**Escopo:**'),
  @('?? **Escopo:**', '**Escopo:**'),
  @('?? **NOTA SOBRE ESCOPO:**', '**NOTA SOBRE ESCOPO:**'),
  @('?? **CANDIDATA', '**CANDIDATA'),
  @('?? **REFATORAR:**', '**REFATORAR:**'),
  @('?? **Duplicacao identificada:**', '**Duplicacao identificada:**'),
  @('?? **Ambos os cursors', '**Ambos os cursors'),
  @('?? **Bug:**', '**Bug:**'),
  @('?? **Bug de design:**', '**Bug de design:**'),
  @('?? **Problema:**', '**Problema:**'),
  @('?? **Risco de seguranca', '**Risco de seguranca'),
  @('(?? **race condition**', '(**race condition**'),
  @('?? possivel bug)', 'possivel bug)'),
  @('?? Na refatoracao,', 'Na refatoracao,'),
  @('?? Validacao rudimentar', 'Validacao rudimentar'),
  @('?? **Nao valida obrigatoriedade**', '**Nao valida obrigatoriedade**'),
  @('?? **Nao valida tamanho maximo**', '**Nao valida tamanho maximo**'),
  @('?? Verifica apenas', 'Verifica apenas'),
  @('(?? falso negativo', '(falso negativo'),
  @('?? Ordem invertida', 'Ordem invertida'),
  @('#### ?? Issues', '#### Issues'),

  # Camadas
  @('<summary>?? Camada 1', '<summary>Camada 1'),
  @('<summary>?? Camada 2', '<summary>Camada 2'),
  @('<summary>?? Camada 3', '<summary>Camada 3'),
  @('### ?? Pre-condicoes', '### Pre-condicoes'),
  @('### ? Validacoes', '### Validacoes')
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { continue }
  $raw = [System.IO.File]::ReadAllBytes($f)
  $content = [System.Text.Encoding]::UTF8.GetString($raw)

  $count = 0
  foreach ($r in $replacements) {
    if ($content.Contains($r[0])) {
      $content = $content.Replace($r[0], $r[1])
      $count++
    }
  }

  # Diagrama ASCII: substituir ? usado como box-drawing
  # Linha horizontal de ?s (7+ seguidos)
  $content = [regex]::Replace($content, '\?{7,}', { param($m) '-' * $m.Value.Length })

  # Escopo labels dentro de diagramas
  $content = $content.Replace('?  ?? ESCOPO:', '|  ESCOPO:')
  $content = $content.Replace('?  ?? ESCOPO:', '|  ESCOPO:')

  # Tabela de canais
  $content = $content.Replace('| ?? |', '| * |')
  $content = $content.Replace('| ?? `pr_efetiva_internet`', '| `pr_efetiva_internet`')
  $content = $content.Replace('| ?? `pr_cadastramento_empresa_prov`', '| `pr_cadastramento_empresa_prov`')
  $content = $content.Replace('marcadas com ??', 'marcadas com (efetiva)')
  $content = $content.Replace('marcadas com ??', 'marcadas com (cadastramento)')

  # Checkmarks
  $content = $content.Replace('? Sim', 'Sim')
  $content = $content.Replace('? Nao', 'Nao')

  # Specifications header
  $content = $content.Replace('(Validacao de Campos) ??', '(Validacao de Campos)')

  # Salvar como UTF-8 com BOM
  $utf8bom = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($f, $content, $utf8bom)
  Write-Host "OK: $f ($count substituicoes de texto)"
}

Write-Host "`nConcluido!"
