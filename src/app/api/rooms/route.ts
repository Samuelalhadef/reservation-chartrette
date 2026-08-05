import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let results;

    if (activeOnly) {
      results = await db
        .select()
        .from(rooms)
        .where(eq(rooms.isActive, true))
        .orderBy(rooms.name);
    } else {
      results = await db
        .select()
        .from(rooms)
        .orderBy(rooms.name);
    }

    return NextResponse.json({ rooms: results }, { status: 200 });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const data = await req.json();

    if (!data.buildingId || !data.name || !data.capacity) {
      return NextResponse.json(
        { error: "L'établissement, le nom et la capacité sont obligatoires" },
        { status: 400 }
      );
    }

    // On ne conserve que les champs attendus ; les colonnes JSON
    // (equipment, images, tarifs, créneaux…) prennent leurs valeurs par défaut.
    const [room] = await db
      .insert(rooms)
      .values({
        buildingId: String(data.buildingId),
        name: String(data.name).trim(),
        description: data.description?.trim() || null,
        capacity: Number(data.capacity),
        surface: data.surface != null && data.surface !== '' ? Number(data.surface) : null,
        rules: data.rules?.trim() || null,
        isPaid: !!data.isPaid,
        deposit: data.deposit != null && data.deposit !== '' ? Number(data.deposit) : 0,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Room created successfully',
        room,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
