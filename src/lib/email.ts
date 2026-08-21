import nodemailer from 'nodemailer';
import { db, client } from '@/lib/db';
import { emailQueue } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

// --- Adresses ---------------------------------------------------------------
// Deux adresses distinctes, avec deux rôles différents :
//
// FROM_ADDRESS (var. EMAIL_FROM) : adresse technique d'expédition de tous les
//   mails de l'application — confirmations de réservation, codes de
//   vérification, notifications d'approbation/refus.
//   Elle porte le domaine du service de réservation, et non celui de la mairie :
//   l'envoi passe par Resend, qui n'accepte que des domaines vérifiés chez lui,
//   et la zone mairie-chartrettes.fr n'est pas administrée par le projet.
//   Attention : un relais SMTP réécrit ou rejette le From si le domaine n'est
//   pas un de ceux qu'il a validés. EMAIL_FROM doit donc rester sur un domaine
//   vérifié côté relais.
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
  process.env.EMAIL_FROM?.trim() || 'reservation@chartrettes-reservation-salle.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME?.trim() || 'Réservation Chartrettes';

/** En-tête From complet, ex : "Réservation Chartrettes" <adresse@exemple.fr> */
export const EMAIL_FROM = `"${FROM_NAME}" <${FROM_ADDRESS}>`;

// --- Transport SMTP ---------------------------------------------------------
// Deux modes d'authentification, choisis selon la configuration présente :
//
//   OAuth2 (client credentials) dès que EMAIL_OAUTH_TENANT_ID / _CLIENT_ID /
//     _CLIENT_SECRET sont renseignés. C'est le mode imposé par Microsoft 365 :
//     les « Security Defaults » du tenant refusent l'authentification par mot de
//     passe (535 5.7.139), et Microsoft désactive de toute façon l'auth basique
//     SMTP par défaut fin décembre 2026.
//
//   Mot de passe (EMAIL_SERVER_PASSWORD) sinon, pour un SMTP classique.
//
// Port 465 (SSL implicite) par défaut : évite les timeouts observés en 587
// (STARTTLS). Microsoft 365 n'écoute en revanche que sur 587 et 25, il faut donc
// y poser explicitement EMAIL_SERVER_PORT=587.
const SMTP_PORT = Number(process.env.EMAIL_SERVER_PORT) || 465;

const OAUTH_TENANT_ID = process.env.EMAIL_OAUTH_TENANT_ID?.trim();
const OAUTH_CLIENT_ID = process.env.EMAIL_OAUTH_CLIENT_ID?.trim();
const OAUTH_CLIENT_SECRET = process.env.EMAIL_OAUTH_CLIENT_SECRET?.trim();
const USE_OAUTH = Boolean(OAUTH_TENANT_ID && OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET);

const SMTP_OPTIONS = {
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // SSL implicite en 465, STARTTLS sinon
  connectionTimeout: 10000, // 10 secondes
  greetingTimeout: 10000,
  socketTimeout: 10000,
};

type Transporter = ReturnType<typeof nodemailer.createTransport>;

const passwordTransporter: Transporter = nodemailer.createTransport({
  ...SMTP_OPTIONS,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

// Entra ID délivre un jeton valable ~1 h. On le garde en cache et on le renouvelle
// une minute avant l'échéance, plutôt que de rappeler le serveur d'autorisation à
// chaque envoi.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${OAUTH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OAUTH_CLIENT_ID!,
        client_secret: OAUTH_CLIENT_SECRET!,
        // Portée SMTP d'Exchange Online — ce n'est pas celle de Microsoft Graph.
        scope: 'https://outlook.office365.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Jeton OAuth2 refusé (${response.status}) : ${data.error_description || data.error}`
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

// Le jeton fait partie des options du transport : on ne le reconstruit que quand
// le jeton lui-même a changé.
let oauthTransporter: { token: string; transport: Transporter } | null = null;

async function getTransporter(): Promise<Transporter> {
  if (!USE_OAUTH) return passwordTransporter;

  const accessToken = await getAccessToken();

  if (!oauthTransporter || oauthTransporter.token !== accessToken) {
    oauthTransporter = {
      token: accessToken,
      transport: nodemailer.createTransport({
        ...SMTP_OPTIONS,
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_SERVER_USER,
          accessToken,
        },
      }),
    };
  }

  return oauthTransporter.transport;
}

// --- Quota quotidien et file d'attente ------------------------------------
// Le fournisseur d'envoi plafonne le nombre de messages par jour (100 sur
// l'offre gratuite de Resend). Au-delà, il rejette les envois : sans garde-fou,
// une confirmation de réservation ou un code de vérification serait purement
// perdu. On compte donc les envois de la journée et on met les suivants de côté
// en base ; ils repartent seuls quand le compteur repart à zéro, le lendemain.
const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT) || 100;

