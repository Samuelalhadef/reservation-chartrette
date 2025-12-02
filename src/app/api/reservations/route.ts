import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, rooms, users, associations } from '@/lib/db/schema';
import { eq, and, gte, lt, inArray, sql } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';
import { formatDate, formatTimeSlot } from '@/lib/utils';
import { calculateReservationPrice } from '@/lib/pricing';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userIdParam = searchParams.get('userId');
    const roomIdParam = searchParams.get('roomId');
    const statusParam = searchParams.get('status');
    const dateParam = searchParams.get('date');

    const conditions = [];

    // Non-admin users can only see their own reservations
    if (session.user?.role !== 'admin') {
      conditions.push(eq(reservations.userId, session.user.id));
    } else if (userIdParam) {
      conditions.push(eq(reservations.userId, userIdParam));
    }

    if (roomIdParam) {
      conditions.push(eq(reservations.roomId, roomIdParam));
    }

    if (statusParam) {
      conditions.push(eq(reservations.status, statusParam as any));
    } else {
      // Par défaut, exclure les réservations annulées
      conditions.push(inArray(reservations.status, ['pending', 'approved', 'rejected']));
    }

    if (dateParam) {
      const startDate = new Date(dateParam);
      const endDate = new Date(dateParam);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(gte(reservations.date, startDate));
      conditions.push(lt(reservations.date, endDate));
    }

    const results = await db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        roomId: reservations.roomId,
        associationId: reservations.associationId,
        date: reservations.date,
        timeSlots: reservations.timeSlots,
        reason: reservations.reason,
        estimatedParticipants: reservations.estimatedParticipants,
        requiredEquipment: reservations.requiredEquipment,
        status: reservations.status,
        adminComment: reservations.adminComment,
        reviewedBy: reservations.reviewedBy,
        reviewedAt: reservations.reviewedAt,
        cancelledAt: reservations.cancelledAt,
        cancelReason: reservations.cancelReason,
        totalPrice: reservations.totalPrice,
        depositAmount: reservations.depositAmount,
        durationType: reservations.durationType,
        paymentStatus: reservations.paymentStatus,
        paymentMethod: reservations.paymentMethod,
        paymentReference: reservations.paymentReference,
        paymentValidatedBy: reservations.paymentValidatedBy,
        paymentValidatedAt: reservations.paymentValidatedAt,
        paymentNotes: reservations.paymentNotes,
        createdAt: reservations.createdAt,
        updatedAt: reservations.updatedAt,
        userName: users.name,
        userEmail: users.email,
        roomName: rooms.name,
        associationName: associations.name,
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .leftJoin(associations, eq(reservations.associationId, associations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(reservations.date, reservations.createdAt);

    // Transform the results to match frontend expectations
    const transformedResults = results.map(result => ({
      id: result.id,
      userId: {
        id: result.userId,
        name: result.userName || '',
        email: result.userEmail || '',
      },
      roomId: {
        id: result.roomId,
        name: result.roomName || '',
      },
      associationId: {
        id: result.associationId,
        name: result.associationName || '',
      },
      date: result.date,
      timeSlots: result.timeSlots,
      reason: result.reason,
      estimatedParticipants: result.estimatedParticipants,
      requiredEquipment: result.requiredEquipment,
      status: result.status,
      adminComment: result.adminComment,
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAt,
      cancelledAt: result.cancelledAt,
      cancelReason: result.cancelReason,
      totalPrice: result.totalPrice,
      depositAmount: result.depositAmount,
      durationType: result.durationType,
      paymentStatus: result.paymentStatus,
      paymentMethod: result.paymentMethod,
      paymentReference: result.paymentReference,
      paymentValidatedBy: result.paymentValidatedBy,
      paymentValidatedAt: result.paymentValidatedAt,
      paymentNotes: result.paymentNotes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));

    return NextResponse.json({ reservations: transformedResults }, { status: 200 });
  } catch (error: any) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.roomId || !data.date || !data.timeSlots || !data.reason || !data.estimatedParticipants) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reservation date (règle des 30 jours pour tous les utilisateurs)
    const reservationDate = new Date(data.date);
    reservationDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is in the past or today
    if (reservationDate < today) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas réserver une salle pour une date passée' },
        { status: 400 }
      );
    }

    // Apply 30-day rule for all users
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 30);

    if (reservationDate < minDate) {
      return NextResponse.json(
        { error: 'Vous devez réserver au minimum 30 jours à l\'avance pour permettre la validation par les administrateurs' },
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

    // For admin users, use the "Mairie de Chartrettes" association
    // For particuliers, create or use a special "Particuliers" association
    let associationId = user.associationId;

    if (session.user?.role === 'admin') {
      // Find the "Mairie de Chartrettes" association
      const [mairieAssoc] = await db
        .select()
        .from(associations)
        .where(sql`lower(${associations.name}) = lower('Mairie de Chartrettes')`)
        .limit(1);

      if (!mairieAssoc) {
        return NextResponse.json(
          { error: 'L\'association "Mairie de Chartrettes" n\'existe pas. Veuillez contacter l\'administrateur système.' },
          { status: 400 }
        );
      }

      associationId = mairieAssoc.id;
    } else if (session.user?.role === 'particulier') {
      // Find or create "Particuliers" association for individual users
      let [particuliersAssoc] = await db
        .select()
        .from(associations)
        .where(sql`lower(${associations.name}) = lower('Particuliers')`)
        .limit(1);

      if (!particuliersAssoc) {
        // Create the "Particuliers" association if it doesn't exist
        [particuliersAssoc] = await db
          .insert(associations)
          .values({
            name: 'Particuliers',
            description: 'Association virtuelle pour les réservations des particuliers',
            status: 'active',
            contactName: 'Mairie de Chartrettes',
            contactEmail: 'contact@chartrettes.fr',
          })
          .returning();
      }

      associationId = particuliersAssoc.id;
    } else if (!user.associationId) {
      return NextResponse.json(
        { error: 'User must be associated with an association' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const startOfDay = new Date(reservationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reservationDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflicts = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.roomId, data.roomId),
          gte(reservations.date, startOfDay),
          lt(reservations.date, endOfDay),
          inArray(reservations.status, ['pending', 'approved'])
        )
      );

    // Check if any time slots overlap
    for (const conflict of conflicts) {
      for (const existingSlot of conflict.timeSlots as any) {
        for (const newSlot of data.timeSlots) {
          const existingStart = parseInt(existingSlot.start.split(':')[0]);
          const existingEnd = parseInt(existingSlot.end.split(':')[0]);
          const newStart = parseInt(newSlot.start.split(':')[0]);
          const newEnd = parseInt(newSlot.end.split(':')[0]);

          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            return NextResponse.json(
              { error: 'Time slot conflict with existing reservation' },
              { status: 409 }
            );
          }
        }
      }
    }

    // Ensure associationId is defined
    if (!associationId) {
      return NextResponse.json(
        { error: 'Association ID is required' },
        { status: 400 }
      );
    }

    // Calculate pricing
    const pricingResult = calculateReservationPrice(room, user, data.timeSlots);

    // Create reservation
    // Admin reservations are automatically approved
    const reservationStatus = session.user?.role === 'admin' ? 'approved' : 'pending';

    const [reservation] = await db
      .insert(reservations)
      .values({
        userId: session.user.id,
        roomId: data.roomId,
        associationId: associationId,
        date: new Date(data.date),
        timeSlots: data.timeSlots,
        reason: data.reason,
        estimatedParticipants: data.estimatedParticipants,
        requiredEquipment: data.requiredEquipment || [],
        status: reservationStatus,
        // Pricing fields
        totalPrice: pricingResult.totalPrice,
        depositAmount: pricingResult.depositAmount,
        durationType: pricingResult.durationType,
        paymentStatus: 'pending',
        // For admin, set review info immediately
        ...(session.user?.role === 'admin' && {
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        }),
      })
      .returning();

    // Send confirmation email
    const timeSlotStr = data.timeSlots.map((slot: any) => formatTimeSlot(slot.start, slot.end)).join(', ');
    await sendEmail({
      to: user.email,
      subject: 'Demande de réservation reçue',
      html: emailTemplates.reservationSubmitted(user.name, room.name, formatDate(data.date)),
    });

    return NextResponse.json(
      {
        message: 'Reservation created successfully',
        reservation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create reservation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
