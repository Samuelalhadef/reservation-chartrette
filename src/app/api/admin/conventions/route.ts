import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, reservations, rooms, users } from '@/lib/db/schema';
import { and, eq, isNotNull, isNull, ne, or } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { isMairieAssociationName } from '@/lib/mairieAssociation';

/**
 * GET /api/admin/conventions
 *
 * Liste unifiée de toutes les conventions :
 *   - "ponctuelle" : 1 entrée par réservation signée (reservations.conventionSignature)
 *   - "annuelle"   : 1 entrée par association active, signée ou non. Les non signées
 *                    ont signedAt/signature à null pour permettre le filtre
 *                    "signée / non signée" côté admin.
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
        estimatedParticipants: reservations.estimatedParticipants,
        status: reservations.status,
        userId: users.id,
        userRole: users.role,
        signerName: users.name,
        signerEmail: users.email,
        signerAddress: users.address,
        associationId: associations.id,
        associationName: associations.name,
        associationAddress: associations.address,
        associationPresident: associations.contactName,
        associationEmail: associations.contactEmail,
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

    // 2) Conventions annuelles — 1 par association non archivée.
    //    Les associations qui n'ont pas encore signé apparaissent aussi (signedAt null).
    const annuelles = await db
      .select({
        associationId: associations.id,
        associationName: associations.name,
        associationAddress: associations.address,
        contactName: associations.contactName,
        contactEmail: associations.contactEmail,
        signedAt: associations.yearlyConventionSignedAt,
        signature: associations.yearlyConventionSignature,
        validatedAt: associations.yearlyConventionValidatedAt,
      })
      .from(associations)
      .where(
        or(
          // Signée : on la garde quel que soit le statut de l'association
          and(
            isNotNull(associations.yearlyConventionSignedAt),
            isNotNull(associations.yearlyConventionSignature),
          ),
          // Non signée : uniquement les associations encore actives
          and(
            ne(associations.status, 'inactive'),
            or(
              isNull(associations.yearlyConventionSignedAt),
              isNull(associations.yearlyConventionSignature),
            ),
          ),
        )
      )
      .orderBy(associations.yearlyConventionSignedAt);

    const items = [
      ...ponctuelles.map(p => {
        // Réservation saisie par un admin au nom d'une association : la convention
        // est signée par le représentant de l'association, pas par l'agent qui a
        // enregistré la réservation. C'est son identité qui doit figurer au PDF.
        const signedForThirdParty =
          p.userRole === 'admin' &&
          Boolean(p.associationId) &&
          !isMairieAssociationName(p.associationName);

        return {
          type: 'ponctuelle' as const,
          signed: true,
          id: `r:${p.reservationId}`,
          reservationId: p.reservationId,
          signedAt: p.signedAt,
          signature: p.signature,
          signerName: (signedForThirdParty ? p.associationPresident : p.signerName) || '—',
          signerEmail: (signedForThirdParty ? p.associationEmail : p.signerEmail) || '',
          signerAddress: signedForThirdParty ? p.associationAddress : p.signerAddress,
          userId: p.userId,
          associationId: p.associationId,
          associationName: p.associationName || 'Particulier',
          associationAddress: p.associationAddress,
          associationPresident: p.associationPresident,
          roomName: p.roomName || '—',
          reservationDate: p.reservationDate,
          timeSlots: p.timeSlots,
          reason: p.reason,
          estimatedParticipants: p.estimatedParticipants,
          reservationStatus: p.status,
        };
      }),
      ...annuelles.map(a => ({
        type: 'annuelle' as const,
        signed: Boolean(a.signedAt && a.signature),
        id: `a:${a.associationId}`,
        signedAt: a.signedAt,
        signature: a.signature,
        signerName: a.contactName || '—',
        signerEmail: a.contactEmail || '',
        signerAddress: undefined,
        associationId: a.associationId,
        associationName: a.associationName,
        associationAddress: a.associationAddress,
        associationPresident: a.contactName,
        validatedAt: a.validatedAt,
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
