import { db, client } from '../src/lib/db';
import { associations, users, buildings, rooms } from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function initDatabase() {
  try {
    console.log('🚀 Initialisation de la base de données...\n');

    // Créer l'association test
    console.log('📝 Création de l\'association test...');
    const [testAssociation] = await db
      .insert(associations)
      .values({
        name: 'Association Test',
        description: 'Association de test pour le développement',
        status: 'active',
        contactName: 'Contact Test',
        contactEmail: 'test@association.fr',
        contactPhone: '01 23 45 67 89',
      })
      .returning()
      .catch(async () => {
        // Si l'association existe déjà, la récupérer
        return await db
          .select()
          .from(associations)
          .where(eq(associations.name, 'Association Test'))
          .limit(1);
      });
    console.log('✅ Association créée:', testAssociation.name);

    // Créer le compte admin
    console.log('\n🔐 Création du compte admin...');
    const hashedPassword = await bcrypt.hash('admin', 12);
    const [adminUser] = await db
      .insert(users)
      .values({
        name: 'Administrateur',
        email: 'admin@123',
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      })
      .returning()
      .catch(async () => {
        // Si l'admin existe déjà, le récupérer
        return await db
          .select()
          .from(users)
          .where(eq(users.email, 'admin@123'))
          .limit(1);
      });
    console.log('✅ Admin créé - Email: admin@123 / Mot de passe: admin');

    // Créer un utilisateur test
    console.log('\n👤 Création de l\'utilisateur test...');
    const hashedUserPassword = await bcrypt.hash('test123', 12);
    const [testUser] = await db
      .insert(users)
      .values({
        name: 'Utilisateur Test',
        email: 'user@test.fr',
        password: hashedUserPassword,
        role: 'user',
        associationId: testAssociation.id,
        emailVerified: new Date(),
      })
      .returning()
      .catch(async () => {
        return await db
          .select()
          .from(users)
          .where(eq(users.email, 'user@test.fr'))
          .limit(1);
      });
    console.log('✅ Utilisateur test créé - Email: user@test.fr / Mot de passe: test123');

    // Créer un bâtiment test
    console.log('\n🏢 Création du bâtiment test...');
    const [testBuilding] = await db
      .insert(buildings)
      .values({
        name: 'Mairie de Chartrettes',
        description: 'Bâtiment principal de la mairie',
        address: '1 Place de la Mairie, 77590 Chartrettes',
        isActive: true,
      })
      .returning()
      .catch(async () => {
        return await db
          .select()
          .from(buildings)
          .where(eq(buildings.name, 'Mairie de Chartrettes'))
          .limit(1);
      });
    console.log('✅ Bâtiment créé:', testBuilding.name);

    // Créer des salles test
    console.log('\n🚪 Création des salles...');
    const sampleRooms = [
      {
        name: 'Salle des fêtes',
        description: 'Grande salle polyvalente pour événements',
        capacity: 150,
        surface: 200.0,
      },
      {
        name: 'Salle du conseil',
        description: 'Salle de réunion municipale',
        capacity: 30,
        surface: 50.0,
      },
      {
        name: 'Salle associative',
        description: 'Petite salle pour les associations',
        capacity: 20,
        surface: 30.0,
      },
    ];

    for (const room of sampleRooms) {
      try {
        const [createdRoom] = await db
          .insert(rooms)
          .values({
            buildingId: testBuilding.id,
            ...room,
            equipment: [
              { name: 'Tables', available: true },
              { name: 'Chaises', available: true },
              { name: 'Projecteur', available: true },
            ],
            images: [],
            rules: 'Respecter les horaires et laisser la salle propre.',
            defaultTimeSlots: { start: '08:00', end: '22:00' },
            blockedDates: [],
            isActive: true,
          })
          .returning();
        console.log('  ✅', createdRoom.name);
      } catch (error) {
        console.log('  ⚠️', room.name, '(existe déjà)');
      }
    }

    console.log('\n✨ Base de données initialisée avec succès!\n');
    console.log('📌 Informations de connexion:');
    console.log('   Admin - Email: admin@123 | Mot de passe: admin');
    console.log('   User  - Email: user@test.fr | Mot de passe: test123\n');

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    await client.close();
    process.exit(1);
  }
}

initDatabase();
