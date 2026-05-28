import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

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

    let association = null;
    if (user.associationId) {
      const [assoc] = await db
        .select()
        .from(associations)
        .where(eq(associations.id, user.associationId))
        .limit(1);
      if (assoc) {
        association = {
          id: assoc.id,
          name: assoc.name,
          description: assoc.description,
          address: assoc.address,
          contactName: assoc.contactName,
          contactEmail: assoc.contactEmail,
          contactPhone: assoc.contactPhone,
        };
      }
    }

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
    });
  } catch (error: any) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
