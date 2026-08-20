import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listPendingRequests } from '@/lib/pendingRequests';

/**
 * Demandes en attente regroupées par soumission : une réservation à l'année
 * compte pour UNE demande, pas pour ses cinquante dates.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    return NextResponse.json(await listPendingRequests());
  } catch (error) {
    console.error('Erreur lors du chargement des demandes en attente:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des demandes en attente' },
      { status: 500 }
    );
  }
}
