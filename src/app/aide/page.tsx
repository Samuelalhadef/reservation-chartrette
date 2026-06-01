'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft, HelpCircle, Download, UserPlus, MailCheck, LogIn, KeyRound,
  Building2, CalendarPlus, PenTool, CalendarRange, ListChecks, FileText,
  BookOpen, MessageCircle, HelpingHand,
} from 'lucide-react';

interface Section {
  icon: React.ElementType;
  n: number;
  title: string;
  body: React.ReactNode;
}

const sections: Section[] = [
  {
    icon: UserPlus, n: 1, title: 'Créer votre compte',
    body: (
      <>
        <p>Sur la page d'accueil, dans l'encadré « Pas encore de compte ? », cliquez sur <strong>« Créer un compte »</strong>. L'inscription se fait en 3 étapes.</p>
        <h4>Étape 1 — Vos informations</h4>
        <ul>
          <li>Nom complet</li>
          <li>Email</li>
          <li>Mot de passe (au minimum 8 caractères)</li>
          <li>Confirmer le mot de passe</li>
        </ul>
        <h4>Étape 2 — Votre profil</h4>
        <p>Indiquez si vous réservez en tant qu'<strong>association</strong> ou en tant que <strong>particulier</strong>.</p>
        <ul>
          <li><strong>Association :</strong> sélectionnez-la dans la liste. Si elle n'y figure pas, cliquez sur « Mon association n'est pas dans la liste » et remplissez le formulaire (la demande sera examinée par un administrateur).</li>
          <li><strong>Particulier :</strong> saisissez votre adresse complète. Si elle contient « Chartrettes », la case « J'habite à Chartrettes » se coche automatiquement (priorité et tarifs réduits).</li>
        </ul>
        <p>Cliquez ensuite sur <strong>« S'inscrire »</strong>.</p>
      </>
    ),
  },
  {
    icon: MailCheck, n: 2, title: 'Vérifier votre adresse email',
    body: (
      <>
        <p>Après l'inscription, un code à 6 chiffres est envoyé à votre adresse email.</p>
        <ol>
          <li>Ouvrez votre boîte mail (vérifiez les spams).</li>
          <li>Saisissez le code dans le champ « Code de vérification ».</li>
          <li>Cliquez sur « Vérifier et finaliser l'inscription ».</li>
        </ol>
        <Callout>Le code expire au bout de 15 minutes. Tant que l'email n'est pas vérifié, la connexion est refusée.</Callout>
      </>
    ),
  },
  {
    icon: LogIn, n: 3, title: 'Se connecter',
    body: (
      <>
        <p>Sur la page d'accueil, renseignez votre <strong>Email</strong> et votre <strong>Mot de passe</strong>, puis cliquez sur <strong>« Se connecter »</strong>.</p>
        <p>Vous pouvez aussi utiliser le bouton <strong>« Google »</strong> pour vous connecter avec un compte Google.</p>
      </>
    ),
  },
  {
    icon: KeyRound, n: 4, title: 'Mot de passe oublié',
    body: (
      <ol>
        <li>Sur la page de connexion, cliquez sur « Mot de passe oublié ? ».</li>
        <li>Saisissez votre email puis cliquez sur « Envoyer le lien de réinitialisation ».</li>
        <li>Ouvrez l'email reçu et cliquez sur le lien.</li>
        <li>Choisissez un nouveau mot de passe, confirmez-le, puis validez.</li>
      </ol>
    ),
  },
  {
    icon: Building2, n: 5, title: 'Choisir un établissement et une salle',
    body: (
      <>
        <p>Une fois connecté, vous arrivez sur le tableau de bord (« Accueil »).</p>
        <ol>
          <li>La page « Choisissez un établissement » affiche les bâtiments disponibles.</li>
          <li>Cliquez sur un bâtiment pour voir ses salles.</li>
          <li>Cliquez sur une salle pour ouvrir son calendrier.</li>
        </ol>
        <p>Sur la page de la salle, vous voyez sa <strong>capacité</strong>, sa <strong>surface</strong> et le <strong>matériel disponible</strong>.</p>
      </>
    ),
  },
  {
    icon: CalendarPlus, n: 6, title: 'Réserver une salle pour une date',
    body: (
      <>
        <p>Cette réservation, dite <strong>ponctuelle</strong>, concerne une date précise.</p>
        <ol>
          <li>Dans le calendrier de la salle, cliquez sur le créneau horaire souhaité.</li>
          <li>La fenêtre « Nouvelle réservation » s'ouvre. Vérifiez la date et l'horaire.</li>
          <li>Renseignez le nombre de personnes, la raison et le nom du responsable.</li>
          <li>Facultatif : « + Réserver plusieurs salles » pour le même horaire.</li>
          <li>Signez la convention (obligatoire — voir section 7).</li>
          <li>Vérifiez le récapitulatif du tarif (prix, caution, total).</li>
          <li>Cliquez sur « Réserver ».</li>
        </ol>
        <Callout>Une réservation doit être faite au moins <strong>7 jours à l'avance</strong>. Les dates passées sont impossibles. Votre demande est ensuite envoyée à la mairie pour validation.</Callout>
      </>
    ),
  },
  {
    icon: PenTool, n: 7, title: 'Signer la convention',
    body: (
      <>
        <p>Chaque réservation ponctuelle nécessite la signature d'une convention de mise à disposition.</p>
        <ol>
          <li>Repérez l'encadré « Convention à signer ».</li>
          <li>Cliquez sur « Lire et signer la convention ».</li>
          <li>Lisez la convention (vos informations sont pré-remplies).</li>
          <li>Signez dans la zone prévue (souris, ou doigt sur mobile/tablette).</li>
          <li>Cliquez sur « Signer la convention ».</li>
        </ol>
        <p>Tant que la convention n'est pas signée, le bouton « Réserver » reste indisponible. Lorsque la mairie approuve, elle appose la <strong>signature du maire</strong> et vous envoie la <strong>convention complète en PDF</strong> par email.</p>
      </>
    ),
  },
  {
    icon: CalendarRange, n: 8, title: "Réserver à l'année",
    body: (
      <>
        <p>La réservation à l'année permet de réserver des <strong>créneaux réguliers</strong> (ex : tous les lundis 18h-20h sur une saison), en 4 étapes.</p>
        <h4>Étape 1 — Période et informations</h4>
        <ul><li>Date de début et date de fin</li><li>Nombre de personnes estimé</li><li>Raison de la réservation</li></ul>
        <h4>Étape 2 — Créneaux hebdomadaires</h4>
        <p>Sélectionnez, pour chaque jour, les plages horaires (2 clics : début, puis fin).</p>
        <h4>Étape 3 — Exclusions</h4>
        <ul>
          <li>Cochez « Exclure les vacances scolaires ».</li>
          <li>Bouton « Tout exclure » : retire en un clic fériés et vacances.</li>
          <li>Excluez aussi des dates précises en cliquant dessus (fériés 🇫🇷, vacances 🎒).</li>
        </ul>
        <h4>Étape 4 — Récapitulatif</h4>
        <p>Vérifiez et cliquez sur « Valider la réservation ». Une convention annuelle doit être signée. La mairie la valide et vous envoie le PDF par email.</p>
      </>
    ),
  },
  {
    icon: ListChecks, n: 9, title: 'Suivre mes réservations',
    body: (
      <>
        <p>Cliquez sur <strong>« Mes Réservations »</strong> dans le menu. Vous pouvez filtrer par statut :</p>
        <ul>
          <li><strong>En attente</strong> — pas encore traitée</li>
          <li><strong>Approuvée</strong> — confirmée</li>
          <li><strong>Refusée</strong> — refusée (motif indiqué)</li>
          <li><strong>Annulée</strong> — annulée</li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText, n: 10, title: 'Mon profil et mes conventions',
    body: (
      <>
        <p>Cliquez sur <strong>votre nom</strong> en haut à droite. Vous y trouvez vos informations, vos conventions ponctuelles et votre convention annuelle.</p>
        <p>Pour chaque convention : voir la signature, la télécharger (PNG) ou télécharger la <strong>convention complète en PDF</strong>. Si la mairie a validé, la signature du maire apparaît avec la mention « Validée par la mairie ».</p>
      </>
    ),
  },
  {
    icon: BookOpen, n: 11, title: 'Consulter le règlement',
    body: (
      <>
        <p>Cliquez sur <strong>« Règlement »</strong> dans le menu. Deux onglets : « Complexe sportif » et « Salles municipales » (Espace Culturel et Vergers).</p>
        <Callout>À retenir : attestation d'assurance requise, caution par clé de 54 €, et annulation d'une salle municipale au moins 15 jours à l'avance.</Callout>
      </>
    ),
  },
  {
    icon: MessageCircle, n: 12, title: 'Poser une question',
    body: (
      <p>En bas à droite de chaque page se trouve un <strong>bouton d'aide</strong> (bulle de discussion). Cliquez dessus, écrivez votre message et cliquez sur « Envoyer ». Il est transmis à l'animateur culturel de la mairie, qui vous répondra par email.</p>
    ),
  },
  {
    icon: HelpingHand, n: 13, title: 'Questions fréquentes',
    body: (
      <>
        <h4>Je ne reçois pas l'email de vérification</h4>
        <p>Vérifiez vos spams. Le code expire au bout de 15 minutes ; vous pouvez en redemander un.</p>
        <h4>Je ne peux pas cliquer sur « Réserver »</h4>
        <p>Vérifiez que la convention est signée (encadré vert « Convention signée ✓ ») et que tous les champs obligatoires sont remplis.</p>
        <h4>Pourquoi ma réservation est-elle « En attente » ?</h4>
        <p>Toute réservation est soumise à la validation de la mairie. Vous recevrez un email dès le traitement.</p>
        <h4>Quel délai pour réserver ?</h4>
        <p>Au minimum 7 jours avant la date souhaitée. Les dates passées sont impossibles.</p>
        <h4>Comment annuler une réservation ?</h4>
        <p>Contactez la mairie via le bouton d'aide. Pour les salles municipales, l'annulation doit intervenir au moins 15 jours à l'avance.</p>
      </>
    ),
  },
];

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-sm">
      {children}
    </div>
  );
}

