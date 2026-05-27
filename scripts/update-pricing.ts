import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { rooms } from '../src/lib/db/schema';
import { like, eq } from 'drizzle-orm';

/**
 * Met à jour les tarifs des salles selon le règlement municipal
 * Délibération N°2025_35 du 18 juin 2025
 *
 * Grande Salle: Chartrettois 102€/h, CAPF 102€/h, Extérieurs 204€/h, Caution 1530€
 * Dojo: Chartrettois 51€/h, CAPF 51€/h, Extérieurs 102€/h, Caution 510€
 */
async function updatePricing() {
  console.log('Mise à jour des tarifs selon le règlement municipal...\n');

  try {
    // Récupérer toutes les salles
    const allRooms = await db.select().from(rooms);
    console.log(`${allRooms.length} salle(s) trouvée(s)\n`);

    for (const room of allRooms) {
      const nameLower = room.name.toLowerCase();

      if (nameLower.includes('grande salle') || nameLower.includes('gymnase')) {
        console.log(`Mise à jour: ${room.name}`);
        await db.update(rooms).set({
          capacity: 130,
          surface: 1034,
          isPaid: true,
          deposit: 1530,
          pricingHourly: { chartrettois: 102, association: 102, exterieur: 204 },
          pricingHalfDay: { chartrettois: 408, association: 408, exterieur: 816 },
          pricingFullDay: { chartrettois: 816, association: 816, exterieur: 1632 },
          updatedAt: new Date(),
        }).where(eq(rooms.id, room.id));
        console.log('  ✓ Grande Salle: 102€/h chartrettois, 102€/h CAPF, 204€/h extérieurs, caution 1530€, 1034m², 130 pers.');

      } else if (nameLower.includes('dojo')) {
        console.log(`Mise à jour: ${room.name}`);
        await db.update(rooms).set({
          capacity: 63,
          surface: 253,
          isPaid: true,
          deposit: 510,
          pricingHourly: { chartrettois: 51, association: 51, exterieur: 102 },
          pricingHalfDay: { chartrettois: 204, association: 204, exterieur: 408 },
          pricingFullDay: { chartrettois: 408, association: 408, exterieur: 816 },
          updatedAt: new Date(),
        }).where(eq(rooms.id, room.id));
        console.log('  ✓ Dojo: 51€/h chartrettois, 51€/h CAPF, 102€/h extérieurs, caution 510€, 253m², 63 pers.');

      } else {
        console.log(`Ignoré (pas de tarif dans le règlement): ${room.name}`);
      }
    }

    console.log('\n✅ Tarifs mis à jour avec succès!');
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

updatePricing();
