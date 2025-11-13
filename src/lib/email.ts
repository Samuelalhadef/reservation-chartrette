import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@reservation-chartrettes.fr',
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
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
};
