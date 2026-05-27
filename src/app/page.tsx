import Link from 'next/link';
import { Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Salles municipales',
    desc: 'Mairie, complexe sportif, espace culturel et vergers — réservez en quelques clics.',
  },
  {
    icon: Calendar,
    title: 'Réservation simple',
    desc: 'Choisissez votre créneau, suivez vos demandes et conventions au même endroit.',
  },
  {
    icon: Clock,
    title: 'Suivi en temps réel',
    desc: 'Validation, paiement et disponibilités mis à jour instantanément.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      {/* Héro */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-accent-800" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.5) 0, transparent 40%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/25">
            <Calendar className="h-4 w-4" />
            Commune de Chartrettes
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-white text-balance">
            Réservez les salles de votre commune
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-lg sm:text-xl text-white/80 text-balance">
            Un service de gestion et de réservation des salles, pensé pour les associations et les
            habitants de Chartrettes.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="btn btn-accent px-7 py-3 text-base shadow-lg"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/signup"
              className="btn px-7 py-3 text-base bg-white/10 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white/20"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>

      {/* Cartes de présentation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card card-hover p-6 animate-fade-in-up">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-accent-500/15 dark:text-accent-300">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
