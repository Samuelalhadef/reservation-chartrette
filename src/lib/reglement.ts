import sanitizeHtml from 'sanitize-html';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ensureDbOptimizations } from '@/lib/db/optimize';
import { reglements } from '@/lib/db/schema';
import { DEFAULT_REGLEMENT_COMPLEXE, DEFAULT_REGLEMENT_SALLES } from '@/lib/reglementDefaults';

export const REGLEMENT_IDS = ['complexe', 'salles'] as const;
export type ReglementId = (typeof REGLEMENT_IDS)[number];

export const REGLEMENT_LABELS: Record<ReglementId, string> = {
  complexe: 'Complexe sportif',
  salles: 'Salles municipales (EMC / Vergers)',
};

const DEFAULTS: Record<ReglementId, string> = {
  complexe: DEFAULT_REGLEMENT_COMPLEXE,
  salles: DEFAULT_REGLEMENT_SALLES,
};

/** Taille maximale acceptée pour le PDF officiel. */
export const REGLEMENT_PDF_MAX_BYTES = 10 * 1024 * 1024;

export interface ReglementDoc {
  id: ReglementId;
  html: string;
  pdfName: string | null;
  updatedAt: string | null;
  /** Vrai tant qu'aucun admin n'a enregistré de version. */
  isDefault: boolean;
}

export function isReglementId(value: unknown): value is ReglementId {
  return typeof value === 'string' && (REGLEMENT_IDS as readonly string[]).includes(value);
}

export function getDefaultReglementHtml(id: ReglementId): string {
  return DEFAULTS[id];
}

/**
 * Le contenu est affiché tel quel sur la page publique : on ne garde que la
 * mise en forme produite par l'éditeur (titres, listes, tableaux…).
 */
export function sanitizeReglementHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'br', 'hr', 'blockquote',
      'strong', 'b', 'em', 'i', 'u', 's', 'a',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  }).trim();
}

/** Les deux règlements, sans le contenu des PDF. */
export async function getReglements(): Promise<Record<ReglementId, ReglementDoc>> {
  await ensureDbOptimizations();
  const rows = await db
    .select({
      id: reglements.id,
      html: reglements.html,
      pdfName: reglements.pdfName,
      updatedAt: reglements.updatedAt,
    })
    .from(reglements);

  const result = {} as Record<ReglementId, ReglementDoc>;
  for (const id of REGLEMENT_IDS) {
    const row = rows.find(r => r.id === id);
    result[id] = row
      ? { id, html: row.html, pdfName: row.pdfName, updatedAt: row.updatedAt.toISOString(), isDefault: false }
      : { id, html: DEFAULTS[id], pdfName: null, updatedAt: null, isDefault: true };
  }
  return result;
}

export async function getReglementPdf(id: ReglementId): Promise<{ name: string; data: Buffer } | null> {
  await ensureDbOptimizations();
  const [row] = await db
    .select({ pdfName: reglements.pdfName, pdfData: reglements.pdfData })
    .from(reglements)
    .where(eq(reglements.id, id))
    .limit(1);
  if (!row?.pdfName || !row.pdfData) return null;
  return { name: row.pdfName, data: Buffer.from(row.pdfData, 'base64') };
}

/**
 * Enregistre le texte d'un règlement.
 * `pdf` : undefined = PDF inchangé, null = PDF supprimé, objet = nouveau PDF.
 */
export async function saveReglement(
  id: ReglementId,
  html: string,
  pdf: { name: string; data: Buffer } | null | undefined,
  updatedBy: string | null
): Promise<void> {
  await ensureDbOptimizations();
  const values = {
    html: sanitizeReglementHtml(html),
    updatedBy,
    updatedAt: new Date(),
    ...(pdf === undefined
      ? {}
      : { pdfName: pdf?.name ?? null, pdfData: pdf ? pdf.data.toString('base64') : null }),
  };

  await db
    .insert(reglements)
    .values({ id, ...values })
    .onConflictDoUpdate({ target: reglements.id, set: values });
}
