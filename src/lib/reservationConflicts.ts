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

/**
 * Créneaux disputés : salles/jours où au moins deux demandes se chevauchent et
 * où l'une d'elles reste à arbitrer. Seules les dates à venir sont retournées,
 * les conflits passés n'appelant plus de décision.
 */
export async function findConflictGroups(): Promise<ConflictGroup[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
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
          }))
          // Le premier arrivé en premier : l'ordre de dépôt aide à trancher.
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      });
    }
  }

  return groups.sort((a, b) => a.date.localeCompare(b.date));
}
