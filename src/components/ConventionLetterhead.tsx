import Image from 'next/image';
import type { ConventionTextSettings } from '@/lib/conventionText';
import { MAIRIE_LOGO_URL } from '@/lib/imageDataUrl';

interface ConventionLetterheadProps {
  settings: ConventionTextSettings;
  /** Sur-titre discret (ex. « Convention annuelle — saison 2025-2026 »). */
  eyebrow: string;
  /** Titre du document. */
  title: string;
}

/**
 * En-tête officiel des conventions affichées à l'écran : blason de la commune,
 * mention « République Française », coordonnées de la mairie, filet double puis
 * titre centré.
 *
 * Reprend trait pour trait l'en-tête du PDF (conventionPdfLayout.letterhead)
 * pour que le document signé à l'écran et le PDF téléchargé soient le même
 * document.
 */
export default function ConventionLetterhead({
  settings,
  eyebrow,
  title,
}: ConventionLetterheadProps) {
  return (
    <header className="mb-6">
      <div className="flex items-start gap-4">
        <Image
          src={MAIRIE_LOGO_URL}
          alt="Blason de Chartrettes"
          width={72}
          height={72}
          className="h-16 w-16 sm:h-[72px] sm:w-[72px] flex-shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            République Française
          </p>
          <p className="text-base sm:text-lg font-bold text-primary-700 dark:text-white leading-snug">
            {settings.mairieName.replace(/^LA\s+/i, '')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {settings.mairieAddressLine1} — {settings.mairieAddressLine2}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tél. {settings.mairiePhone}</p>
        </div>
      </div>

      {/* Filet double, comme sur le papier à en-tête municipal */}
      <div className="mt-4 h-[3px] bg-primary-700 dark:bg-accent-500" />
      <div className="mt-[3px] h-px bg-accent-600" />

      <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600 dark:text-accent-400">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-center text-lg sm:text-xl font-bold leading-snug text-primary-700 dark:text-white">
        {title}
      </h3>
      <div className="mx-auto mt-3 h-[2px] w-16 bg-accent-600" />
    </header>
  );
}
