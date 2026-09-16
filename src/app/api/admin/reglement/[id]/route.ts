import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getReglements, isReglementId, REGLEMENT_PDF_MAX_BYTES, saveReglement } from '@/lib/reglement';

/**
 * PUT /api/admin/reglement/[id]  (multipart/form-data)
 * - html      : texte du règlement (obligatoire)
 * - pdf       : nouveau PDF officiel à proposer au téléchargement (facultatif)
 * - removePdf : "true" pour retirer le PDF existant
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as any;
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!isReglementId(id)) {
    return NextResponse.json({ error: 'Règlement inconnu' }, { status: 404 });
  }

  try {
    const form = await req.formData();
    const html = form.get('html');
    if (typeof html !== 'string' || !html.replace(/<[^>]*>/g, '').trim()) {
      return NextResponse.json({ error: 'Le règlement ne peut pas être vide' }, { status: 400 });
    }

    let pdf: { name: string; data: Buffer } | null | undefined;
    const file = form.get('pdf');
    if (file instanceof File && file.size > 0) {
      if (file.size > REGLEMENT_PDF_MAX_BYTES) {
        return NextResponse.json({ error: 'PDF trop volumineux (10 Mo maximum)' }, { status: 400 });
      }
      const data = Buffer.from(await file.arrayBuffer());
      if (data.subarray(0, 5).toString() !== '%PDF-') {
        return NextResponse.json({ error: 'Le fichier n\'est pas un PDF' }, { status: 400 });
      }
      pdf = { name: file.name || `reglement-${id}.pdf`, data };
    } else if (form.get('removePdf') === 'true') {
      pdf = null;
    }

    await saveReglement(id, html, pdf, session.user.email ?? session.user.id ?? null);
    const reglements = await getReglements();
    return NextResponse.json({ reglement: reglements[id] });
  } catch (error) {
    console.error('PUT /api/admin/reglement error:', error);
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
}
