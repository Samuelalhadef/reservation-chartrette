import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

/** Même exigence qu'à l'inscription (POST /api/auth/signup). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * PUT /api/admin/users/[id]/password
 *
 * Définit le mot de passe d'un compte. Pensé pour le guichet : la mairie
 * réattribue un accès à quelqu'un qui ne reçoit plus ses e-mails ou a perdu
 * son mot de passe, sans passer par le lien de réinitialisation.
 *
 * Réservé aux admins. Le mot de passe est haché (bcrypt, coût 12) comme à
 * l'inscription — il n'est jamais stocké ni renvoyé en clair.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Deux refus bien distincts : « personne n'est connecté » se répare en se
    // reconnectant, « vous n'êtes pas admin » non. Les confondre sous un seul
    // « Non autorisé » ne dit pas à l'administrateur quoi faire.
    const session = (await getServerSession(authOptions)) as any;

    if (!session?.user) {
      console.warn(
        '[admin/password] session absente — cookies reçus :',
        req.cookies.getAll().map((c) => c.name).join(', ') || 'aucun'
      );
      return NextResponse.json(
        { error: 'Votre session a expiré. Rechargez la page, reconnectez-vous, puis réessayez.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      console.warn('[admin/password] rôle insuffisant :', session.user.role);
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { password, markVerified } = await req.json();

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
        { status: 400 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Un lien de réinitialisation en attente doit mourir avec l'ancien mot de
    // passe : sinon il permettrait encore de reprendre la main sur le compte.
    const changes: Partial<typeof users.$inferInsert> = {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date(),
    };

    // La connexion exige un e-mail vérifié (cf. authorize() dans lib/auth.ts) :
    // sans ça, redonner un mot de passe ne débloque rien.
    if (markVerified && !user.emailVerified) {
      changes.emailVerified = new Date();
      changes.verificationCode = null;
      changes.verificationCodeExpiry = null;
    }

    await db.update(users).set(changes).where(eq(users.id, id));

    const stillUnverified = !user.emailVerified && !markVerified;

    return NextResponse.json({
      success: true,
      message: 'Mot de passe mis à jour',
      warning: stillUnverified
        ? "Ce compte n'a pas validé son adresse e-mail : il ne pourra pas se connecter tant que l'e-mail n'est pas vérifié."
        : null,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
