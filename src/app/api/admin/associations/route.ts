import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { associations, userAssociations, users } from '@/lib/db/schema';
import { authOptions } from '@/lib/auth';
import { parseAssociationInput } from '@/lib/associationInput';

/** GET - Toutes les associations, quel que soit leur statut, avec leur nombre de membres. */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const [rows, links, primaries] = await Promise.all([
      db.select().from(associations).orderBy(associations.name),
      db
        .select({ userId: userAssociations.userId, associationId: userAssociations.associationId })
        .from(userAssociations),
      db
        .select({ userId: users.id, associationId: users.associationId })
        .from(users)
        .where(isNotNull(users.associationId)),
    ]);

    // Membres = table de liaison + association principale (comptes hérités)
    const members = new Map<string, Set<string>>();
    for (const { userId, associationId } of [...links, ...primaries]) {
      if (!associationId) continue;
      if (!members.has(associationId)) members.set(associationId, new Set());
      members.get(associationId)!.add(userId);
    }

    return NextResponse.json({
      associations: rows.map((a) => ({
        ...a,
        memberCount: members.get(a.id)?.size ?? 0,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/associations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** POST - Création d'une association par l'administration (active d'emblée). */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const parsed = await parseAssociationInput(await req.json(), { creating: true });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const [association] = await db
      .insert(associations)
      .values(parsed.values as typeof associations.$inferInsert)
      .returning();

    return NextResponse.json({ association: { ...association, memberCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/associations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
