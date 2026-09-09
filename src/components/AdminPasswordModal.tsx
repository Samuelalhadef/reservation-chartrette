'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, X } from 'lucide-react';

/** Même exigence qu'à l'inscription et côté API. */
export const MIN_PASSWORD_LENGTH = 8;

// Alphabet sans caractères ambigus (0/O, 1/l/I) : le mot de passe est souvent
// dicté au téléphone ou recopié depuis un papier au guichet.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('');
}

interface AdminPasswordModalProps {
  user: { id: string; name: string; email: string; emailVerified: Date | string | null };
  onClose: () => void;
  /** Appelé après un changement réussi (pour recharger la liste). */
  onSaved: (warning: string | null) => void;
}

/**
 * Définition d'un mot de passe par un administrateur.
 *
 * Le mot de passe existant n'est pas affichable : il n'est stocké que haché.
 * L'admin en saisit donc un nouveau, ou en fait générer un qu'il transmet à
 * la personne concernée.
 */
export default function AdminPasswordModal({ user, onClose, onSaved }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [markVerified, setMarkVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVerified = Boolean(user.emailVerified);

  // Échap ferme la fenêtre, comme partout ailleurs dans l'admin.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && confirmation === password && !saving;

  const strength = useMemo(() => {
    if (password.length === 0) return null;
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
    if (password.length < MIN_PASSWORD_LENGTH) return { label: 'Trop court', tone: 'danger' as const };
    if (password.length >= 12 && classes >= 3) return { label: 'Solide', tone: 'success' as const };
    if (classes >= 2) return { label: 'Correct', tone: 'warning' as const };
    return { label: 'Faible', tone: 'danger' as const };
  }, [password]);

  const handleGenerate = () => {
    const generated = generatePassword();
    setPassword(generated);
    setConfirmation(generated);
    setVisible(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible : sélectionnez le mot de passe et copiez-le à la main.");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, markVerified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de mot de passe');
      onSaved(data.warning ?? null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-primary-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="header-gradient p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <KeyRound className="w-7 h-7 text-white" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Changer le mot de passe</h2>
              <p className="text-sm text-primary-100 truncate">
                {user.name} — {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Le mot de passe actuel n&apos;est pas consultable : il n&apos;est stocké que sous forme
            chiffrée. Définissez-en un nouveau, puis transmettez-le à la personne concernée.
          </p>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Nouveau mot de passe
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCopied(false);
                  }}
                  autoComplete="new-password"
                  className="input pr-10 w-full"
                  placeholder={`${MIN_PASSWORD_LENGTH} caractères minimum`}
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={visible ? 'Masquer' : 'Afficher'}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="btn btn-outline whitespace-nowrap"
                title="Générer un mot de passe aléatoire"
              >
                <RefreshCw className="w-4 h-4" />
                Générer
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 min-h-[20px]">
              {tooShort ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {MIN_PASSWORD_LENGTH} caractères minimum
                </span>
              ) : strength ? (
                <span
                  className={
                    strength.tone === 'success'
                      ? 'text-xs text-accent-600 dark:text-accent-400'
                      : strength.tone === 'warning'
                        ? 'text-xs text-yellow-600 dark:text-yellow-400'
                        : 'text-xs text-red-600 dark:text-red-400'
                  }
                >
                  Robustesse : {strength.label}
                </span>
              ) : (
                <span />
              )}
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-accent-300 hover:underline"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Confirmation
            </label>
            <input
              type={visible ? 'text' : 'password'}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="new-password"
              className="input w-full"
              placeholder="Ressaisissez le mot de passe"
            />
            {mismatch && (
              <span className="text-xs text-red-600 dark:text-red-400 mt-1.5 block">
                Les deux saisies ne correspondent pas
              </span>
            )}
          </div>

          {!isVerified && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Ce compte n&apos;a jamais validé son adresse e-mail. La connexion étant refusée
                    tant que l&apos;e-mail n&apos;est pas vérifié, un nouveau mot de passe seul ne
                    lui rendra pas l&apos;accès.
                  </p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markVerified}
                      onChange={(e) => setMarkVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-primary-700 focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">
                      Marquer aussi l&apos;adresse e-mail comme vérifiée
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-outline w-full sm:flex-1">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn btn-primary w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Définir le mot de passe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
