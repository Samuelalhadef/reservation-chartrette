import { db } from '@/lib/db';
import { reservations, rooms, users, associations } from '@/lib/db/schema';
import { and, eq, inArray, gte } from 'drizzle-orm';
import {
  BLOCKING_STATUSES,
  formatFrDate,
  formatHourRanges,
  parisDayKey,
  requestKey,
  slotListsOverlap,
  type HourSlot,
} from '@/lib/reservationConflicts';

/**
 * Une « demande » = ce que l'occupant a réellement soumis en une fois.
 *
 * Une réservation à l'année crée une ligne par date (facilement 40 à 50 lignes
 * pour un créneau hebdomadaire sur une année scolaire). L'administrateur, lui,
 * n'a qu'une seule décision à prendre : accepter ou refuser LA demande. Ce
 * module reconstitue ces demandes côté serveur, pour que l'admin traite
 * quelques dizaines de dossiers au lieu de milliers de lignes.
 */

/** Jours de la semaine, index = getDay() (0 = dimanche). */
const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export interface PendingRequestDate {
  id: string;
  date: string; // ISO
  dateLabel: string;
  hours: string;
  inConflict: boolean;
  isPast: boolean;
}

export interface PendingRequest {
  key: string;
  kind: 'single' | 'series';
  ids: string[];
  count: number;
  /** Identifiants des dates disputées : à isoler pour l'arbitrage. */
  conflictIds: string[];
  conflictCount: number;
  /** Dates déjà passées : plus rien à valider, mais la demande traîne encore. */
  pastCount: number;
  isFullyPast: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  roomId: string;
  roomName: string;
  reason: string;
  estimatedParticipants: number;
  submittedAt: string;
  firstDate: string;
  lastDate: string;
  periodLabel: string;
  /** Rythme hebdomadaire reconstitué : « Lundi 18:00 - 20:00 ». */
  weeklyPattern: string[];
  totalPrice: number;
  dates: PendingRequestDate[];
}

export interface PendingRequestsSummary {
  requests: PendingRequest[];
  totals: {
    requests: number;
    reservations: number;
    clean: number;
    withConflicts: number;
    past: number;
  };
}

interface Row {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  roomId: string;
  roomName: string | null;
  associationName: string | null;
  date: Date;
  timeSlots: unknown;
  reason: string;
  estimatedParticipants: number;
  status: string;
  createdAt: Date;
  totalPrice: number | null;
}

// La clé de regroupement est partagée avec la détection de conflits, pour que
// les deux vues parlent bien des mêmes séries.
export { requestKey };

function slotsOf(row: { timeSlots: unknown }): HourSlot[] {
  return (row.timeSlots as HourSlot[]) ?? [];
}

/** Jour de la semaine du jour calendaire parisien (0 = dimanche). */
function parisWeekDay(date: Date): number {
  return new Date(`${parisDayKey(date)}T12:00:00Z`).getUTCDay();
}

/** « du 8 septembre 2025 au 29 juin 2026 », ou la date seule si unique. */
function periodLabelOf(first: Date, last: Date): string {
  const firstLabel = formatFrDate(first);
  if (parisDayKey(first) === parisDayKey(last)) return firstLabel;
  return `du ${firstLabel} au ${formatFrDate(last)}`;
}

/**
 * Rythme hebdomadaire d'une série : un libellé par couple (jour, horaires).
 * Reconstitué depuis les dates réelles — la règle de récurrence n'est pas
 * stockée en base.
 */
function weeklyPatternOf(rows: Row[]): string[] {
  const seen = new Map<string, { day: number; hours: string }>();

  for (const row of rows) {
    const day = parisWeekDay(row.date);
    const hours = formatHourRanges(slotsOf(row));
    const key = `${day}|${hours}`;
    if (!seen.has(key)) seen.set(key, { day, hours });
  }

  return [...seen.values()]
    .sort((a, b) => a.day - b.day || a.hours.localeCompare(b.hours))
    .map(({ day, hours }) => `${WEEK_DAYS[day]} ${hours}`);
}

/**
 * Toutes les demandes en attente, regroupées, avec le repérage des dates
 * disputées (une autre demande occupe déjà le créneau).
 */
