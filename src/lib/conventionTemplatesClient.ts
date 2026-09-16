import { getDefaultConventionTemplates, type ConventionTemplates } from '@/lib/conventionText';

/**
 * Charge les textes de convention côté navigateur (modals de signature, PDF
 * téléchargés). Pas de mise en cache : un texte modifié par la mairie doit
 * s'appliquer dès la prochaine ouverture. En cas d'erreur, texte par défaut.
 */
export async function fetchConventionTemplates(): Promise<ConventionTemplates> {
  try {
    const res = await fetch('/api/convention-templates', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ...getDefaultConventionTemplates(), ...(data.templates || {}) };
  } catch (error) {
    console.warn('Textes de convention indisponibles, texte par défaut utilisé :', error);
    return getDefaultConventionTemplates();
  }
}
