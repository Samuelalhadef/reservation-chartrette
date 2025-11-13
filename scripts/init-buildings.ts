import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { buildings, rooms } from '../src/lib/db/schema';

const buildingsData = [
  {
    name: 'COMPLEXE SPORTIF',
    description: 'Centre sportif municipal avec équipements complets',
    address: 'Chartrettes',
  },
  {
    name: 'ESPACE CULTUREL RENÉE WANNER',
    description: 'Espace dédié aux activités culturelles et artistiques',
    address: 'Chartrettes',
  },
  {
    name: 'MAIRIE',
    description: 'Hôtel de ville de Chartrettes',
    address: 'Chartrettes',
  },
  {
    name: 'SALLE DES VERGERS',
    description: 'Salle polyvalente pour événements et réunions',
    address: 'Chartrettes',
  },
];

async function initBuildings() {
  console.log('Initialisation des bâtiments...');

  try {
    // Créer les bâtiments
    for (const buildingData of buildingsData) {
      const [building] = await db
        .insert(buildings)
        .values(buildingData)
        .returning();

      console.log(`✓ Bâtiment créé: ${building.name}`);

      // Créer une salle "Salle 1" dans chaque bâtiment
      const [room] = await db
        .insert(rooms)
        .values({
          buildingId: building.id,
          name: `Salle 1`,
          description: `Salle principale du ${building.name}`,
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

      console.log(`  ✓ Salle créée: ${room.name} dans ${building.name}`);
    }

    console.log('\n✅ Initialisation terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    throw error;
  }
}

initBuildings();
