# syntax=docker/dockerfile:1

# =============================================================
#  Étape 1 — Build (toutes les dépendances, y compris dev)
# =============================================================
FROM node:20-slim AS builder
WORKDIR /app

# Installe les dépendances en se basant sur le lockfile s'il est présent.
# --legacy-peer-deps : nodemailer@6 vs next-auth (qui veut nodemailer@7 en peer optionnel).
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

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
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

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
COPY --from=builder  --chown=node:node /app/.next            ./.next
COPY --from=builder  --chown=node:node /app/public           ./public
COPY --from=builder  --chown=node:node /app/server.js        ./server.js
COPY --from=builder  --chown=node:node /app/next.config.ts   ./next.config.ts
COPY --from=builder  --chown=node:node /app/package.json     ./package.json
# Fichiers nécessaires à l'init du schéma (drizzle-kit push) au 1er démarrage.
COPY --from=builder  --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder  --chown=node:node /app/src/lib/db        ./src/lib/db
COPY --from=builder  --chown=node:node /app/drizzle           ./drizzle
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Crée le dossier /data pour la base SQLite (monté en volume), avec droits node.
RUN mkdir -p /data && chown -R node:node /data

# Exécution en utilisateur non-root (présent dans l'image node).
USER node

EXPOSE 3000

# Le script entrypoint initialise le schéma SQLite si nécessaire puis lance Next.js.
CMD ["./docker-entrypoint.sh"]
