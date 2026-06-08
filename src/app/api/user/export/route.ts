import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users, reservations, rooms, buildings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getUserAssociations } from '@/lib/userAssociations';

/**
 * GET /api/user/export
 *
 * Droit d'accès et de portabilité (RGPD art. 15 & 20).
 * Renvoie l'intégralité des données personnelles de l'utilisateur connecté
 * au format JSON, en excluant les secrets (mot de passe, jetons).
 * Le fichier est servi en téléchargement.
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

    // Associations rattachées au compte
    const userAssocs = await getUserAssociations(user.id, user.associationId);

    // Réservations de l'utilisateur (avec nom de salle / bâtiment lisibles)
    const userReservations = await db
      .select({
        id: reservations.id,
        roomName: rooms.name,
        buildingName: buildings.name,
        date: reservations.date,
        timeSlots: reservations.timeSlots,
        reason: reservations.reason,
        estimatedParticipants: reservations.estimatedParticipants,
        requiredEquipment: reservations.requiredEquipment,
        status: reservations.status,
        adminComment: reservations.adminComment,
        totalPrice: reservations.totalPrice,
        depositAmount: reservations.depositAmount,
        paymentStatus: reservations.paymentStatus,
        conventionSignedAt: reservations.conventionSignedAt,
        cancelledAt: reservations.cancelledAt,
        cancelReason: reservations.cancelReason,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .leftJoin(buildings, eq(rooms.buildingId, buildings.id))
      .where(eq(reservations.userId, user.id));

    const exportData = {
      _metadata: {
        description:
          'Export de vos données personnelles — Réservation des salles municipales de Chartrettes',
        exportedAt: new Date().toISOString(),
        rgpd:
          'Cet export est fourni au titre de votre droit d’accès et de portabilité (RGPD art. 15 et 20). Les mots de passe et jetons de sécurité ne sont pas inclus.',
      },
      compte: {
        id: user.id,
        nom: user.name,
        email: user.email,
        role: user.role,
        adresse: user.address,
        residentChartrettes: user.isChartrettesResident,
        emailVerifie: user.emailVerified,
        creeLe: user.createdAt,
        misAJourLe: user.updatedAt,
      },
      associations: userAssocs.map((a) => ({
        id: a.id,
        nom: a.name,
        description: a.description,
        adresse: a.address,
        objetSocial: a.socialPurpose,
        contactNom: a.contactName,
        contactEmail: a.contactEmail,
        contactTelephone: a.contactPhone,
        statut: a.status,
      })),
      reservations: userReservations,
    };

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="mes-donnees-chartrettes.json"',
      },
    });
  } catch (error: any) {
    console.error('GET /api/user/export error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
