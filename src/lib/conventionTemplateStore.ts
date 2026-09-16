import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ensureDbOptimizations } from '@/lib/db/optimize';
import { conventionTemplates } from '@/lib/db/schema';
import {
  CONVENTION_KINDS,
  getDefaultConventionTemplate,
  normalizeConventionTemplate,
  type ConventionKind,
  type ConventionTemplate,
  type ConventionTemplates,
} from '@/lib/conventionText';

export interface ConventionTemplateMeta {
  /** Vrai tant qu'aucun admin n'a enregistré de version. */
  isDefault: boolean;
  updatedAt: string | null;
}

/** Les 4 modèles en vigueur (texte enregistré, sinon texte par défaut). */
export async function getConventionTemplatesWithMeta(): Promise<{
  templates: ConventionTemplates;
  meta: Record<ConventionKind, ConventionTemplateMeta>;
}> {
  await ensureDbOptimizations();
  const rows = await db.select().from(conventionTemplates);

  const templates = {} as ConventionTemplates;
  const meta = {} as Record<ConventionKind, ConventionTemplateMeta>;

  for (const kind of CONVENTION_KINDS) {
    const row = rows.find((r) => r.id === kind);
    let stored: ConventionTemplate | null = null;
    if (row) {
      try {
        const parsed = normalizeConventionTemplate(JSON.parse(row.content));
        if (parsed.ok) stored = parsed.template;
      } catch {
        // Contenu illisible : on retombe sur le texte par défaut.
      }
      if (!stored) console.warn(`⚠ Modèle de convention « ${kind} » invalide en base, texte par défaut utilisé`);
    }
    templates[kind] = stored ?? getDefaultConventionTemplate(kind);
    meta[kind] = {
      isDefault: !stored,
      updatedAt: stored && row ? row.updatedAt.toISOString() : null,
    };
  }

  return { templates, meta };
}

export async function getConventionTemplates(): Promise<ConventionTemplates> {
  return (await getConventionTemplatesWithMeta()).templates;
}

export async function saveConventionTemplate(
  kind: ConventionKind,
  template: ConventionTemplate,
  updatedBy: string | null
): Promise<void> {
  await ensureDbOptimizations();
  const values = { content: JSON.stringify(template), updatedBy, updatedAt: new Date() };
  await db
    .insert(conventionTemplates)
    .values({ id: kind, ...values })
    .onConflictDoUpdate({ target: conventionTemplates.id, set: values });
}

/** Revient au texte par défaut. */
export async function resetConventionTemplate(kind: ConventionKind): Promise<void> {
  await ensureDbOptimizations();
  await db.delete(conventionTemplates).where(eq(conventionTemplates.id, kind));
}
