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

    if (!data.name || !data.capacity) {
      return NextResponse.json(
        { error: 'Name and capacity are required' },
        { status: 400 }
      );
    }

    const [room] = await db
      .insert(rooms)
      .values(data)
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
