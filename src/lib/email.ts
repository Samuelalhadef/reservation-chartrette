import nodemailer from 'nodemailer';

// --- Adresses ---------------------------------------------------------------
// Deux adresses distinctes, avec deux rôles différents :
//
// FROM_ADDRESS (var. EMAIL_FROM) : adresse technique d'expédition. C'est le
//   service informatique de la mairie qui porte la boîte SMTP, donc tous les
//   mails de l'application partent de là — confirmations de réservation,
//   codes de vérification, notifications d'approbation/refus.
//   Attention : le serveur SMTP réécrit le From vers le compte authentifié
//   (EMAIL_SERVER_USER) si cette adresse n'est pas la sienne ou un de ses alias
//   autorisés. EMAIL_FROM doit donc correspondre au compte configuré.
//
// MAIRIE_EMAIL (var. EMAIL_ADMIN) : contact métier. Destinataire des
//   notifications admin (formulaire de contact, demandes de réservation à
//   l'année) ET adresse de réponse (Reply-To) des mails sortants : quand une
//   association répond à une confirmation, le message part vers l'animateur
//   culturel, pas vers le service informatique.
//
// Les littéraux servent de repli si la variable d'env est absente, pour ne pas
// dépendre d'une configuration prod incomplète.
export const MAIRIE_EMAIL =
  process.env.EMAIL_ADMIN?.trim() || 'animateur.culturel@mairie-chartrettes.fr';

const FROM_ADDRESS =
  process.env.EMAIL_FROM?.trim() || 'serviceinformatique@mairie-chartrettes.fr';
const FROM_NAME = process.env.EMAIL_FROM_NAME?.trim() || 'Réservation Chartrettes';

/** En-tête From complet, ex : "Réservation Chartrettes" <adresse@exemple.fr> */
export const EMAIL_FROM = `"${FROM_NAME}" <${FROM_ADDRESS}>`;

