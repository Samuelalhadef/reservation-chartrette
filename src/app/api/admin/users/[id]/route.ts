import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users, reservations } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

const ROLES = ['user', 'admin', 'particulier'] as const;
type Role = (typeof ROLES)[number];

// PATCH - Modifier le rôle d'un utilisateur
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const { role } = await req.json();

    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Rôle invalide. Valeurs acceptées : ${ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Se retirer soi-même les droits d'admin ferme la porte derrière soi :
    // le changement doit passer par un autre administrateur.
    if (user.id === session.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier votre propre rôle' },
        { status: 400 }
      );
    }

    // Ne jamais laisser l'application sans administrateur.
    if (user.role === 'admin' && role !== 'admin') {
      const otherAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'admin'), ne(users.id, id)))
        .limit(1);

      if (otherAdmins.length === 0) {
        return NextResponse.json(
          { error: "Impossible de retirer le rôle du dernier administrateur" },
          { status: 400 }
        );
      }
    }

    if (user.role === role) {
      return NextResponse.json({
        success: true,
        message: 'Rôle inchangé',
        user: { id: user.id, name: user.name, role: user.role },
      });
    }

    const [updated] = await db
      .update(users)
      .set({ role: role as Role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // Un membre d'association sans association rattachée ne peut pas réserver
    // (cf. POST /api/reservations) : on le signale sans bloquer le changement.
    const warning =
      role === 'user' && !updated.associationId
        ? "Ce compte n'est rattaché à aucune association : il ne pourra pas réserver tant qu'il n'en aura pas."
        : null;

    return NextResponse.json({
      success: true,
      message: 'Rôle mis à jour',
      warning,
      user: { id: updated.id, name: updated.name, role: updated.role },
    });
  } catch (error) {
    console.error('Erreur lors de la modification du rôle:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que l'utilisateur existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Empêcher la suppression de son propre compte
    if (user.id === session.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a des réservations liées
    const userReservations = await db
      .select()
      .from(reservations)
      .where(eq(reservations.userId, id))
      .limit(1);

    if (userReservations.length > 0) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer cet utilisateur car il a des réservations associées. Veuillez d\'abord supprimer ou réaffecter ses réservations.'
        },
        { status: 400 }
      );
    }

    // Supprimer l'utilisateur
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
