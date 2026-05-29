import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Lit la signature du maire (public/image/signature-maire.png) et la renvoie
 * en data URL base64, prête à être injectée dans le PDF de convention.
 *
 * Le résultat est mis en cache mémoire (la signature ne change pas en cours
 * d'exécution). Retourne null si le fichier est absent ou illisible.
 */
let cached: string | null | undefined;

export async function getMairieSignatureDataUrl(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    const filePath = path.join(process.cwd(), 'public', 'image', 'signature-maire.png');
    const buffer = await readFile(filePath);
    cached = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error('Impossible de lire signature-maire.png :', e);
    cached = null;
  }
  return cached;
}
