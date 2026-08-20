/** Squelette du calendrier d'une salle (la partie la plus longue à charger). */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="container mx-auto px-4 py-6">
        <div className="h-6 w-56 rounded bg-slate-200 dark:bg-primary-800 animate-pulse mb-6" />

        {/* En-tête de la salle */}
        <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-card border border-slate-200 dark:border-primary-700/60 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-primary-800 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-7 w-52 rounded bg-slate-200 dark:bg-primary-800 animate-pulse" />
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-primary-800 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Grille du calendrier */}
        <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-card border border-slate-200 dark:border-primary-700/60 p-4 sm:p-6">
          <div className="h-8 w-64 rounded bg-slate-200 dark:bg-primary-800 animate-pulse mb-6" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-slate-100 dark:bg-primary-900/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
