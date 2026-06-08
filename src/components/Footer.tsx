import Link from 'next/link';

/**
 * Pied de page global — rendu sur toutes les pages via le root layout.
 * Donne un accès permanent aux pages légales (RGPD / LCEN), exigence de
 * conformité : les mentions légales et la politique de confidentialité
 * doivent être accessibles depuis n'importe quelle page du site.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/confidentialite', label: 'Politique de confidentialité' },
    { href: '/reglement', label: 'Règlement' },
    { href: '/aide', label: 'Aide' },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm dark:border-primary-700/60 dark:bg-primary-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {year} Mairie de Chartrettes — Réservation des salles municipales
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium text-slate-600 hover:text-primary-700 dark:text-slate-300 dark:hover:text-accent-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
