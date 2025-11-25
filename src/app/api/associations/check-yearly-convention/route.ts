import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.associationId) {
      return NextResponse.json(
        { error: 'Vous devez être associé à une association' },
        { status: 400 }
      );
    }

    // Récupérer l'association
    const [association] = await db
      .select()
      .from(associations)
      .where(eq(associations.id, user.associationId))
      .limit(1);

    if (!association) {
      return NextResponse.json(
        { error: 'Association non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la convention annuelle a été signée
    const hasSigned = association.yearlyConventionSignedAt !== null;

    return NextResponse.json({
      hasSigned,
      association: {
        id: association.id,
        name: association.name,
        contactName: association.contactName,
        contactEmail: association.contactEmail,
        contactPhone: association.contactPhone,
        description: association.description,
        yearlyConventionSignedAt: association.yearlyConventionSignedAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la convention annuelle:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
