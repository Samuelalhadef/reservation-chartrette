/**
 * Crochet exécuté une fois au démarrage du serveur Next.
 *
 * Sert à relancer la file d'attente des e-mails. Les envois différés repartent
 * déjà à chaque appel de sendEmail, mais une journée sans activité sur le site
 * laisserait la file pleine : ce minuteur garantit qu'elle se vide de toute
 * façon, dès que le quota quotidien est réinitialisé.
 */
export async function register() {
  // Le crochet est aussi appelé pour le runtime edge, où ni la base ni
  // nodemailer ne sont disponibles.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { flushEmailQueue } = await import('@/lib/email');

  const INTERVAL_MS = 15 * 60 * 1000;

  const run = () =>
    flushEmailQueue().catch(error =>
      console.warn("⚠ Purge périodique de la file d'e-mails impossible :", error)
    );

  // Laisser le serveur finir de démarrer avant la première purge.
  setTimeout(run, 30_000).unref();

  // unref : ce minuteur ne doit pas à lui seul maintenir le processus en vie.
  setInterval(run, INTERVAL_MS).unref();
}
