import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getConventionSettings } from '@/lib/conventionSettings';
import { getMairieSignatureDataUrl } from '@/lib/mairieSignature';
import { generateYearlyConventionPDF } from '@/lib/generateYearlyConventionPDF';

/**
 * POST /api/admin/conventions/validate-yearly
 * body: { associationId: string }
 *
 * Valide la convention annuelle d'une association (équivalent de
 * l'approbation d'une réservation ponctuelle) :
 *  - ajoute la signature du maire (validatedAt/By)
 *  - génère le PDF avec les deux signatures
 *  - l'envoie par email à l'association
 *
 * Réservé aux admins.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { associationId } = await req.json();
    if (!associationId) {
      return NextResponse.json({ error: 'associationId requis' }, { status: 400 });
    }

    const [association] = await db
      .select()
      .from(associations)
      .where(eq(associations.id, associationId))
      .limit(1);

    if (!association) {
      return NextResponse.json({ error: 'Association non trouvée' }, { status: 404 });
    }

    if (!association.yearlyConventionSignedAt || !association.yearlyConventionSignature) {
      return NextResponse.json(
        { error: "La convention annuelle n'a pas encore été signée par l'association" },
        { status: 400 }
      );
    }

    if (association.yearlyConventionValidatedAt) {
      return NextResponse.json(
        { error: 'Cette convention a déjà été validée' },
        { status: 400 }
      );
    }

    const validatedAt = new Date();

    // Marquer comme validée
    await db
      .update(associations)
      .set({
        yearlyConventionValidatedAt: validatedAt,
        yearlyConventionValidatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(associations.id, associationId));

    // Générer le PDF (2 signatures) et l'envoyer par email
    let emailSent = false;
    try {
      const [settings, mairieSignature] = await Promise.all([
        getConventionSettings(),
        getMairieSignatureDataUrl(),
      ]);

      const pdf = generateYearlyConventionPDF({
        association: {
          name: association.name,
          address: association.address || undefined,
          presidentName: association.contactName || undefined,
          email: association.contactEmail || undefined,
          phone: association.contactPhone || undefined,
        },
        signature: association.yearlyConventionSignature,
        signedAt: association.yearlyConventionSignedAt,
        mairieSignature,
        mairieValidatedAt: validatedAt,
        settings,
      });

      const recipient = association.contactEmail;
      if (recipient) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const safeName = association.name.replace(/\s+/g, '_');
        await sendEmail({
          to: recipient,
          subject: 'Convention annuelle validée',
          html: yearlyConventionValidatedEmail(association.contactName || association.name, association.name, settings.conventionYear),
          attachments: [
            {
              filename: `convention_annuelle_${safeName}.pdf`,
              content: pdfBase64,
              encoding: 'base64' as const,
              contentType: 'application/pdf',
            },
          ],
        });
        emailSent = true;
      }
    } catch (pdfError) {
      console.error('Génération/envoi PDF convention annuelle échoué:', pdfError);
      // La validation reste effective même si l'email échoue.
    }

    return NextResponse.json({
      success: true,
      validatedAt,
      emailSent,
      message: 'Convention annuelle validée',
    });
  } catch (error: any) {
    console.error('POST validate-yearly error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function yearlyConventionValidatedEmail(contactName: string, associationName: string, year: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Convention annuelle validée</h2>
      <p>Bonjour ${contactName},</p>
      <p>La convention annuelle de mise à disposition de l'association <strong>${associationName}</strong> pour la saison ${year} a été validée par la Mairie de Chartrettes.</p>
      <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #065f46;">
          📄 <strong>Votre convention</strong>, signée par votre association et par la Mairie, est jointe à cet email au format PDF. Conservez-la précieusement.
        </p>
      </div>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `;
}
