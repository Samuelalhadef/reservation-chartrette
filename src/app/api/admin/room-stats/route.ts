import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, rooms, associations } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // Calculer les dates de début et fin de l'année
    const startDate = new Date(`${year}-01-01T00:00:00`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    if (roomId) {
      // Détail pour une salle spécifique : heures par association
      const roomReservations = await db
        .select({
          id: reservations.id,
          timeSlots: reservations.timeSlots,
          status: reservations.status,
          associationId: associations.id,
          associationName: associations.name,
        })
        .from(reservations)
        .leftJoin(associations, eq(reservations.associationId, associations.id))
        .where(
          and(
            eq(reservations.roomId, roomId),
            gte(reservations.date, startDate),
            lte(reservations.date, endDate),
            inArray(reservations.status, ['approved', 'pending'])
          )
        );

      // Calculer les heures par association
      const associationStats: { [key: string]: { name: string; hours: number; reservations: number } } = {};

      for (const reservation of roomReservations) {
        const timeSlots = reservation.timeSlots as any[] || [];
        let hours = 0;

        // Calculer le nombre d'heures pour cette réservation
        for (const slot of timeSlots) {
          const startHour = parseInt(slot.start.split(':')[0]);
          const endHour = parseInt(slot.end.split(':')[0]);
          hours += endHour - startHour;
        }

        const assocId = reservation.associationId || 'unknown';
        const assocName = reservation.associationName || 'Sans association';

        if (!associationStats[assocId]) {
          associationStats[assocId] = { name: assocName, hours: 0, reservations: 0 };
        }

        associationStats[assocId].hours += hours;
        associationStats[assocId].reservations += 1;
      }

      // Convertir en tableau et trier par heures
      const associationList = Object.entries(associationStats)
        .map(([id, data]) => ({
          associationId: id,
          associationName: data.name,
          hours: data.hours,
          reservations: data.reservations,
        }))
        .sort((a, b) => b.hours - a.hours);

      return NextResponse.json(
        {
          year: parseInt(year),
          roomId,
          associations: associationList,
          totalHours: associationList.reduce((sum, a) => sum + a.hours, 0),
        },
        { status: 200 }
      );
    } else {
      // Statistiques globales : toutes les salles avec heures totales
      // 1. Récupérer toutes les salles actives
      const allRooms = await db
        .select({
          id: rooms.id,
          name: rooms.name,
        })
        .from(rooms)
        .where(eq(rooms.isActive, true));

      // 2. Récupérer toutes les réservations de l'année
      const allReservations = await db
        .select({
          roomId: reservations.roomId,
          timeSlots: reservations.timeSlots,
        })
        .from(reservations)
        .where(
          and(
            gte(reservations.date, startDate),
            lte(reservations.date, endDate),
            inArray(reservations.status, ['approved', 'pending'])
          )
        );

      // 3. Calculer les heures par salle
      const roomStats: { [key: string]: { name: string; hours: number; reservations: number } } = {};

      // Initialiser toutes les salles
      for (const room of allRooms) {
        roomStats[room.id] = { name: room.name, hours: 0, reservations: 0 };
      }

      // Calculer les heures
      for (const reservation of allReservations) {
        if (roomStats[reservation.roomId]) {
          const timeSlots = reservation.timeSlots as any[] || [];
          let hours = 0;

          for (const slot of timeSlots) {
            const startHour = parseInt(slot.start.split(':')[0]);
            const endHour = parseInt(slot.end.split(':')[0]);
            hours += endHour - startHour;
          }

          roomStats[reservation.roomId].hours += hours;
          roomStats[reservation.roomId].reservations += 1;
        }
      }

      // Convertir en tableau et trier par heures
      const roomList = Object.entries(roomStats)
        .map(([id, data]) => ({
          roomId: id,
          roomName: data.name,
          hours: data.hours,
          reservations: data.reservations,
        }))
        .sort((a, b) => b.hours - a.hours);

      return NextResponse.json(
        {
          year: parseInt(year),
          rooms: roomList,
          totalHours: roomList.reduce((sum, r) => sum + r.hours, 0),
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Get room stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
