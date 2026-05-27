'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatTimeSlot } from '@/lib/utils';

interface Reservation {
  id: string;
  roomId: { id: string; name: string };
  associationId: { id: string; name: string };
  date: string;
  timeSlots: { start: string; end: string }[];
  reason: string;
  estimatedParticipants: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminComment?: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export default function ReservationsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showSuccess, setShowSuccess] = useState(success === 'true');

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

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

  const filteredReservations = reservations.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-accent-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-600" />;
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
        return 'bg-accent-700 text-white dark:bg-accent-700 dark:text-accent-50';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-slate-100 text-slate-800 dark:bg-primary-900/40 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const statusCounts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === 'pending').length,
    approved: reservations.filter((r) => r.status === 'approved').length,
    rejected: reservations.filter((r) => r.status === 'rejected').length,
    cancelled: reservations.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Mes réservations
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Gérez et suivez l'état de vos réservations
        </p>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg text-accent-700 dark:text-accent-400 flex items-center">
          <CheckCircle className="h-5 w-5 mr-3" />
          Votre demande de réservation a été soumise avec succès !
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 bg-white dark:bg-primary-800/40 rounded-lg shadow border border-slate-200 dark:border-primary-700/60">
        <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 dark:border-primary-700/60">
          {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-700 text-white'
                  : 'bg-slate-100 dark:bg-primary-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-primary-800/60'
              }`}
            >
              {status === 'all' ? 'Toutes' : getStatusText(status)} ({statusCounts[status]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">
            Chargement...
          </div>
        ) : filteredReservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className={`p-4 rounded-xl transition-all shadow-md hover:shadow-lg ${
                reservation.status === 'approved'
                  ? 'bg-accent-50 dark:bg-accent-900/40 hover:bg-accent-100 dark:hover:bg-accent-900/50 border-2 border-accent-200 dark:border-accent-800'
                  : 'bg-white dark:bg-primary-800/40 hover:bg-slate-50 dark:hover:bg-primary-800/60 border border-slate-200 dark:border-primary-700/60'
              }`}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`text-base font-semibold flex-1 ${
                      reservation.status === 'approved'
                        ? 'text-accent-900 dark:text-accent-200'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {reservation.roomId.name}
                    </h3>
                    {getStatusIcon(reservation.status)}
                  </div>

                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-3 ${getStatusColor(reservation.status)}`}>
                    {getStatusText(reservation.status)}
                  </span>

                  <div className="space-y-2 mb-3 flex-1">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDate(reservation.date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {reservation.timeSlots.map((slot) => formatTimeSlot(slot.start, slot.end)).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Motif:
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {reservation.reason}
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                    <span className="font-medium">Participants:</span> {reservation.estimatedParticipants}
                  </div>

                  {reservation.adminComment && (
                    <div className={`p-2 rounded-lg mb-3 ${
                      reservation.status === 'approved'
                        ? 'bg-accent-100 dark:bg-accent-900/30'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Commentaire admin:
                      </p>
                      <p className={`text-xs line-clamp-2 ${
                        reservation.status === 'approved'
                          ? 'text-accent-900 dark:text-accent-300'
                          : 'text-red-700 dark:text-red-400'
                      }`}>
                        {reservation.adminComment}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-primary-700/60">
                    {new Date(reservation.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Calendar className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300">
              {filter === 'all'
                ? 'Vous n\'avez pas encore de réservation'
                : `Aucune réservation ${getStatusText(filter).toLowerCase()}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
