import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { rooms, reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/rooms/[id] - Update room pricing and settings
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
      name,
      description,
      capacity,
      surface,
      isPaid,
      pricingFullDay,
      pricingHalfDay,
      pricingHourly,
      deposit,
      isActive,
    } = body;

    const { id } = await params;

    // Vérifier que la salle existe
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id))
      .limit(1);

    if (!room) {
      return NextResponse.json(
        { error: 'Salle non trouvée' },
        { status: 404 }
      );
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};

    // Informations descriptives de la salle. Chaque champ est optionnel : seuls
    // ceux présents dans le corps sont modifiés (mise à jour partielle).
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Le nom de la salle ne peut pas être vide' },
          { status: 400 }
        );
      }
      updateData.name = trimmed;
    }

    if (description !== undefined) {
      updateData.description = String(description).trim() || null;
    }

    if (capacity !== undefined) {
      const parsed = Number(capacity);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: 'La capacité doit être un nombre supérieur ou égal à 1' },
          { status: 400 }
        );
      }
      updateData.capacity = Math.floor(parsed);
    }

    if (surface !== undefined) {
      if (surface === null || surface === '') {
        updateData.surface = null;
      } else {
        const parsed = Number(surface);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: 'La surface doit être un nombre positif' },
            { status: 400 }
          );
        }
        updateData.surface = parsed;
      }
    }

    if (isPaid !== undefined) {
      updateData.isPaid = isPaid;
    }

    if (pricingFullDay !== undefined) {
      updateData.pricingFullDay = pricingFullDay;
    }

    if (pricingHalfDay !== undefined) {
      updateData.pricingHalfDay = pricingHalfDay;
    }

    if (pricingHourly !== undefined) {
      updateData.pricingHourly = pricingHourly;
    }

    if (deposit !== undefined) {
      // Le formulaire envoie une chaîne (champ vide = pas de caution)
      const parsed = deposit === null || deposit === '' ? 0 : Number(deposit);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: 'La caution doit être un nombre positif' },
          { status: 400 }
        );
      }
      updateData.deposit = parsed;
    }

    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
    }

    updateData.updatedAt = new Date();

    // Mettre à jour la salle
    const [updatedRoom] = await db
      .update(rooms)
      .set(updateData)
      .where(eq(rooms.id, id))
      .returning();

    return NextResponse.json({
      message: 'Salle mise à jour avec succès',
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la salle:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la salle' },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Supprimer une salle (admin uniquement).
// Les réservations rattachées à la salle sont supprimées d'abord (contrainte FK).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = await params;

    const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    if (!room) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }

    // Compter puis supprimer les réservations liées, sinon la contrainte FK bloque.
    const roomReservations = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.roomId, id));

    if (roomReservations.length > 0) {
      await db.delete(reservations).where(eq(reservations.roomId, id));
    }

    await db.delete(rooms).where(eq(rooms.id, id));

    return NextResponse.json({
      message: 'Salle supprimée',
      roomName: room.name,
      reservationsDeleted: roomReservations.length,
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la salle:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la salle' },
      { status: 500 }
    );
  }
}
