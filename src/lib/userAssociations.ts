import { db } from '@/lib/db';
import { associations, userAssociations } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Association } from '@/lib/db/schema';

/**
 * Retourne la liste dédupliquée des IDs d'associations rattachées à un compte.
 *
 * Source de vérité : la table `user_associations`. Pour les comptes hérités qui
 * n'ont pas (encore) de ligne dans cette table, on retombe sur l'association
 * principale `users.associationId` afin de ne rien casser.
 */
export async function getUserAssociationIds(
  userId: string,
  primaryAssociationId?: string | null,
): Promise<string[]> {
  const links = await db
    .select({ associationId: userAssociations.associationId })
    .from(userAssociations)
    .where(eq(userAssociations.userId, userId));

  const ids = new Set<string>(links.map((l) => l.associationId));

  // Repli pour les comptes créés avant l'introduction du multi-association
  if (ids.size === 0 && primaryAssociationId) {
    ids.add(primaryAssociationId);
  }

  return Array.from(ids);
}

/**
 * Retourne les associations rattachées à un compte (objets complets), triées
 * avec l'association principale en premier si elle est présente.
 */
export async function getUserAssociations(
  userId: string,
  primaryAssociationId?: string | null,
): Promise<Association[]> {
  const ids = await getUserAssociationIds(userId, primaryAssociationId);
  if (ids.length === 0) return [];

  const rows = await db
    .select()
    .from(associations)
    .where(inArray(associations.id, ids));

  // Met l'association principale en tête pour qu'elle soit la valeur par défaut
  return rows.sort((a, b) => {
    if (a.id === primaryAssociationId) return -1;
    if (b.id === primaryAssociationId) return 1;
    return a.name.localeCompare(b.name);
  });
}
