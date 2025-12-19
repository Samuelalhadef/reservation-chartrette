import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, associations } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail, emailTemplates } from '@/lib/email';
import { sanitizeValue } from '@/lib/db/utils';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, userType, associationId, newAssociation, address, isChartrettesResident } = await req.json();

    // Debug logging
    console.log('🔍 DEBUG - Received data:', JSON.stringify({
      userType,
      associationId,
      address,
      typeofAssociationId: typeof associationId,
      typeofAddress: typeof address,
    }, null, 2));

    // Sanitize empty strings to null to prevent SQLite type errors
    const sanitizedAssociationId = sanitizeValue(associationId);
    const sanitizedAddress = sanitizeValue(address);

    console.log('🔍 DEBUG - After sanitization:', JSON.stringify({
      sanitizedAssociationId,
      sanitizedAddress,
      typeofSanitizedAssociationId: typeof sanitizedAssociationId,
      typeofSanitizedAddress: typeof sanitizedAddress,
    }, null, 2));

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    let finalAssociationId = sanitizedAssociationId;
    let userRole: 'user' | 'admin' | 'particulier' = 'user'; // Par défaut pour les associations

    // Handle particulier users
    if (userType === 'particulier') {
      userRole = 'particulier';
      finalAssociationId = null; // Les particuliers n'ont pas d'association

      // Validation de l'adresse pour les particuliers
      if (!sanitizedAddress) {
        return NextResponse.json(
          { error: 'Address is required for particulier users' },
          { status: 400 }
        );
      }
    } else {
      // Association users
      // If requesting new association
      if (newAssociation && !sanitizedAssociationId) {
        if (!newAssociation.name || !newAssociation.description) {
          return NextResponse.json(
            { error: 'Association name and description are required' },
            { status: 400 }
          );
        }

        // Create new association with pending status
        const [association] = await db
          .insert(associations)
          .values({
            name: newAssociation.name,
            description: newAssociation.description,
            address: newAssociation.address,
            socialPurpose: newAssociation.socialPurpose,
            presidentAddress: newAssociation.presidentAddress,
            contactName: newAssociation.contactName || name,
            contactEmail: newAssociation.contactEmail || email,
            contactPhone: newAssociation.contactPhone,
            status: 'pending',
          })
          .returning();

        finalAssociationId = association.id;
      } else if (sanitizedAssociationId) {
        // Verify association exists and is active
        const [association] = await db
          .select()
          .from(associations)
          .where(eq(associations.id, sanitizedAssociationId))
          .limit(1);

        if (!association) {
          return NextResponse.json(
            { error: 'Association not found' },
            { status: 404 }
          );
        }
        if (association.status !== 'active') {
          return NextResponse.json(
            { error: 'Association is not active' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Association selection is required' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user (email not verified yet)
    // Build values object conditionally - omit keys that should be null
    const userValues: any = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      verificationCode,
      verificationCodeExpiry,
      isChartrettesResident: userType === 'particulier' ? (isChartrettesResident ?? false) : false,
    };

    // Only add these fields if they have actual values
    // For libSQL/Turso, it's better to omit the field than to pass null
    if (finalAssociationId) {
      userValues.associationId = finalAssociationId;
    }

    if (userType === 'particulier' && sanitizedAddress) {
      userValues.address = sanitizedAddress;
    }

    // Debug logging
    console.log('🔍 DEBUG - User values before insert:', JSON.stringify({
      userValues,
      hasAssociationId: 'associationId' in userValues,
      hasAddress: 'address' in userValues,
      hasEmailVerified: 'emailVerified' in userValues,
    }, null, 2));

    const [user] = await db
      .insert(users)
      .values(userValues)
      .returning();

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Vérifiez votre adresse email - Réservation Chartrettes',
        html: emailTemplates.verificationCode(name, verificationCode),
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue even if email fails in dev
      if (process.env.NODE_ENV !== 'development') {
        // In production, delete the user if email fails
        await db.delete(users).where(eq(users.id, user.id));
        throw new Error('Failed to send verification email. Please try again.');
      }
    }

    return NextResponse.json(
      {
        message: 'User created successfully. Please check your email for the verification code.',
        requiresVerification: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          associationId: user.associationId,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
