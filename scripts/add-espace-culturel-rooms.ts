import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { buildings, rooms } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const espaceCulturelRooms = [
  'Cuisine',
  'ESPACE CULTUREL (Tout)',
  'Hall verrière',
  'Salle Edouard Tan',
  'Salle Frédéric Chopin',
  'Salle Igor Stravinsky',
  'Salle Jean-Baptiste Pergolèse',
  'Salle Marius Petipa',
  'Salle Martha Graham',
  'Salle Maurice Martenot',
  'Salle Rosa Bonheur',
  'Salle Tino Petruzzi',
];

async function addEspaceCulturelRooms() {
  console.log('Ajout des salles pour l\'Espace Culturel Renée Wanner...');

  try {
    // Trouver le bâtiment "ESPACE CULTUREL RENÉE WANNER"
    const [espaceCulturel] = await db
      .select()
      .from(buildings)
      .where(eq(buildings.name, 'ESPACE CULTUREL RENÉE WANNER'));

    if (!espaceCulturel) {
      console.error('❌ Bâtiment "ESPACE CULTUREL RENÉE WANNER" non trouvé');
      return;
    }

    console.log(`✓ Bâtiment trouvé: ${espaceCulturel.name} (ID: ${espaceCulturel.id})`);

    // Supprimer l'ancienne "Salle 1" si elle existe
    const existingRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.buildingId, espaceCulturel.id));

    if (existingRooms.length > 0) {
      console.log(`Suppression de ${existingRooms.length} salle(s) existante(s)...`);
      for (const room of existingRooms) {
        await db.delete(rooms).where(eq(rooms.id, room.id));
      }
    }

    // Ajouter toutes les nouvelles salles
    for (const roomName of espaceCulturelRooms) {
      const [room] = await db
        .insert(rooms)
        .values({
          buildingId: espaceCulturel.id,
          name: roomName,
          description: `${roomName} de l'Espace Culturel Renée Wanner`,
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

      console.log(`  ✓ Salle ajoutée: ${room.name}`);
    }

    console.log(`\n✅ ${espaceCulturelRooms.length} salles ajoutées avec succès!`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des salles:', error);
    throw error;
  }
}

addEspaceCulturelRooms();
