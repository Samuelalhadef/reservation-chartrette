import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, users, rooms, associations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';
import { formatDate, formatTimeSlot } from '@/lib/utils';
import { getConventionSettings } from '@/lib/conventionSettings';
import { getMairieSignatureDataUrl } from '@/lib/mairieSignature';
import { generateReservationConventionPDF } from '@/lib/generateReservationConventionPDF';

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

    // Get reservation with joined user, room and association data
    const reservationData = await db
      .select({
        reservation: reservations,
        user: {
          name: users.name,
          email: users.email,
          role: users.role,
          address: users.address,
          associationId: users.associationId,
        },
        room: {
          name: rooms.name,
        },
        association: {
          name: associations.name,
          address: associations.address,
          contactName: associations.contactName,
        },
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id))
      .where(eq(reservations.id, id))
      .limit(1);

    if (!reservationData.length || !reservationData[0]) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const { reservation, user, room, association } = reservationData[0];

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
      // Génère le PDF de convention signé par les deux parties (occupant + maire)
      // et le joint à l'email — uniquement si l'occupant a bien signé.
      let attachments;
      try {
        if (
          reservation.conventionSignature &&
          reservation.conventionSignature.startsWith('data:image/')
        ) {
          const [settings, mairieSignature] = await Promise.all([
            getConventionSettings(),
            getMairieSignatureDataUrl(),
          ]);

          const isAssoc =
            !!user.associationId &&
            !!association?.name;
          const signerType: 'association' | 'particulier' | 'mairie' = isAssoc
            ? 'association'
            : user.role === 'admin'
              ? 'mairie'
              : 'particulier';

          const pdf = generateReservationConventionPDF({
            signer: {
              name: user.name,
              email: user.email,
              address: user.address || undefined,
              type: signerType,
            },
            association: isAssoc
              ? {
                  name: association!.name,
                  address: association!.address || undefined,
                  presidentName: association!.contactName || undefined,
                }
              : undefined,
            reservation: {
              roomName: room.name,
              date: reservation.date,
              timeSlots: reservation.timeSlots as any,
              reason: reservation.reason,
              estimatedParticipants: reservation.estimatedParticipants,
            },
            signature: reservation.conventionSignature,
            signedAt: reservation.conventionSignedAt || reservation.date,
            mairieSignature,
            mairieValidatedAt: new Date(),
            settings,
          });

          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          const dateStr = new Date(reservation.date).toISOString().slice(0, 10);
          const safeRoom = room.name.replace(/\s+/g, '_');
          attachments = [
            {
              filename: `convention_${safeRoom}_${dateStr}.pdf`,
              content: pdfBase64,
              encoding: 'base64' as const,
              contentType: 'application/pdf',
            },
          ];
        }
      } catch (pdfError) {
        console.error('Génération PDF convention échouée:', pdfError);
        // On envoie quand même l'email d'approbation, sans pièce jointe.
      }

      await sendEmail({
        to: user.email,
        subject: 'Réservation approuvée',
        html: emailTemplates.reservationApproved(
          user.name,
          room.name,
          formatDate(reservation.date),
          timeSlots,
          adminComment,
          !!attachments
        ),
        attachments,
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
