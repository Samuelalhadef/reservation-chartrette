import nodemailer from 'nodemailer';

// Configuration avec port 465 et SSL pour éviter les problèmes de timeout
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: 465, // Port SSL au lieu de 587 (STARTTLS)
  secure: true, // SSL activé
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  connectionTimeout: 10000, // 10 secondes
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  // En développement local, si l'email échoue, on log simplement
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@reservation-chartrettes.fr',
      to,
      subject,
      html,
      text,
    });

    console.log('✅ Email envoyé avec succès:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);

    // En développement, on simule le succès et on log l'email
    if (isDev) {
      console.log('\n📧 [MODE DEV] Email qui aurait été envoyé:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      console.log('\n');

      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  reservationSubmitted: (userName: string, roomName: string, date: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Demande de réservation reçue</h2>
      <p>Bonjour ${userName},</p>
      <p>Nous avons bien reçu votre demande de réservation pour :</p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        <li><strong>Date :</strong> ${date}</li>
      </ul>
      <p>Votre demande est en cours d'examen. Vous recevrez une notification dès qu'un administrateur aura traité votre demande.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  reservationApproved: (userName: string, roomName: string, date: string, timeSlots: string, adminComment?: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Réservation approuvée</h2>
      <p>Bonjour ${userName},</p>
      <p>Excellente nouvelle ! Votre réservation a été approuvée :</p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        <li><strong>Date :</strong> ${date}</li>
        <li><strong>Créneaux :</strong> ${timeSlots}</li>
      </ul>
      ${adminComment ? `<p><strong>Message de l'administrateur :</strong><br/>${adminComment}</p>` : ''}
      <p>N'oubliez pas de respecter le règlement de la salle et de laisser les lieux propres après utilisation.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  reservationRejected: (userName: string, roomName: string, date: string, adminComment: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Réservation refusée</h2>
      <p>Bonjour ${userName},</p>
      <p>Nous sommes désolés de vous informer que votre demande de réservation a été refusée :</p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        <li><strong>Date :</strong> ${date}</li>
      </ul>
      <p><strong>Motif du refus :</strong><br/>${adminComment}</p>
      <p>Vous pouvez soumettre une nouvelle demande en tenant compte de ces informations.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  reservationReminder: (userName: string, roomName: string, date: string, timeSlots: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Rappel de réservation</h2>
      <p>Bonjour ${userName},</p>
      <p>Ceci est un rappel concernant votre réservation qui approche :</p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        <li><strong>Date :</strong> ${date}</li>
        <li><strong>Créneaux :</strong> ${timeSlots}</li>
      </ul>
      <p>Nous vous attendons ! N'oubliez pas de respecter le règlement de la salle.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  associationRequestSubmitted: (userName: string, associationName: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Demande d'ajout d'association reçue</h2>
      <p>Bonjour ${userName},</p>
      <p>Nous avons bien reçu votre demande d'ajout de l'association "${associationName}".</p>
      <p>Un administrateur va examiner votre demande. Vous recevrez une notification dès que votre association sera validée.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  associationApproved: (userName: string, associationName: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Association approuvée</h2>
      <p>Bonjour ${userName},</p>
      <p>Bonne nouvelle ! L'association "${associationName}" a été approuvée.</p>
      <p>Vous pouvez maintenant effectuer des réservations de salles.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  associationRejected: (userName: string, associationName: string, reason: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Demande d'association refusée</h2>
      <p>Bonjour ${userName},</p>
      <p>Nous sommes désolés de vous informer que la demande d'ajout de l'association "${associationName}" a été refusée.</p>
      <p><strong>Motif :</strong><br/>${reason}</p>
      <p>Vous pouvez nous contacter pour plus d'informations.</p>
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  verificationCode: (userName: string, code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Bienvenue !</h1>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Bonjour ${userName},</p>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Merci de vous être inscrit sur la plateforme de réservation de salles de Chartrettes.
        </p>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Pour finaliser votre inscription et vérifier votre adresse email, veuillez utiliser le code de vérification suivant :
        </p>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
          <p style="color: white; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px;">Code de vérification</p>
          <p style="color: white; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${code}
          </p>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>⚠️ Important :</strong> Ce code expirera dans <strong>15 minutes</strong>. Si vous n'avez pas demandé cette inscription, ignorez cet email.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 32px;">
          Cordialement,<br/>
          <strong style="color: #374151;">L'équipe de Réservation Chartrettes</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  `,
};
