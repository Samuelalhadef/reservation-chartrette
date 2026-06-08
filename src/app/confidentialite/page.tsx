'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Database,
  Target,
  Scale,
  Users,
  Clock,
  Lock,
  Cookie,
  UserCheck,
  Mail,
} from 'lucide-react';

const CONTACT_EMAIL = 'mairie@mairie-chartrettes.fr';
const UPDATED_AT = '8 juin 2026';

interface MairieInfo {
  addressLine1: string;
  addressLine2: string;
  phone: string;
}

const DEFAULT_MAIRIE: MairieInfo = {
  addressLine1: '37 rue Georges Clemenceau',
  addressLine2: '77590 Chartrettes',
  phone: '01.60.69.65.01',
};

export default function ConfidentialitePage() {
  const [mairie, setMairie] = useState<MairieInfo>(DEFAULT_MAIRIE);

  useEffect(() => {
    fetch('/api/convention-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setMairie({
            addressLine1: d.settings.mairieAddressLine1 || DEFAULT_MAIRIE.addressLine1,
            addressLine2: d.settings.mairieAddressLine2 || DEFAULT_MAIRIE.addressLine2,
            phone: d.settings.mairiePhone || DEFAULT_MAIRIE.phone,
          });
        }
      })
      .catch(() => {});
  }, []);

  const mairieName = 'Mairie de Chartrettes';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 dark:text-accent-300 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </Link>

        {/* Header */}
        <div className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Politique de confidentialité
              </h1>
              <p className="text-white/80 mt-1">
                Protection de vos données personnelles (RGPD)
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Dernière mise à jour : {UPDATED_AT}
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {/* Préambule */}
          <Section icon={ShieldCheck} title="Préambule">
            <p>
              La présente politique décrit la manière dont la {mairieName} traite les
              données personnelles des utilisateurs de l'application de réservation des
              salles municipales (ci-après « le Service »), conformément au Règlement
              général sur la protection des données (RGPD – UE 2016/679) et à la loi
              « Informatique et Libertés ».
            </p>
          </Section>

          {/* Responsable */}
          <Section icon={UserCheck} title="1. Responsable du traitement">
            <p>
              Le responsable du traitement est la <strong>{mairieName}</strong>, située{' '}
              {mairie.addressLine1}, {mairie.addressLine2}.
            </p>
            <p className="mt-2">
              Pour toute question relative à vos données personnelles, vous pouvez
              contacter la mairie à l'adresse{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-700 dark:text-accent-300 font-medium underline">
                {CONTACT_EMAIL}
              </a>{' '}
              ou par téléphone au {mairie.phone}.
            </p>
          </Section>

          {/* Données collectées */}
          <Section icon={Database} title="2. Données personnelles collectées">
            <p>Dans le cadre du Service, nous collectons les données suivantes :</p>
            <ul className="mt-2 space-y-1.5">
              {[
                'Données de compte : nom et prénom, adresse email, mot de passe (stocké de façon chiffrée), photo de profil le cas échéant.',
                'Données de résidence (particuliers) : adresse postale et indication de résidence à Chartrettes, utilisées pour déterminer les priorités et tarifs.',
                "Données d'association (représentants) : nom de l'association, coordonnées de contact, nom et adresse du président.",
                'Données de réservation : salle, date, créneaux, motif, nombre estimé de participants, matériel demandé.',
                'Signatures électroniques des conventions de mise à disposition et leur horodatage.',
                'Données techniques minimales nécessaires au fonctionnement (cookie de session d’authentification).',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-600 mt-1 font-bold">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Finalités */}
          <Section icon={Target} title="3. Finalités du traitement">
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="mt-2 space-y-1.5">
              {[
                'La création et la gestion de votre compte utilisateur.',
                'La gestion des demandes de réservation de salles municipales et leur instruction par les services de la mairie.',
                'La génération et la conservation des conventions de mise à disposition signées.',
                "L'envoi des emails liés au Service (vérification de compte, confirmation, validation ou refus de réservation, rappels, réinitialisation de mot de passe).",
                'Le suivi des paiements et cautions le cas échéant.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-600 mt-1 font-bold">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Vos données ne font l'objet d'aucune prospection commerciale ni d'aucune
              prise de décision automatisée.
            </p>
          </Section>

          {/* Base légale */}
          <Section icon={Scale} title="4. Base légale">
            <p>
              Le traitement repose sur l'<strong>exécution de la mission d'intérêt
              public</strong> dont est investie la commune (gestion du domaine public et
              des équipements municipaux) ainsi que sur l'<strong>exécution des mesures
              précontractuelles et du contrat</strong> de mise à disposition des salles
              que vous sollicitez. La création de votre compte nécessite par ailleurs
              votre acceptation de la présente politique.
            </p>
          </Section>

          {/* Destinataires */}
          <Section icon={Users} title="5. Destinataires des données">
            <p>
              Vos données sont accessibles uniquement aux <strong>services habilités de
              la mairie de Chartrettes</strong> chargés de la gestion des salles. Elles
              ne sont ni vendues, ni louées, ni transmises à des tiers à des fins
              commerciales.
            </p>
            <p className="mt-2">
              L'application est hébergée sur l'infrastructure de la commune et les
              données sont conservées au sein de l'Union européenne. Aucun transfert
              de données hors UE n'est réalisé.
            </p>
          </Section>

          {/* Durée de conservation */}
          <Section icon={Clock} title="6. Durée de conservation">
            <ul className="space-y-1.5">
              {[
                "Compte utilisateur : conservé tant que le compte est actif. En l'absence d'utilisation prolongée, le compte peut être supprimé.",
                'Réservations et conventions signées : conservées pour la durée nécessaire au respect des obligations administratives et comptables de la commune.',
                'Codes de vérification et jetons de réinitialisation de mot de passe : supprimés automatiquement après expiration (15 minutes à 1 heure).',
                "En cas de demande de suppression, les données de compte sont effacées ou anonymisées, sous réserve des documents devant être conservés au titre des obligations légales.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-600 mt-1 font-bold">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Sécurité */}
          <Section icon={Lock} title="7. Sécurité">
            <p>
              Les mots de passe sont stockés sous forme chiffrée (hachage bcrypt) et ne
              sont jamais accessibles en clair. Les échanges avec l'application sont
              chiffrés (HTTPS). L'accès aux données d'administration est restreint aux
              agents habilités.
            </p>
          </Section>

          {/* Cookies */}
          <Section icon={Cookie} title="8. Cookies">
            <p>
              Le Service utilise uniquement des <strong>cookies strictement
              nécessaires</strong> à son fonctionnement, notamment un cookie de session
              destiné à vous maintenir connecté. Aucun cookie publicitaire, de mesure
              d'audience ou de traçage tiers n'est déposé. Les polices de caractères
              sont hébergées localement : aucune requête n'est adressée à des services
              tiers lors de votre navigation. À ce titre, votre consentement préalable
              n'est pas requis pour ces cookies.
            </p>
          </Section>

          {/* Droits */}
          <Section icon={UserCheck} title="9. Vos droits">
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="mt-2 space-y-1.5">
              {[
                "Droit d'accès et de portabilité : consulter et télécharger vos données depuis la page « Mon profil » (export au format JSON).",
                'Droit de rectification : modifier vos informations personnelles depuis la page « Mon profil ».',
                "Droit à l'effacement : supprimer votre compte depuis la page « Mon profil ». Lorsque des réservations ou conventions sont rattachées à votre compte, vos données personnelles sont anonymisées afin de respecter les obligations de conservation.",
                "Droit d'opposition et de limitation : vous opposer à certains traitements ou en demander la limitation.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-600 mt-1 font-bold">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Vous pouvez exercer ces droits directement depuis votre espace personnel
              ou en écrivant à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-700 dark:text-accent-300 font-medium underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          {/* Réclamation */}
          <Section icon={Scale} title="10. Réclamation auprès de la CNIL">
            <p>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
              respectés, vous pouvez introduire une réclamation auprès de la Commission
              Nationale de l'Informatique et des Libertés (CNIL) –{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-700 dark:text-accent-300 font-medium underline"
              >
                www.cnil.fr
              </a>
              .
            </p>
          </Section>

          {/* Contact */}
          <section className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 text-white">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Nous contacter
            </h2>
            <p className="text-white/80 leading-relaxed">
              Pour toute question relative à la protection de vos données, contactez la
              mairie à l'adresse{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
                {CONTACT_EMAIL}
              </a>{' '}
              ou par courrier : {mairieName}, {mairie.addressLine1}, {mairie.addressLine2}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-primary-900/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
      <h2 className="text-lg font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-700/60 pb-3 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h2>
      {children}
    </section>
  );
}
