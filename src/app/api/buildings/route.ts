import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { buildings } from '@/lib/db/schema';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Par défaut, seuls les établissements actifs sont renvoyés.
    // ?activeOnly=false pour inclure les désactivés (usage admin).
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';
    const allBuildings = activeOnly
      ? await db.select().from(buildings).where(eq(buildings.isActive, true))
      : await db.select().from(buildings);
    return NextResponse.json(allBuildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

// Créer un nouvel établissement (admin uniquement)
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé — accès administrateur requis' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const name = (data.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
    }

    // Nom unique : on vérifie pour renvoyer une erreur claire.
    const existing = await db
      .select({ id: buildings.id })
      .from(buildings)
      .where(eq(buildings.name, name))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Un établissement porte déjà ce nom' },
        { status: 409 }
      );
    }

    const [building] = await db
      .insert(buildings)
      .values({
        name,
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        image: data.image?.trim() || null,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
      })
      .returning();

    return NextResponse.json(
      { message: 'Établissement créé', building },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create building error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}

// Modifier un établissement (activer/désactiver, renommer…) — admin uniquement
export async function PATCH(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé — accès administrateur requis' },
        { status: 401 }
      );
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: "L'identifiant est obligatoire" }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.description !== undefined) updates.description = data.description?.trim() || null;
    if (data.address !== undefined) updates.address = data.address?.trim() || null;
    if (data.image !== undefined) updates.image = data.image?.trim() || null;
    if (data.isActive !== undefined) updates.isActive = !!data.isActive;

    const [building] = await db
      .update(buildings)
      .set(updates)
      .where(eq(buildings.id, data.id))
      .returning();

    if (!building) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Établissement mis à jour', building });
  } catch (error: any) {
    console.error('Update building error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
