import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { reservations, rooms, users, associations } from '@/lib/db/schema';
import { and, gte, inArray, eq } from 'drizzle-orm';

/** Créneau horaire tel que stocké en base (une entrée par heure). */
export interface HourSlot {
  start: string; // "10:00"
  end: string; // "11:00"
}

// Statuts qui occupent réellement le créneau : une réservation en attente
// bloque la place le temps de sa validation par la mairie.
export const BLOCKING_STATUSES = ['pending', 'approved', 'awaiting_payment'] as const;

/** Clé de regroupement par jour calendaire parisien (YYYY-MM-DD). */
export function parisDayKey(date: Date): string {
  return date.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

/**
 * Formate une date en jour calendaire français (heure de Paris), pour rester
 * cohérent avec la façon dont les dates sont générées (parseISO = minuit Paris).
 */
export function formatFrDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

export function slotBounds(slot: HourSlot): [number, number] {
  return [parseInt(slot.start.split(':')[0], 10), parseInt(slot.end.split(':')[0], 10)];
}

export function slotsOverlap(a: HourSlot, b: HourSlot): boolean {
  const [aStart, aEnd] = slotBounds(a);
  const [bStart, bEnd] = slotBounds(b);
  return aStart < bEnd && bStart < aEnd;
}

/** Deux réservations se chevauchent si au moins une de leurs heures est commune. */
export function slotListsOverlap(a: HourSlot[], b: HourSlot[]): boolean {
  return a.some(slotA => b.some(slotB => slotsOverlap(slotA, slotB)));
}

/** Regroupe des heures contiguës en plages lisibles ("10:00 - 12:00, 14:00 - 15:00"). */
export function formatHourRanges(slots: HourSlot[]): string {
  const sorted = [...slots].sort((a, b) => slotBounds(a)[0] - slotBounds(b)[0]);
  const ranges: [number, number][] = [];

  for (const slot of sorted) {
    const [start, end] = slotBounds(slot);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      ranges.push([start, end]);
    }
  }

  return ranges.map(([start, end]) => `${start}:00 - ${end}:00`).join(', ');
}

/**
 * Clé de regroupement d'une demande. Les lignes d'une même soumission sont
 * créées dans la même boucle : même occupant, même salle, même motif, et
 * horodatage à la minute près.
 *
 * Vit ici plutôt que dans pendingRequests pour que la détection de conflits
 * puisse rattacher chaque ligne à sa série sans dépendre de ce module.
 */
export function requestKey(row: {
  userId: string;
  roomId: string;
  reason: string;
  createdAt: Date;
}): string {
  const minute = Math.floor(row.createdAt.getTime() / 60000);
  const reasonHash = createHash('sha1').update(row.reason).digest('hex').slice(0, 8);
  return `${row.userId}:${row.roomId}:${minute}:${reasonHash}`;
}

/** Jour de la semaine du jour calendaire parisien (0 = dimanche). */
function parisWeekDay(date: Date): number {
  return new Date(`${parisDayKey(date)}T12:00:00Z`).getUTCDay();
}

const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Une demande concurrente sur un créneau disputé. */
export interface ConflictClaim {
  id: string;
  hours: string;
  status: string;
  reason: string;
  estimatedParticipants: number;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  /** Série (soumission) dont cette ligne fait partie — voir requestKey. */
  seriesKey: string;
}

/** Un créneau disputé : une salle, un jour, et les demandes qui se chevauchent. */
export interface ConflictGroup {
  key: string;
  roomId: string;
  roomName: string;
  date: string; // ISO
  dateLabel: string;
  hours: string; // plage globale couverte par le conflit
  claims: ConflictClaim[];
  pendingCount: number;
}

/** Réservations à venir qui occupent réellement un créneau. */
async function loadUpcomingBlockingRows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db
    .select({
      id: reservations.id,
      roomId: reservations.roomId,
      roomName: rooms.name,
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      status: reservations.status,
      reason: reservations.reason,
      estimatedParticipants: reservations.estimatedParticipants,
      createdAt: reservations.createdAt,
      userId: reservations.userId,
      userName: users.name,
      userEmail: users.email,
      associationName: associations.name,
    })
    .from(reservations)
    .leftJoin(rooms, eq(reservations.roomId, rooms.id))
    .leftJoin(users, eq(reservations.userId, users.id))
    .leftJoin(associations, eq(reservations.associationId, associations.id))
    .where(
      and(
        gte(reservations.date, today),
        inArray(reservations.status, [...BLOCKING_STATUSES])
      )
    )
    .orderBy(reservations.date, reservations.createdAt);
}

