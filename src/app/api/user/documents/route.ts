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

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const documents = [];

    // Check if user has association
    if (user.associationId) {
      const [association] = await db
        .select()
        .from(associations)
        .where(eq(associations.id, user.associationId))
        .limit(1);

      if (association && association.conventionSignedAt) {
        documents.push({
          id: association.id,
          type: 'convention',
          title: 'Convention de mise à disposition 2025-2026',
          signedAt: association.conventionSignedAt,
          associationName: association.name,
          signatureUrl: association.conventionSignature,
        });
      }
    }

    return NextResponse.json(
      {
        documents,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          associationId: user.associationId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
