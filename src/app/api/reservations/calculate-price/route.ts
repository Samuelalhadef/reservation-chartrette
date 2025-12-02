import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { rooms, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { calculateReservationPrice } from '@/lib/pricing';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.roomId || !data.timeSlots) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user and room info
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId)).limit(1);

    if (!user || !room) {
      return NextResponse.json(
        { error: 'User or room not found' },
        { status: 404 }
      );
    }

    // Calculate pricing
    const pricingResult = calculateReservationPrice(room, user, data.timeSlots);

    return NextResponse.json({
      pricing: pricingResult,
      room: {
        name: room.name,
        isPaid: room.isPaid,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Calculate price error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
