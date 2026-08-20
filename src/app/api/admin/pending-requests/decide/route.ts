import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { decideReservationGroup, type DecisionStatus } from '@/lib/reservationDecision';

/** Au-delà, la requête risquerait de dépasser le temps imparti (emails inclus). */
const MAX_REQUESTS_PER_CALL = 10;

/**
 * POST /api/admin/pending-requests/decide
 * body: { action: 'approved' | 'rejected', adminComment?: string,
 *         requests: { key: string; ids: string[] }[] }
 *
 * Applique une décision à un lot de demandes. Chaque demande est traitée d'un
 * bloc et ne déclenche qu'un seul email récapitulatif pour l'occupant. Le
 * client envoie les demandes par petits paquets pour afficher une progression.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { action, adminComment, requests } = await req.json();

    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    if (action === 'rejected' && !adminComment?.trim()) {
      return NextResponse.json(
        { error: 'Un motif est obligatoire pour un refus' },
        { status: 400 }
      );
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: 'Aucune demande fournie' }, { status: 400 });
    }

    if (requests.length > MAX_REQUESTS_PER_CALL) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REQUESTS_PER_CALL} demandes par appel` },
        { status: 400 }
      );
    }

    const results: {
      key: string;
      ok: boolean;
      processed: number;
      error?: string;
    }[] = [];

    // Séquentiel : l'envoi d'emails en parallèle sature le serveur SMTP de la
    // mairie et fait échouer des notifications sans trace côté admin.
    for (const request of requests) {
      const ids: string[] = Array.isArray(request?.ids) ? request.ids : [];
      const key: string = request?.key ?? '';

      if (ids.length === 0) {
        results.push({ key, ok: false, processed: 0, error: 'Aucune date à traiter' });
        continue;
      }

      try {
        const outcome = await decideReservationGroup({
          ids,
          status: action as DecisionStatus,
          adminComment: adminComment?.trim() || undefined,
          adminId: session.user.id,
        });
        results.push({ key, ok: outcome.ok, processed: outcome.processed, error: outcome.error });
      } catch (error: any) {
        console.error('Décision impossible pour la demande', key, error);
        results.push({
          key,
          ok: false,
          processed: 0,
          error: error?.message || 'Erreur inattendue',
        });
      }
    }

    return NextResponse.json({
      results,
      processedRequests: results.filter(r => r.ok).length,
      processedReservations: results.reduce((sum, r) => sum + r.processed, 0),
      failed: results.filter(r => !r.ok),
    });
  } catch (error) {
    console.error('Erreur lors du traitement des demandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement des demandes' },
      { status: 500 }
    );
  }
}
