'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/Button';
import { formatDate, formatTimeSlot } from '@/lib/utils';

interface Reservation {
  _id: string;
  roomId: { _id: string; name: string };
  date: string;
  timeSlots: { start: string; end: string }[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminComment?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingReservations = reservations.filter(
    (r) => r.status === 'approved' && new Date(r.date) >= new Date()
  ).slice(0, 5);

  const pendingReservations = reservations.filter((r) => r.status === 'pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Refusée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bienvenue, {session?.user?.name}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gérez vos réservations de salles
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {pendingReservations.length}
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approuvées</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {reservations.filter((r) => r.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {reservations.length}
              </p>
            </div>
            <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-white mb-4 md:mb-0">
            <h2 className="text-2xl font-bold">Réserver une salle</h2>
            <p className="mt-1 opacity-90">Trouvez et réservez une salle pour votre association</p>
          </div>
          <Link href="/dashboard/new-reservation">
            <Button variant="secondary" size="lg">
              <Calendar className="h-5 w-5 mr-2" />
              Nouvelle réservation
            </Button>
          </Link>
        </div>
      </div>

      {/* Upcoming Reservations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Prochaines réservations
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            Chargement...
          </div>
        ) : upcomingReservations.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {upcomingReservations.map((reservation) => (
              <div key={reservation._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {reservation.roomId.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                        {getStatusText(reservation.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(reservation.date)}
                      </p>
                      <p className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {reservation.timeSlots.map((slot) => formatTimeSlot(slot.start, slot.end)).join(', ')}
                      </p>
                      <p className="mt-2">{reservation.reason}</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusIcon(reservation.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            Aucune réservation à venir
          </div>
        )}

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 text-center">
          <Link
            href="/dashboard/reservations"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold text-sm"
          >
            Voir toutes mes réservations →
          </Link>
        </div>
      </div>
    </div>
  );
}
