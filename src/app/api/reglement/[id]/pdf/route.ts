import { NextResponse } from 'next/server';
import { getReglementPdf, isReglementId } from '@/lib/reglement';

/** GET /api/reglement/[id]/pdf — PDF officiel du règlement (public). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isReglementId(id)) {
    return NextResponse.json({ error: 'Règlement inconnu' }, { status: 404 });
  }

  const pdf = await getReglementPdf(id);
  if (!pdf) {
    return NextResponse.json({ error: 'Aucun PDF disponible' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(pdf.name)}`,
      'Cache-Control': 'no-cache',
    },
  });
}
