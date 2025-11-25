import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users, reservations, rooms } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's association
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.associationId) {
      return NextResponse.json(
        { error: 'User must be associated with an association' },
        { status: 400 }
      );
    }

    // Get association details
    const [association] = await db
      .select()
      .from(associations)
      .where(eq(associations.id, user.associationId))
      .limit(1);

    if (!association || !association.conventionSignedAt) {
      return NextResponse.json(
        { error: 'Convention not found or not signed' },
        { status: 404 }
      );
    }

    // Get approved reservations for this association
    const approvedReservations = await db
      .select({
        id: reservations.id,
        date: reservations.date,
        timeSlots: reservations.timeSlots,
        reason: reservations.reason,
        roomName: rooms.name,
      })
      .from(reservations)
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(
        and(
          eq(reservations.associationId, user.associationId),
          eq(reservations.status, 'approved')
        )
      );

    // Return data for PDF generation on client side
    return NextResponse.json(
      {
        association: {
          id: association.id,
          name: association.name,
          contactName: association.contactName,
          contactEmail: association.contactEmail,
          contactPhone: association.contactPhone,
          description: association.description,
          address: association.address,
          socialPurpose: association.socialPurpose,
          presidentAddress: association.presidentAddress,
          conventionSignedAt: association.conventionSignedAt,
          conventionSignature: association.conventionSignature,
        },
        reservations: approvedReservations,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get convention PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
