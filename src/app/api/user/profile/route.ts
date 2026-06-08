import { NextResponse, NextRequest } from 'next/server';
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

/**
 * PUT /api/user/profile
 *
 * Droit de rectification (RGPD art. 16) : permet à l'utilisateur de mettre à
 * jour ses propres informations personnelles (nom, adresse, résidence).
 * L'email n'est pas modifiable ici car il nécessite une nouvelle vérification.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json(
          { error: 'Le nom doit contenir au moins 2 caractères' },
          { status: 400 }
        );
      }
      updates.name = name;
    }

    if (typeof body.address === 'string') {
      updates.address = body.address.trim() || null;
    }

    if (typeof body.isChartrettesResident === 'boolean') {
      updates.isChartrettesResident = body.isChartrettesResident;
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        isChartrettesResident: user.isChartrettesResident,
      },
    });
  } catch (error: any) {
    console.error('PUT /api/user/profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
