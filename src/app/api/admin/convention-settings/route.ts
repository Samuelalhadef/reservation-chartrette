import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getConventionSettings,
  upsertConventionSettings,
  DEFAULT_CONVENTION_SETTINGS,
} from '@/lib/conventionSettings';

/**
 * GET / PUT /api/admin/convention-settings
 * Réservé aux admins. Le GET public sans auth est sur /api/convention-settings.
 */

async function requireAdmin() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await getConventionSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const allowedKeys = Object.keys(DEFAULT_CONVENTION_SETTINGS);
    const sanitized: Record<string, string> = {};
    for (const k of allowedKeys) {
      if (typeof body[k] === 'string' && body[k].trim()) {
        sanitized[k] = body[k].trim();
      }
    }
    const settings = await upsertConventionSettings(sanitized as any);
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('PUT /api/admin/convention-settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
