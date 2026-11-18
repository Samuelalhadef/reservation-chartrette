import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, rooms, associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getUserAssociationIds } from '@/lib/userAssociations';
import { sendEmail, emailTemplates, MAIRIE_EMAIL } from '@/lib/email';
import { parseISO, isValid } from 'date-fns';
import { formatWeeklySlotHours, normalizeWeeklySlots } from '@/lib/utils';
import {
  WEEK_DAYS,
  computeValidDates,
  conflictErrorMessage,
  findYearlyConflicts,
  formatFrDate,
  getSlotsForDate,
} from '@/lib/yearlyReservations';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const {
      roomId,
      startDate,
      endDate,
      timeSlots: rawTimeSlots,
      reason,
      estimatedParticipants,
      excludeSchoolHolidays,
      excludedDates,
      associationId: customAssociationId,
      // Le demandeur a vu l'alerte de conflit et demande l'arbitrage de la mairie.
      acceptConflicts,
    } = body;

    // Validation
    if (!roomId || !startDate || !endDate || !rawTimeSlots || rawTimeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const timeSlots = normalizeWeeklySlots(rawTimeSlots);
    if (!timeSlots) {
      return NextResponse.json({ error: 'Créneaux horaires invalides' }, { status: 400 });
    }

    if (!isValid(parseISO(startDate)) || !isValid(parseISO(endDate)) || parseISO(startDate) > parseISO(endDate)) {
      return NextResponse.json({ error: 'Période invalide' }, { status: 400 });
    }

    // Pas de date passée, et au plus ~13 mois (une saison + marge) pour ne pas
    // générer des milliers de lignes sur une borne de fin aberrante.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parseISO(startDate) < today) {
      return NextResponse.json(
        { error: 'La période ne peut pas commencer dans le passé' },
        { status: 400 }
      );
    }
    const maxEnd = parseISO(startDate);
    maxEnd.setMonth(maxEnd.getMonth() + 13);
    if (parseISO(endDate) > maxEnd) {
      return NextResponse.json(
        { error: 'La période ne peut pas dépasser un an' },
        { status: 400 }
      );
    }

    const participants = Number(estimatedParticipants);
    if (!reason || typeof reason !== 'string' || !Number.isInteger(participants) || participants < 1) {
      return NextResponse.json(
        { error: 'Le motif et le nombre de participants sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que la salle existe
    const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    if (room.length === 0) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }

    // Salle désactivée : plus réservable, sauf par un administrateur.
    if (session.user?.role !== 'admin' && !room[0].isActive) {
      return NextResponse.json(
        { error: "Cette salle n'est pas ouverte à la réservation" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Déterminer l'association à utiliser
    let targetAssociationId = user.associationId;

    // Si c'est un admin et qu'une association personnalisée est fournie, l'utiliser
    if (session.user?.role === 'admin' && customAssociationId) {
      targetAssociationId = customAssociationId;
    } else if (session.user?.role !== 'admin' && customAssociationId) {
      // Membre rattaché à plusieurs associations : l'association choisie doit lui appartenir
      const userAssocIds = await getUserAssociationIds(user.id, user.associationId);
      if (!userAssocIds.includes(customAssociationId)) {
        return NextResponse.json(
          { error: "Vous n'êtes pas rattaché à cette association" },
          { status: 403 }
        );
      }
      targetAssociationId = customAssociationId;
    }

    // Si pas d'associationId déterminé, erreur
    if (!targetAssociationId) {
      return NextResponse.json(
        { error: 'Vous devez être associé à une association' },
        { status: 400 }
      );
    }

    // Récupérer l'association
    const [association] = await db
      .select()
      .from(associations)
      .where(eq(associations.id, targetAssociationId))
      .limit(1);

    if (!association) {
      return NextResponse.json(
        { error: 'Association non trouvée' },
        { status: 404 }
      );
    }

    // Convention annuelle obligatoire pour un membre (la modale la fait signer
    // avant l'envoi ; un appel direct à l'API ne doit pas la contourner).
    if (session.user?.role !== 'admin' && !association.yearlyConventionSignedAt) {
      return NextResponse.json(
        { error: "La convention annuelle de l'association doit être signée avant de réserver" },
        { status: 400 }
      );
    }

    // Générer toutes les dates entre startDate et endDate, filtrées selon les critères
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const validDates = computeValidDates({
      startDate,
      endDate,
      timeSlots,
      excludeSchoolHolidays,
      excludedDates,
    });

    // Par défaut, aucune réservation n'est créée si une seule date entre en
    // conflit : le demandeur doit exclure la date, contacter la mairie, ou
    // renvoyer sa demande explicitement pour arbitrage (acceptConflicts).
    const conflicts = await findYearlyConflicts({
      roomId,
      dates: validDates,
      timeSlots,
      includeAssociationName: session.user?.role === 'admin',
    });

    if (conflicts.length > 0 && !acceptConflicts) {
      return NextResponse.json(
        {
          error: conflictErrorMessage(conflicts),
          conflicts,
        },
        { status: 409 }
      );
    }

    // Une demande qui empiète sur un créneau déjà pris reste toujours à
    // valider, même pour un admin : c'est l'arbitrage qui tranchera.
    const hasConflicts = conflicts.length > 0;

    // Créer les réservations
    const createdReservations = [];
    // Récapitulatif date + horaires de chaque réservation créée (pour l'email unique).
    const createdSlots: { date: Date; hoursLabel: string }[] = [];

    for (const date of validDates) {
      // Créneaux de ce jour, éclatés heure par heure + libellé lisible
      const { hourSlots: formattedTimeSlots, hoursLabel } = getSlotsForDate(timeSlots, date);

      if (formattedTimeSlots.length === 0) continue;

      try {
        // Admin reservations are automatically approved, sauf demande en conflit
        const reservationStatus =
          session.user?.role === 'admin' && !hasConflicts ? 'approved' : 'pending';

        // Créer la réservation pour cette date
        const [reservation] = await db
          .insert(reservations)
          .values({
            userId: session.user.id,
            roomId: roomId,
            associationId: association.id,
            date: date,
            timeSlots: formattedTimeSlots,
            reason: reason,
            estimatedParticipants: participants,
            requiredEquipment: [],
            status: reservationStatus,
            // For admin, set review info immediately
            ...(session.user?.role === 'admin' && !hasConflicts && {
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
            }),
          })
          .returning();

        createdReservations.push(reservation);
        createdSlots.push({ date, hoursLabel });
      } catch (error) {
        console.error(`Erreur lors de la création de la réservation pour ${date}:`, error);
        // Continuer avec les autres dates même si une échoue
      }
    }

    // Un seul email récapitulatif listant tous les horaires réservés.
    if (createdReservations.length > 0 && user.email) {
      const isApproved = session.user?.role === 'admin' && !hasConflicts;

      // Période (bornes demandées), au format français.
      const periodLabel = `du ${formatFrDate(start)} au ${formatFrDate(end)}`;

      // Créneaux hebdomadaires récurrents, triés par jour puis par heure.
      const weeklySummaryHtml = [...timeSlots]
        .sort((a, b) => a.day - b.day || a.startHour - b.startHour)
        .map(
          (slot) =>
            `<li><strong>${WEEK_DAYS[slot.day] ?? 'Jour ' + slot.day}</strong> : ${formatWeeklySlotHours(slot)}</li>`
        )
        .join('');

      // Détail de chaque date réservée avec ses horaires (déjà triées chronologiquement).
      const datesListHtml = createdSlots
        .map(
          ({ date, hoursLabel }) =>
            `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; text-transform: capitalize;">${formatFrDate(date)}</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${hoursLabel}</td></tr>`
        )
        .join('');

      // Dates disputées : elles apparaissent en tête de l'email et signalent à
      // la mairie qu'un arbitrage est attendu.
      const conflictsListHtml = hasConflicts
        ? conflicts
            .map(
              conflict =>
                `<li><span style="text-transform: capitalize;">${conflict.dateLabel}</span> — ${conflict.conflictingHours} déjà réservé (demande : ${conflict.requestedHours})</li>`
            )
            .join('')
        : undefined;

      const html = emailTemplates.yearlyReservationSubmitted(
        user.name,
        room[0].name,
        association.name,
        periodLabel,
        createdReservations.length,
        weeklySummaryHtml,
        datesListHtml,
        isApproved,
        conflictsListHtml
      );
      const subject = hasConflicts
        ? 'Demande de réservation à l\'année reçue — arbitrage requis'
        : 'Demande de réservation à l\'année reçue';

      // 1) Copie au demandeur
      await sendEmail({ to: user.email, subject, html });

      // 2) Copie à la mairie (mêmes infos), pour validation/suivi.
      await sendEmail({
        to: MAIRIE_EMAIL,
        subject: `[Admin] ${subject} — ${association.name}`,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      count: createdReservations.length,
      message: hasConflicts
        ? `${createdReservations.length} réservations enregistrées — ${conflicts.length} date(s) en conflit soumises à l'arbitrage de la mairie`
        : `${createdReservations.length} réservations créées avec succès`,
      conflicts: hasConflicts ? conflicts : undefined,
      reservations: createdReservations,
    });
  } catch (error) {
    console.error('Erreur lors de la création des réservations annuelles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création des réservations' },
      { status: 500 }
    );
  }
}
