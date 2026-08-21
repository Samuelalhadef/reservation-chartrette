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

// Le schéma n'étant poussé qu'à la première installation, une table ajoutée
// après coup n'existerait jamais sur la base de production. On la crée donc ici,
// de façon idempotente, au même titre que les index.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS email_quota (
     day TEXT PRIMARY KEY,
     sent INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS email_queue (
     id TEXT PRIMARY KEY,
     "to" TEXT NOT NULL,
     subject TEXT NOT NULL,
     html TEXT NOT NULL,
     body TEXT,
     reply_to TEXT,
     attachments TEXT,
     status TEXT NOT NULL DEFAULT 'pending',
     attempts INTEGER NOT NULL DEFAULT 0,
     last_error TEXT,
     created_at INTEGER NOT NULL,
     sent_at INTEGER
   )`,
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS reservations_room_date_idx ON reservations (room_id, date)',
  'CREATE INDEX IF NOT EXISTS reservations_user_date_idx ON reservations (user_id, date)',
  'CREATE INDEX IF NOT EXISTS reservations_status_date_idx ON reservations (status, date)',
  'CREATE INDEX IF NOT EXISTS reservations_association_idx ON reservations (association_id)',
  'CREATE INDEX IF NOT EXISTS rooms_building_idx ON rooms (building_id)',
  // La purge de la file relit uniquement les envois encore en attente.
  'CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue (status, created_at)',
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

  // Avant les index : l'index de la file porte sur une table créée ici.
  for (const statement of TABLES) {
    try {
      await client.execute(statement);
    } catch (error) {
      console.warn('⚠ Table non créée :', error);
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
