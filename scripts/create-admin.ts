import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';

async function createAdmin() {
  const email = 'admin@chartrettes.fr';
  const password = 'Admin1234!';
  const name = 'Administrateur';

  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  if (existing.length > 0) {
    // Update existing user to admin
    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
    console.log(`✅ Utilisateur existant mis à jour en admin: ${email}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      emailVerified: new Date(),
    })
    .returning();

  console.log(`✅ Compte admin créé avec succès!`);
  console.log(`   Email: ${email}`);
  console.log(`   Nom: ${name}`);
  console.log(`   Rôle: admin`);
  console.log(`   ID: ${user.id}`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
