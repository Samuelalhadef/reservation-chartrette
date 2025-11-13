import { db, client } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function checkAdmin() {
  try {
    console.log('🔍 Vérification du compte admin...\n');

    // Chercher l'admin par email
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@123'))
      .limit(1);

    if (admin) {
      console.log('✅ Compte admin trouvé:');
      console.log('   ID:', admin.id);
      console.log('   Nom:', admin.name);
      console.log('   Email:', admin.email);
      console.log('   Rôle:', admin.role);
      console.log('   Mot de passe hashé:', admin.password ? 'Oui' : 'Non');

      // Tester le mot de passe
      if (admin.password) {
        const isValid = await bcrypt.compare('admin', admin.password);
        console.log('   Test mot de passe "admin":', isValid ? '✅ VALIDE' : '❌ INVALIDE');
      }
    } else {
      console.log('❌ Aucun compte admin trouvé avec email admin@123');

      // Chercher tous les admins
      const allAdmins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'));

      if (allAdmins.length > 0) {
        console.log('\n📋 Comptes admin existants:');
        allAdmins.forEach((user) => {
          console.log('   -', user.email, '(' + user.name + ')');
        });
      }
    }

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    await client.close();
    process.exit(1);
  }
}

checkAdmin();
