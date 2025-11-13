import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's association
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.associationId) {
      return NextResponse.json(
        { error: 'User must be associated with an association' },
        { status: 400 }
      );
    }

    // Get association details
    const [association] = await db
      .select()
      .from(associations)
      .where(eq(associations.id, user.associationId))
      .limit(1);

    if (!association || !association.conventionSignedAt) {
      return NextResponse.json(
        { error: 'Convention not found or not signed' },
        { status: 404 }
      );
    }

    // Return data for PDF generation on client side
    return NextResponse.json(
      {
        association: {
          id: association.id,
          name: association.name,
          contactName: association.contactName,
          contactEmail: association.contactEmail,
          contactPhone: association.contactPhone,
          description: association.description,
          conventionSignedAt: association.conventionSignedAt,
          conventionSignature: association.conventionSignature,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get convention PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
