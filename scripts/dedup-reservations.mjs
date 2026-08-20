// Détection et nettoyage des réservations en doublon.
//
// Par défaut : DRY-RUN (aucune écriture). Affiche les groupes de doublons
// selon plusieurs critères pour décider en connaissance de cause.
//
// Usage :
//   node scripts/dedup-reservations.mjs                      # rapport seul
//   node scripts/dedup-reservations.mjs --apply              # annule les doublons (réversible)
//   node scripts/dedup-reservations.mjs --apply --mode=delete # supprime définitivement
//   options : --key=strict|slot|day   (défaut: strict)
//
// Sur le TrueNAS (base /mnt/tank/reservation-chartrettes/db/app.db) :
//   docker run --rm \
//     -e TURSO_DATABASE_URL=file:/data/app.db \
//     -v /mnt/tank/reservation-chartrettes/db:/data \
//     -v "$PWD/scripts":/scripts -w /app \
//     reservation-chartrettes:latest node /scripts/dedup-reservations.mjs

import { createClient } from '@libsql/client';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (n, d) => (argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').pop();

const APPLY = has('--apply');
const MODE = opt('mode', 'cancel');            // cancel | delete
const KEY = opt('key', 'strict');              // strict | slot | day

if (!['cancel', 'delete'].includes(MODE)) throw new Error(`--mode invalide: ${MODE}`);
if (!['strict', 'slot', 'day'].includes(KEY)) throw new Error(`--key invalide: ${KEY}`);

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:/data/app.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Statuts "vivants" : seuls ceux-là peuvent constituer un doublon.
const LIVE = ['pending', 'approved', 'awaiting_payment'];

const rooms = new Map((await client.execute('SELECT id,name FROM rooms')).rows.map((r) => [r.id, r.name]));
const assos = new Map((await client.execute('SELECT id,name FROM associations')).rows.map((r) => [r.id, r.name]));
const users = new Map((await client.execute('SELECT id,name,email FROM users')).rows.map((r) => [r.id, r.name || r.email]));

const rows = (await client.execute({
  sql: `SELECT id,user_id,room_id,association_id,date,time_slots,reason,status,created_at
        FROM reservations WHERE status IN (${LIVE.map(() => '?').join(',')}) ORDER BY created_at`,
  args: LIVE,
})).rows;

const fmtDate = (d) => new Date(Number(d) * 1000).toISOString().slice(0, 10);
const norm = (ts) => {
  // Créneaux normalisés (ordre + "9:00" == "09:00") pour comparer de façon fiable.
  try {
    const pad = (h) => h.split(':').map((p, i) => (i === 0 ? p.padStart(2, '0') : p)).join(':');
    return JSON.parse(ts).map((s) => `${pad(s.start)}-${pad(s.end)}`).sort().join(',');
  } catch {
    return String(ts);
  }
};

const KEYS = {
  // Même demandeur, même salle, même asso, même jour, mêmes créneaux, même motif
  strict: (r) => [r.user_id, r.room_id, r.association_id, r.date, norm(r.time_slots), String(r.reason).trim().toLowerCase()].join('|'),
  // Même salle, même jour, mêmes créneaux (peu importe qui a demandé)
  slot: (r) => [r.room_id, r.date, norm(r.time_slots)].join('|'),
  // Même salle, même jour, même asso (créneaux différents tolérés)
  day: (r) => [r.room_id, r.date, r.association_id].join('|'),
};

function groups(keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m.values()].filter((v) => v.length > 1);
}

console.log(`Base : ${process.env.TURSO_DATABASE_URL || 'file:/data/app.db'}`);
console.log(`Réservations actives (${LIVE.join('/')}) : ${rows.length}\n`);
console.log('Doublons potentiels selon le critère :');
for (const [name, fn] of Object.entries(KEYS)) {
  const g = groups(fn);
  console.log(`  --key=${name.padEnd(6)} ${String(g.length).padStart(4)} groupes, ${String(g.reduce((s, v) => s + v.length - 1, 0)).padStart(4)} lignes en trop`);
}

// On garde la plus « avancée » : approved > awaiting_payment > pending,
// puis la plus ancienne (celle d'origine).
const RANK = { approved: 0, awaiting_payment: 1, pending: 2 };
const pickKeeper = (g) =>
  [...g].sort((a, b) => (RANK[a.status] - RANK[b.status]) || (Number(a.created_at) - Number(b.created_at)))[0];

const dups = groups(KEYS[KEY]);
const toRemove = [];
console.log(`\n=== Détail (--key=${KEY}) : ${dups.length} groupes ===`);
for (const g of dups) {
  const keep = pickKeeper(g);
  const drop = g.filter((r) => r.id !== keep.id);
  toRemove.push(...drop);
  console.log(`\n${fmtDate(g[0].date)}  ${rooms.get(g[0].room_id) ?? g[0].room_id}  | ${assos.get(g[0].association_id) ?? '—'}  | ${users.get(g[0].user_id) ?? '—'}`);
  console.log(`   motif « ${String(g[0].reason).slice(0, 50)} »  créneaux ${norm(g[0].time_slots)}`);
  console.log(`   GARDE   ${keep.id}  ${keep.status}  créé ${new Date(Number(keep.created_at) * 1000).toISOString().slice(0, 16)}`);
  for (const r of drop) {
    console.log(`   ${MODE === 'delete' ? 'SUPPR ' : 'ANNULE'}  ${r.id}  ${r.status}  créé ${new Date(Number(r.created_at) * 1000).toISOString().slice(0, 16)}`);
  }
}

console.log(`\n→ ${toRemove.length} réservation(s) à ${MODE === 'delete' ? 'supprimer' : 'annuler'}.`);

if (!APPLY) {
  console.log('\nDRY-RUN : rien n\'a été modifié. Relancer avec --apply pour appliquer.');
  process.exit(0);
}
if (!toRemove.length) process.exit(0);

const now = Math.floor(Date.now() / 1000);
const stmts = toRemove.map((r) =>
  MODE === 'delete'
    ? { sql: 'DELETE FROM reservations WHERE id = ?', args: [r.id] }
    : {
        sql: `UPDATE reservations SET status='cancelled', cancelled_at=?, cancel_reason=?, updated_at=? WHERE id = ?`,
        args: [now, 'Doublon — nettoyage administratif', now, r.id],
      }
);
await client.batch(stmts, 'write');
console.log(`✅ ${toRemove.length} réservation(s) ${MODE === 'delete' ? 'supprimée(s)' : 'annulée(s)'}.`);
