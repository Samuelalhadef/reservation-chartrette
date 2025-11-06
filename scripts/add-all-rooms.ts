import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { buildings, rooms } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const buildingRooms = {
  'COMPLEXE SPORTIF': [
    'Dojo',
    'Grande salle (gymnase)',
    'Vestiaire 1 (hommes)',
    'Vestiaire 2 (femmes)',
    'Vestiaire 3 (hommes)',
    'Vestiaire 4 (femmes)',
  ],
  'MAIRIE': [
    'Salle du Conseil',
  ],
  'SALLE DES VERGERS': [
    'Salle des Vergers',
  ],
};

async function addAllRooms() {
  console.log('Ajout de toutes les salles pour tous les bâtiments...\n');

  try {
    for (const [buildingName, roomNames] of Object.entries(buildingRooms)) {
      console.log(`\n📍 Traitement du bâtiment: ${buildingName}`);

      // Trouver le bâtiment
      const [building] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.name, buildingName));

      if (!building) {
        console.error(`  ❌ Bâtiment "${buildingName}" non trouvé`);
        continue;
      }

      console.log(`  ✓ Bâtiment trouvé (ID: ${building.id})`);

      // Supprimer les salles existantes
      const existingRooms = await db
        .select()
        .from(rooms)
        .where(eq(rooms.buildingId, building.id));

      if (existingRooms.length > 0) {
        console.log(`  🗑️  Suppression de ${existingRooms.length} salle(s) existante(s)...`);
        for (const room of existingRooms) {
          await db.delete(rooms).where(eq(rooms.id, room.id));
        }
      }

      // Ajouter les nouvelles salles
      console.log(`  ➕ Ajout de ${roomNames.length} nouvelle(s) salle(s):`);
      for (const roomName of roomNames) {
        const [room] = await db
          .insert(rooms)
          .values({
            buildingId: building.id,
            name: roomName,
            description: `${roomName} du ${buildingName}`,
            capacity: 50,
            surface: 80,
            equipment: [],
            images: [],
            rules: 'Respecter les horaires et laisser la salle propre.',
            defaultTimeSlots: { start: '08:00', end: '22:00' },
            blockedDates: [],
            isActive: true,
          })
          .returning();

        console.log(`     ✓ ${room.name}`);
      }
    }

    const totalRooms = Object.values(buildingRooms).reduce((sum, rooms) => sum + rooms.length, 0);
    console.log(`\n✅ ${totalRooms} salles ajoutées avec succès pour ${Object.keys(buildingRooms).length} bâtiments!`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des salles:', error);
    throw error;
  }
}

addAllRooms();
