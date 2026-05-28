import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, reservations, rooms, users } from '@/lib/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/documents
 *
 * Renvoie tous les documents/conventions signés par l'utilisateur courant :
 *  - conventions ponctuelles (1 par réservation signée par lui)
 *  - convention annuelle de son association (s'il en a une et qu'elle est signée)
 *
 * Utilisé par la page /profile.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const documents: Array<any> = [];

    // 1) Conventions ponctuelles signées par cet utilisateur (1 par réservation)
    const userReservations = await db
      .select({
        id: reservations.id,
        signedAt: reservations.conventionSignedAt,
        signature: reservations.conventionSignature,
        reservationDate: reservations.date,
        timeSlots: reservations.timeSlots,
        reason: reservations.reason,
        estimatedParticipants: reservations.estimatedParticipants,
        status: reservations.status,
        roomName: rooms.name,
        associationName: associations.name,
        associationAddress: associations.address,
        associationPresident: associations.contactName,
      })
      .from(reservations)
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id))
      .where(
        and(
          eq(reservations.userId, user.id),
          isNotNull(reservations.conventionSignedAt),
          isNotNull(reservations.conventionSignature),
        )
      )
      .orderBy(reservations.conventionSignedAt);

    for (const r of userReservations) {
      documents.push({
        id: `r:${r.id}`,
        type: 'ponctuelle',
        title: `Convention ponctuelle — ${r.roomName || 'Salle'}`,
        signedAt: r.signedAt,
        associationName: r.associationName || 'Particulier',
        associationAddress: r.associationAddress,
        associationPresident: r.associationPresident,
        signatureUrl: r.signature,
        roomName: r.roomName,
        reservationDate: r.reservationDate,
        timeSlots: r.timeSlots,
        reason: r.reason,
        estimatedParticipants: r.estimatedParticipants,
        reservationStatus: r.status,
        reservationId: r.id,
      });
    }

    // 2) Convention annuelle (1 par asso de l'utilisateur, s'il en a une)
    if (user.associationId) {
      const [association] = await db
        .select()
        .from(associations)
        .where(eq(associations.id, user.associationId))
        .limit(1);

      if (association && association.yearlyConventionSignedAt) {
        documents.push({
          id: `a:${association.id}-yearly`,
          type: 'yearly-convention',
          title: 'Convention de réservation à l\'année 2025-2026',
          signedAt: association.yearlyConventionSignedAt,
          associationName: association.name,
          signatureUrl: association.yearlyConventionSignature,
        });
      }
    }

    // Tri global : plus récente d'abord
    documents.sort((a, b) => {
      const ad = a.signedAt ? new Date(a.signedAt).getTime() : 0;
      const bd = b.signedAt ? new Date(b.signedAt).getTime() : 0;
      return bd - ad;
    });

    return NextResponse.json({
      documents,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        associationId: user.associationId,
      },
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
