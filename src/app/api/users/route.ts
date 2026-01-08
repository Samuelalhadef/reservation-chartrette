import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, associations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active users
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      associationId: users.associationId,
    }).from(users);

    // Get all associations
    const allAssociations = await db.select({
      id: associations.id,
      name: associations.name,
    }).from(associations)
      .where(eq(associations.status, 'active'));

    // Format users with their association names
    const formattedUsers = await Promise.all(
      allUsers.map(async (user) => {
        let associationName = null;
        if (user.associationId) {
          const assoc = allAssociations.find(a => a.id === user.associationId);
          associationName = assoc?.name || null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          associationId: user.associationId,
          associationName,
        };
      })
    );

    return NextResponse.json({
      users: formattedUsers,
      associations: allAssociations,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
