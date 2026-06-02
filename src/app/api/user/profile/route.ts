import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getUserAssociations } from '@/lib/userAssociations';

/**
 * GET /api/user/profile
 *
 * Retourne les infos de l'utilisateur courant + son association (s'il en a une).
 * Utilisé notamment par ReservationModal pour pré-remplir le signataire de la
 * convention de mise à disposition.
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

    // Toutes les associations rattachées au compte (principale + table de liaison)
    const userAssocs = await getUserAssociations(user.id, user.associationId);
    const mapAssoc = (assoc: typeof userAssocs[number]) => ({
      id: assoc.id,
      name: assoc.name,
      description: assoc.description,
      address: assoc.address,
      contactName: assoc.contactName,
      contactEmail: assoc.contactEmail,
      contactPhone: assoc.contactPhone,
    });

    const associationsList = userAssocs.map(mapAssoc);
    // `association` (singulier) = association principale, conservé pour compatibilité
    const association =
      associationsList.find((a) => a.id === user.associationId) ||
      associationsList[0] ||
      null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        isChartrettesResident: user.isChartrettesResident,
      },
      association,
      associations: associationsList,
    });
  } catch (error: any) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
