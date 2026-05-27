# syntax=docker/dockerfile:1

# =============================================================
#  Étape 1 — Build (toutes les dépendances, y compris dev)
# =============================================================
FROM node:20-slim AS builder
WORKDIR /app

# Installe les dépendances en se basant sur le lockfile s'il est présent.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copie le code et construit l'application Next.js.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# =============================================================
#  Étape 2 — Dépendances de production uniquement (image légère)
# =============================================================
FROM node:20-slim AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# =============================================================
#  Étape 3 — Image finale d'exécution
# =============================================================
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Récupère uniquement ce qui est nécessaire à l'exécution.
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=builder  --chown=node:node /app/.next         ./.next
COPY --from=builder  --chown=node:node /app/public        ./public
COPY --from=builder  --chown=node:node /app/server.js     ./server.js
COPY --from=builder  --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder  --chown=node:node /app/package.json  ./package.json

# Exécution en utilisateur non-root (présent dans l'image node).
USER node

EXPOSE 3000

# Serveur custom (Next.js + Socket.IO). Écoute sur 0.0.0.0:3000.
CMD ["node", "server.js"]
