import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWeeklyOccupancy } from '@/lib/yearlyReservations';

/**
 * Créneaux déjà pris dans une salle sur une période donnée, projetés sur la
 * grille hebdomadaire. Sert à afficher au demandeur, dès le choix des horaires,
 * ce qui est déjà réservé ou en cours de validation — plutôt que de le laisser
 * découvrir les conflits au récapitulatif.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'roomId, startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    const occupancy = await getWeeklyOccupancy({ roomId, startDate, endDate });

    return NextResponse.json(occupancy);
  } catch (error) {
    console.error("Erreur lors du chargement des créneaux occupés:", error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des créneaux occupés' },
      { status: 500 }
    );
  }
}
