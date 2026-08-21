import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { flushEmailQueue, getEmailQuotaStatus } from '@/lib/email';

/**
 * Consommation du quota d'envoi du jour et état de la file d'attente.
 *
 * La consultation déclenche aussi une purge : si l'administrateur ouvre son
 * tableau de bord le lendemain d'une saturation, les messages en attente
 * repartent sans qu'il ait à faire quoi que ce soit.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await flushEmailQueue().catch(error =>
      console.warn("⚠ Purge de la file d'e-mails impossible :", error)
    );

    return NextResponse.json(await getEmailQuotaStatus());
  } catch (error) {
    console.error('Erreur lors de la lecture du quota e-mail :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
