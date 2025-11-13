import { db, client } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function updateAdminEmail() {
  try {
    console.log('🔄 Mise à jour de l\'email admin...');

    // Supprimer l'ancien admin avec email "admin123"
    const deleted = await db
      .delete(users)
      .where(eq(users.email, 'admin123'))
      .returning();

    if (deleted.length > 0) {
      console.log('✅ Ancien compte admin (admin123) supprimé');
    }

    console.log('✅ Email admin mis à jour: admin@123');
    console.log('\n📌 Nouvelles informations de connexion:');
    console.log('   Email: admin@123');
    console.log('   Mot de passe: admin\n');

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    await client.close();
    process.exit(1);
  }
}

updateAdminEmail();