/**
 * Journée de comptage, en UTC.
 *
 * C'est à minuit UTC que le fournisseur remet son compteur à zéro. Compter en
 * heure de Paris rouvrirait le quota à 22 h UTC, soit deux heures avant lui, et
 * les envois de cette fenêtre seraient rejetés.
 */
function quotaDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Réserve un envoi sur le quota du jour.
 *
 * L'incrément et le test sont faits dans la même instruction SQL : deux requêtes
 * simultanées ne peuvent pas lire le même compteur et le dépasser toutes les
 * deux. On réserve avant d'envoyer, quitte à rendre le crédit si l'envoi échoue.
 */
async function reserveQuota(): Promise<boolean> {
  const day = quotaDay();
  const result = await client.execute({
    sql: `INSERT INTO email_quota (day, sent) VALUES (?, 1)
          ON CONFLICT(day) DO UPDATE SET sent = sent + 1
          WHERE email_quota.sent < ?
          RETURNING sent`,
    args: [day, DAILY_LIMIT],
  });
  return result.rows.length > 0;
}

/** Rend le crédit réservé quand l'envoi a finalement échoué. */
async function releaseQuota(): Promise<void> {
  await client.execute({
    sql: `UPDATE email_quota SET sent = MAX(sent - 1, 0) WHERE day = ?`,
    args: [quotaDay()],
  });
}

/** Nombre d'envois déjà consommés aujourd'hui. */
async function sentToday(): Promise<number> {
  const result = await client.execute({
    sql: 'SELECT sent FROM email_quota WHERE day = ?',
    args: [quotaDay()],
  });
  return Number(result.rows[0]?.sent ?? 0);
}

/** État du quota et de la file, pour l'affichage administrateur. */
export async function getEmailQuotaStatus() {
  const [used, pending] = await Promise.all([
    sentToday(),
    client.execute("SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM email_queue WHERE status = 'pending'"),
  ]);

  const pendingCount = Number(pending.rows[0]?.n ?? 0);
  const oldest = pending.rows[0]?.oldest;

  return {
    limit: DAILY_LIMIT,
    used,
    remaining: Math.max(DAILY_LIMIT - used, 0),
    pendingCount,
    // Les dates sont stockées en secondes, comme partout dans le schéma.
    oldestPendingAt: oldest ? new Date(Number(oldest) * 1000).toISOString() : null,
  };
}

/** Sérialise les pièces jointes pour les stocker en base (contenu en base64). */
function serializeAttachments(attachments?: EmailAttachment[]): string | null {
  if (!attachments?.length) return null;
  return JSON.stringify(
    attachments.map(a => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : a.encoding === 'base64'
          ? a.content
          : Buffer.from(a.content).toString('base64'),
      encoding: 'base64' as const,
    }))
  );
}

function deserializeAttachments(raw: string | null): EmailAttachment[] | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as EmailAttachment[];
  } catch {
    return undefined;
  }
}

/** Envoi effectif, sans gestion de quota : utilisé par sendEmail et par la purge. */
async function deliver(options: EmailOptions) {
  const transporter = await getTransporter();
  return transporter.sendMail({
    from: EMAIL_FROM,
    // Les réponses des associations doivent arriver à la mairie, même si
    // l'expéditeur technique est une adresse noreply.
    replyTo: options.replyTo || MAIRIE_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
  });
}

