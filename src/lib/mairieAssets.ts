import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Lit les images officielles de la mairie (blason, signature du maire) depuis
 * public/image et les renvoie en data URL base64, prêtes à être injectées dans
 * les PDF de convention.
 *
 * Réservé au serveur (fs). Côté navigateur, voir fetchImageDataUrl().
 * Chaque fichier est mis en cache mémoire : il ne change pas en cours
 * d'exécution. Retourne null si le fichier est absent ou illisible.
 */

const cache = new Map<string, string | null>();

async function loadDataUrl(fileName: string, mime: string): Promise<string | null> {
  const cached = cache.get(fileName);
  if (cached !== undefined) return cached;

  let result: string | null = null;
  try {
    const filePath = path.join(process.cwd(), 'public', 'image', fileName);
    const buffer = await readFile(filePath);
    result = `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error(`Impossible de lire public/image/${fileName} :`, e);
  }
  cache.set(fileName, result);
  return result;
}

/** Signature manuscrite du maire, apposée sur les conventions validées. */
export function getMairieSignatureDataUrl(): Promise<string | null> {
  return loadDataUrl('signature-maire.png', 'image/png');
}

/** Blason de Chartrettes, affiché en tête des conventions. */
export function getMairieLogoDataUrl(): Promise<string | null> {
  return loadDataUrl('logo.jpg', 'image/jpeg');
}
