'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from './Button';

export default function HelpChat() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Pré-remplir avec les infos de l'utilisateur connecté
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setStatusMessage('Message envoyé avec succès !');
        setMessage('');
        setName('');
        setEmail('');

        // Fermer automatiquement après 3 secondes
        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
          setStatusMessage('');
        }, 3000);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Erreur lors de l\'envoi du message');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('Erreur lors de l\'envoi du message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-primary-700 hover:bg-primary-800 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-300 hover:scale-110 z-50"
          aria-label="Ouvrir le chat d'aide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-96 bg-white dark:bg-primary-800/40 rounded-lg shadow-2xl z-50 border border-slate-200 dark:border-primary-700/60">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-700 to-accent-700 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="font-semibold">Besoin d'aide ?</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setStatus('idle');
                setStatusMessage('');
              }}
              className="hover:bg-primary-800 rounded p-1 transition-colors"
              aria-label="Fermer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === 'success' ? (
              <div className="bg-accent-50 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-400 p-4 rounded-lg text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="font-semibold">{statusMessage}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-900 dark:text-white mb-4">
                  Posez votre question et nous vous répondrons dans les plus brefs délais.
                </p>

                {status === 'error' && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {statusMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={!!session?.user}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-primary-900/40 text-slate-900 dark:text-white text-sm disabled:bg-slate-100 dark:disabled:bg-primary-800/40 disabled:cursor-not-allowed"
                      placeholder="Votre nom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!!session?.user}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-primary-900/40 text-slate-900 dark:text-white text-sm disabled:bg-slate-100 dark:disabled:bg-primary-800/40 disabled:cursor-not-allowed"
                      placeholder="votre.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-primary-900/40 text-slate-900 dark:text-white text-sm resize-none"
                      placeholder="Décrivez votre question ou problème..."
                    />
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Envoyer
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