let flushing = false;

/**
 * Vide la file tant qu'il reste du quota.
 *
 * Appelée à chaque envoi et périodiquement (voir src/instrumentation.ts), pour
 * que la file reparte même un jour sans activité sur le site.
 */
export async function flushEmailQueue(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: 0 };
  flushing = true;
  let sent = 0;

  try {
    while (true) {
      const [next] = await db
        .select()
        .from(emailQueue)
        .where(eq(emailQueue.status, 'pending'))
        .orderBy(asc(emailQueue.createdAt))
        .limit(1);

      if (!next) break;
      if (!(await reserveQuota())) break; // quota épuisé, on réessaiera demain

      try {
        await deliver({
          to: next.to,
          subject: next.subject,
          html: next.html,
          text: next.body ?? undefined,
          replyTo: next.replyTo ?? undefined,
          attachments: deserializeAttachments(next.attachments),
        });
        await db
          .update(emailQueue)
          .set({ status: 'sent', sentAt: new Date(), attempts: next.attempts + 1 })
          .where(eq(emailQueue.id, next.id));
        sent++;
      } catch (error) {
        await releaseQuota();
        const attempts = next.attempts + 1;
        // Trois échecs : on cesse de réessayer, sinon un destinataire invalide
        // bloquerait indéfiniment la tête de file.
        await db
          .update(emailQueue)
          .set({
            attempts,
            status: attempts >= 3 ? 'failed' : 'pending',
            lastError: String((error as Error)?.message ?? error).slice(0, 500),
          })
          .where(eq(emailQueue.id, next.id));
        if (attempts < 3) break; // erreur probablement transitoire : on stoppe la purge
      }
    }
  } finally {
    flushing = false;
  }

  const status = await getEmailQuotaStatus();
  if (sent > 0) {
    console.log(`📤 File d'attente : ${sent} e-mail(s) envoyé(s), ${status.pendingCount} en attente.`);
  }
  return { sent, remaining: status.pendingCount };
}

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

  // Les messages mis de côté un jour de saturation repartent dès qu'il y a du
  // quota. Volontairement non attendu : la réponse à l'utilisateur ne doit pas
  // dépendre du temps de purge.
  void flushEmailQueue().catch(error =>
    console.warn("⚠ Purge de la file d'attente impossible :", error)
  );

  // Le comptage ne doit jamais empêcher un envoi : si la base est indisponible,
  // on envoie quand même plutôt que de bloquer un code de vérification.
  let reserved: boolean;
  try {
    reserved = await reserveQuota();
  } catch (error) {
    console.warn('⚠ Quota indisponible, envoi direct :', error);
    reserved = true;
  }

  if (!reserved) {
    try {
      await db.insert(emailQueue).values({
        to,
        subject,
        html,
        body: text,
        replyTo: replyTo || MAIRIE_EMAIL,
        attachments: serializeAttachments(attachments),
      });
      console.warn(
        `⏳ Quota quotidien de ${DAILY_LIMIT} e-mails atteint — message pour ${to} mis en attente, il partira demain.`
      );
      return { success: true, queued: true, messageId: null };
    } catch (error) {
      console.error("❌ Impossible de mettre l'e-mail en file d'attente :", error);
      return { success: false, queued: false, error };
    }
  }

  try {
    const info = await deliver({ to, subject, html, text, attachments, replyTo });

    console.log('✅ Email envoyé avec succès:', info.messageId);
    return { success: true, queued: false, messageId: info.messageId };
  } catch (error) {
    // L'envoi a échoué : le crédit réservé est rendu, sinon le quota se
    // consommerait sur des messages jamais partis.
    await releaseQuota().catch(() => {});
    console.error("❌ Erreur lors de l'envoi de l'email:", error);

    // En développement, on simule le succès et on log l'email
    if (isDev) {
      console.log('\n📧 [MODE DEV] Email qui aurait été envoyé:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      console.log('\n');

      return { success: true, queued: false, messageId: 'dev-mode-' + Date.now() };
    }

    return { success: false, queued: false, error };
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
