import { jsPDF } from 'jspdf';

/**
 * Génère le guide utilisateur complet en PDF (jsPDF), mis en page proprement
 * avec en-tête coloré, sections numérotées, paragraphes, listes et encadrés.
 *
 * Le contenu reflète les parcours réels de l'application (voir GUIDE_UTILISATEUR.md).
 */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

const PRIMARY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [5, 150, 105];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_300: [number, number, number] = [203, 213, 225];
const AMBER_50: [number, number, number] = [255, 251, 235];
const AMBER_700: [number, number, number] = [180, 83, 9];

type Block =
  | { kind: 'section'; n: number; title: string }
  | { kind: 'sub'; title: string }
  | { kind: 'p'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'note'; text: string };

const CONTENT: Block[] = [
  { kind: 'p', text: "Bienvenue sur la plateforme de réservation des salles municipales de la commune de Chartrettes. Ce guide vous explique pas à pas comment créer votre compte, réserver une salle et suivre vos demandes." },
  { kind: 'p', text: "Site : https://chartrettes-reservation-salle.com" },

  { kind: 'section', n: 1, title: 'Créer votre compte' },
  { kind: 'p', text: "Sur la page d'accueil, dans l'encadré « Pas encore de compte ? », cliquez sur « Créer un compte ». L'inscription se fait en 3 étapes." },
  { kind: 'sub', title: 'Étape 1 — Vos informations' },
  { kind: 'bullets', items: [
    'Nom complet',
    'Email',
    'Mot de passe (au minimum 8 caractères)',
    'Confirmer le mot de passe',
  ] },
  { kind: 'p', text: "Puis cliquez sur « Continuer »." },
  { kind: 'sub', title: 'Étape 2 — Votre profil' },
  { kind: 'p', text: "Indiquez si vous réservez en tant qu'association ou en tant que particulier." },
  { kind: 'p', text: "Si vous êtes une association : sélectionnez-la dans la liste. Si elle n'y figure pas, cliquez sur « Mon association n'est pas dans la liste » et remplissez le formulaire de demande (nom, description, siège social, objet social, nom et adresse du président, email et téléphone). Votre demande sera examinée par un administrateur de la mairie." },
  { kind: 'p', text: "Si vous êtes un particulier : saisissez votre adresse complète. Si elle contient « Chartrettes », la case « J'habite à Chartrettes » se coche automatiquement. Les résidents de Chartrettes bénéficient d'une priorité et de tarifs réduits." },
  { kind: 'p', text: "Cliquez ensuite sur « S'inscrire »." },

  { kind: 'section', n: 2, title: 'Vérifier votre adresse email' },
  { kind: 'p', text: "Après l'inscription, un code à 6 chiffres est envoyé à votre adresse email." },
  { kind: 'steps', items: [
    'Ouvrez votre boîte mail (vérifiez les spams / courriers indésirables).',
    'Saisissez le code dans le champ « Code de vérification ».',
    'Cliquez sur « Vérifier et finaliser l\'inscription ».',
  ] },
  { kind: 'note', text: "Le code expire au bout de 15 minutes. Si vous ne l'avez pas reçu, cliquez sur « Vous n'avez pas reçu le code ? ». Tant que l'email n'est pas vérifié, la connexion est refusée." },

  { kind: 'section', n: 3, title: 'Se connecter' },
  { kind: 'steps', items: [
    'Sur la page d\'accueil, renseignez votre Email et votre Mot de passe.',
    'Cliquez sur « Se connecter ».',
  ] },
  { kind: 'p', text: "Vous pouvez aussi utiliser le bouton « Google » pour vous connecter avec un compte Google." },

  { kind: 'section', n: 4, title: 'Mot de passe oublié' },
  { kind: 'steps', items: [
    'Sur la page de connexion, cliquez sur « Mot de passe oublié ? ».',
    'Saisissez votre email puis cliquez sur « Envoyer le lien de réinitialisation ».',
    'Ouvrez l\'email reçu et cliquez sur le lien.',
    'Choisissez un nouveau mot de passe, confirmez-le, puis validez.',
  ] },
  { kind: 'note', text: "Le lien de réinitialisation a une durée de validité limitée. S'il a expiré, recommencez la procédure." },

  { kind: 'section', n: 5, title: 'Choisir un établissement et une salle' },
  { kind: 'p', text: "Une fois connecté, vous arrivez sur le tableau de bord (« Accueil »)." },
  { kind: 'steps', items: [
    'La page « Choisissez un établissement » affiche les bâtiments disponibles.',
    'Cliquez sur un bâtiment pour voir ses salles.',
    'Cliquez sur une salle pour ouvrir son calendrier.',
  ] },
  { kind: 'p', text: "Sur la page de la salle, vous voyez sa capacité (nombre de personnes maximum), sa surface, et le matériel disponible." },

  { kind: 'section', n: 6, title: 'Réserver une salle pour une date' },
  { kind: 'p', text: "Cette réservation, dite ponctuelle, concerne une date précise." },
  { kind: 'steps', items: [
    'Dans le calendrier de la salle, cliquez sur le créneau horaire souhaité.',
    'La fenêtre « Nouvelle réservation » s\'ouvre. Vérifiez la date et l\'horaire.',
    'Renseignez le nombre de personnes, la raison de la réservation et le nom du responsable.',
    'Facultatif : pour réserver plusieurs salles au même horaire, cliquez sur « + Réserver plusieurs salles ».',
    'Signez la convention (obligatoire — voir section 7).',
    'Vérifiez le récapitulatif du tarif (prix, caution, total).',
    'Cliquez sur « Réserver ».',
  ] },
  { kind: 'note', text: "Délai à respecter : une réservation doit être faite au moins 7 jours à l'avance. Vous ne pouvez pas réserver pour une date passée." },
  { kind: 'p', text: "Votre demande est envoyée à la mairie pour validation. Vous recevrez un email dès qu'elle sera traitée." },

  { kind: 'section', n: 7, title: 'Signer la convention' },
  { kind: 'p', text: "Chaque réservation ponctuelle nécessite la signature d'une convention de mise à disposition." },
  { kind: 'steps', items: [
    'Dans la fenêtre de réservation, repérez l\'encadré « Convention à signer ».',
    'Cliquez sur « Lire et signer la convention ».',
    'Lisez la convention (vos informations sont déjà pré-remplies).',
    'Signez dans la zone prévue (à la souris, ou au doigt sur mobile/tablette).',
    'Cliquez sur « Signer la convention ».',
  ] },
  { kind: 'p', text: "L'encadré devient vert « Convention signée ✓ ». Tant que la convention n'est pas signée, le bouton « Réserver » reste indisponible." },
  { kind: 'p', text: "Lorsque la mairie approuve votre réservation, elle y appose la signature du maire puis vous envoie par email la convention complète en PDF (signée par vous et par la mairie). Vous la retrouvez aussi dans votre profil." },

  { kind: 'section', n: 8, title: 'Réserver à l\'année' },
  { kind: 'p', text: "La réservation à l'année permet de réserver des créneaux réguliers (par exemple tous les lundis de 18h à 20h sur une saison). Elle se fait en 4 étapes." },
  { kind: 'sub', title: 'Étape 1 — Période et informations' },
  { kind: 'bullets', items: ['Date de début et date de fin', 'Nombre de personnes estimé', 'Raison de la réservation'] },
  { kind: 'sub', title: 'Étape 2 — Créneaux horaires hebdomadaires' },
  { kind: 'p', text: "Sélectionnez, pour chaque jour de la semaine, les plages horaires souhaitées (2 clics : début, puis fin). Les créneaux choisis s'affichent en liste." },
  { kind: 'sub', title: 'Étape 3 — Exclusions' },
  { kind: 'bullets', items: [
    'Cochez « Exclure les vacances scolaires » pour ne pas réserver pendant les vacances.',
    'Bouton « Tout exclure » : retire en un clic tous les jours fériés et vacances scolaires de la période.',
    'Vous pouvez aussi exclure des dates précises en cliquant dessus (fériés 🇫🇷, vacances 🎒).',
  ] },
  { kind: 'sub', title: 'Étape 4 — Récapitulatif' },
  { kind: 'p', text: "Vérifiez la période, les créneaux, le nombre de participants et le nombre estimé de réservations. Une convention annuelle doit être signée avant la validation finale. Cliquez sur « Valider la réservation »." },
  { kind: 'note', text: "Comme pour les ponctuelles, la mairie valide votre convention annuelle, y appose la signature du maire et vous envoie le PDF complet par email." },

  { kind: 'section', n: 9, title: 'Suivre mes réservations' },
  { kind: 'p', text: "Cliquez sur « Mes Réservations » dans le menu du haut. Vous pouvez filtrer par statut :" },
  { kind: 'bullets', items: [
    'En attente — votre demande n\'a pas encore été traitée',
    'Approuvée — votre réservation est confirmée',
    'Refusée — la mairie a refusé (le motif est indiqué)',
    'Annulée — la réservation a été annulée',
  ] },
  { kind: 'p', text: "Chaque réservation affiche la salle, la date, l'horaire, le motif, le nombre de participants et, le cas échéant, un commentaire de l'administrateur." },

  { kind: 'section', n: 10, title: 'Mon profil et mes conventions' },
  { kind: 'p', text: "Cliquez sur votre nom en haut à droite pour accéder à votre profil. Vous y trouvez vos informations, vos conventions ponctuelles (une par réservation signée) et votre convention annuelle (si vous appartenez à une association)." },
  { kind: 'p', text: "Pour chaque convention, vous pouvez voir la signature, la télécharger (PNG) ou télécharger la convention complète en PDF (bouton « Convention PDF »). Si la mairie a validé, la signature du maire apparaît et la mention « Validée par la mairie » s'affiche." },

  { kind: 'section', n: 11, title: 'Consulter le règlement' },
  { kind: 'p', text: "Cliquez sur « Règlement » dans le menu. Deux onglets : « Complexe sportif » et « Salles municipales » (Espace Culturel et Vergers). Vous y trouvez les conditions de mise à disposition, les obligations, les règles de sécurité, l'accès aux salles et les tarifs." },
  { kind: 'note', text: "À retenir : une attestation d'assurance est requise, la caution par clé est de 54 €, et l'annulation d'une salle municipale doit intervenir au moins 15 jours à l'avance." },

  { kind: 'section', n: 12, title: 'Poser une question' },
  { kind: 'p', text: "En bas à droite de chaque page se trouve un bouton d'aide (bulle de discussion). Cliquez dessus, écrivez votre message puis cliquez sur « Envoyer ». Votre message est transmis à l'animateur culturel de la mairie, qui vous répondra par email." },

  { kind: 'section', n: 13, title: 'Questions fréquentes' },
  { kind: 'sub', title: "Je ne reçois pas l'email de vérification" },
  { kind: 'p', text: "Vérifiez vos spams. Le code expire au bout de 15 minutes ; vous pouvez en redemander un." },
  { kind: 'sub', title: 'Je ne peux pas cliquer sur « Réserver »' },
  { kind: 'p', text: "Vérifiez que vous avez bien signé la convention (encadré vert « Convention signée ✓ ») et rempli tous les champs obligatoires." },
  { kind: 'sub', title: 'Pourquoi ma réservation est-elle « En attente » ?' },
  { kind: 'p', text: "Toute réservation est soumise à la validation de la mairie. Vous recevrez un email dès qu'elle sera approuvée ou refusée." },
  { kind: 'sub', title: 'Quel délai pour réserver ?' },
  { kind: 'p', text: "Au minimum 7 jours avant la date souhaitée. Les réservations pour une date passée sont impossibles." },
  { kind: 'sub', title: 'Comment annuler une réservation ?' },
  { kind: 'p', text: "Contactez la mairie via le bouton d'aide. Pour les salles municipales, l'annulation doit intervenir au moins 15 jours à l'avance, faute de quoi le montant reste dû." },
];

