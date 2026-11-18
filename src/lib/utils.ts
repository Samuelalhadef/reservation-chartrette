import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  // Les réservations ponctuelles sont stockées à minuit UTC ("2026-06-18"),
  // les réservations à l'année à minuit heure de Paris (22h/23h UTC la veille).
  // Lire la date à l'heure de Paris donne le bon jour dans les deux cas ; la
  // lire en UTC affichait la veille pour toutes les réservations à l'année.
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Jour calendaire parisien au format YYYY-MM-DD (noms de fichiers, clés). */
export function parisDateKey(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeSlot(start: string, end: string): string {
  return `${start} - ${end}`;
}

/** "8:30" -> 8.5 — les créneaux peuvent porter des minutes depuis le mode 30 min. */
export function parseHourFraction(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

/** 8.5 -> "8:30", 8 -> "8:00" — même style que les créneaux stockés ("10:00"). */
export function formatHourLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Créneau hebdomadaire d'une réservation à l'année. `endHour` est le début du
 * dernier créneau (inclus) ; `step` est la durée d'un créneau (1 h ou 0,5 h,
 * 1 h par défaut pour les anciennes demandes).
 */
export interface WeeklySlotLike {
  day: number;
  startHour: number;
  endHour: number;
  step?: number;
}

/** Heure de fin réelle d'un créneau hebdomadaire (ex. 16 + 1 => 17). */
export function weeklySlotEnd(slot: WeeklySlotLike): number {
  return slot.endHour + (slot.step ?? 1);
}

/** "14:30 - 16:00" */
export function formatWeeklySlotHours(slot: WeeklySlotLike): string {
  return `${formatHourLabel(slot.startHour)} - ${formatHourLabel(weeklySlotEnd(slot))}`;
}

/**
 * Valide et normalise les créneaux hebdomadaires reçus d'un client. Renvoie
 * null si un créneau est incohérent (jour hors 0-6, heures hors grille, pas
 * autre que 1 h / 30 min, bornes non alignées sur le pas).
 */
export function normalizeWeeklySlots(input: unknown): WeeklySlotLike[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: WeeklySlotLike[] = [];
  for (const raw of input) {
    const day = Number(raw?.day);
    const startHour = Number(raw?.startHour);
    const endHour = Number(raw?.endHour);
    const step = raw?.step === undefined || raw?.step === null ? 1 : Number(raw.step);
    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    if (step !== 1 && step !== 0.5) return null;
    if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null;
    if (startHour < 0 || endHour < startHour || endHour + step > 24) return null;
    // Bornes alignées sur le pas (8, 8.5... en 30 min ; entiers en 1 h)
    if (Math.round(startHour / step) * step !== startHour) return null;
    if (Math.round(endHour / step) * step !== endHour) return null;
    out.push({ day, startHour, endHour, step });
  }
  return out;
}

/** 1.5 -> "1h30", 2 -> "2h" */
export function formatDurationLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export function isDateBlocked(date: Date, blockedDates: { startDate: Date; endDate: Date }[]): boolean {
  return blockedDates.some((blocked) => {
    const blockStart = new Date(blocked.startDate);
    const blockEnd = new Date(blocked.endDate);
    return date >= blockStart && date <= blockEnd;
  });
}

export function generateTimeSlots(start: string = '08:00', end: string = '22:00'): string[] {
  const slots: string[] = [];
  const [startHour] = start.split(':').map(Number);
  const [endHour] = end.split(':').map(Number);

  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  return slots;
}

export function isTimeSlotAvailable(
  slot: string,
  reservedSlots: { start: string; end: string }[]
): boolean {
  const slotHour = parseInt(slot.split(':')[0]);

  return !reservedSlots.some((reserved) => {
    const startHour = parseInt(reserved.start.split(':')[0]);
    const endHour = parseInt(reserved.end.split(':')[0]);
    return slotHour >= startHour && slotHour < endHour;
  });
}
