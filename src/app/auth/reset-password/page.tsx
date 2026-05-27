'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AuthShell from '@/components/AuthShell';
import { CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Le lien de réinitialisation est invalide');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell title="Mot de passe réinitialisé !">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-accent-100 dark:bg-accent-900/40 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-accent-600 dark:text-accent-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <p className="text-sm text-slate-500 mb-2">
            Vous allez être redirigé vers la page de connexion...
          </p>
        </div>
      </AuthShell>
    );
  }

  if (!token || error === 'Le lien de réinitialisation est invalide') {
    return (
      <AuthShell title="Lien invalide">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Le lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link href="/auth/forgot-password">
            <Button className="w-full">Demander un nouveau lien</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe pour votre compte"
    >
        {error && error !== 'Le lien de réinitialisation est invalide' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Nouveau mot de passe"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Minimum 6 caractères
            </p>
          </div>

          <div>
            <Input
              label="Confirmer le mot de passe"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
            className="w-full"
          >
            Réinitialiser le mot de passe
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-primary-700 hover:text-primary-800 dark:text-accent-300"
          >
            Retour à la connexion
          </Link>
        </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-accent-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/80">Chargement...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
