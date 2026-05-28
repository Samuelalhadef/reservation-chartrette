'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
} from 'lucide-react';
import Button from '@/components/Button';
import Input from '@/components/Input';

const highlights = [
  {
    icon: MapPin,
    title: 'Salles municipales',
    desc: 'Mairie, complexe sportif, espace culturel et vergers — tout est centralisé.',
  },
  {
    icon: Calendar,
    title: 'Réservation simple',
    desc: 'Choisissez votre créneau et suivez vos demandes au même endroit.',
  },
  {
    icon: Clock,
    title: 'Suivi en temps réel',
    desc: 'Validation, paiement et disponibilités mis à jour instantanément.',
  },
  {
    icon: ShieldCheck,
    title: 'Conventions sécurisées',
    desc: 'Vos conventions annuelles sont générées et conservées automatiquement.',
  },
];

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = (await signIn('credentials', {
        redirect: false,
        email,
        password,
      })) as any;

      if (result?.error) {
        setError('Email ou mot de passe incorrect');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Colonne gauche — présentation */}
        <section className="relative overflow-hidden hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-accent-800" />
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 85% 0%, rgba(16,185,129,0.55) 0, transparent 40%), radial-gradient(circle at 75% 95%, rgba(255,255,255,0.18) 0, transparent 35%)',
            }}
          />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1 shadow-md ring-1 ring-white/40">
                <Image
                  src="/image/logo.jpg"
                  alt="Blason de Chartrettes"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
              <span className="text-lg font-bold tracking-wide">
                Réservation Chartrettes
              </span>
            </Link>
          </div>

          <div className="relative max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-balance">
              Réservez les salles de votre commune en quelques clics.
            </h1>
            <p className="mt-5 text-base xl:text-lg text-white/80 text-balance">
              Un service pensé pour les associations et les habitants de
              Chartrettes : gérez vos créneaux, vos conventions et vos paiements
              au même endroit.
            </p>

            <ul className="mt-8 space-y-4">
              {highlights.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-white/75">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">
            © {new Date().getFullYear()} Mairie de Chartrettes
          </p>
        </section>

        {/* Colonne droite — formulaire de connexion */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
          {/* En-tête mobile (la colonne gauche est masquée < lg) */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/image/logo.jpg"
                  alt="Blason de Chartrettes"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
              <span className="text-lg font-bold text-primary-800">
                Réservation Chartrettes
              </span>
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md animate-fade-in-up">
            <div className="mb-7">
              <h2 className="text-3xl font-bold text-slate-900">
                Bon retour 👋
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Connectez-vous pour accéder à votre espace de réservation.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  disabled={isLoading}
                  className="pl-10"
                />
                <Mail className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-slate-400" />
              </div>

              <div>
                <div className="relative">
                  <Input
                    label="Mot de passe"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="pl-10"
                  />
                  <Lock className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-slate-400" />
                </div>
                <div className="text-right mt-2">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-primary-700 hover:text-primary-800"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Se connecter
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="px-3 bg-slate-50 text-slate-500">
                    Ou continuer avec
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-card">
              <p className="text-sm text-slate-600">
                Pas encore de compte ?
              </p>
              <Link
                href="/auth/signup"
                className="mt-3 inline-flex items-center justify-center gap-2 w-full btn btn-outline px-5 py-2.5"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-slate-500">
                Particuliers et associations de Chartrettes.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-accent-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
            <p className="mt-4 text-white/80">Chargement…</p>
          </div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