export default function AidePage() {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const { generateUserGuidePDF } = await import('@/lib/generateUserGuidePDF');
      const pdf = generateUserGuidePDF();
      pdf.save('guide_utilisateur_reservation_chartrettes.pdf');
    } catch (e) {
      console.error('PDF guide generation failed:', e);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au tableau de bord
        </Link>

        {/* Header */}
        <div className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <HelpCircle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Guide d'utilisation</h1>
                <p className="text-white/80 mt-1">Comment utiliser l'application de réservation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-primary-800 hover:bg-slate-100 disabled:opacity-60 rounded-xl font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              {downloading ? 'Génération…' : 'Télécharger le guide (PDF)'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map(({ icon: Icon, n, title, body }) => (
            <section key={n} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
              <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white text-sm font-bold">
                  {n}
                </span>
                <Icon className="w-5 h-5 text-primary-600" />
                {title}
              </h2>
              <div className="guide-body text-sm leading-relaxed text-slate-600 space-y-3
                [&_h4]:font-semibold [&_h4]:text-slate-900 [&_h4]:mt-4 [&_h4]:mb-1
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1
                [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1
                [&_strong]:text-slate-900">
                {body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={downloadPDF}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-60 rounded-xl font-semibold shadow-md transition-all"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Génération…' : 'Télécharger le guide complet (PDF)'}
          </button>
        </div>
      </div>
    </div>
  );
}
