'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, Euro } from 'lucide-react';

export default function AdminMenu() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-4 py-4">
          {/* Bouton Statistiques */}
          <Link
            href="/admin"
            className={`
              flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200
              ${
                isActive('/admin')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-500 hover:shadow-md'
              }
            `}
          >
            <BarChart3 className={`w-5 h-5 ${isActive('/admin') ? 'animate-pulse' : ''}`} />
            <span className="text-lg">Statistiques</span>
          </Link>

          {/* Bouton Réservations */}
          <Link
            href="/admin/reservations"
            className={`
              flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200
              ${
                isActive('/admin/reservations')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-500 hover:shadow-md'
              }
            `}
          >
            <Calendar className={`w-5 h-5 ${isActive('/admin/reservations') ? 'animate-pulse' : ''}`} />
            <span className="text-lg">Réservations</span>
          </Link>

          {/* Bouton Tarifs */}
          <Link
            href="/admin/pricing"
            className={`
              flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200
              ${
                isActive('/admin/pricing')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-500 hover:shadow-md'
              }
            `}
          >
            <Euro className={`w-5 h-5 ${isActive('/admin/pricing') ? 'animate-pulse' : ''}`} />
            <span className="text-lg">Tarifs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
