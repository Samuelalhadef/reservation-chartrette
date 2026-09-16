import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';
import { authOptions } from '@/lib/auth';
import { associationExists, parseAssociationInput } from '@/lib/associationInput';

/** PATCH - Modification de n'importe quelle association par l'administration. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!(await associationExists(id))) {
      return NextResponse.json({ error: 'Association introuvable' }, { status: 404 });
    }

    const parsed = await parseAssociationInput(await req.json(), {
      creating: false,
      excludeId: id,
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const [association] = await db
      .update(associations)
      .set({ ...parsed.values, updatedAt: new Date() })
      .where(eq(associations.id, id))
      .returning();

    return NextResponse.json({ association });
  } catch (error) {
    console.error('PATCH /api/admin/associations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
