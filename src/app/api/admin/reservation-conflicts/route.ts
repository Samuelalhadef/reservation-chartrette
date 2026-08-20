import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findConflictGroups } from '@/lib/reservationConflicts';

/**
 * Créneaux disputés à arbitrer : dates où plusieurs demandes se chevauchent sur
 * la même salle et où au moins une reste en attente de validation.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const conflicts = await findConflictGroups();

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Erreur lors de la détection des conflits:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection des conflits' },
      { status: 500 }
    );
  }
}
