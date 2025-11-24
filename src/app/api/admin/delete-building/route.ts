import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildings, rooms, reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { buildingId, buildingName } = await req.json();

    if (!buildingId && !buildingName) {
      return NextResponse.json(
        { error: 'Building ID or name is required' },
        { status: 400 }
      );
    }

    let targetBuilding;

    // Trouver le bâtiment par ID ou nom
    if (buildingId) {
      const result = await db
        .select()
        .from(buildings)
        .where(eq(buildings.id, buildingId))
        .limit(1);
      targetBuilding = result[0];
    } else {
      const result = await db
        .select()
        .from(buildings)
        .where(eq(buildings.name, buildingName))
        .limit(1);
      targetBuilding = result[0];
    }

    if (!targetBuilding) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      );
    }

    // Obtenir toutes les salles du bâtiment
    const buildingRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.buildingId, targetBuilding.id));

    // Compter les réservations associées
    let totalReservations = 0;
    for (const room of buildingRooms) {
      const roomReservations = await db
        .select()
        .from(reservations)
        .where(eq(reservations.roomId, room.id));
      totalReservations += roomReservations.length;
    }

    // Supprimer les réservations des salles
    for (const room of buildingRooms) {
      await db.delete(reservations).where(eq(reservations.roomId, room.id));
    }

    // Supprimer les salles
    await db.delete(rooms).where(eq(rooms.buildingId, targetBuilding.id));

    // Supprimer le bâtiment
    await db.delete(buildings).where(eq(buildings.id, targetBuilding.id));

    return NextResponse.json(
      {
        message: 'Building deleted successfully',
        summary: {
          buildingName: targetBuilding.name,
          roomsDeleted: buildingRooms.length,
          reservationsDeleted: totalReservations,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete building error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
