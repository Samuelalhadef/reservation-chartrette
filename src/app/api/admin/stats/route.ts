import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db, client } from '@/lib/db';
import { reservations, rooms, associations, users } from '@/lib/db/schema';
import { eq, gte, and, inArray, sql, count } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all'; // week, month, year, all

    const now = new Date();
    let startDate = new Date(0); // Default to beginning of time for 'all'

    switch (period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // All time
        break;
    }

    // Total counts using aggregation
    const [totalReservationsResult] = await db.select({ count: count() }).from(reservations);
    const totalReservations = totalReservationsResult.count;

    const [totalRoomsResult] = await db.select({ count: count() }).from(rooms).where(eq(rooms.isActive, true));
    const totalRooms = totalRoomsResult.count;

    const [totalAssociationsResult] = await db.select({ count: count() }).from(associations).where(eq(associations.status, 'active'));
    const totalAssociations = totalAssociationsResult.count;

    const [totalUsersResult] = await db.select({ count: count() }).from(users).where(eq(users.role, 'user'));
    const totalUsers = totalUsersResult.count;

    // Pending requests
    const [pendingReservationsResult] = await db.select({ count: count() }).from(reservations).where(eq(reservations.status, 'pending'));
    const pendingReservations = pendingReservationsResult.count;

    const [pendingAssociationsResult] = await db.select({ count: count() }).from(associations).where(eq(associations.status, 'pending'));
    const pendingAssociations = pendingAssociationsResult.count;

    // Status breakdown using raw SQL for GROUP BY
    const statusBreakdown = await client.execute(`
      SELECT status as _id, COUNT(*) as count
      FROM reservations
      GROUP BY status
    `);

    // Reservations by room
    const reservationsByRoom = await client.execute(`
      SELECT r.name as roomName, COUNT(res.id) as count
      FROM reservations res
      LEFT JOIN rooms r ON res.room_id = r.id
      WHERE res.date >= ${startDate.getTime()} AND res.status IN ('approved', 'pending')
      GROUP BY res.room_id, r.name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top associations
    const topAssociations = await client.execute(`
      SELECT a.name as associationName, COUNT(res.id) as count
      FROM reservations res
      LEFT JOIN associations a ON res.association_id = a.id
      WHERE res.date >= ${startDate.getTime()} AND res.status IN ('approved', 'pending')
      GROUP BY res.association_id, a.name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Reservations over time
    const dateFormat = period === 'year' ? '%Y-%m' : '%Y-%m-%d';
    const reservationsOverTime = await client.execute(`
      SELECT strftime('${dateFormat}', datetime(date / 1000, 'unixepoch')) as _id, COUNT(*) as count
      FROM reservations
      WHERE date >= ${startDate.getTime()}
      GROUP BY strftime('${dateFormat}', datetime(date / 1000, 'unixepoch'))
      ORDER BY _id ASC
    `);

    // Acceptance rate
    const acceptanceStats = await client.execute(`
      SELECT status as _id, COUNT(*) as count
      FROM reservations
      WHERE status IN ('approved', 'rejected')
      GROUP BY status
    `);

    const approved = (acceptanceStats.rows as any[]).find((s: any) => s._id === 'approved')?.count || 0;
    const rejected = (acceptanceStats.rows as any[]).find((s: any) => s._id === 'rejected')?.count || 0;
    const acceptanceRate = approved + rejected > 0 ? (approved / (approved + rejected)) * 100 : 0;

    return NextResponse.json(
      {
        summary: {
          totalReservations,
          totalRooms,
          totalAssociations,
          totalUsers,
          pendingReservations,
          pendingAssociations,
          acceptanceRate: Math.round(acceptanceRate),
        },
        statusBreakdown: statusBreakdown.rows,
        reservationsByRoom: reservationsByRoom.rows,
        topAssociations: topAssociations.rows,
        reservationsOverTime: reservationsOverTime.rows,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
