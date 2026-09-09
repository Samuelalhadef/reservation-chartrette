import { db } from '@/lib/db';
import { reservations, rooms } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import {
  BLOCKING_STATUSES,
  formatFrDate,
  formatHourRanges,
  parisDayKey,
  parisWeekDay,
  type HourSlot,
} from '@/lib/reservationConflicts';

/**
 * Reconstruit l'annexe « Créneaux attribués » d'une convention annuelle.
 *
 * Une réservation à l'année est éclatée en une ligne `reservations` par date :
 * la convention, elle, est portée par l'association et ne garde aucune trace du
 * motif hebdomadaire d'origine. On le recompose donc ici en regroupant les
 * réservations par salle + jour de la semaine + plage horaire, ce qui redonne
 * le tableau (Jour / Horaires / Installation) de la convention papier.
 *
 * Les jours de semaine sont calculés sur le jour calendaire **parisien** : en
 * UTC une réservation du dimanche soir bascule au lundi.
 */

const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export interface ConventionSlot {
  /** Salle concernée. */
  roomName: string;
  /** 0 = dimanche, comme getDay(). */
  day: number;
  dayLabel: string;
  /** Plage horaire consolidée, ex. « 18:00 - 21:30 ». */
  hoursLabel: string;
  /** Première et dernière date effectivement réservées sur ce créneau. */
  firstDate: string;
  lastDate: string;
  /** Nombre de séances réservées sur ce créneau. */
  occurrences: number;
}

export interface ConventionSchedule {
  /** Bornes de la période couverte, tous créneaux confondus (ISO, ou null). */
  periodStart: string | null;
  periodEnd: string | null;
  /** Libellé prêt à imprimer : « du 8 septembre 2025 au 10 juillet 2026 ». */
  periodLabel: string | null;
  slots: ConventionSlot[];
}

const EMPTY_SCHEDULE: ConventionSchedule = {
  periodStart: null,
  periodEnd: null,
  periodLabel: null,
  slots: [],
};

/**
 * Créneaux réservés par une association, hors demandes refusées ou annulées
 * (`BLOCKING_STATUSES` = celles qui occupent réellement la salle).
 */
export async function getAssociationSchedule(
  associationId: string | null | undefined
): Promise<ConventionSchedule> {
  if (!associationId) return { ...EMPTY_SCHEDULE };

  const rows = await db
    .select({
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      roomName: rooms.name,
    })
    .from(reservations)
    .leftJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        eq(reservations.associationId, associationId),
        inArray(reservations.status, [...BLOCKING_STATUSES])
      )
    )
    .orderBy(reservations.date);

  return buildSchedule(rows);
}

/**
 * Même chose pour plusieurs associations en une seule requête — la liste admin
 * affiche toutes les conventions d'un coup et ne doit pas faire N requêtes.
 */
export async function getSchedulesForAssociations(
  associationIds: string[]
): Promise<Map<string, ConventionSchedule>> {
  const result = new Map<string, ConventionSchedule>();
  const ids = [...new Set(associationIds.filter(Boolean))];
  if (ids.length === 0) return result;

  const rows = await db
    .select({
      associationId: reservations.associationId,
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      roomName: rooms.name,
    })
    .from(reservations)
    .leftJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        inArray(reservations.associationId, ids),
        inArray(reservations.status, [...BLOCKING_STATUSES])
      )
    )
    .orderBy(reservations.date);

  const byAssociation = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byAssociation.get(row.associationId) ?? [];
    bucket.push(row);
    byAssociation.set(row.associationId, bucket);
  }

  for (const id of ids) {
    result.set(id, buildSchedule(byAssociation.get(id) ?? []));
  }
  return result;
}

/** Regroupement pur (testable, réutilisable côté client si les lignes sont déjà chargées). */
export function buildSchedule(
  rows: Array<{ date: Date | string; timeSlots: HourSlot[] | null; roomName: string | null }>
): ConventionSchedule {
  if (rows.length === 0) return { ...EMPTY_SCHEDULE };

  const groups = new Map<string, ConventionSlot>();
  let min: Date | null = null;
  let max: Date | null = null;

  for (const row of rows) {
    const date = typeof row.date === 'string' ? new Date(row.date) : row.date;
    if (Number.isNaN(date.getTime())) continue;

    const slots = row.timeSlots || [];
    if (slots.length === 0) continue;

    const roomName = row.roomName || 'Salle';
    const day = parisWeekDay(date);
    const hoursLabel = formatHourRanges(slots);
    const key = `${roomName}|${day}|${hoursLabel}`;

    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (date < new Date(existing.firstDate)) existing.firstDate = date.toISOString();
      if (date > new Date(existing.lastDate)) existing.lastDate = date.toISOString();
    } else {
      groups.set(key, {
        roomName,
        day,
        dayLabel: WEEK_DAYS[day],
        hoursLabel,
        firstDate: date.toISOString(),
        lastDate: date.toISOString(),
        occurrences: 1,
      });
    }

    if (!min || date < min) min = date;
    if (!max || date > max) max = date;
  }

  const slots = [...groups.values()].sort(
    (a, b) =>
      a.roomName.localeCompare(b.roomName, 'fr') ||
      a.day - b.day ||
      a.hoursLabel.localeCompare(b.hoursLabel)
  );

  if (!min || !max) return { ...EMPTY_SCHEDULE };

  return {
    periodStart: min.toISOString(),
    periodEnd: max.toISOString(),
    periodLabel:
      parisDayKey(min) === parisDayKey(max)
        ? `le ${formatFrDate(min)}`
        : `du ${formatFrDate(min)} au ${formatFrDate(max)}`,
    slots,
  };
}
