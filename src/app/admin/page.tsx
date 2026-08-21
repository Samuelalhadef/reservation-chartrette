'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Calendar, Users, Building2, Clock, CheckCircle, TrendingUp, BarChart3, Mail } from 'lucide-react';

// Chart.js n'est chargé que côté client, à la demande (hors du bundle initial).
const Pie = dynamic(() => import('@/components/charts/PieChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-slate-400">
      Chargement du graphique…
    </div>
  ),
});

interface Stats {
  summary: {
    totalReservations: number;
    totalRooms: number;
    totalAssociations: number;
    totalUsers: number;
    pendingReservations: number;
    pendingAssociations: number;
    acceptanceRate: number;
  };
  statusBreakdown: { _id: string; count: number }[];
  reservationsByRoom: { roomName: string; count: number }[];
  topAssociations: { associationName: string; count: number }[];
}

interface EmailQuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  pendingCount: number;
  oldestPendingAt: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [emailQuota, setEmailQuota] = useState<EmailQuotaStatus | null>(null);

  useEffect(() => {
    fetchStats();
  }, [period]);

  // Indépendant de la période : le quota est toujours celui de la journée.
  useEffect(() => {
    fetch('/api/admin/email-quota')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setEmailQuota(data?.error ? null : data))
      .catch(() => setEmailQuota(null));
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`);
      const data = await res.json();

      // Check if the response has an error
      if (data.error) {
        console.error('API Error:', data.error);
        setStats(null);
      } else {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  // Préparer les données pour le graphique camembert des salles
  const generateColors = (count: number) => {
    const colors = [
      'rgba(30, 58, 95, 0.85)',
      'rgba(5, 150, 105, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(239, 68, 68, 0.85)',
      'rgba(30, 58, 95, 0.65)',
      'rgba(5, 150, 105, 0.65)',
      'rgba(30, 58, 95, 0.50)',
      'rgba(5, 150, 105, 0.50)',
      'rgba(245, 158, 11, 0.65)',
      'rgba(239, 68, 68, 0.65)',
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  const roomsChartData = {
    labels: stats.reservationsByRoom.map(r => r.roomName),
    datasets: [
      {
        label: 'Réservations',
        data: stats.reservationsByRoom.map(r => r.count),
        backgroundColor: generateColors(stats.reservationsByRoom.length),
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 2,
      },
    ],
  };

  const associationsChartData = {
    labels: stats.topAssociations.map(a => a.associationName),
    datasets: [
      {
        label: 'Réservations',
        data: stats.topAssociations.map(a => a.count),
        backgroundColor: generateColors(stats.topAssociations.length),
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-800 dark:text-white">
              Dashboard Administrateur
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Vue d'ensemble et statistiques du système
            </p>
          </div>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-primary-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-primary-800/40 text-slate-900 dark:text-white"
            >
              <option value="all">Toutes les périodes</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pending Alerts */}
      {(stats.summary?.pendingReservations > 0 || stats.summary?.pendingAssociations > 0) && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                Actions en attente
              </h3>
              <div className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                {(stats.summary?.pendingReservations || 0) > 0 && (
                  <p>
                    <Link href="/admin/reservations" className="font-semibold hover:underline">
                      {stats.summary?.pendingReservations} demande(s) de réservation
                    </Link>{' '}
                    en attente de validation
                  </p>
                )}
                {(stats.summary?.pendingAssociations || 0) > 0 && (
                  <p>
                    <Link href="/admin/associations" className="font-semibold hover:underline">
                      {stats.summary?.pendingAssociations} demande(s) d'association
                    </Link>{' '}
                    en attente de validation
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerte quota e-mails : messages retenus faute de quota */}
      {emailQuota && emailQuota.pendingCount > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Quota d'envoi quotidien atteint
              </h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                {emailQuota.pendingCount} e-mail(s) n'ont pas pu être envoyés aujourd'hui : la
                limite de {emailQuota.limit} messages par jour est atteinte. Ils sont conservés et
                partiront automatiquement demain, dès que le compteur sera réinitialisé.
                Aucune action n'est nécessaire.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">Réservations totales</p>
            <Calendar className="h-8 w-8 text-primary-700 dark:text-accent-300 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.summary?.totalReservations || 0}
          </p>
          <Link
            href="/admin/reservations"
            className="text-sm text-primary-700 hover:text-primary-800 dark:text-accent-300 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">Salles actives</p>
            <Building2 className="h-8 w-8 text-accent-600 dark:text-accent-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.summary?.totalRooms || 0}
          </p>
          <Link
            href="/admin/rooms"
            className="text-sm text-primary-700 hover:text-primary-800 dark:text-accent-300 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">Utilisateurs</p>
            <Users className="h-8 w-8 text-primary-600 dark:text-primary-300 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.summary?.totalUsers || 0}
          </p>
          <Link
            href="/admin/users"
            className="text-sm text-primary-700 hover:text-primary-800 dark:text-accent-300 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">Taux d'acceptation</p>
            <CheckCircle className="h-8 w-8 text-accent-600 dark:text-accent-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.summary?.acceptanceRate || 0}%
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Demandes approuvées
          </p>
        </div>
      </div>

      {/* Quota d'envoi d'e-mails */}
      {emailQuota && (
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Mail className="h-5 w-5 mr-2 text-primary-700 dark:text-accent-300" />
                Quota d'envoi d'e-mails
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Confirmations, codes de vérification et notifications. Le compteur se
                réinitialise chaque nuit.
              </p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
              {emailQuota.used}
              <span className="text-lg font-medium text-slate-500 dark:text-slate-400">
                {' / '}
                {emailQuota.limit}
              </span>
            </p>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-primary-900/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                emailQuota.remaining === 0
                  ? 'bg-red-500'
                  : emailQuota.used / emailQuota.limit >= 0.8
                    ? 'bg-amber-500'
                    : 'bg-accent-600'
              }`}
              style={{
                width: `${Math.min(100, Math.round((emailQuota.used / emailQuota.limit) * 100))}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {emailQuota.remaining > 0
                ? `${emailQuota.remaining} envoi(s) restant(s) aujourd'hui`
                : "Plus d'envoi possible aujourd'hui"}
            </span>
            {emailQuota.pendingCount > 0 && (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {emailQuota.pendingCount} en attente, envoi demain
              </span>
            )}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Rooms */}
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60">
          <div className="p-6 border-b border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Salles les plus réservées
            </h2>
          </div>
          <div className="p-6">
            {stats.reservationsByRoom.length > 0 ? (
              <div className="h-80">
                <Pie data={roomsChartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300 text-center py-4">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>

        {/* Top Associations */}
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60">
          <div className="p-6 border-b border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Associations les plus actives
            </h2>
          </div>
          <div className="p-6">
            {stats.topAssociations.length > 0 ? (
              <div className="h-80">
                <Pie data={associationsChartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300 text-center py-4">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60">
        <div className="p-6 border-b border-slate-200 dark:border-primary-700/60">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Répartition des réservations par statut
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.statusBreakdown.map((status) => (
              <div
                key={status._id}
                className="bg-slate-50 dark:bg-primary-800/30 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {status.count}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 capitalize">
                  {status._id === 'pending'
                    ? 'En attente'
                    : status._id === 'approved'
                    ? 'Approuvées'
                    : status._id === 'rejected'
                    ? 'Refusées'
                    : 'Annulées'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
