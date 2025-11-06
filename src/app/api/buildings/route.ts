import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildings } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const allBuildings = await db.select().from(buildings);
    return NextResponse.json(allBuildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}
