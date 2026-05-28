import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, reservations, rooms, users } from '@/lib/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/conventions
 *
 * Liste unifiée de toutes les conventions signées :
 *   - "ponctuelle" : 1 entrée par réservation signée (reservations.conventionSignature)
 *   - "annuelle"   : 1 entrée par association ayant signé la convention annuelle
 *
 * Réservé aux admins.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1) Conventions ponctuelles — 1 par réservation signée
    const ponctuelles = await db
      .select({
        reservationId: reservations.id,
        signedAt: reservations.conventionSignedAt,
        signature: reservations.conventionSignature,
        reservationDate: reservations.date,
        timeSlots: reservations.timeSlots,
        reason: reservations.reason,
        status: reservations.status,
        userId: users.id,
        signerName: users.name,
        signerEmail: users.email,
        associationId: associations.id,
        associationName: associations.name,
        roomId: rooms.id,
        roomName: rooms.name,
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(
        and(
          isNotNull(reservations.conventionSignedAt),
          isNotNull(reservations.conventionSignature),
        )
      )
      .orderBy(reservations.conventionSignedAt);

    // 2) Conventions annuelles — 1 par asso signée
    const annuelles = await db
      .select({
        associationId: associations.id,
        associationName: associations.name,
        contactName: associations.contactName,
        contactEmail: associations.contactEmail,
        signedAt: associations.yearlyConventionSignedAt,
        signature: associations.yearlyConventionSignature,
      })
      .from(associations)
      .where(
        and(
          isNotNull(associations.yearlyConventionSignedAt),
          isNotNull(associations.yearlyConventionSignature),
        )
      )
      .orderBy(associations.yearlyConventionSignedAt);

    const items = [
      ...ponctuelles.map(p => ({
        type: 'ponctuelle' as const,
        id: `r:${p.reservationId}`,
        reservationId: p.reservationId,
        signedAt: p.signedAt,
        signature: p.signature,
        signerName: p.signerName || '—',
        signerEmail: p.signerEmail || '',
        userId: p.userId,
        associationId: p.associationId,
        associationName: p.associationName || 'Particulier',
        roomName: p.roomName || '—',
        reservationDate: p.reservationDate,
        timeSlots: p.timeSlots,
        reason: p.reason,
        reservationStatus: p.status,
      })),
      ...annuelles.map(a => ({
        type: 'annuelle' as const,
        id: `a:${a.associationId}`,
        signedAt: a.signedAt,
        signature: a.signature,
        signerName: a.contactName || '—',
        signerEmail: a.contactEmail || '',
        associationId: a.associationId,
        associationName: a.associationName,
      })),
    ];

    // Tri global décroissant par date de signature
    items.sort((x, y) => {
      const xd = x.signedAt ? new Date(x.signedAt).getTime() : 0;
      const yd = y.signedAt ? new Date(y.signedAt).getTime() : 0;
      return yd - xd;
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error: any) {
    console.error('GET /api/admin/conventions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