export function generateUserGuidePDF(): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 14) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // -------------- En-tête (page 1) --------------
  pdf.setFillColor(...PRIMARY);
  pdf.rect(0, 0, PAGE_W, 38, 'F');
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 38, PAGE_W, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text("Guide d'utilisation", MARGIN, 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Réservation des salles de Chartrettes', MARGIN, 27);
  pdf.setFontSize(8);
  pdf.text('Mairie de Chartrettes — Guide à destination des usagers', MARGIN, 33);
  y = 48;

  for (const block of CONTENT) {
    switch (block.kind) {
      case 'section': {
        ensureSpace(14);
        y += 2;
        pdf.setFillColor(...PRIMARY);
        pdf.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${block.n}. ${block.title}`, MARGIN + 3, y + 5.5);
        y += 12;
        break;
      }
      case 'sub': {
        ensureSpace(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...ACCENT);
        const lines = pdf.splitTextToSize(block.title, CONTENT_W);
        pdf.text(lines, MARGIN, y + 3);
        y += lines.length * 4.5 + 3;
        break;
      }
      case 'p': {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...SLATE_600);
        const lines = pdf.splitTextToSize(block.text, CONTENT_W);
        ensureSpace(lines.length * 4.6 + 3);
        pdf.text(lines, MARGIN, y + 3);
        y += lines.length * 4.6 + 4;
        break;
      }
      case 'bullets': {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...SLATE_600);
        for (const item of block.items) {
          const lines = pdf.splitTextToSize(item, CONTENT_W - 6);
          ensureSpace(lines.length * 4.6 + 1);
          pdf.setTextColor(...ACCENT);
          pdf.text('•', MARGIN + 1, y + 3);
          pdf.setTextColor(...SLATE_600);
          pdf.text(lines, MARGIN + 5, y + 3);
          y += lines.length * 4.6 + 1.5;
        }
        y += 2;
        break;
      }
      case 'steps': {
        pdf.setFontSize(9.5);
        let i = 1;
        for (const item of block.items) {
          const lines = pdf.splitTextToSize(item, CONTENT_W - 8);
          ensureSpace(lines.length * 4.6 + 1);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...PRIMARY);
          pdf.text(`${i}.`, MARGIN + 1, y + 3);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...SLATE_600);
          pdf.text(lines, MARGIN + 7, y + 3);
          y += lines.length * 4.6 + 1.5;
          i++;
        }
        y += 2;
        break;
      }
      case 'note': {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        const lines = pdf.splitTextToSize(block.text, CONTENT_W - 8);
        const boxH = lines.length * 4.2 + 6;
        ensureSpace(boxH + 2);
        pdf.setFillColor(...AMBER_50);
        pdf.setDrawColor(...AMBER_700);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 1.5, 1.5, 'FD');
        pdf.setLineWidth(0.2);
        pdf.setTextColor(...AMBER_700);
        pdf.setFont('helvetica', 'bold');
        pdf.text('À noter', MARGIN + 3, y + 4.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...SLATE_900);
        pdf.text(lines, MARGIN + 3, y + 9);
        y += boxH + 4;
        break;
      }
    }
  }

  // -------------- Pied de page --------------
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...SLATE_300);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...SLATE_600);
    pdf.text('Réservation des salles de Chartrettes — Guide utilisateur', MARGIN, PAGE_H - 8);
    pdf.text(`Page ${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  return pdf;
}
