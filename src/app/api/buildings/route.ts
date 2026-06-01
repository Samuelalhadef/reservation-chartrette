import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { buildings } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Par défaut, seuls les établissements actifs sont renvoyés.
    // ?activeOnly=false pour inclure les désactivés (usage admin).
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';
    const allBuildings = activeOnly
      ? await db.select().from(buildings).where(eq(buildings.isActive, true))
      : await db.select().from(buildings);
    return NextResponse.json(allBuildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}
