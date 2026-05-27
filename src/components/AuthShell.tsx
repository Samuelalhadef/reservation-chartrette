import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Largeur de la carte (par défaut max-w-md) */
  maxWidth?: string;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-700 via-primary-800 to-accent-900 dark:from-primary-950 dark:via-primary-900 dark:to-primary-950">
      <div className={`w-full ${maxWidth} animate-scale-in`}>
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
              <Calendar className="h-6 w-6" />
            </span>
          </Link>
        </div>
        <div className="rounded-2xl bg-white dark:bg-primary-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary-800 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
