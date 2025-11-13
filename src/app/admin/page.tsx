'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Building2, Clock, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';

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
  const [period, setPeriod] = useState('month');

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
          <p className="text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Administrateur
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Vue d'ensemble et statistiques du système
        </p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Réservations totales</p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Salles actives</p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Associations</p>
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.totalAssociations || 0}
          </p>
          <Link
            href="/admin/associations"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
          >
            Gérer →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Taux d'acceptation</p>
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.summary?.acceptanceRate || 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Demandes approuvées
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Rooms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Salles les plus réservées
            </h2>
          </div>
          <div className="p-6">
            {stats.reservationsByRoom.length > 0 ? (
              <div className="space-y-4">
                {stats.reservationsByRoom.map((room, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {room.roomName}
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {room.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(room.count / stats.reservationsByRoom[0].count) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">
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
              <div className="space-y-4">
                {stats.topAssociations.map((assoc, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {assoc.associationName}
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {assoc.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(assoc.count / stats.topAssociations[0].count) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 capitalize">
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
