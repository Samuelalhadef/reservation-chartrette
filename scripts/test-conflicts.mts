// Test manuel de la détection de conflits, sur une base SQLite jetable.
// Lancer avec :
//   TURSO_DATABASE_URL=file:test-conflicts.db node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-conflicts.mts
import { db } from '@/lib/db';
import { associations, buildings, reservations, rooms, users } from '@/lib/db/schema';
import { findConflictGroups } from '@/lib/reservationConflicts';
import { computeValidDates, findYearlyConflicts } from '@/lib/yearlyReservations';

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function main() {
  // Table rase
  await db.delete(reservations);
  await db.delete(users);
  await db.delete(rooms);
  await db.delete(buildings);
  await db.delete(associations);

  const [assoA] = await db
    .insert(associations)
    .values({ name: 'Asso A', description: 'test', status: 'active' })
    .returning();
  const [assoB] = await db
    .insert(associations)
    .values({ name: 'Asso B', description: 'test', status: 'active' })
    .returning();

  const [building] = await db
    .insert(buildings)
    .values({ name: 'Espace culturel' })
    .returning();

  const [room] = await db
    .insert(rooms)
    .values({ buildingId: building.id, name: 'Salle des fêtes', capacity: 50 })
    .returning();

  const [userA] = await db
    .insert(users)
    .values({
      name: 'Alice',
      email: 'alice@test.fr',
      password: 'x',
      role: 'user',
      associationId: assoA.id,
    })
    .returning();
  const [userB] = await db
    .insert(users)
    .values({
      name: 'Bob',
      email: 'bob@test.fr',
      password: 'x',
      role: 'user',
      associationId: assoB.id,
    })
    .returning();

  // Trouver le prochain lundi (jour 1) pour caler les créneaux hebdomadaires.
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + ((1 - monday.getDay() + 7) % 7 || 7));
  const mondayIso = monday.toISOString().slice(0, 10);

  // Réservation existante d'Alice : lundi 10h-12h (approuvée)
  await db.insert(reservations).values({
    userId: userA.id,
    roomId: room.id,
    associationId: assoA.id,
    date: monday,
    timeSlots: [
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
    ],
    reason: 'Répétition chorale',
    estimatedParticipants: 10,
    status: 'approved',
  });

  // 1) Demande annuelle de Bob : lundis 11h-13h => doit entrer en conflit
  const timeSlots = [{ day: 1, startHour: 11, endHour: 12 }]; // 11:00 -> 13:00
  const dates = computeValidDates({
    startDate: mondayIso,
    endDate: isoDay(21),
    timeSlots,
    excludeSchoolHolidays: false,
    excludedDates: [],
  });
  const yearlyConflicts = await findYearlyConflicts({
    roomId: room.id,
    dates,
    timeSlots,
    includeAssociationName: true,
  });

  console.log('--- Conflits détectés pour la demande à l\'année ---');
  console.log('Dates générées :', dates.length);
  console.log(JSON.stringify(yearlyConflicts, null, 2));

  // 2) Créneau non chevauchant (14h-15h) => aucun conflit attendu
  const freeSlots = [{ day: 1, startHour: 14, endHour: 14 }];
  const noConflicts = await findYearlyConflicts({
    roomId: room.id,
    dates: computeValidDates({
      startDate: mondayIso,
      endDate: isoDay(21),
      timeSlots: freeSlots,
      excludeSchoolHolidays: false,
      excludedDates: [],
    }),
    timeSlots: freeSlots,
  });
  console.log('--- Créneau libre (14h) ---');
  console.log('Conflits :', noConflicts.length);

  // 3) Bob envoie quand même sa demande (arbitrage) : elle est enregistrée en attente
  await db.insert(reservations).values({
    userId: userB.id,
    roomId: room.id,
    associationId: assoB.id,
    date: monday,
    timeSlots: [
      { start: '11:00', end: '12:00' },
      { start: '12:00', end: '13:00' },
    ],
    reason: 'Cours de théâtre',
    estimatedParticipants: 15,
    status: 'pending',
  });

  const groups = await findConflictGroups();
  console.log('--- Vue admin : créneaux disputés ---');
  console.log(JSON.stringify(groups, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
