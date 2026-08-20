import { db } from '@/lib/db';
import { reservations, associations } from '@/lib/db/schema';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';
import {
  BLOCKING_STATUSES,
  formatFrDate,
  formatHourRanges,
  parisDayKey,
  slotsOverlap,
  type HourSlot,
} from '@/lib/reservationConflicts';

export { formatFrDate };
export type { HourSlot };

/** Créneau hebdomadaire récurrent saisi dans la modale de réservation à l'année. */
export interface WeeklyTimeSlot {
  day: number; // 0 = dimanche, comme getDay()
  startHour: number;
  endHour: number; // inclus (16 => la plage se termine à 17:00)
}

/** Un conflit détecté entre une date demandée et une réservation existante. */
export interface YearlyConflict {
  date: string; // ISO de la date concernée
  dateLabel: string; // "lundi 12 janvier 2026"
  requestedHours: string; // horaires demandés ce jour-là
  conflictingHours: string; // horaires déjà pris qui se chevauchent
  associationName?: string; // renseigné uniquement pour les admins
}

// Jours de la semaine (index 0 = dimanche, comme getDay()).
export const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Périodes de vacances scolaires françaises (à personnaliser selon la zone)
const SCHOOL_HOLIDAYS_2024_2025 = [
  { start: '2024-10-19', end: '2024-11-03' }, // Toussaint
  { start: '2024-12-21', end: '2025-01-05' }, // Noël
  { start: '2025-02-08', end: '2025-02-23' }, // Hiver
  { start: '2025-04-05', end: '2025-04-21' }, // Printemps
  { start: '2025-07-05', end: '2025-08-31' }, // Été
];

const SCHOOL_HOLIDAYS_2025_2026 = [
  { start: '2025-10-18', end: '2025-11-02' }, // Toussaint
  { start: '2025-12-20', end: '2026-01-04' }, // Noël
  { start: '2026-02-07', end: '2026-02-22' }, // Hiver
  { start: '2026-04-04', end: '2026-04-20' }, // Printemps
  { start: '2026-07-04', end: '2026-08-31' }, // Été
];

export function isSchoolHoliday(date: Date): boolean {
  const allHolidays = [...SCHOOL_HOLIDAYS_2024_2025, ...SCHOOL_HOLIDAYS_2025_2026];

  return allHolidays.some(holiday => {
    const start = parseISO(holiday.start);
    const end = parseISO(holiday.end);
    return date >= start && date <= end;
  });
}

/**
 * Dates effectivement réservées : celles qui portent un créneau récurrent,
 * hors vacances scolaires (si demandé) et hors dates explicitement exclues.
 */
export function computeValidDates(params: {
  startDate: string;
  endDate: string;
  timeSlots: WeeklyTimeSlot[];
  excludeSchoolHolidays?: boolean;
  excludedDates?: string[];
}): Date[] {
  const { startDate, endDate, timeSlots, excludeSchoolHolidays, excludedDates } = params;

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return eachDayOfInterval({ start, end }).filter(date => {
    const dayOfWeek = getDay(date);

    // Vérifier si ce jour de la semaine a des créneaux définis
    if (!timeSlots.some(slot => slot.day === dayOfWeek)) return false;

    // Exclure les vacances scolaires si demandé
    if (excludeSchoolHolidays && isSchoolHoliday(date)) return false;

    // Exclure les dates spécifiquement exclues
    if (excludedDates && excludedDates.length > 0) {
      const isExcluded = excludedDates.some(excludedDate => isSameDay(parseISO(excludedDate), date));
      if (isExcluded) return false;
    }

    return true;
  });
}

/** Créneaux récurrents applicables à une date, éclatés heure par heure. */
export function getSlotsForDate(timeSlots: WeeklyTimeSlot[], date: Date) {
  const daySlots = timeSlots.filter(slot => slot.day === getDay(date));

  // Libellé lisible des plages horaires de ce jour (ex. "10:00 - 12:00, 14:00 - 16:00")
  const hoursLabel = daySlots
    .map(slot => `${slot.startHour}:00 - ${slot.endHour + 1}:00`)
    .join(', ');

  const hourSlots: HourSlot[] = [];
  for (const slot of daySlots) {
    for (let hour = slot.startHour; hour <= slot.endHour; hour++) {
      hourSlots.push({ start: `${hour}:00`, end: `${hour + 1}:00` });
    }
  }

  return { daySlots, hourSlots, hoursLabel };
}

/**
 * Recherche les créneaux déjà réservés dans la salle qui chevauchent les dates
 * et horaires demandés pour une réservation à l'année.
 */
