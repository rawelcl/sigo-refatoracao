# syntax=docker/dockerfile:1.7
# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY portal/package.json portal/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# precisamos do contexto do monorepo por causa do outputFileTracingRoot
COPY portal/ ./portal/
COPY --from=deps /app/node_modules ./portal/node_modules
WORKDIR /app/portal
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Raiz do repositorio dentro do container (para o portal localizar output/, _shared/, .github/agents/)
ENV REPO_ROOT=/repo

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copia o standalone server (inclui node_modules minimo) preservando a estrutura do monorepo:
# .next/standalone/portal/server.js + .next/standalone/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/portal/.next/static ./portal/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/portal/public ./portal/public

USER nextjs
EXPOSE 3000
WORKDIR /app/portal
CMD ["node", "server.js"]
