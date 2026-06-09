import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, rooms, associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getUserAssociationIds } from '@/lib/userAssociations';
import { sendEmail, emailTemplates } from '@/lib/email';
import { eachDayOfInterval, parseISO, getDay, isSameDay } from 'date-fns';

// Jours de la semaine (index 0 = dimanche, comme getDay()).
const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Formate une date en jour calendaire français (heure de Paris), pour rester
// cohérent avec la façon dont les dates sont générées (parseISO = minuit Paris).
function formatFrDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

// Périodes de vacances scolaires françaises (à personnaliser selon la zone)
const SCHOOL_HOLIDAYS_2024_2025 = [
  { start: '2024-10-19', end: '2024-11-03' }, // Toussaint
  { start: '2024-12-21', end: '2025-01-05' }, // Noël
  { start: '2025-02-08', end: '2025-02-23' }, // Hiver
  { start: '2025-04-05', end: '2025-04-21' }, // Printemps
  { start: '2025-07-05', end: '2025-08-31' }, // Été
];

const SCHOOL_HOLIDAYS_2025_2026 = [
  { start: '2025-10-18', end: '2025-11-02' }, // Toussaint
  { start: '2025-12-20', end: '2026-01-04' }, // Noël
  { start: '2026-02-07', end: '2026-02-22' }, // Hiver
  { start: '2026-04-04', end: '2026-04-20' }, // Printemps
  { start: '2026-07-04', end: '2026-08-31' }, // Été
];

function isSchoolHoliday(date: Date): boolean {
  const allHolidays = [...SCHOOL_HOLIDAYS_2024_2025, ...SCHOOL_HOLIDAYS_2025_2026];

  return allHolidays.some(holiday => {
    const start = parseISO(holiday.start);
    const end = parseISO(holiday.end);
    return date >= start && date <= end;
  });
}

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
      timeSlots,
      reason,
      estimatedParticipants,
      excludeSchoolHolidays,
      excludedDates,
      associationId: customAssociationId,
    } = body;

    // Validation
    if (!roomId || !startDate || !endDate || !timeSlots || timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que la salle existe
    const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    if (room.length === 0) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
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

    // Générer toutes les dates entre startDate et endDate
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allDates = eachDayOfInterval({ start, end });

    // Filtrer les dates selon les critères
    const validDates = allDates.filter(date => {
      const dayOfWeek = getDay(date);

      // Vérifier si ce jour de la semaine a des créneaux définis
      const hasSlotsForThisDay = timeSlots.some((slot: any) => slot.day === dayOfWeek);
      if (!hasSlotsForThisDay) return false;

      // Exclure les vacances scolaires si demandé
      if (excludeSchoolHolidays && isSchoolHoliday(date)) return false;

      // Exclure les dates spécifiquement exclues
      if (excludedDates && excludedDates.length > 0) {
        const isExcluded = excludedDates.some((excludedDate: string) =>
          isSameDay(parseISO(excludedDate), date)
        );
        if (isExcluded) return false;
      }

      return true;
    });

    // Créer les réservations
    const createdReservations = [];
    // Récapitulatif date + horaires de chaque réservation créée (pour l'email unique).
    const createdSlots: { date: Date; hoursLabel: string }[] = [];

    for (const date of validDates) {
      const dayOfWeek = getDay(date);

      // Récupérer les créneaux pour ce jour
      const daySlotsData = timeSlots.filter((slot: any) => slot.day === dayOfWeek);

      if (daySlotsData.length === 0) continue;

      // Libellé lisible des plages horaires de ce jour (ex. "10:00 - 12:00, 14:00 - 16:00")
      const hoursLabel = daySlotsData
        .map((slot: any) => `${slot.startHour}:00 - ${slot.endHour + 1}:00`)
        .join(', ');

      // Convertir les créneaux au format attendu
      const formattedTimeSlots = [];
      for (const slot of daySlotsData) {
        for (let hour = slot.startHour; hour <= slot.endHour; hour++) {
          formattedTimeSlots.push({
            start: `${hour}:00`,
            end: `${hour + 1}:00`,
          });
        }
      }

      try {
        // Admin reservations are automatically approved
        const reservationStatus = session.user?.role === 'admin' ? 'approved' : 'pending';

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
            estimatedParticipants: estimatedParticipants,
            requiredEquipment: [],
            status: reservationStatus,
            // For admin, set review info immediately
            ...(session.user?.role === 'admin' && {
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
      const isApproved = session.user?.role === 'admin';

      // Période (bornes demandées), au format français.
      const periodLabel = `du ${formatFrDate(start)} au ${formatFrDate(end)}`;

      // Créneaux hebdomadaires récurrents, triés par jour puis par heure.
      const weeklySummaryHtml = [...timeSlots]
        .sort((a: any, b: any) => a.day - b.day || a.startHour - b.startHour)
        .map(
          (slot: any) =>
            `<li><strong>${WEEK_DAYS[slot.day] ?? 'Jour ' + slot.day}</strong> : ${slot.startHour}:00 - ${slot.endHour + 1}:00</li>`
        )
        .join('');

      // Détail de chaque date réservée avec ses horaires (déjà triées chronologiquement).
      const datesListHtml = createdSlots
        .map(
          ({ date, hoursLabel }) =>
            `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; text-transform: capitalize;">${formatFrDate(date)}</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${hoursLabel}</td></tr>`
        )
        .join('');

      await sendEmail({
        to: user.email,
        subject: 'Demande de réservation à l\'année reçue',
        html: emailTemplates.yearlyReservationSubmitted(
          user.name,
          room[0].name,
          association.name,
          periodLabel,
          createdReservations.length,
          weeklySummaryHtml,
          datesListHtml,
          isApproved
        ),
      });
    }

    return NextResponse.json({
      success: true,
      count: createdReservations.length,
      message: `${createdReservations.length} réservations créées avec succès`,
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
