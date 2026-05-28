import { NextResponse } from 'next/server';
import { getConventionSettings } from '@/lib/conventionSettings';

/**
 * GET /api/convention-settings
 *
 * Endpoint PUBLIC en lecture seule — utilisé par le modal de signature et
 * par les vues qui génèrent le PDF (côté user). Le PUT est sur la route admin.
 */
export async function GET() {
  try {
    const settings = await getConventionSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('GET /api/convention-settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
