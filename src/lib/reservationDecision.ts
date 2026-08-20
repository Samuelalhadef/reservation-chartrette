import { db } from '@/lib/db';
import { reservations, users, rooms, associations } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendEmail, emailTemplates } from '@/lib/email';
import { formatDate, formatTimeSlot } from '@/lib/utils';
import { getConventionSettings } from '@/lib/conventionSettings';
import { getMairieSignatureDataUrl } from '@/lib/mairieSignature';
import { generateReservationConventionPDF } from '@/lib/generateReservationConventionPDF';
import { formatFrDate, formatHourRanges, type HourSlot } from '@/lib/reservationConflicts';

/**
 * Application d'une décision d'administrateur sur une ou plusieurs
 * réservations. Un refus SUPPRIME la demande (après email), pour qu'aucun bloc
 * « Refusée » ne reste affiché chez l'occupant.
 *
 * Le point important pour les séries : une réservation à l'année compte une
 * ligne par date, mais l'occupant ne doit recevoir qu'UN email récapitulatif —
 * pas cinquante.
 */

export type DecisionStatus = 'approved' | 'rejected';

export interface DecisionOutcome {
  ok: boolean;
  /** Nombre de lignes réellement traitées. */
  processed: number;
  error?: string;
  /** Code d'erreur exploitable par l'appelant HTTP. */
  status?: number;
}

/**
 * Décision sur UNE réservation : email individuel, avec la convention signée
 * par les deux parties en pièce jointe lorsque l'occupant a signé.
 */
export async function decideSingleReservation({
  id,
  status,
  adminComment,
  adminId,
}: {
  id: string;
  status: DecisionStatus;
  adminComment?: string;
  adminId: string;
}): Promise<DecisionOutcome> {
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
      room: { name: rooms.name },
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
    return { ok: false, processed: 0, error: 'Reservation not found', status: 404 };
  }

  const { reservation, user, room, association } = reservationData[0];

  if (!user || !room) {
    return { ok: false, processed: 0, error: 'User or room not found', status: 404 };
  }

  if (reservation.status !== 'pending') {
    return {
      ok: false,
      processed: 0,
      error: 'Reservation has already been processed',
      status: 400,
    };
  }

  const timeSlots = (reservation.timeSlots as any)
    .map((slot: any) => formatTimeSlot(slot.start, slot.end))
    .join(', ');

  // Cas du refus : on prévient l'occupant par email puis on SUPPRIME
  // simplement la demande, afin qu'aucun bloc « Refusée » ne reste affiché
  // dans ses réservations.
  if (status === 'rejected') {
    await sendEmail({
      to: user.email,
      subject: 'Réservation refusée',
      html: emailTemplates.reservationRejected(
        user.name,
        room.name,
        formatDate(reservation.date),
        adminComment || ''
      ),
    });

    await db.delete(reservations).where(eq(reservations.id, id));

    return { ok: true, processed: 1 };
  }

  // Approbation : on met à jour la réservation.
  await db
    .update(reservations)
    .set({
      status: 'approved',
      adminComment,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id));

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

      const isAssoc = !!user.associationId && !!association?.name;
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

  return { ok: true, processed: 1 };
}

/**
 * Décision sur un lot de lignes appartenant à une même demande (réservation à
 * l'année). Les lignes déjà traitées sont ignorées silencieusement, et un seul
 * email récapitulatif est envoyé à l'occupant.
 */
export async function decideReservationGroup({
  ids,
  status,
  adminComment,
  adminId,
}: {
  ids: string[];
  status: DecisionStatus;
  adminComment?: string;
  adminId: string;
}): Promise<DecisionOutcome> {
  if (ids.length === 0) return { ok: true, processed: 0 };

  const rows = await db
    .select({
      id: reservations.id,
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      status: reservations.status,
      userName: users.name,
      userEmail: users.email,
      roomName: rooms.name,
      associationName: associations.name,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .leftJoin(rooms, eq(reservations.roomId, rooms.id))
    .leftJoin(associations, eq(reservations.associationId, associations.id))
    .where(inArray(reservations.id, ids))
    .orderBy(reservations.date);

  const pending = rows.filter(r => r.status === 'pending');

  if (pending.length === 0) {
    return { ok: true, processed: 0 };
  }

  // Une seule date : on garde le parcours individuel (convention PDF incluse).
  if (pending.length === 1) {
    return decideSingleReservation({ id: pending[0].id, status, adminComment, adminId });
  }

  const pendingIds = pending.map(r => r.id);
  const first = pending[0];
  const last = pending[pending.length - 1];

  if (status === 'approved') {
    await db
      .update(reservations)
      .set({
        status: 'approved',
        adminComment,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(reservations.id, pendingIds));
  } else {
    await db.delete(reservations).where(inArray(reservations.id, pendingIds));
  }

  if (first.userEmail) {
    const datesListHtml = pending
      .map(
        row =>
          `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; text-transform: capitalize;">${formatFrDate(
            row.date
          )}</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${formatHourRanges(
            (row.timeSlots as HourSlot[]) ?? []
          )}</td></tr>`
      )
      .join('');

    const periodLabel = `du ${formatFrDate(first.date)} au ${formatFrDate(last.date)}`;

    await sendEmail({
      to: first.userEmail,
      subject:
        status === 'approved'
          ? 'Réservations approuvées'
          : 'Demande de réservation refusée',
      html: emailTemplates.seriesDecision(
        first.userName ?? '',
        first.roomName ?? '',
        first.associationName ?? '',
        periodLabel,
        pending.length,
        datesListHtml,
        status,
        adminComment
      ),
    });
  }

  return { ok: true, processed: pending.length };
}
