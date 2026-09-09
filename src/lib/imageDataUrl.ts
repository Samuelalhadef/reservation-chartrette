/**
 * Charge une image servie par l'application et la convertit en data URL, seul
 * format que jsPDF sait embarquer. Utilisé côté navigateur pour le blason et
 * la signature du maire au moment de générer une convention.
 *
 * Le résultat est mémorisé par URL : ces images ne changent pas d'une
 * génération à l'autre. Retourne null si l'image est absente ou illisible,
 * auquel cas le PDF se contente de son en-tête typographique.
 */
const cache = new Map<string, Promise<string | null>>();

export function fetchImageDataUrl(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  })();

  cache.set(url, pending);
  return pending;
}

/** Signature manuscrite du maire (conventions validées). */
export const MAIRIE_SIGNATURE_URL = '/image/signature-maire.png';
/** Blason de Chartrettes, en tête des conventions. */
export const MAIRIE_LOGO_URL = '/image/logo.jpg';
