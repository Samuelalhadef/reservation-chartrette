import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDefaultReglementHtml, getReglements, REGLEMENT_IDS } from '@/lib/reglement';

/**
 * GET /api/admin/reglement
 * Les deux règlements tels qu'affichés, plus leur texte d'origine (bouton
 * « Restaurer le texte d'origine » de l'éditeur).
 */
export async function GET() {
  const session = (await getServerSession(authOptions)) as any;
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const reglements = await getReglements();
  const defaults = Object.fromEntries(REGLEMENT_IDS.map(id => [id, getDefaultReglementHtml(id)]));
  return NextResponse.json({ reglements, defaults });
}
