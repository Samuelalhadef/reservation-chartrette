'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import Button from '@/components/Button';
import { formatDate, formatTimeSlot } from '@/lib/utils';
import ViewToggle from '@/components/ViewToggle';
import CalendarView from '@/components/CalendarView';

interface Reservation {
  id: string;
  userId: { id: string; name: string; email: string };
  roomId: { id: string; name: string };
  associationId: { id: string; name: string };
  date: string;
  timeSlots: { start: string; end: string }[];
  reason: string;
  estimatedParticipants: number;
  requiredEquipment?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminComment?: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [commentModal, setCommentModal] = useState<{
    reservationId: string;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchReservations();
    fetchRooms();
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

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleAction = async (reservationId: string, action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !comment.trim()) {
      alert('Veuillez fournir un commentaire pour le refus');
      return;
    }

    setProcessingId(reservationId);

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          adminComment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Une erreur est survenue');
        return;
      }

      await fetchReservations();
      setCommentModal(null);
      setComment('');
    } catch (error) {
      console.error('Error processing reservation:', error);
      alert('Une erreur est survenue');
    } finally {
      setProcessingId(null);
    }
  };

  const openCommentModal = (reservationId: string, action: 'approved' | 'rejected') => {
    setCommentModal({ reservationId, action });
    setComment('');
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  const filteredReservations = reservations.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const statusCounts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === 'pending').length,
    approved: reservations.filter((r) => r.status === 'approved').length,
    rejected: reservations.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestion des réservations
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Approuver ou refuser les demandes de réservation
            </p>
          </div>
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter Tabs */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex flex-wrap gap-2 p-4">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' && `Toutes (${statusCounts.all})`}
                  {status === 'pending' && `En attente (${statusCounts.pending})`}
                  {status === 'approved' && `Approuvées (${statusCounts.approved})`}
                  {status === 'rejected' && `Refusées (${statusCounts.rejected})`}
                </button>
              ))}
            </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Chargement...
          </div>
        ) : filteredReservations.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className={`p-6 transition-colors ${
                reservation.status === 'approved'
                  ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40'
                  : reservation.status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {reservation.roomId.name}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          reservation.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : reservation.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}
                      >
                        {reservation.status === 'approved'
                          ? 'Approuvée'
                          : reservation.status === 'rejected'
                          ? 'Refusée'
                          : 'En attente'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          <strong>{reservation.userId.name}</strong> ({reservation.associationId.name})
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{formatDate(reservation.date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {reservation.timeSlots
                            .map((slot) => formatTimeSlot(slot.start, slot.end))
                            .join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{reservation.estimatedParticipants} participants</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Motif:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {reservation.reason}
                      </p>
                    </div>

                    {reservation.adminComment && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Commentaire administrateur:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {reservation.adminComment}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Demande créée le {new Date(reservation.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  {reservation.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Button
                        variant="success"
                        onClick={() => openCommentModal(reservation.id, 'approved')}
                        disabled={processingId === reservation.id}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approuver
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => openCommentModal(reservation.id, 'rejected')}
                        disabled={processingId === reservation.id}
                        className="w-full"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Aucune réservation trouvée
          </div>
        )}
          </div>
        </>
      ) : (
        <CalendarView
          reservations={reservations}
          rooms={rooms}
          onApprove={(reservationId) => openCommentModal(reservationId, 'approved')}
          onReject={(reservationId) => openCommentModal(reservationId, 'rejected')}
        />
      )}

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Détails de la réservation
                </h3>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedReservation.roomId.name}
                    </h4>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        selectedReservation.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : selectedReservation.status === 'rejected'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {selectedReservation.status === 'approved'
                        ? 'Approuvée'
                        : selectedReservation.status === 'rejected'
                        ? 'Refusée'
                        : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      <strong>{selectedReservation.userId.name}</strong> ({selectedReservation.associationId.name})
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{formatDate(selectedReservation.date)}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      {selectedReservation.timeSlots
                        .map((slot) => formatTimeSlot(slot.start, slot.end))
                        .join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{selectedReservation.estimatedParticipants} participants</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Motif:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedReservation.reason}
                  </p>
                </div>

                {selectedReservation.adminComment && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commentaire administrateur:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedReservation.adminComment}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Demande créée le {new Date(selectedReservation.createdAt).toLocaleString('fr-FR')}
                </p>

                {selectedReservation.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="success"
                      onClick={() => {
                        setSelectedReservation(null);
                        openCommentModal(selectedReservation.id, 'approved');
                      }}
                      disabled={processingId === selectedReservation.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setSelectedReservation(null);
                        openCommentModal(selectedReservation.id, 'rejected');
                      }}
                      disabled={processingId === selectedReservation.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {commentModal.action === 'approved' ? 'Approuver' : 'Refuser'} la réservation
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commentaire {commentModal.action === 'rejected' && '(obligatoire)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={
                  commentModal.action === 'approved'
                    ? 'Ajoutez des instructions ou informations complémentaires (optionnel)...'
                    : 'Expliquez la raison du refus...'
                }
                required={commentModal.action === 'rejected'}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setCommentModal(null);
                  setComment('');
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant={commentModal.action === 'approved' ? 'success' : 'danger'}
                onClick={() => handleAction(commentModal.reservationId, commentModal.action)}
                isLoading={processingId === commentModal.reservationId}
                disabled={
                  processingId === commentModal.reservationId ||
                  (commentModal.action === 'rejected' && !comment.trim())
                }
                className="flex-1"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
