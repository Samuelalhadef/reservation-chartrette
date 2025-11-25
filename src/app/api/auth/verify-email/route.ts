import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    // Validation
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Find user with this email and verification code
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase()),
          eq(users.verificationCode, code)
        )
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Code de vérification invalide' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (user.verificationCodeExpiry && new Date() > user.verificationCodeExpiry) {
      return NextResponse.json(
        { error: 'Le code de vérification a expiré. Veuillez vous réinscrire.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email déjà vérifié' },
        { status: 400 }
      );
    }

    // Verify the email
    await db
      .update(users)
      .set({
        emailVerified: new Date(),
        verificationCode: null,
        verificationCodeExpiry: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
