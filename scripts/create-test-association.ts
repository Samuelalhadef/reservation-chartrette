import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { associations } from '../src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(__dirname, '../.env.local') });

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN n\'est pas défini dans .env.local');
  process.exit(1);
}

async function createTestAssociation() {
  try {
    console.log('Connexion à Turso...');
    console.log('✓ Connecté à Turso');

    // Vérifier si l'association test existe déjà
    const existingAssociation = await db
      .select()
      .from(associations)
      .where(sql`lower(${associations.name}) = lower('Association Test')`)
      .limit(1);

    if (existingAssociation.length > 0) {
      const assoc = existingAssociation[0];
      console.log('\n⚠️  Une association test existe déjà:');
      console.log('ID:', assoc.id);
      console.log('Nom:', assoc.name);
      console.log('Statut:', assoc.status);
      console.log('\nSi vous voulez la supprimer, utilisez cet ID.');

      // Mettre à jour le statut si ce n'est pas "active"
      if (assoc.status !== 'active') {
        await db
          .update(associations)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(associations.id, assoc.id));
        console.log('\n✓ Statut mis à jour vers "active"');
      }

      return;
    }

    // Créer une nouvelle association de test
    const [testAssociation] = await db
      .insert(associations)
      .values({
        name: 'Association Test',
        description: 'Association de test pour le développement et les démonstrations',
        status: 'active',
        contactName: 'Contact Test',
        contactEmail: 'test@association.fr',
        contactPhone: '01 23 45 67 89',
      })
      .returning();

    console.log('\n✓ Association de test créée avec succès!');
    console.log('\nDétails:');
    console.log('ID:', testAssociation.id);
    console.log('Nom:', testAssociation.name);
    console.log('Description:', testAssociation.description);
    console.log('Statut:', testAssociation.status);
    console.log('Email:', testAssociation.contactEmail);
    console.log('Téléphone:', testAssociation.contactPhone);
    console.log('\n⚠️  Notez cet ID pour créer un utilisateur associé à cette association.');

    console.log('\n✓ Terminé');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createTestAssociation();
