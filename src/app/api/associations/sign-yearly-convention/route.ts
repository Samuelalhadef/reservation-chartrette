import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { signature } = body;

    if (!signature || !signature.trim()) {
      return NextResponse.json(
        { error: 'La signature est requise' },
        { status: 400 }
      );
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

    // Mettre à jour la signature de la convention annuelle
    await db
      .update(associations)
      .set({
        yearlyConventionSignedAt: new Date(),
        yearlyConventionSignature: signature,
        updatedAt: new Date(),
      })
      .where(eq(associations.id, association.id));

    return NextResponse.json({
      success: true,
      message: 'Convention annuelle signée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la signature de la convention annuelle:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
