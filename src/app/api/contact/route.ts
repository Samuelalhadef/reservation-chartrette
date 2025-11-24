import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Envoyer l'email
    await sendEmail({
      to: 'samuel.alhadef@edu.devinci.fr',
      subject: `[Réservation Chartrettes] Question de ${name}`,
      text: `Vous avez reçu un nouveau message de la part de ${name} (${email}):\n\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouveau message de contact</h2>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>De:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Message:</h3>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Ce message a été envoyé depuis le système de réservation de salles de Chartrettes.
            </p>
          </div>
        </div>
      `,
    });

    // Envoyer un email de confirmation à l'expéditeur
    await sendEmail({
      to: email,
      subject: 'Confirmation de votre message - Réservation Chartrettes',
      text: `Bonjour ${name},\n\nNous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.\n\nVotre message:\n${message}\n\nCordialement,\nL'équipe de Réservation Chartrettes`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Message bien reçu</h2>

          <p style="color: #374151; line-height: 1.6;">Bonjour ${name},</p>

          <p style="color: #374151; line-height: 1.6;">
            Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.
          </p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Votre message:</h3>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #374151; line-height: 1.6;">
            Cordialement,<br>
            <strong>L'équipe de Réservation Chartrettes</strong>
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Ce message a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json(
      { message: 'Message envoyé avec succès' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
