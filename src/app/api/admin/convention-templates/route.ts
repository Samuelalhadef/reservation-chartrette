import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConventionTemplatesWithMeta } from '@/lib/conventionTemplateStore';
import { getDefaultConventionTemplates } from '@/lib/conventionText';

/** GET - Modèles en vigueur, état (par défaut / modifié) et textes d'origine. */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { templates, meta } = await getConventionTemplatesWithMeta();
    return NextResponse.json({ templates, meta, defaults: getDefaultConventionTemplates() });
  } catch (error) {
    console.error('GET /api/admin/convention-templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
