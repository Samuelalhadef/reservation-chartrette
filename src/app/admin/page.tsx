'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Building2, Clock, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    fetchStats();
  }, [period]);

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
          <p className="text-gray-800 dark:text-gray-200">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  // Préparer les données pour le graphique camembert des salles
  const generateColors = (count: number) => {
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(14, 165, 233, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(168, 85, 247, 0.8)',
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard Administrateur
            </h1>
            <p className="mt-2 text-gray-800 dark:text-gray-200">
              Vue d'ensemble et statistiques du système
            </p>
          </div>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800 dark:text-gray-200">Réservations totales</p>
            <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.totalReservations || 0}
          </p>
          <Link
            href="/admin/reservations"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800 dark:text-gray-200">Salles actives</p>
            <Building2 className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.totalRooms || 0}
          </p>
          <Link
            href="/admin/rooms"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800 dark:text-gray-200">Utilisateurs</p>
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.totalUsers || 0}
          </p>
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800 dark:text-gray-200">Taux d'acceptation</p>
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.acceptanceRate || 0}%
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-2">
            Demandes approuvées
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Rooms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Salles les plus réservées
              </h2>
              <Link
                href="/admin/room-stats"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <BarChart3 className="h-4 w-4" />
                Voir statistiques détaillées
              </Link>
            </div>
          </div>
          <div className="p-6">
            {stats.reservationsByRoom.length > 0 ? (
              <div className="h-80">
                <Pie data={roomsChartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-gray-800 dark:text-gray-200 text-center py-4">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>

        {/* Top Associations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
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
              <p className="text-gray-800 dark:text-gray-200 text-center py-4">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Répartition des réservations par statut
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.statusBreakdown.map((status) => (
              <div
                key={status._id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {status.count}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 capitalize">
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
