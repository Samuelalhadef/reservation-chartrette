import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users, reservations, userAssociations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

/**
 * DELETE /api/user/account
 *
 * Droit à l'effacement (RGPD art. 17), en self-service.
 *
 * Stratégie : si l'utilisateur a des réservations (et donc potentiellement des
 * conventions signées qui doivent être conservées au titre des obligations
 * administratives de la commune), son compte est *anonymisé* : ses données
 * personnelles sont remplacées par des valeurs neutres et son mot de passe est
 * retiré. Sinon, le compte est purement et simplement supprimé.
 *
 * Les comptes administrateurs ne peuvent pas être supprimés par cette voie afin
 * d'éviter tout verrouillage involontaire (ils doivent être gérés par un autre
 * administrateur).
 */
export async function DELETE() {
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

    if (user.role === 'admin') {
      return NextResponse.json(
        {
          error:
            "Les comptes administrateurs ne peuvent pas être supprimés depuis cette page. Contactez un autre administrateur.",
        },
        { status: 400 }
      );
    }

    // L'utilisateur a-t-il des réservations rattachées ?
    const linkedReservation = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.userId, user.id))
      .limit(1);

    const hasReservations = linkedReservation.length > 0;

    // Dans tous les cas, on retire le lien personnel aux associations.
    await db.delete(userAssociations).where(eq(userAssociations.userId, user.id));

    if (hasReservations) {
      // Anonymisation : on conserve la ligne (pour l'intégrité des réservations
      // et des conventions) mais on efface toute donnée personnelle.
      await db
        .update(users)
        .set({
          name: 'Compte supprimé',
          email: `supprime-${user.id}@anonymise.local`,
          password: null,
          image: null,
          address: null,
          isChartrettesResident: false,
          associationId: null,
          emailVerified: null,
          verificationCode: null,
          verificationCodeExpiry: null,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({ success: true, anonymized: true });
    }

    // Aucune réservation : suppression complète.
    await db.delete(users).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, anonymized: false });
  } catch (error: any) {
    console.error('DELETE /api/user/account error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
