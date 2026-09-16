import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getConventionTemplatesWithMeta,
  resetConventionTemplate,
  saveConventionTemplate,
} from '@/lib/conventionTemplateStore';
import { isConventionKind, normalizeConventionTemplate } from '@/lib/conventionText';

type Params = { params: Promise<{ kind: string }> };

async function requireAdmin() {
  const session = (await getServerSession(authOptions)) as any;
  return session?.user?.role === 'admin' ? session : null;
}

/** PUT - Enregistre le texte d'une convention. body: { template } */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { kind } = await params;
    if (!isConventionKind(kind)) {
      return NextResponse.json({ error: 'Type de convention inconnu' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = normalizeConventionTemplate(body?.template);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await saveConventionTemplate(kind, parsed.template, session.user.id ?? null);
    const { templates, meta } = await getConventionTemplatesWithMeta();
    return NextResponse.json({ template: templates[kind], meta: meta[kind] });
  } catch (error) {
    console.error('PUT /api/admin/convention-templates/[kind] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** DELETE - Rétablit le texte d'origine. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { kind } = await params;
    if (!isConventionKind(kind)) {
      return NextResponse.json({ error: 'Type de convention inconnu' }, { status: 404 });
    }

    await resetConventionTemplate(kind);
    const { templates, meta } = await getConventionTemplatesWithMeta();
    return NextResponse.json({ template: templates[kind], meta: meta[kind] });
  } catch (error) {
    console.error('DELETE /api/admin/convention-templates/[kind] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
