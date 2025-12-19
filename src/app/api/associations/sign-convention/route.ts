import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.signature) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
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

    // Update association with signature and timestamp
    const [updatedAssociation] = await db
      .update(associations)
      .set({
        conventionSignedAt: new Date(),
        conventionSignature: data.signature,
        updatedAt: new Date(),
      })
      .where(eq(associations.id, user.associationId))
      .returning();

    return NextResponse.json(
      {
        message: 'Convention signed successfully',
        association: {
          id: updatedAssociation.id,
          conventionSignedAt: updatedAssociation.conventionSignedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Sign convention error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
