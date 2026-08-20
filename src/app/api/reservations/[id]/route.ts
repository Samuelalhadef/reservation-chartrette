import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { decideSingleReservation } from '@/lib/reservationDecision';

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

    const outcome = await decideSingleReservation({
      id,
      status,
      adminComment,
      adminId: session.user.id,
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });
    }

    return NextResponse.json(
      {
        message:
          status === 'rejected'
            ? 'Reservation rejected and removed successfully'
            : 'Reservation approved successfully',
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
