'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Calendar, Home, LogOut, User, Users, Menu, X, Shield, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const linkBase =
  'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors';
const linkActive = 'bg-primary-50 text-primary-700 dark:bg-accent-500/15 dark:text-accent-300';
const linkIdle =
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-primary-700/40 dark:hover:text-white';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  const isActive = (path: string) => pathname === path;
  const isAdmin = session.user.role === 'admin';

  const navItems = [
    { href: '/dashboard', label: 'Accueil', icon: Home, match: isActive('/dashboard') },
    {
      href: '/dashboard/reservations',
      label: 'Mes Réservations',
      icon: Calendar,
      match: isActive('/dashboard/reservations'),
    },
    { href: '/reglement', label: 'Règlement', icon: Shield, match: isActive('/reglement') },
    { href: '/aide', label: 'Aide', icon: HelpCircle, match: isActive('/aide') },
    ...(isAdmin
      ? [
          {
            href: '/admin',
            label: 'Administration',
            icon: Users,
            match: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm dark:border-primary-700/60 dark:bg-primary-900/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-0.5 ring-1 ring-slate-200 shadow-sm">
                <Image
                  src="/image/logo.jpg"
                  alt="Blason de Chartrettes"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
              <span className="text-base sm:text-lg font-bold text-primary-800">
                Chartrettes
              </span>
            </Link>

            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navItems.map(({ href, label, icon: Icon, match }) => (
                <Link key={href} href={href} className={`${linkBase} ${match ? linkActive : linkIdle}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/profile"
              className={`hidden sm:inline-flex ${linkBase} ${
                isActive('/profile') ? linkActive : linkIdle
              }`}
            >
              <User className="h-4 w-4" />
              {session.user.name}
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={`hidden sm:inline-flex ${linkBase} ${linkIdle}`}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary-700/40 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-900 animate-fade-in">
          <div className="px-3 pt-3 pb-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon, match }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg ${
                  match ? linkActive : linkIdle
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}

            <div className="border-t border-slate-200 dark:border-primary-700/60 my-2" />

            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg ${
                isActive('/profile') ? linkActive : linkIdle
              }`}
            >
              <User className="h-5 w-5" />
              {session.user.name}
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg ${linkIdle}`}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
