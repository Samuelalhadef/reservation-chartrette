import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { associations, users, reservations } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

// Fonction pour normaliser les noms (enlever accents, caractères spéciaux)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[\"']/g, '') // Enlever les guillemets
    .replace(/\s+/g, ' '); // Normaliser les espaces
}

export async function POST(req: NextRequest) {
  try {
    const allAssociations = await db.select().from(associations).orderBy(associations.name);

    // Grouper les associations par nom normalisé
    const groupedByName = new Map<string, typeof allAssociations>();

    for (const assoc of allAssociations) {
      const normalizedName = normalizeName(assoc.name);
      if (!groupedByName.has(normalizedName)) {
        groupedByName.set(normalizedName, []);
      }
      groupedByName.get(normalizedName)!.push(assoc);
    }

    const duplicatesFound: Array<{
      name: string;
      count: number;
      kept: string;
      deleted: string[];
    }> = [];

    let totalDeleted = 0;

    // Traiter chaque groupe
    for (const [normalizedName, assocs] of groupedByName.entries()) {
      if (assocs.length > 1) {
        // Trier pour garder la meilleure version (celle avec le plus d'infos)
        const sorted = [...assocs].sort((a, b) => {
          // Priorité 1: Celle avec des informations de contact
          const aHasContact = !!(a.contactName || a.contactEmail || a.contactPhone);
          const bHasContact = !!(b.contactName || b.contactEmail || b.contactPhone);

          if (aHasContact && !bHasContact) return -1;
          if (!aHasContact && bHasContact) return 1;

          // Priorité 2: Description la plus longue
          const aDescLength = a.description?.length || 0;
          const bDescLength = b.description?.length || 0;

          if (aDescLength > bDescLength) return -1;
          if (aDescLength < bDescLength) return 1;

          // Priorité 3: La plus récente
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        const toKeep = sorted[0];
        const toDelete = sorted.slice(1);

        const deletedIds: string[] = [];

        // Transférer les utilisateurs et réservations vers l'association à garder
        for (const assoc of toDelete) {
          // Transférer les utilisateurs
          await db
            .update(users)
            .set({ associationId: toKeep.id })
            .where(eq(users.associationId, assoc.id));

          // Transférer les réservations
          await db
            .update(reservations)
            .set({ associationId: toKeep.id })
            .where(eq(reservations.associationId, assoc.id));

          // Supprimer l'association en double
          await db.delete(associations).where(eq(associations.id, assoc.id));

          deletedIds.push(assoc.id);
          totalDeleted++;
        }

        duplicatesFound.push({
          name: toKeep.name,
          count: assocs.length,
          kept: toKeep.id,
          deleted: deletedIds,
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Nettoyage des doublons terminé',
        summary: {
          duplicateGroupsFound: duplicatesFound.length,
          totalAssociationsDeleted: totalDeleted,
        },
        details: duplicatesFound,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Clean duplicate associations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
