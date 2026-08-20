import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, users, associations } from '@/lib/db/schema';
import { and, eq, gte, lte, ne } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

/**
 * Réservations d'une salle sur une période, telles qu'affichées par le
 * calendrier (mêmes informations que la page serveur, pour tout utilisateur
 * connecté).
 *
 * Existe pour deux raisons :
 * - /api/reservations ne renvoie à un non-admin que ses propres réservations :
 *   le rafraîchissement après une demande faisait disparaître celles des autres ;
 * - la page ne précharge qu'une fenêtre de dates, le calendrier complète à la
 *   demande quand l'utilisateur navigue au-delà.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: roomId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions = [
      eq(reservations.roomId, roomId),
      // Les calendriers n'affichent jamais les réservations annulées.
      ne(reservations.status, 'cancelled'),
    ];

    if (from) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(reservations.date, start));
    }

    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(reservations.date, end));
    }

    const rows = await db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        roomId: reservations.roomId,
        date: reservations.date,
        timeSlots: reservations.timeSlots,
        status: reservations.status,
        reason: reservations.reason,
        createdAt: reservations.createdAt,
        userName: users.name,
        associationName: associations.name,
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id))
      .where(and(...conditions))
      .orderBy(reservations.date);

    return NextResponse.json({
      reservations: rows.map(row => ({
        id: row.id,
        userId: row.userId,
        roomId: row.roomId,
        date: row.date,
        timeSlots: row.timeSlots,
        status: row.status,
        reason: row.reason,
        createdAt: row.createdAt,
        user: { name: row.userName ?? '' },
        association: { name: row.associationName ?? '' },
      })),
    });
  } catch (error) {
    console.error('Erreur lors du chargement des réservations de la salle:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des réservations' },
      { status: 500 }
    );
  }
}
