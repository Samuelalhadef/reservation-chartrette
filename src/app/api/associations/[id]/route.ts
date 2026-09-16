import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { authOptions } from '@/lib/auth';
import { getUserAssociationIds } from '@/lib/userAssociations';
import { associationExists, parseAssociationInput } from '@/lib/associationInput';

/** Champs qu'un membre peut modifier (le statut et le reste restent à la mairie). */
const MEMBER_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone', 'address'] as const;

/**
 * PUT /api/associations/:id
 * body: { name?, contactName?, contactEmail?, contactPhone?, address? }
 *
 * Met à jour les informations d'une association. Autorisé à tout compte
 * rattaché à l'association (et aux administrateurs).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    if (session.user.role !== 'admin') {
      const [user] = await db
        .select({ associationId: users.associationId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      const allowedIds = await getUserAssociationIds(session.user.id, user?.associationId);
      if (!allowedIds.includes(id)) {
        return NextResponse.json(
          { error: "Vous n'êtes pas rattaché à cette association" },
          { status: 403 }
        );
      }
    }

    if (!(await associationExists(id))) {
      return NextResponse.json({ error: 'Association introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const allowed = Object.fromEntries(MEMBER_FIELDS.map((key) => [key, body?.[key]]));
    const parsed = await parseAssociationInput(allowed, { creating: false, excludeId: id });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const [association] = await db
      .update(associations)
      .set({ ...parsed.values, updatedAt: new Date() })
      .where(eq(associations.id, id))
      .returning();

    return NextResponse.json({
      association: {
        id: association.id,
        name: association.name,
        description: association.description,
        address: association.address,
        contactName: association.contactName,
        contactEmail: association.contactEmail,
        contactPhone: association.contactPhone,
      },
    });
  } catch (error: any) {
    console.error('PUT /api/associations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
