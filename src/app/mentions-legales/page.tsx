'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Building2, User, Server, Copyright, Mail } from 'lucide-react';

const CONTACT_EMAIL = 'mairie@mairie-chartrettes.fr';

interface MairieInfo {
  addressLine1: string;
  addressLine2: string;
  phone: string;
  mayorName: string;
}

const DEFAULT_MAIRIE: MairieInfo = {
  addressLine1: '37 rue Georges Clemenceau',
  addressLine2: '77590 Chartrettes',
  phone: '01.60.69.65.01',
  mayorName: 'Monsieur le Maire',
};

export default function MentionsLegalesPage() {
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
            mayorName: d.settings.mayorName || DEFAULT_MAIRIE.mayorName,
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
              <Scale className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mentions légales</h1>
              <p className="text-white/80 mt-1">Réservation des salles municipales</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <Section icon={Building2} title="Éditeur du site">
            <p>
              Le présent site est édité par la <strong>{mairieName}</strong>.
            </p>
            <ul className="mt-2 space-y-1">
              <li>Adresse : {mairie.addressLine1}, {mairie.addressLine2}</li>
              <li>Téléphone : {mairie.phone}</li>
              <li>
                Email :{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-700 dark:text-accent-300 font-medium underline">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </Section>

          <Section icon={User} title="Directeur de la publication">
            <p>
              Le directeur de la publication est {mairie.mayorName}, en sa qualité de
              Maire de Chartrettes.
            </p>
          </Section>

          <Section icon={Server} title="Hébergement">
            <p>
              Le site est hébergé sur l'infrastructure informatique de la{' '}
              {mairieName} ({mairie.addressLine1}, {mairie.addressLine2}). La
              distribution et la sécurisation des accès au site sont assurées par{' '}
              <strong>Cloudflare, Inc.</strong>, 101 Townsend Street, San Francisco,
              CA 94107, États-Unis.
            </p>
          </Section>

          <Section icon={Copyright} title="Propriété intellectuelle">
            <p>
              L'ensemble des contenus présents sur ce site (textes, logo, blason de la
              commune, mise en page) est la propriété de la {mairieName}, sauf mention
              contraire. Toute reproduction ou représentation, totale ou partielle, sans
              autorisation préalable, est interdite.
            </p>
          </Section>

          <Section icon={Scale} title="Données personnelles">
            <p>
              Le traitement des données personnelles effectué dans le cadre de ce site
              est décrit dans notre{' '}
              <Link href="/confidentialite" className="text-primary-700 dark:text-accent-300 font-medium underline">
                Politique de confidentialité
              </Link>
              , conformément au Règlement général sur la protection des données (RGPD).
            </p>
          </Section>

          <section className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 text-white">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact
            </h2>
            <p className="text-white/80 leading-relaxed">
              Pour toute question concernant le site, vous pouvez contacter la mairie à
              l'adresse{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
                {CONTACT_EMAIL}
              </a>
              .
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