type BlockingRow = Awaited<ReturnType<typeof loadUpcomingBlockingRows>>[number];

/**
 * Créneaux disputés : salles/jours où au moins deux demandes se chevauchent et
 * où l'une d'elles reste à arbitrer. Seules les dates à venir sont retournées,
 * les conflits passés n'appelant plus de décision.
 */
export async function findConflictGroups(preloaded?: BlockingRow[]): Promise<ConflictGroup[]> {
  const rows = preloaded ?? (await loadUpcomingBlockingRows());

  // Regrouper par salle + jour : seules ces réservations peuvent se chevaucher.
  const byRoomAndDay = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.roomId}|${parisDayKey(row.date)}`;
    const bucket = byRoomAndDay.get(key) ?? [];
    bucket.push(row);
    byRoomAndDay.set(key, bucket);
  }

  const groups: ConflictGroup[] = [];

  for (const [key, bucket] of byRoomAndDay) {
    if (bucket.length < 2) continue;

    // Composantes connexes : A chevauche B, B chevauche C => les trois sont
    // sur le même créneau disputé, même si A et C ne se touchent pas.
    const remaining = [...bucket];

    while (remaining.length > 0) {
      const cluster = [remaining.shift()!];
      let grew = true;

      while (grew) {
        grew = false;
        for (let i = remaining.length - 1; i >= 0; i--) {
          const candidate = remaining[i];
          const overlapsCluster = cluster.some(member =>
            slotListsOverlap(
              (member.timeSlots as HourSlot[]) ?? [],
              (candidate.timeSlots as HourSlot[]) ?? []
            )
          );
          if (overlapsCluster) {
            cluster.push(candidate);
            remaining.splice(i, 1);
            grew = true;
          }
        }
      }

      if (cluster.length < 2) continue;

      const pendingCount = cluster.filter(r => r.status === 'pending').length;
      // Sans demande en attente, il n'y a plus rien à arbitrer.
      if (pendingCount === 0) continue;

      const allSlots = cluster.flatMap(r => (r.timeSlots as HourSlot[]) ?? []);

      groups.push({
        key: `${key}|${cluster[0].id}`,
        roomId: cluster[0].roomId,
        roomName: cluster[0].roomName ?? '',
        date: cluster[0].date.toISOString(),
        dateLabel: formatFrDate(cluster[0].date),
        hours: formatHourRanges(allSlots),
        pendingCount,
        claims: cluster
          .map(r => ({
            id: r.id,
            hours: formatHourRanges((r.timeSlots as HourSlot[]) ?? []),
            status: r.status,
            reason: r.reason,
            estimatedParticipants: r.estimatedParticipants,
            createdAt: r.createdAt.toISOString(),
            userId: r.userId,
            userName: r.userName ?? '',
            userEmail: r.userEmail ?? '',
            associationName: r.associationName ?? '',
            seriesKey: requestKey(r),
          }))
          // Le premier arrivé en premier : l'ordre de dépôt aide à trancher.
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      });
    }
  }

  return groups.sort((a, b) => a.date.localeCompare(b.date));
}

/** Une série (soumission) engagée dans un conflit récurrent. */
export interface RecurringParty {
  seriesKey: string;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  reason: string;
  hours: string;
  /** Lignes de cette série effectivement disputées, dans l'ordre des dates. */
  ids: string[];
  conflictCount: number;
  /** Taille totale de la série, dates disputées ou non. */
  seriesCount: number;
  pendingCount: number;
  approvedCount: number;
  submittedAt: string;
}

/**
 * Un conflit récurrent : les mêmes demandes qui se disputent la même salle,
 * semaine après semaine.
 */
export interface RecurringConflict {
  key: string;
  roomId: string;
  roomName: string;
  /** Rythme reconstitué depuis les dates réelles : « Samedi 16:00 - 23:00 ». */
  weeklyPattern: string[];
  dateCount: number;
  periodLabel: string;
  firstDate: string;
  lastDate: string;
  parties: RecurringParty[];
  pendingCount: number;
  dates: { date: string; dateLabel: string; hours: string }[];
}

/** « du 8 septembre 2025 au 29 juin 2026 », ou la date seule si unique. */
function periodLabelOf(first: Date, last: Date): string {
  const firstLabel = formatFrDate(first);
  if (parisDayKey(first) === parisDayKey(last)) return firstLabel;
  return `du ${firstLabel} au ${formatFrDate(last)}`;
}

/**
 * Regroupe les créneaux disputés par jeu de demandes opposées.
 *
 * Un cours hebdomadaire à l'année produit une quarantaine de créneaux disputés
 * strictement identiques : mêmes salles, mêmes occupants, même horaire. Les
 * présenter date par date oblige l'admin à trancher quarante fois la même
 * question. Ici, un conflit récurrent = un arbitrage.
 */
function buildRecurringConflicts(groups: ConflictGroup[], rows: BlockingRow[]): RecurringConflict[] {
  // Taille totale de chaque série, pour situer le conflit dans son ensemble :
  // « 43 dates disputées sur les 45 de la série ».
  const seriesSize = new Map<string, number>();
  for (const row of rows) {
    const key = requestKey(row);
    seriesSize.set(key, (seriesSize.get(key) ?? 0) + 1);
  }

  // Deux créneaux disputés relèvent du même conflit récurrent s'ils opposent
  // exactement les mêmes séries dans la même salle.
  const clusters = new Map<string, ConflictGroup[]>();
  for (const group of groups) {
    const seriesKeys = [...new Set(group.claims.map(c => c.seriesKey))].sort();
    const key = `${group.roomId}|${seriesKeys.join('+')}`;
    const bucket = clusters.get(key) ?? [];
    bucket.push(group);
    clusters.set(key, bucket);
  }

  const recurring: RecurringConflict[] = [];

  for (const [key, bucket] of clusters) {
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date);
    const last = new Date(sorted[sorted.length - 1].date);

    // Rythme hebdomadaire : un libellé par couple (jour, horaires).
    const patterns = new Map<string, { day: number; hours: string }>();
    for (const group of sorted) {
      const day = parisWeekDay(new Date(group.date));
      const patternKey = `${day}|${group.hours}`;
      if (!patterns.has(patternKey)) patterns.set(patternKey, { day, hours: group.hours });
    }

    // Agrégation par série : une ligne par partie en présence.
    const parties = new Map<string, RecurringParty>();
    for (const group of sorted) {
      for (const claim of group.claims) {
        const party = parties.get(claim.seriesKey) ?? {
          seriesKey: claim.seriesKey,
          userId: claim.userId,
          userName: claim.userName,
          userEmail: claim.userEmail,
          associationName: claim.associationName,
          reason: claim.reason,
          hours: claim.hours,
          ids: [],
          conflictCount: 0,
          seriesCount: seriesSize.get(claim.seriesKey) ?? 1,
          pendingCount: 0,
          approvedCount: 0,
          submittedAt: claim.createdAt,
        };

        party.ids.push(claim.id);
        party.conflictCount += 1;
        if (claim.status === 'pending') party.pendingCount += 1;
        else party.approvedCount += 1;
        if (claim.createdAt < party.submittedAt) party.submittedAt = claim.createdAt;

        parties.set(claim.seriesKey, party);
      }
    }

    recurring.push({
      key,
      roomId: sorted[0].roomId,
      roomName: sorted[0].roomName,
      weeklyPattern: [...patterns.values()]
        // Lundi en tête plutôt que dimanche : l'ordre attendu d'un planning.
        .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.hours.localeCompare(b.hours))
        .map(p => `${WEEK_DAYS[p.day]} ${p.hours}`),
      dateCount: sorted.length,
      periodLabel: periodLabelOf(first, last),
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      pendingCount: sorted.reduce((sum, g) => sum + g.pendingCount, 0),
      parties: [...parties.values()].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
      dates: sorted.map(g => ({ date: g.date, dateLabel: g.dateLabel, hours: g.hours })),
    });
  }

  // Les conflits les plus répétitifs d'abord : ce sont eux qui encombrent.
  return recurring.sort((a, b) => b.dateCount - a.dateCount || a.firstDate.localeCompare(b.firstDate));
}

/**
 * Les créneaux disputés sous leurs deux angles : date par date pour l'arbitrage
 * fin, et regroupés par conflit récurrent pour trancher une série d'un bloc.
 */
export async function findConflictsOverview(): Promise<{
  groups: ConflictGroup[];
  recurring: RecurringConflict[];
}> {
  const rows = await loadUpcomingBlockingRows();
  const groups = await findConflictGroups(rows);
  return { groups, recurring: buildRecurringConflicts(groups, rows) };
}