export async function findYearlyConflicts(params: {
  roomId: string;
  dates: Date[];
  timeSlots: WeeklyTimeSlot[];
  includeAssociationName?: boolean;
}): Promise<YearlyConflict[]> {
  const { roomId, dates, timeSlots, includeAssociationName } = params;

  if (dates.length === 0) return [];

  // Bornes de la requête : du premier au dernier jour concerné.
  const rangeStart = new Date(Math.min(...dates.map(d => d.getTime())));
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(Math.max(...dates.map(d => d.getTime())));
  rangeEnd.setHours(23, 59, 59, 999);

  const existing = await db
    .select({
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      associationName: associations.name,
    })
    .from(reservations)
    .leftJoin(associations, eq(reservations.associationId, associations.id))
    .where(
      and(
        eq(reservations.roomId, roomId),
        gte(reservations.date, rangeStart),
        lte(reservations.date, rangeEnd),
        inArray(reservations.status, [...BLOCKING_STATUSES])
      )
    );

  // Regrouper les réservations existantes par jour calendaire.
  const byDay = new Map<string, { slots: HourSlot[]; associationName: string | null }[]>();
  for (const reservation of existing) {
    const key = parisDayKey(reservation.date);
    const entries = byDay.get(key) ?? [];
    entries.push({
      slots: (reservation.timeSlots as HourSlot[]) ?? [],
      associationName: reservation.associationName,
    });
    byDay.set(key, entries);
  }

  const conflicts: YearlyConflict[] = [];

  for (const date of dates) {
    const entries = byDay.get(parisDayKey(date));
    if (!entries || entries.length === 0) continue;

    const { hourSlots, hoursLabel } = getSlotsForDate(timeSlots, date);
    if (hourSlots.length === 0) continue;

    const overlapping: HourSlot[] = [];
    const names = new Set<string>();

    for (const entry of entries) {
      for (const existingSlot of entry.slots) {
        if (hourSlots.some(requested => slotsOverlap(requested, existingSlot))) {
          overlapping.push(existingSlot);
          if (entry.associationName) names.add(entry.associationName);
        }
      }
    }

    if (overlapping.length === 0) continue;

    conflicts.push({
      date: date.toISOString(),
      dateLabel: formatFrDate(date),
      requestedHours: hoursLabel,
      conflictingHours: formatHourRanges(overlapping),
      ...(includeAssociationName && names.size > 0
        ? { associationName: [...names].join(', ') }
        : {}),
    });
  }

  return conflicts;
}

/** Message d'alerte affiché au demandeur lorsqu'une ou plusieurs dates sont déjà prises. */
export function conflictErrorMessage(conflicts: YearlyConflict[]): string {
  return conflicts.length === 1
    ? 'Date déjà réservée : il y a un conflit pour réserver ce créneau. Excluez cette date ou contactez la mairie.'
    : `${conflicts.length} dates déjà réservées : il y a un conflit pour réserver ces créneaux. Excluez ces dates ou contactez la mairie.`;
}

/** Une date précise déjà occupée sur un créneau hebdomadaire. */
export interface OccupiedDate {
  date: string; // ISO
  dateLabel: string; // "lundi 12 janvier 2026"
  hours: string; // "18:00 - 20:00"
  status: 'approved' | 'pending'; // pending = demande en cours de validation
  associationName?: string;
}

/**
 * Occupation d'une case de la grille hebdomadaire (un jour + une heure) :
 * combien de dates de la période sont déjà prises sur ce créneau.
 */
export interface OccupancyCell {
  day: number; // 0 = dimanche, comme getDay()
  hour: number; // heure de début (18 => 18:00 - 19:00)
  approved: number; // dates déjà validées par la mairie
  pending: number; // demandes en cours de validation
  dates: OccupiedDate[];
}

/**
 * Créneaux déjà pris dans la salle sur la période demandée, projetés sur la
 * grille hebdomadaire. Permet d'afficher au demandeur, avant qu'il ne choisisse
 * ses horaires, ce qui est déjà réservé ou en cours de validation.
 */
export async function getWeeklyOccupancy(params: {
  roomId: string;
  startDate: string;
  endDate: string;
}): Promise<{ cells: OccupancyCell[]; totalReservations: number }> {
  const { roomId, startDate, endDate } = params;

  const rangeStart = parseISO(startDate);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = parseISO(endDate);
  rangeEnd.setHours(23, 59, 59, 999);

  const existing = await db
    .select({
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      status: reservations.status,
      associationName: associations.name,
    })
    .from(reservations)
    .leftJoin(associations, eq(reservations.associationId, associations.id))
    .where(
      and(
        eq(reservations.roomId, roomId),
        gte(reservations.date, rangeStart),
        lte(reservations.date, rangeEnd),
        inArray(reservations.status, [...BLOCKING_STATUSES])
      )
    )
    .orderBy(reservations.date);

  // Une case par jour de la semaine + heure ; on y accumule les dates concernées.
  const cells = new Map<string, OccupancyCell>();

  for (const reservation of existing) {
    const slots = (reservation.timeSlots as HourSlot[]) ?? [];
    if (slots.length === 0) continue;

    // Le jour de la semaine se lit à l'heure de Paris (cf. fuseau des dates).
    const dayOfWeek = getDay(parseISO(parisDayKey(reservation.date)));
    // Une réservation validée occupe le créneau ; en attente, elle le bloque
    // provisoirement le temps de la décision de la mairie.
    const status: OccupiedDate['status'] =
      reservation.status === 'approved' ? 'approved' : 'pending';

    const occupied: OccupiedDate = {
      date: reservation.date.toISOString(),
      dateLabel: formatFrDate(reservation.date),
      hours: formatHourRanges(slots),
      status,
      ...(reservation.associationName ? { associationName: reservation.associationName } : {}),
    };

    for (const slot of slots) {
      const [start, end] = [slot.start, slot.end].map(h => parseInt(h.split(':')[0], 10));
      for (let hour = start; hour < end; hour++) {
        const key = `${dayOfWeek}|${hour}`;
        const cell = cells.get(key) ?? { day: dayOfWeek, hour, approved: 0, pending: 0, dates: [] };
        // Une réservation couvrant plusieurs heures ne compte qu'une fois par case.
        if (!cell.dates.some(d => d.date === occupied.date && d.hours === occupied.hours)) {
          cell.dates.push(occupied);
          if (status === 'approved') cell.approved += 1;
          else cell.pending += 1;
        }
        cells.set(key, cell);
      }
    }
  }

  return { cells: [...cells.values()], totalReservations: existing.length };
}
