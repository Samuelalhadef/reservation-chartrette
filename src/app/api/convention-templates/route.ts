import { NextResponse } from 'next/server';
import { getConventionTemplates } from '@/lib/conventionTemplateStore';

/**
 * GET /api/convention-templates
 *
 * Endpoint PUBLIC en lecture seule : texte des 4 conventions, utilisé par les
 * modals de signature et par les vues qui génèrent le PDF.
 */
export async function GET() {
  try {
    const templates = await getConventionTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('GET /api/convention-templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
