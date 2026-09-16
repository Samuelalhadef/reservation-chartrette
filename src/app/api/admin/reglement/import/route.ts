import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { REGLEMENT_PDF_MAX_BYTES, sanitizeReglementHtml } from '@/lib/reglement';
import { pdfToReglementHtml } from '@/lib/pdfToReglementHtml';

/**
 * POST /api/admin/reglement/import  (multipart/form-data, champ "pdf")
 * Convertit un PDF en texte mis en forme, sans rien enregistrer : l'admin
 * relit le résultat dans l'éditeur avant de valider.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as any;
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('pdf');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }
    if (file.size > REGLEMENT_PDF_MAX_BYTES) {
      return NextResponse.json({ error: 'PDF trop volumineux (10 Mo maximum)' }, { status: 400 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') {
      return NextResponse.json({ error: 'Le fichier n\'est pas un PDF' }, { status: 400 });
    }

    const html = sanitizeReglementHtml(await pdfToReglementHtml(data));
    if (!html) {
      return NextResponse.json(
        { error: 'Aucun texte trouvé dans ce PDF. S\'il s\'agit d\'un document scanné, le texte ne peut pas être extrait.' },
        { status: 422 }
      );
    }
    return NextResponse.json({ html });
  } catch (error) {
    console.error('POST /api/admin/reglement/import error:', error);
    return NextResponse.json({ error: 'Lecture du PDF impossible' }, { status: 500 });
  }
}
