/** Squelette de la page des salles d'un établissement. */
export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="h-[400px] w-full bg-slate-200 dark:bg-primary-800 animate-pulse" />

      <div className="container mx-auto px-4 -mt-16 relative z-30 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="min-h-[200px] rounded-2xl bg-white dark:bg-primary-800/40 shadow-card p-8 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-primary-800 animate-pulse" />
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-primary-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
