'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AuthShell from '@/components/AuthShell';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      setSuccess(true);
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell title="Email envoyé !">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-accent-100 dark:bg-accent-900/40 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-accent-600 dark:text-accent-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Si l'email existe dans notre système, vous recevrez un lien de réinitialisation dans quelques instants.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Vérifiez votre boîte de réception et vos spams.
          </p>
          <Link href="/">
            <Button className="w-full">Retour à la connexion</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié ?"
      subtitle="Entrez votre email pour recevoir un lien de réinitialisation"
    >
        <Link
          href="/"
          className="inline-flex items-center text-sm text-primary-700 hover:text-primary-800 dark:text-accent-300 dark:hover:text-accent-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour à la connexion
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
            />
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
            className="w-full"
          >
            Envoyer le lien de réinitialisation
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Vous vous souvenez de votre mot de passe ?{' '}
            <Link
              href="/"
              className="text-primary-700 hover:text-primary-800 dark:text-accent-300 font-semibold"
            >
              Se connecter
            </Link>
          </p>
        </div>
    </AuthShell>
  );
}
