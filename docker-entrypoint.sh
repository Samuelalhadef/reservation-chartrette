#!/bin/sh
# Entrypoint pour le container "reservation-chartrettes".
# - Au premier démarrage (DB SQLite vide ou absente) : applique le schéma via
#   drizzle-kit push --force (lit src/lib/db/schema.ts).
# - Aux démarrages suivants : démarre directement le serveur.
# - Pour appliquer un changement de schéma plus tard :
#     docker exec -it reservation-chartrettes sh -c "npx drizzle-kit push --force"

set -e

DB_URL="${TURSO_DATABASE_URL:-file:/data/app.db}"

case "$DB_URL" in
  file:*)
    DB_FILE="${DB_URL#file:}"
    if [ ! -s "$DB_FILE" ]; then
      echo "▶  Premier démarrage : initialisation du schéma SQLite ($DB_FILE)…"
      mkdir -p "$(dirname "$DB_FILE")"
      npx drizzle-kit push --force
      echo "✅ Schéma initialisé."
    else
      echo "✓ Base SQLite existante détectée ($DB_FILE), démarrage direct."
    fi
    ;;
  *)
    echo "ℹ Base distante détectée (non-file:), pas d'initialisation locale."
    ;;
esac

echo "▶  Démarrage du serveur Next.js + Socket.IO…"
exec node server.js
