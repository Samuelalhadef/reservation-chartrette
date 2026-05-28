/**
 * Jours fériés français + vacances scolaires Zone C (Académie de Créteil,
 * qui couvre la Seine-et-Marne 77 et donc Chartrettes).
 *
 * - Les jours fériés sont calculés (algo de Gauss pour Pâques, dates fixes
 *   pour les autres). Pas de hardcoded year-by-year — marche pour n'importe
 *   quelle année.
 * - Les vacances scolaires sont des plages hardcodées par année scolaire car
 *   leur calendrier n'est pas algorithmique. Source : education.gouv.fr.
 *   À mettre à jour chaque été quand le ministère publie l'année suivante.
 */

// ---------- Jours fériés (calculés) ----------

/** Calcule la date de Pâques pour une année donnée (algo de Gauss / Meeus). */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export interface NamedDate {
  date: Date;
  label: string;
}

/** Retourne les 11 jours fériés français pour une année civile donnée. */
export function getFrenchPublicHolidays(year: number): NamedDate[] {
  const easter = easterDate(year);
  return [
    { date: new Date(year, 0, 1), label: "Jour de l'an" },
    { date: addDays(easter, 1), label: 'Lundi de Pâques' },
    { date: new Date(year, 4, 1), label: 'Fête du travail' },
    { date: new Date(year, 4, 8), label: 'Victoire 1945' },
    { date: addDays(easter, 39), label: 'Ascension' },
    { date: addDays(easter, 50), label: 'Lundi de Pentecôte' },
    { date: new Date(year, 6, 14), label: 'Fête nationale' },
    { date: new Date(year, 7, 15), label: 'Assomption' },
    { date: new Date(year, 10, 1), label: 'Toussaint' },
    { date: new Date(year, 10, 11), label: 'Armistice 1918' },
    { date: new Date(year, 11, 25), label: 'Noël' },
  ];
}

// ---------- Vacances scolaires Zone C ----------

interface SchoolBreak {
  /** Premier jour des vacances (inclus, généralement un samedi) */
  start: Date;
  /** Premier jour de reprise des cours (EXCLU, généralement un lundi) */
  end: Date;
  label: string;
}

/**
 * Vacances scolaires Zone C (Créteil — couvre Chartrettes / 77).
 * Dates officielles publiées par education.gouv.fr.
 * À étendre chaque été pour l'année scolaire suivante.
 */
const SCHOOL_BREAKS_ZONE_C: SchoolBreak[] = [
  // Année scolaire 2025-2026
  { start: new Date(2025, 9, 18), end: new Date(2025, 10, 3), label: 'Toussaint 2025' },
  { start: new Date(2025, 11, 20), end: new Date(2026, 0, 5), label: 'Noël 2025' },
  { start: new Date(2026, 1, 14), end: new Date(2026, 2, 2), label: 'Hiver 2026' },
  { start: new Date(2026, 3, 11), end: new Date(2026, 3, 27), label: 'Printemps 2026' },
  { start: new Date(2026, 4, 14), end: new Date(2026, 4, 18), label: "Pont de l'Ascension 2026" },
  { start: new Date(2026, 6, 4), end: new Date(2026, 8, 1), label: 'Été 2026' },

  // Année scolaire 2026-2027
  { start: new Date(2026, 9, 17), end: new Date(2026, 10, 2), label: 'Toussaint 2026' },
  { start: new Date(2026, 11, 19), end: new Date(2027, 0, 4), label: 'Noël 2026' },
  { start: new Date(2027, 1, 13), end: new Date(2027, 2, 1), label: 'Hiver 2027' },
  { start: new Date(2027, 3, 10), end: new Date(2027, 3, 26), label: 'Printemps 2027' },
  { start: new Date(2027, 4, 6), end: new Date(2027, 4, 10), label: "Pont de l'Ascension 2027" },
  { start: new Date(2027, 6, 3), end: new Date(2027, 8, 1), label: 'Été 2027' },
];

// ---------- Helpers ----------

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(date: Date, start: Date, endExclusive: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

/** Renvoie l'étiquette du jour férié si la date en est un, sinon null. */
export function getPublicHolidayLabel(date: Date): string | null {
  const holidays = getFrenchPublicHolidays(date.getFullYear());
  const hit = holidays.find((h) => sameDay(h.date, date));
  return hit ? hit.label : null;
}

/** Renvoie le nom de la période de vacances scolaires si la date y tombe, sinon null. */
export function getSchoolBreakLabel(date: Date): string | null {
  const hit = SCHOOL_BREAKS_ZONE_C.find((b) => isInRange(date, b.start, b.end));
  return hit ? hit.label : null;
}

/**
 * Renvoie true si la date est un jour férié OU dans une plage de vacances scolaires
 * de la zone C.
 */
export function isHolidayOrSchoolBreak(date: Date): boolean {
  return getPublicHolidayLabel(date) !== null || getSchoolBreakLabel(date) !== null;
}

/**
 * Filtre une liste de dates et renvoie celles qui tombent sur un jour férié
 * ou pendant les vacances scolaires.
 */
export function filterHolidaysAndBreaks(dates: Date[]): Date[] {
  return dates.filter(isHolidayOrSchoolBreak);
}
