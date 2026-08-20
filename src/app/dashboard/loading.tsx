/**
 * Affiché pendant le chargement de la liste des établissements : la page
 * apparaît immédiatement au lieu de rester figée sur l'écran précédent.
 */
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-12 text-center">
        <div className="h-10 w-80 max-w-full mx-auto rounded-lg bg-slate-200 dark:bg-primary-800 animate-pulse" />
        <div className="mt-3 h-5 w-96 max-w-full mx-auto rounded bg-slate-200 dark:bg-primary-800 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[300px] rounded-2xl bg-slate-200 dark:bg-primary-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
