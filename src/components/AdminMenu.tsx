'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, Euro, PieChart, Users } from 'lucide-react';

const items = [
  { href: '/admin', label: 'Statistiques', icon: BarChart3 },
  { href: '/admin/reservations', label: 'Réservations', icon: Calendar },
  { href: '/admin/pricing', label: 'Tarifs', icon: Euro },
  { href: '/admin/room-stats', label: 'Stats salles', icon: PieChart },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
];

export default function AdminMenu() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white dark:border-primary-700/60 dark:bg-primary-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary-700 text-white shadow-sm dark:bg-accent-600'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-primary-700/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