export async function listPendingRequests(): Promise<PendingRequestsSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const columns = {
    id: reservations.id,
    userId: reservations.userId,
    userName: users.name,
    userEmail: users.email,
    roomId: reservations.roomId,
    roomName: rooms.name,
    associationName: associations.name,
    date: reservations.date,
    timeSlots: reservations.timeSlots,
    reason: reservations.reason,
    estimatedParticipants: reservations.estimatedParticipants,
    status: reservations.status,
    createdAt: reservations.createdAt,
    totalPrice: reservations.totalPrice,
  };

  const base = () =>
    db
      .select(columns)
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id));

  // Les demandes à traiter, et l'occupation à venir toutes demandes confondues
  // (nécessaire pour savoir si une date est disputée).
  const [pendingRows, occupancyRows] = await Promise.all([
    base().where(eq(reservations.status, 'pending')).orderBy(reservations.date),
    base().where(
      and(gte(reservations.date, today), inArray(reservations.status, [...BLOCKING_STATUSES]))
    ),
  ]);

  // Occupation indexée par salle + jour : seules ces lignes peuvent se croiser.
  const byRoomAndDay = new Map<string, Row[]>();
  for (const row of occupancyRows as Row[]) {
    const key = `${row.roomId}|${parisDayKey(row.date)}`;
    const bucket = byRoomAndDay.get(key) ?? [];
    bucket.push(row);
    byRoomAndDay.set(key, bucket);
  }

  const conflictIds = new Set<string>();
  for (const row of pendingRows as Row[]) {
    const bucket = byRoomAndDay.get(`${row.roomId}|${parisDayKey(row.date)}`);
    if (!bucket || bucket.length < 2) continue;

    // Deux lignes de la même demande ne se disputent pas le créneau.
    const ownKey = requestKey(row);
    const disputed = bucket.some(
      other =>
        other.id !== row.id &&
        requestKey(other) !== ownKey &&
        slotListsOverlap(slotsOf(row), slotsOf(other))
    );
    if (disputed) conflictIds.add(row.id);
  }

  const groups = new Map<string, Row[]>();
  for (const row of pendingRows as Row[]) {
    const key = requestKey(row);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const startOfToday = today.getTime();
  const requests: PendingRequest[] = [];

  for (const [key, unsorted] of groups) {
    const rows = [...unsorted].sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = rows[0];
    const last = rows[rows.length - 1];

    const dates: PendingRequestDate[] = rows.map(row => ({
      id: row.id,
      date: row.date.toISOString(),
      dateLabel: formatFrDate(row.date),
      hours: formatHourRanges(slotsOf(row)),
      inConflict: conflictIds.has(row.id),
      isPast: row.date.getTime() < startOfToday,
    }));

    const pastCount = dates.filter(d => d.isPast).length;
    const requestConflictIds = dates.filter(d => d.inConflict).map(d => d.id);

    requests.push({
      key,
      kind: rows.length > 1 ? 'series' : 'single',
      ids: rows.map(r => r.id),
      count: rows.length,
      conflictIds: requestConflictIds,
      conflictCount: requestConflictIds.length,
      pastCount,
      isFullyPast: pastCount === rows.length,
      userId: first.userId,
      userName: first.userName ?? '',
      userEmail: first.userEmail ?? '',
      associationName: first.associationName ?? '',
      roomId: first.roomId,
      roomName: first.roomName ?? '',
      reason: first.reason,
      estimatedParticipants: first.estimatedParticipants,
      submittedAt: first.createdAt.toISOString(),
      firstDate: first.date.toISOString(),
      lastDate: last.date.toISOString(),
      periodLabel: periodLabelOf(first.date, last.date),
      weeklyPattern:
        rows.length > 1 ? weeklyPatternOf(rows) : [formatHourRanges(slotsOf(first))],
      totalPrice: rows.reduce((sum, r) => sum + (r.totalPrice ?? 0), 0),
      dates,
    });
  }

  // Les plus anciennes demandes d'abord : c'est l'ordre d'arrivée qui fait foi.
  requests.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  return {
    requests,
    totals: {
      requests: requests.length,
      reservations: pendingRows.length,
      clean: requests.filter(r => r.conflictCount === 0 && !r.isFullyPast).length,
      withConflicts: requests.filter(r => r.conflictCount > 0).length,
      past: requests.filter(r => r.isFullyPast).length,
    },
  };
}
