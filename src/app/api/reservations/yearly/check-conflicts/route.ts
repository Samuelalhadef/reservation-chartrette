import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeValidDates, findYearlyConflicts } from '@/lib/yearlyReservations';

/**
 * Vérifie, avant toute création, si une réservation à l'année entre en conflit
 * avec des créneaux déjà réservés dans la salle. Utilisé par le récapitulatif de
 * la modale pour prévenir le demandeur au lieu de le laisser aller jusqu'à la
 * signature de la convention.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const {
      roomId,
      startDate,
      endDate,
      timeSlots,
      excludeSchoolHolidays,
      excludedDates,
    } = await req.json();

    if (!roomId || !startDate || !endDate || !timeSlots || timeSlots.length === 0) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    const validDates = computeValidDates({
      startDate,
      endDate,
      timeSlots,
      excludeSchoolHolidays,
      excludedDates,
    });

    const conflicts = await findYearlyConflicts({
      roomId,
      dates: validDates,
      timeSlots,
      includeAssociationName: session.user?.role === 'admin',
    });

    return NextResponse.json({
      totalDates: validDates.length,
      conflicts,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des conflits annuels:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des conflits' },
      { status: 500 }
    );
  }
}
