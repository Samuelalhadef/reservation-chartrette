import { getReglements } from '@/lib/reglement';
import ReglementView from '@/components/ReglementView';

// Le texte est modifiable depuis l'administration : toujours relu en base.
export const dynamic = 'force-dynamic';

export default async function ReglementPage() {
  const reglements = await getReglements();
  return <ReglementView reglements={reglements} />;
}
