import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // Vérifier si l'association "Mairie de Chartrettes" existe déjà
    const existing = await db
      .select()
      .from(associations)
      .where(sql`lower(${associations.name}) = lower('Mairie de Chartrettes')`)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          message: 'L\'association "Mairie de Chartrettes" existe déjà',
          association: existing[0],
        },
        { status: 200 }
      );
    }

    // Créer l'association "Mairie de Chartrettes" avec le statut "active"
    const [newAssoc] = await db
      .insert(associations)
      .values({
        name: 'Mairie de Chartrettes',
        description: 'Association officielle de la Mairie de Chartrettes pour les réservations administratives',
        status: 'active',
        contactName: 'Mairie de Chartrettes',
        contactEmail: 'mairie@chartrettes.fr',
        contactPhone: null,
        conventionSignedAt: new Date(), // Convention considérée comme signée automatiquement
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Association "Mairie de Chartrettes" créée avec succès',
        association: newAssoc,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Mairie association error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
