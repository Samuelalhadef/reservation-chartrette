import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, users, rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';
import { formatDate, formatTimeSlot } from '@/lib/utils';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, adminComment } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !adminComment) {
      return NextResponse.json(
        { error: 'Admin comment is required for rejection' },
        { status: 400 }
      );
    }

    // Get reservation with joined user and room data
    const reservationData = await db
      .select({
        reservation: reservations,
        user: {
          name: users.name,
          email: users.email,
        },
        room: {
          name: rooms.name,
        },
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, id))
      .limit(1);

    if (!reservationData.length || !reservationData[0]) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const { reservation, user, room } = reservationData[0];

    if (!user || !room) {
      return NextResponse.json(
        { error: 'User or room not found' },
        { status: 404 }
      );
    }

    if (reservation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Reservation has already been processed' },
        { status: 400 }
      );
    }

    // Update the reservation
    const [updatedReservation] = await db
      .update(reservations)
      .set({
        status: status as any,
        adminComment,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    // Send email notification
    const timeSlots = (reservation.timeSlots as any)
      .map((slot: any) => formatTimeSlot(slot.start, slot.end))
      .join(', ');

    if (status === 'approved') {
      await sendEmail({
        to: user.email,
        subject: 'Réservation approuvée',
        html: emailTemplates.reservationApproved(
          user.name,
          room.name,
          formatDate(reservation.date),
          timeSlots,
          adminComment
        ),
      });
    } else {
      await sendEmail({
        to: user.email,
        subject: 'Réservation refusée',
        html: emailTemplates.reservationRejected(
          user.name,
          room.name,
          formatDate(reservation.date),
          adminComment
        ),
      });
    }

    return NextResponse.json(
      {
        message: `Reservation ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
        reservation: updatedReservation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update reservation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Only the owner or admin can cancel
    if (
      reservation.userId !== session.user?.id &&
      session.user?.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (reservation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Reservation is already cancelled' },
        { status: 400 }
      );
    }

    const [updatedReservation] = await db
      .update(reservations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    return NextResponse.json(
      {
        message: 'Reservation cancelled successfully',
        reservation: updatedReservation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
