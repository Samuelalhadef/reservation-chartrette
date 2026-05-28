import { db } from '@/lib/db';
import { conventionSettings, type ConventionSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Valeurs par défaut utilisées si la ligne singleton n'existe pas encore en base.
 * Reflètent les hardcoded historiques de la convention de Chartrettes.
 */
export interface ConventionSettingsPayload {
  mayorName: string;
  mayorTitle: string;
  mairieName: string;
  mairieAddressLine1: string;
  mairieAddressLine2: string;
  mairiePhone: string;
  conventionYear: string;
}

export const DEFAULT_CONVENTION_SETTINGS: ConventionSettingsPayload = {
  mayorName: 'Pascal Gros',
  mayorTitle: 'Le Maire',
  mairieName: 'LA MAIRIE DE CHARTRETTES',
  mairieAddressLine1: '37 rue Georges Clemenceau',
  mairieAddressLine2: '77590 CHARTRETTES',
  mairiePhone: '01.60.69.65.01',
  conventionYear: '2025-2026',
};

/**
 * Lit la ligne singleton ; si absente, retourne les valeurs par défaut SANS
 * écrire en base (le PUT côté admin créera la ligne au premier "Enregistrer").
 */
export async function getConventionSettings(): Promise<ConventionSettingsPayload> {
  const [row] = await db
    .select()
    .from(conventionSettings)
    .where(eq(conventionSettings.id, 'singleton'))
    .limit(1);

  if (!row) return { ...DEFAULT_CONVENTION_SETTINGS };

  return {
    mayorName: row.mayorName,
    mayorTitle: row.mayorTitle,
    mairieName: row.mairieName,
    mairieAddressLine1: row.mairieAddressLine1,
    mairieAddressLine2: row.mairieAddressLine2,
    mairiePhone: row.mairiePhone,
    conventionYear: row.conventionYear,
  };
}

/**
 * Upsert de la ligne singleton.
 */
export async function upsertConventionSettings(
  data: Partial<ConventionSettingsPayload>
): Promise<ConventionSettingsPayload> {
  const merged = { ...DEFAULT_CONVENTION_SETTINGS, ...data };
  const existing = await db
    .select()
    .from(conventionSettings)
    .where(eq(conventionSettings.id, 'singleton'))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(conventionSettings).values({ id: 'singleton', ...merged });
  } else {
    await db
      .update(conventionSettings)
      .set({ ...merged, updatedAt: new Date() })
      .where(eq(conventionSettings.id, 'singleton'));
  }
  return merged;
}
