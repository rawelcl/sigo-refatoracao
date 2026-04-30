# SIGO Refact - Portal

Portal Next.js para visualizacao dos artefatos de refatoracao do projeto SIGO (Hapvida).

## Stack

- Next.js 16 (App Router, standalone output)
- Tailwind CSS v4
- shadcn/ui (componentes base)
- next-themes (dark mode)
- next-mdx-remote (renderizacao Markdown)
- sonner (notificacoes toast)

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # configure COPILOT_TOKEN ou GITHUB_TOKEN
npm run dev
```

Acesse http://localhost:3000.

O portal le os artefatos do diretorio pai (`output/`, `_shared/`, `.github/agents/`).
A variavel `REPO_ROOT` controla a raiz do repositorio (padrao: diretorio pai de `portal/`).

## Executar agente

O botao **Executar agente** dispara o agente orquestrador direto no servidor
usando a Copilot Chat API. O loop de tool-calling roda no Next.js: o modelo
recebe o prompt + tools (`read_file`, `write_file`, `list_dir`, `glob`, `grep`,
`run_command`) e o portal executa cada tool localmente com sandbox.

Variaveis de ambiente:

| Var | Descricao | Default |
|---|---|---|
| `COPILOT_TOKEN` | Token de sessao Copilot (preferencial) | - |
| `GITHUB_TOKEN`  | PAT GitHub com Copilot ativo (fallback, troca automatica por token interno) | - |
| `COPILOT_MODEL` | Modelo (`gpt-4o`, etc.) | `gpt-4o` |
| `EXEC_MAX_CONCURRENT` | Execucoes simultaneas | `1` |
| `EXEC_MAX_ITER` | Limite de iteracoes do loop de tool-calling | `50` |
| `RUN_COMMAND_TIMEOUT_MS` | Timeout por comando em `run_command` | `60000` |

Logs sao gravados em `output/.execucoes/<id>.jsonl` (replay via SSE em
`GET /api/execucoes/:id/stream`).

## Build e Docker

```bash
# Build de producao
npm run build

# Subir via Docker Compose (a partir da raiz do repositorio)
docker compose up --build
```

O container monta os diretorios de artefatos como volumes somente-leitura
conforme definido em `docker-compose.yml` na raiz do projeto.

## Estrutura

```
src/
  app/           - Paginas (App Router)
    page.tsx     - Home: catalogo de rotinas + construtor de prompts
    rotinas/     - Detalhe de cada rotina (etapas e arquivos)
    visualizar/  - Renderizador de artefatos (MD, SVG, SQL, PUML)
    agentes/     - Listagem dos agentes .github/agents/
    api/         - Endpoints REST (rotinas, artefato, agentes)
  components/    - Componentes React
    ui/          - Componentes shadcn/ui
  lib/
    repo.ts      - Acesso ao sistema de arquivos do repositorio
    utils.ts     - Helper cn() para classes Tailwind
```
