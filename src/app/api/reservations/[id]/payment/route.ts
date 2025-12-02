import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/reservations/[id]/payment - Update payment status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      paymentStatus,
      paymentMethod,
      paymentReference,
      paymentNotes,
    } = body;

    const { id } = await params;

    // Vérifier que la réservation existe
    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;

      // Si le paiement est validé, enregistrer qui l'a validé et quand
      if (paymentStatus === 'paid') {
        updateData.paymentValidatedBy = session.user.id;
        updateData.paymentValidatedAt = new Date();
      }
    }

    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }

    if (paymentReference !== undefined) {
      updateData.paymentReference = paymentReference;
    }

    if (paymentNotes !== undefined) {
      updateData.paymentNotes = paymentNotes;
    }

    // Mettre à jour la réservation
    const [updatedReservation] = await db
      .update(reservations)
      .set(updateData)
      .where(eq(reservations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Paiement mis à jour avec succès',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du paiement' },
      { status: 500 }
    );
  }
}

// POST /api/reservations/[id]/payment/refund - Process deposit refund
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { refundNotes } = body;

    const { id } = await params;

    // Vérifier que la réservation existe
    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que le paiement a été effectué
    if (reservation.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Le paiement doit être validé avant de rembourser la caution' },
        { status: 400 }
      );
    }

    // Mettre à jour le statut à "refunded"
    const [updatedReservation] = await db
      .update(reservations)
      .set({
        paymentStatus: 'refunded',
        paymentValidatedBy: session.user.id,
        paymentValidatedAt: new Date(),
        paymentNotes: refundNotes
          ? `${reservation.paymentNotes || ''}\n\nRemboursement de la caution: ${refundNotes}`.trim()
          : reservation.paymentNotes,
      })
      .where(eq(reservations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Caution remboursée avec succès',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Erreur lors du remboursement:', error);
    return NextResponse.json(
      { error: 'Erreur lors du remboursement de la caution' },
      { status: 500 }
    );
  }
}
