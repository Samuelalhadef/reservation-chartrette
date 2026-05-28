// Migration ponctuelle : copie associations + buildings + rooms depuis Turso
// vers la base SQLite locale (file:/data/app.db).
// Les users et reservations sont volontairement exclus (= compte à zéro).
//
// Variables d'env attendues :
//   TURSO_SOURCE_URL    = libsql://... (lecture seule conseillée)
//   TURSO_SOURCE_TOKEN  = token Turso
//   TURSO_DATABASE_URL  = file:/data/app.db (destination)
//
// Lancement type (depuis le TrueNAS) :
//   docker run --rm \
//     -e TURSO_SOURCE_URL=... \
//     -e TURSO_SOURCE_TOKEN=... \
//     -e TURSO_DATABASE_URL=file:/data/app.db \
//     -v /mnt/tank/reservation-chartrettes/db:/data \
//     -v /mnt/tank/reservation-chartrettes/app/scripts:/scripts \
//     -w /app \
//     reservation-chartrettes:latest \
//     node /scripts/migrate-from-turso.js

const { createClient } = require('@libsql/client');

const SRC_URL = process.env.TURSO_SOURCE_URL;
const SRC_TOKEN = process.env.TURSO_SOURCE_TOKEN;
const DST_URL = process.env.TURSO_DATABASE_URL || 'file:/data/app.db';

if (!SRC_URL || !SRC_TOKEN) {
  console.error('❌ TURSO_SOURCE_URL ou TURSO_SOURCE_TOKEN absent.');
  process.exit(1);
}

const src = createClient({ url: SRC_URL, authToken: SRC_TOKEN });
const dst = createClient({ url: DST_URL });

// Ordre de dépendance — parents d'abord
const TABLES_TO_COPY = ['associations', 'buildings', 'rooms'];
// Tables explicitement vidées (et non recopiées)
const TABLES_TO_WIPE = ['reservations', 'users'];

async function wipe(table) {
  const before = await dst.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  await dst.execute(`DELETE FROM ${table}`);
  console.log(`🧹 ${table.padEnd(20)} ${before.rows[0].n} ligne(s) supprimée(s)`);
}

async function getDestColumns(table) {
  const r = await dst.execute(`PRAGMA table_info(${table})`);
  return new Set(r.rows.map(row => row.name));
}

async function copyTable(table) {
  const res = await src.execute(`SELECT * FROM ${table}`);
  if (res.rows.length === 0) {
    console.log(`📭 ${table.padEnd(20)} (vide côté Turso, rien à copier)`);
    return;
  }

  // Vider la destination d'abord
  await dst.execute(`DELETE FROM ${table}`);

  // Ne copie que les colonnes qui existent côté destination (filtre le drift schéma)
  const dstColSet = await getDestColumns(table);
  const srcCols = res.columns;
  const cols = srcCols.filter(c => dstColSet.has(c));
  const skipped = srcCols.filter(c => !dstColSet.has(c));
  if (skipped.length) {
    console.log(`   ⚠ ${table}: colonne(s) ignorée(s) (absente(s) côté dest) → ${skipped.join(', ')}`);
  }

  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of res.rows) {
    const args = cols.map(c => {
      const v = row[c];
      // libsql renvoie les BigInts pour les INTEGER — convert en number simple si safe
      if (typeof v === 'bigint') {
        return v <= Number.MAX_SAFE_INTEGER ? Number(v) : v;
      }
      return v;
    });
    await dst.execute({ sql, args });
    inserted++;
  }
  console.log(`✅ ${table.padEnd(20)} ${inserted} ligne(s) copiée(s)`);
}

(async () => {
  console.log(`\nSource      : ${SRC_URL}`);
  console.log(`Destination : ${DST_URL}\n`);

  console.log('--- Wipe ---');
  // Important : wipe dans l'ordre inverse (enfants d'abord)
  for (const t of TABLES_TO_WIPE) await wipe(t);

  console.log('\n--- Copy ---');
  for (const t of TABLES_TO_COPY) await copyTable(t);

  console.log('\n--- Vérif finale (destination) ---');
  for (const t of [...TABLES_TO_COPY, ...TABLES_TO_WIPE]) {
    const r = await dst.execute(`SELECT COUNT(*) AS n FROM ${t}`);
    console.log(`${t.padEnd(20)} → ${r.rows[0].n} ligne(s)`);
  }

  await src.close();
  await dst.close();
  console.log('\n🎉 Migration terminée.');
})().catch(err => {
  console.error('\n❌ Erreur :', err);
  process.exit(1);
});
