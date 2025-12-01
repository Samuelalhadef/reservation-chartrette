import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { buildings, rooms } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Définition des salles avec leurs capacités et équipements
const roomsData = [
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Frédéric Chopin',
    capacity: 4,
    surface: null,
    equipment: [
      '1 table en bois',
      '1 poubelle',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Jean-Baptiste Pergolèse',
    capacity: 4,
    surface: null,
    equipment: [
      '1 poubelle',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Martha Graham',
    capacity: 25,
    surface: null,
    equipment: [
      '1 table en bois',
      '2 bancs vestiaires',
      '1 poubelle',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Rosa Bonheur',
    capacity: 19,
    surface: null,
    equipment: [
      '5 tables en bois',
      '1 poubelle',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Igor Stravinsky',
    capacity: 12,
    surface: null,
    equipment: [
      '3 tables en bois',
      '1 poubelle',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Maurice Martenot',
    capacity: 12,
    surface: null,
    equipment: [
      '5 tables en bois',
      '1 poubelle',
    ],
  },
  {
    buildingName: 'SALLE DES VERGERS',
    name: 'Salle des Vergers',
    capacity: 40,
    surface: null,
    equipment: [
      'Mobilier :',
      '10 tables plastiques blanches sur chariot',
      '40 chaises sur chariot (38 grises + 2 rouges)',
      '',
      'Cuisine équipée :',
      'Four, micro-ondes, évier, plaques, poubelle, 1 réfrigérateur',
      '',
      'Autre :',
      '1 local de matériel de ménage',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Tino Petruzzi',
    capacity: 224,
    surface: null,
    equipment: [
      'Dans la salle :',
      '1 plante verte',
      '5 paravents (3 petits & 5 grands indiqués)',
      '2 vestiaires porte-cintres sur roulettes',
      '',
      'Sur le Plateau (Scène) :',
      '5 chaises noires, 1 table ronde',
      '1 vestiaire porte-cintres sur roulettes',
      '5 enceintes (dont 2 sur pied)',
      '1 piano (ADAC)',
      '',
      'Dans le Stock :',
      '10 tables plastiques blanches',
      '178 chaises rouges',
      '36 tapis de sol gris',
      '1 carton de connecteurs de chaises, 1 carton pieds de chaises',
      '3 diables pour chaises, 2 chariots',
    ],
  },
  {
    buildingName: 'ESPACE CULTUREL RENÉE WANNER',
    name: 'Salle Marius Petipa',
    capacity: null,
    surface: null,
    equipment: [
      '16 chaises (empilées sur 2 plateformes à roulettes)',
      '2 bancs vestiaire',
    ],
  },
];

async function updateRoomsWithEquipment() {
  console.log('Mise à jour des salles avec les capacités et équipements...\n');

  try {
    for (const roomData of roomsData) {
      console.log(`\n📍 Traitement de: ${roomData.name}`);

      // Trouver le bâtiment
      const [building] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.name, roomData.buildingName));

      if (!building) {
        console.error(`  ❌ Bâtiment "${roomData.buildingName}" non trouvé`);
        continue;
      }

      // Trouver la salle
      const [room] = await db
        .select()
        .from(rooms)
        .where(
          and(
            eq(rooms.buildingId, building.id),
            eq(rooms.name, roomData.name)
          )
        );

      if (!room) {
        console.error(`  ❌ Salle "${roomData.name}" non trouvée dans ${roomData.buildingName}`);
        continue;
      }

      // Mettre à jour la salle
      await db
        .update(rooms)
        .set({
          capacity: roomData.capacity || 0,
          surface: roomData.surface,
          equipment: roomData.equipment.map(item => ({
            name: item,
            available: true
          })),
          updatedAt: new Date(),
        })
        .where(eq(rooms.id, room.id));

      console.log(`  ✓ Mise à jour réussie:`);
      console.log(`    - Capacité: ${roomData.capacity || 'Non précisé'}`);
      console.log(`    - Équipements: ${roomData.equipment.length} éléments`);
    }

    console.log(`\n✅ ${roomsData.length} salles mises à jour avec succès!`);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des salles:', error);
    throw error;
  }
}

updateRoomsWithEquipment();
