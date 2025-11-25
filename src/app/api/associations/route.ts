import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    let results;

    if (status) {
      results = await db
        .select()
        .from(associations)
        .where(eq(associations.status, status as 'active' | 'inactive' | 'pending'))
        .orderBy(associations.name);
    } else {
      // By default, only return active associations for public access
      results = await db
        .select()
        .from(associations)
        .where(eq(associations.status, 'active'))
        .orderBy(associations.name);
    }

    return NextResponse.json({ associations: results }, { status: 200 });
  } catch (error: any) {
    console.error('Get associations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.name || !data.description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Check if association already exists (case-insensitive)
    const existingAssociation = await db
      .select()
      .from(associations)
      .where(sql`lower(${associations.name}) = lower(${data.name})`)
      .limit(1);

    if (existingAssociation.length > 0) {
      return NextResponse.json(
        { error: 'An association with this name already exists' },
        { status: 409 }
      );
    }

    const [newAssociation] = await db
      .insert(associations)
      .values({
        name: data.name,
        description: data.description,
        address: data.address,
        socialPurpose: data.socialPurpose,
        presidentAddress: data.presidentAddress,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: 'pending', // Requires admin approval
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Association request submitted successfully',
        association: {
          id: newAssociation.id,
          name: newAssociation.name,
          status: newAssociation.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create association error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
