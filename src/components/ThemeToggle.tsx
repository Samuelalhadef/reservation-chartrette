'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const order: Theme[] = ['light', 'dark', 'system'];

function apply(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) || 'system';
    setTheme(stored);
    setMounted(true);
  }, []);

  // Suit le système quand le mode "system" est actif.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = () => {
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    apply(next);
  };

  const label =
    theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Auto';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <button
      onClick={cycle}
      title={`Thème : ${label} (cliquer pour changer)`}
      aria-label={`Changer le thème, actuellement : ${label}`}
      className={`inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-primary-700/40 ${className}`}
    >
      {/* Icône neutre avant hydratation pour éviter tout décalage */}
      {mounted ? <Icon className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
    </button>
  );
}
