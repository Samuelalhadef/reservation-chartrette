import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Garde des routes d'administration : renvoie une réponse 401/403 à retourner
 * telle quelle si l'appelant n'est pas administrateur, sinon null.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}
