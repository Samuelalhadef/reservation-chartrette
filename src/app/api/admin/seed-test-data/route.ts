import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Créer ou récupérer l'association de test
    let testAssociation = await db
      .select()
      .from(associations)
      .where(sql`lower(${associations.name}) = lower('Association Test')`)
      .limit(1);

    if (!testAssociation.length) {
      const [newAssoc] = await db
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
      testAssociation = [newAssoc];
      console.log('✓ Association test créée');
    } else {
      // Mettre à jour le statut si nécessaire
      if (testAssociation[0].status !== 'active') {
        const [updated] = await db
          .update(associations)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(associations.id, testAssociation[0].id))
          .returning();
        testAssociation = [updated];
        console.log('✓ Association test mise à jour');
      }
    }

    // Créer un utilisateur de test lié à cette association
    let testUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'user@test.fr'))
      .limit(1);

    if (!testUser.length) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          name: 'Utilisateur Test',
          email: 'user@test.fr',
          password: hashedPassword,
          role: 'user',
          associationId: testAssociation[0].id,
          emailVerified: new Date(),
        })
        .returning();
      testUser = [newUser];
      console.log('✓ Utilisateur test créé');
    }

    // Créer un admin de test
    let adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@123'))
      .limit(1);

    if (!adminUser.length) {
      const hashedPassword = await bcrypt.hash('admin', 12);
      const [newAdmin] = await db
        .insert(users)
        .values({
          name: 'Administrateur',
          email: 'admin@123',
          password: hashedPassword,
          role: 'admin',
          emailVerified: new Date(),
        })
        .returning();
      adminUser = [newAdmin];
      console.log('✓ Admin créé (admin@123 / admin)');
    }

    return NextResponse.json(
      {
        message: 'Données de test créées avec succès',
        data: {
          association: {
            id: testAssociation[0].id,
            name: testAssociation[0].name,
            status: testAssociation[0].status,
          },
          users: [
            {
              email: testUser[0].email,
              password: 'test123',
              role: testUser[0].role,
              associationId: testUser[0].associationId,
            },
            {
              email: adminUser[0].email,
              password: 'admin',
              role: adminUser[0].role,
            }
          ]
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Seed test data error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