// --- Transport SMTP ---------------------------------------------------------
// Port 465 (SSL implicite) par défaut : évite les timeouts observés en 587
// (STARTTLS). Surchargeable via EMAIL_SERVER_PORT si le serveur de la mairie
// n'expose que 587.
const SMTP_PORT = Number(process.env.EMAIL_SERVER_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // SSL implicite en 465, STARTTLS sinon
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  connectionTimeout: 10000, // 10 secondes
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

interface EmailAttachment {
  filename: string;
  /** Contenu binaire (Buffer) ou base64 si encoding fourni */
  content: Buffer | string;
  contentType?: string;
  encoding?: 'base64';
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** Adresse de réponse spécifique (par défaut : MAIRIE_EMAIL). */
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, attachments, replyTo }: EmailOptions) {
  // En développement local, si l'email échoue, on log simplement
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      // Les réponses des associations doivent arriver à la mairie, même si
      // l'expéditeur technique est une adresse noreply.
      replyTo: replyTo || MAIRIE_EMAIL,
      to,
      subject,
      html,
      text,
      attachments,
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

  // Récapitulatif unique pour une demande de réservation à l'année :
  // un seul email listant la période, les créneaux hebdomadaires récurrents
  // et le détail de toutes les dates réservées avec leurs horaires.
  yearlyReservationSubmitted: (
    userName: string,
    roomName: string,
    associationName: string,
    periodLabel: string,
    count: number,
    weeklySummaryHtml: string,
    datesListHtml: string,
    isApproved: boolean,
    // Dates demandées alors qu'un autre créneau est déjà pris : la mairie doit arbitrer.
    conflictsListHtml?: string
  ) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Demande de réservation à l'année reçue</h2>
      <p>Bonjour ${userName},</p>
      <p>Nous avons bien reçu votre demande de réservation à l'année pour :</p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        <li><strong>Association :</strong> ${associationName}</li>
        <li><strong>Période :</strong> ${periodLabel}</li>
        <li><strong>Nombre de créneaux réservés :</strong> ${count}</li>
      </ul>

      <h3 style="color: #2563eb; margin-top: 24px;">Créneaux hebdomadaires</h3>
      <ul>
        ${weeklySummaryHtml}
      </ul>

      <h3 style="color: #2563eb; margin-top: 24px;">Détail de toutes les dates réservées</h3>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Date</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Horaires</th>
          </tr>
        </thead>
        <tbody>
          ${datesListHtml}
        </tbody>
      </table>

      ${conflictsListHtml
        ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; color: #991b1b;">
          ⚠️ <strong>Dates déjà réservées par un autre demandeur</strong>
        </p>
        <p style="margin: 0 0 8px 0; color: #7f1d1d;">
          La demande a été transmise à la mairie pour arbitrage. Ces dates ne sont pas
          acquises tant qu'un administrateur n'a pas tranché entre les demandes.
        </p>
        <ul style="margin: 0; color: #7f1d1d;">
          ${conflictsListHtml}
        </ul>
      </div>`
        : ''}

      ${isApproved
        ? `<p style="margin-top: 24px;">Ces réservations ont été <strong>automatiquement approuvées</strong>.</p>`
        : `<p style="margin-top: 24px;">Votre demande est en cours d'examen. Vous recevrez une notification dès qu'un administrateur l'aura traitée.</p>`}
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  /**
   * Décision de la mairie sur une demande couvrant plusieurs dates (réservation
   * à l'année). Un seul email récapitulatif, quel que soit le nombre de dates.
   */
  seriesDecision: (
    userName: string,
    roomName: string,
    associationName: string,
    periodLabel: string,
    count: number,
    datesListHtml: string,
    decision: 'approved' | 'rejected',
    adminComment?: string
  ) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${decision === 'approved' ? '#16a34a' : '#dc2626'};">
        ${decision === 'approved' ? 'Réservations approuvées' : 'Demande de réservation refusée'}
      </h2>
      <p>Bonjour ${userName},</p>
      <p>
        ${decision === 'approved'
          ? `Votre demande de réservation a été <strong>approuvée</strong> par la mairie pour l'ensemble des dates ci-dessous :`
          : `Votre demande de réservation n'a pas pu être retenue pour les dates ci-dessous :`}
      </p>
      <ul>
        <li><strong>Salle :</strong> ${roomName}</li>
        ${associationName ? `<li><strong>Association :</strong> ${associationName}</li>` : ''}
        <li><strong>Période :</strong> ${periodLabel}</li>
        <li><strong>Nombre de créneaux :</strong> ${count}</li>
      </ul>

      ${adminComment
        ? `<p><strong>${decision === 'approved' ? 'Message de la mairie' : 'Motif du refus'} :</strong><br/>${adminComment}</p>`
        : ''}

      <h3 style="color: #2563eb; margin-top: 24px;">Détail des dates concernées</h3>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Date</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Horaires</th>
          </tr>
        </thead>
        <tbody>
          ${datesListHtml}
        </tbody>
      </table>

      ${decision === 'approved'
        ? `<p style="margin-top: 24px;">N'oubliez pas de respecter le règlement de la salle et de laisser les lieux propres après chaque utilisation.</p>`
        : `<p style="margin-top: 24px;">Vous pouvez soumettre une nouvelle demande en tenant compte de ces informations.</p>`}
      <p>Cordialement,<br/>L'équipe de Réservation Chartrettes</p>
    </div>
  `,

  reservationApproved: (userName: string, roomName: string, date: string, timeSlots: string, adminComment?: string, hasConvention?: boolean) => `
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
      ${hasConvention ? `
      <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #065f46;">
          📄 <strong>Votre convention de mise à disposition</strong>, signée par vous et par la Mairie, est jointe à cet email au format PDF. Conservez-la précieusement.
        </p>
      </div>` : ''}
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
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code de vérification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px;">

              <!-- Header -->
              <tr>
                <td style="background-color: #2563eb; padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Bienvenue !</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Bonjour <strong>${userName}</strong>,
                  </p>

                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Merci de vous être inscrit sur la plateforme de réservation de salles de Chartrettes.
                  </p>

                  <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Pour finaliser votre inscription et vérifier votre adresse email, veuillez utiliser le code de vérification suivant :
                  </p>

                  <!-- Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                    <tr>
                      <td style="background-color: #2563eb; padding: 30px; text-align: center;">
                        <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                          CODE DE VÉRIFICATION
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 42px; font-weight: bold; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">
                          ${code}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                    <tr>
                      <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                          <strong>⚠️ Important :</strong> Ce code expirera dans <strong>15 minutes</strong>. Si vous n'avez pas demandé cette inscription, ignorez cet email.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Cordialement,<br/>
                    <strong style="color: #374151;">L'équipe de Réservation Chartrettes</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
};
