# SIGO Portal - execucao em Docker

Portal Next.js 16 que orquestra o agente de refatoracao SIGO chamando a
Copilot Chat API. Embalado em uma imagem Docker que monta os recursos do
host (CVS legado, ADRs de arquitetura, output, base de conhecimento).

---

## Pre-requisitos

- Docker Desktop (Windows / Linux / macOS)
- Token GitHub com acesso a Copilot **OU** login OAuth via portal

---

## Setup

1. **Configurar variaveis de ambiente**

   Copie o template e edite:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   No minimo, defina `GITHUB_TOKEN` (ou deixe vazio para logar via Device
   Flow em `http://localhost:3000/auth`).

2. **Confirmar caminhos do host**

   Em `.env`, ajuste se necessario:
   - `CVS_HOST_PATH` - raiz do CVS legado SIGO (default: `C:/CVS/health_install`)
   - `ADRS_HOST_PATH` - repositorio de ADRs Hapvida

   Se algum desses caminhos nao existir no host, o portal sobe normalmente
   mas tools de leitura naqueles paths falharao (esperado).

3. **Subir o container**

   ```powershell
   docker compose up -d --build
   ```

   Acesse http://localhost:3000

4. **Logs**

   ```powershell
   docker compose logs -f portal
   ```

5. **Parar / remover**

   ```powershell
   docker compose down
   ```

---

## Volumes

| Host | Container | Modo | Proposito |
|---|---|---|---|
| `./output` | `/repo/output` | rw | Artefatos das rotinas + auth + execucoes |
| `./_shared` | `/repo/_shared` | rw | Base de conhecimento (escrita pelo agente) |
| `./.github/agents` | `/repo/.github/agents` | ro | Definicoes dos agentes |
| `./_templates` | `/repo/_templates` | ro | Templates de rotina |
| `./CLAUDE.md` | `/repo/CLAUDE.md` | ro | Regras globais |
| `./prompts` | `/repo/prompts` | ro | Catalogo de prompts |
| `./scripts` | `/repo/scripts` | ro | Scripts utilitarios |
| `${CVS_HOST_PATH}` | `/cvs/health_install` | ro | CVS legado |
| `${ADRS_HOST_PATH}` | `/adrs` | ro | ADRs |

---

## Troubleshooting

### Docker daemon nao roda

Sintoma: `failed to connect to ... pipe/docker_engine`.

Solucao (Windows, requer admin):
```powershell
Start-Service com.docker.service
```

### Token nao aceito

- Verifique se o token tem o escopo Copilot habilitado.
- Se usar `GITHUB_TOKEN`, garanta que e Personal Access Token classico ou
  fine-grained com permissao para Copilot.
- Alternativa: limpe `output/.auth/github.json` e refaca login em `/auth`.

### Path do CVS / ADRs invalido

Se a estrutura do host for diferente, ajuste `CVS_HOST_PATH` e
`ADRS_HOST_PATH` em `.env`. O caminho **interno** do container nao muda
(`/cvs/health_install`, `/adrs`), e o portal usa essas variaveis via
`CVS_ROOT` e `ADRS_ROOT`.

### Permissao de escrita em output / _shared

O container roda como uid 1001 (`nextjs`). Em Windows / Docker Desktop nao
ha conflito (volumes sao mapeados via WSL2). Em Linux nativo, garantir que
o uid 1001 tenha escrita nos diretorios mapeados:
```bash
sudo chown -R 1001:1001 ./output ./_shared
```

---

## Build sem compose (alternativa)

```powershell
docker build -f portal/Dockerfile -t sigo-portal:dev .
docker run --rm -p 3000:3000 `
  -e GITHUB_TOKEN=$env:GITHUB_TOKEN `
  -e REPO_ROOT=/repo `
  -e CVS_ROOT=/cvs/health_install `
  -e ADRS_ROOT=/adrs `
  -v ${PWD}/output:/repo/output `
  -v ${PWD}/_shared:/repo/_shared `
  -v ${PWD}/.github/agents:/repo/.github/agents:ro `
  -v ${PWD}/_templates:/repo/_templates:ro `
  -v ${PWD}/CLAUDE.md:/repo/CLAUDE.md:ro `
  -v C:/CVS/health_install:/cvs/health_install:ro `
  -v "C:/Users/thiagorc/Documents/Repos/Refatoracao/adrs arquitetura hapvida:/adrs:ro" `
  sigo-portal:dev
```
