import { client } from './index';

/**
 * Réglages appliqués une fois au démarrage du serveur.
 *
 * Le schéma n'est poussé (drizzle-kit push) qu'au tout premier démarrage : sur
 * une base déjà en production, les index déclarés dans schema.ts ne seraient
 * jamais créés. On les crée donc ici, de façon idempotente, à chaque démarrage.
 * Sans eux, chaque calendrier ou vérification de conflit relit toute la table
 * des réservations.
 */

// PRAGMA : uniquement pour une base SQLite locale (fichier), pas pour Turso.
const PRAGMAS = [
  // WAL : les lectures ne bloquent plus pendant une écriture (plusieurs
  // utilisateurs qui consultent pendant qu'un autre réserve).
  'PRAGMA journal_mode = WAL',
  // Compromis durabilité/vitesse recommandé avec WAL.
  'PRAGMA synchronous = NORMAL',
  // Attendre au lieu d'échouer immédiatement si la base est verrouillée.
  'PRAGMA busy_timeout = 5000',
  // Tables temporaires (tris, GROUP BY des statistiques) en mémoire.
  'PRAGMA temp_store = MEMORY',
  // ~64 Mo de cache de pages : la base tient entièrement en RAM.
  'PRAGMA cache_size = -64000',
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS reservations_room_date_idx ON reservations (room_id, date)',
  'CREATE INDEX IF NOT EXISTS reservations_user_date_idx ON reservations (user_id, date)',
  'CREATE INDEX IF NOT EXISTS reservations_status_date_idx ON reservations (status, date)',
  'CREATE INDEX IF NOT EXISTS reservations_association_idx ON reservations (association_id)',
  'CREATE INDEX IF NOT EXISTS rooms_building_idx ON rooms (building_id)',
];

let applied: Promise<void> | null = null;

async function apply(): Promise<void> {
  const isLocalFile = (process.env.TURSO_DATABASE_URL || 'file:local.db').startsWith('file:');

  if (isLocalFile) {
    for (const pragma of PRAGMAS) {
      try {
        await client.execute(pragma);
      } catch (error) {
        console.warn(`⚠ PRAGMA ignoré (${pragma}) :`, error);
      }
    }
  }

  for (const statement of INDEXES) {
    try {
      await client.execute(statement);
    } catch (error) {
      // Table absente au tout premier démarrage : le schéma est poussé juste
      // après, les index seront créés au démarrage suivant.
      console.warn('⚠ Index non créé :', error);
    }
  }
}

/** Applique les réglages une seule fois par processus. */
export function ensureDbOptimizations(): Promise<void> {
  if (!applied) applied = apply();
  return applied;
}
