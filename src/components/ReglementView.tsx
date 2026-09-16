'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Building2, Download, Shield } from 'lucide-react';
import type { ReglementDoc, ReglementId } from '@/lib/reglement';

const TABS: { id: ReglementId; label: string; icon: typeof Shield }[] = [
  { id: 'complexe', label: 'Complexe sportif', icon: Shield },
  { id: 'salles', label: 'Salles municipales (EMC / Vergers)', icon: Building2 },
];

/**
 * Découpe le texte à chaque titre de niveau 2 : chaque partie du règlement
 * s'affiche dans sa propre carte, le texte d'introduction dans un bandeau.
 */
function splitSections(html: string): { intro: string; sections: string[] } {
  // Les tableaux défilent horizontalement sur mobile.
  const withScroll = html
    .replace(/<table/g, '<div class="reglement-table-scroll"><table')
    .replace(/<\/table>/g, '</table></div>');
  const [intro, ...sections] = withScroll.split(/(?=<h2[\s>])/);
  return intro.startsWith('<h2')
    ? { intro: '', sections: [intro, ...sections] }
    : { intro: intro.trim(), sections };
}

export default function ReglementView({ reglements }: { reglements: Record<ReglementId, ReglementDoc> }) {
  const [tab, setTab] = useState<ReglementId>('complexe');
  const current = reglements[tab];
  const { intro, sections } = useMemo(() => splitSections(current.html), [current.html]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 dark:text-accent-300 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au tableau de bord
        </Link>

        <div className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Règlements d'utilisation</h1>
              <p className="text-white/80 mt-1">Ville de Chartrettes</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                tab === id
                  ? 'bg-primary-700 text-white border-primary-700 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700 dark:bg-primary-900/40 dark:text-slate-300 dark:border-primary-700/60'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {(current.pdfName || current.updatedAt) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {current.updatedAt &&
                `Mis à jour le ${format(new Date(current.updatedAt), 'd MMMM yyyy', { locale: fr })}`}
            </span>
            {current.pdfName && (
              <a
                href={`/api/reglement/${tab}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline px-3 py-1.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Télécharger le PDF officiel
              </a>
            )}
          </div>
        )}

        <div className="space-y-6">
          {intro && (
            <div
              className="reglement-content rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-700/60 dark:bg-primary-900/40"
              dangerouslySetInnerHTML={{ __html: intro }}
            />
          )}
          {sections.map((section, index) => (
            <section
              key={`${tab}-${index}`}
              className="reglement-content card p-6 sm:p-8"
              dangerouslySetInnerHTML={{ __html: section }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
