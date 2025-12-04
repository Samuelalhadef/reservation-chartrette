'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, MessageSquare, Repeat, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import Button from '@/components/Button';
import { formatDate, formatTimeSlot } from '@/lib/utils';
import ViewToggle from '@/components/ViewToggle';
import CalendarView from '@/components/CalendarView';
import PaymentModal from '@/components/PaymentModal';
import { formatPrice } from '@/lib/pricing';

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
  totalPrice: number;
  depositAmount: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
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
  const [applyToGroup, setApplyToGroup] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [paymentModalReservation, setPaymentModalReservation] = useState<Reservation | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

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

  // Détecte si une réservation fait partie d'un groupe (réservation annuelle)
  const isPartOfYearlyReservation = (reservation: Reservation) => {
    // Chercher d'autres réservations avec le même utilisateur, salle, raison et créneaux similaires
    const similarReservations = reservations.filter(r =>
      r.userId.id === reservation.userId.id &&
      r.roomId.id === reservation.roomId.id &&
      r.reason === reservation.reason &&
      r.id !== reservation.id &&
      Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000 // Créées dans la même minute
    );
    return similarReservations.length > 0;
  };

  // Compte le nombre de réservations liées (réservation annuelle)
  const countRelatedReservations = (reservation: Reservation) => {
    if (!isPartOfYearlyReservation(reservation)) return 0;
    return reservations.filter(r =>
      r.userId.id === reservation.userId.id &&
      r.roomId.id === reservation.roomId.id &&
      r.reason === reservation.reason &&
      Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000
    ).length;
  };

  // Génère une clé unique pour un groupe de réservations
  const getGroupKey = (reservation: Reservation) => {
    return `${reservation.userId.id}-${reservation.roomId.id}-${new Date(reservation.createdAt).getTime()}`;
  };

  // Obtient toutes les réservations d'un groupe
  const getGroupReservations = (reservation: Reservation) => {
    return reservations.filter(r =>
      r.userId.id === reservation.userId.id &&
      r.roomId.id === reservation.roomId.id &&
      r.reason === reservation.reason &&
      Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Groupe les réservations (sépare les individuelles et les groupes)
  const groupReservations = (reservations: Reservation[]) => {
    const groups: { [key: string]: Reservation[] } = {};
    const singles: Reservation[] = [];
    const processed = new Set<string>();

    reservations.forEach(reservation => {
      if (processed.has(reservation.id)) return;

      if (isPartOfYearlyReservation(reservation)) {
        const groupKey = getGroupKey(reservation);
        if (!groups[groupKey]) {
          const groupReservations = getGroupReservations(reservation);
          groups[groupKey] = groupReservations;
          groupReservations.forEach(r => processed.add(r.id));
        }
      } else {
        singles.push(reservation);
        processed.add(reservation.id);
      }
    });

    return { groups, singles };
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
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

  const handleAction = async (reservationId: string, action: 'approved' | 'rejected', applyToGroup: boolean = false) => {
    if (action === 'rejected' && !comment.trim()) {
      alert('Veuillez fournir un commentaire pour le refus');
      return;
    }

    setProcessingId(reservationId);

    try {
      if (applyToGroup) {
        // Trouver toutes les réservations liées
        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        const relatedReservations = reservations.filter(r =>
          r.userId.id === reservation.userId.id &&
          r.roomId.id === reservation.roomId.id &&
          r.reason === reservation.reason &&
          Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000
        );

        // Traiter toutes les réservations en parallèle
        const promises = relatedReservations.map(r =>
          fetch(`/api/reservations/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: action,
              adminComment: comment.trim() || undefined,
            }),
          })
        );

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.ok);

        if (failed.length > 0) {
          alert(`${failed.length} réservation(s) n'ont pas pu être traitées`);
        } else {
          alert(`${relatedReservations.length} réservations ${action === 'approved' ? 'approuvées' : 'refusées'} avec succès`);
        }
      } else {
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
    setApplyToGroup(false);
    setConfirmationText('');
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  const filteredReservations = reservations.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const { groups: yearlyGroups, singles: singleReservations } = groupReservations(filteredReservations);

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
          <div className="space-y-4 p-4">
            {/* Groupes de réservations annuelles */}
            {Object.entries(yearlyGroups).map(([groupKey, groupReservations]) => {
              const firstReservation = groupReservations[0];
              const isExpanded = expandedGroups.has(groupKey);
              const groupStatus = firstReservation.status;

              return (
                <div key={groupKey} className={`rounded-xl border-2 transition-all shadow-md ${
                  groupStatus === 'approved'
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                    : groupStatus === 'rejected'
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'border-purple-400 dark:border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30'
                }`}>
                  {/* En-tête du groupe */}
                  <div
                    onClick={() => toggleGroup(groupKey)}
                    className="p-4 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-800/30 transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-purple-600 dark:bg-purple-500 rounded-lg">
                          <Repeat className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">
                              Réservation à l'année
                            </h3>
                            <span className="px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white text-xs font-bold rounded-full">
                              {groupReservations.length} dates
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                groupStatus === 'approved'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : groupStatus === 'rejected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}
                            >
                              {groupStatus === 'approved'
                                ? 'Approuvée'
                                : groupStatus === 'rejected'
                                ? 'Refusée'
                                : 'En attente'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-purple-800 dark:text-purple-200">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span className="font-semibold">{firstReservation.userId.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{firstReservation.roomId.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {firstReservation.timeSlots
                                  .map((slot) => formatTimeSlot(slot.start, slot.end))
                                  .join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <ChevronRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Liste des réservations du groupe */}
                  {isExpanded && (
                    <div className="border-t-2 border-purple-200 dark:border-purple-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                        {groupReservations.map((reservation) => (
                          <div key={reservation.id} className={`p-3 rounded-lg transition-all shadow-sm hover:shadow-md ${
                            reservation.status === 'approved'
                              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                              : reservation.status === 'rejected'
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex flex-col h-full">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(reservation.date)}</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {reservation.timeSlots
                                  .map((slot) => formatTimeSlot(slot.start, slot.end))
                                  .join(', ')}
                              </div>
                              {reservation.status === 'pending' && (
                                <div className="flex gap-2 mt-auto pt-2">
                                  <Button
                                    variant="success"
                                    onClick={() => openCommentModal(reservation.id, 'approved')}
                                    disabled={processingId === reservation.id}
                                    className="flex-1 text-xs py-1"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    onClick={() => openCommentModal(reservation.id, 'rejected')}
                                    disabled={processingId === reservation.id}
                                    className="flex-1 text-xs py-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Actions groupées */}
                      {firstReservation.status === 'pending' && (
                        <div className="border-t-2 border-purple-200 dark:border-purple-700 p-4 bg-purple-100/50 dark:bg-purple-900/20">
                          <p className="text-sm text-purple-900 dark:text-purple-100 font-semibold mb-3">
                            Actions groupées sur toutes les réservations :
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="success"
                              onClick={() => {
                                openCommentModal(firstReservation.id, 'approved');
                                setApplyToGroup(true);
                              }}
                              disabled={processingId === firstReservation.id}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Tout approuver ({groupReservations.length})
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => {
                                openCommentModal(firstReservation.id, 'rejected');
                                setApplyToGroup(true);
                              }}
                              disabled={processingId === firstReservation.id}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Tout refuser ({groupReservations.length})
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Réservations individuelles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {singleReservations.map((reservation) => {
              const isPaidReservation = reservation.totalPrice > 0 || reservation.depositAmount > 0;
              return (
              <div key={reservation.id} className={`p-4 rounded-xl transition-all shadow-md hover:shadow-lg ${
                isPaidReservation
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 ring-2 ring-amber-200 dark:ring-amber-800'
                  : reservation.status === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 border-2 border-green-200 dark:border-green-800'
                  : reservation.status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-2 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex-1">
                      {reservation.roomId.name}
                    </h3>
                    {isPaidReservation && (
                      <span className="ml-2 px-2 py-1 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center gap-1 shadow-md">
                        <DollarSign className="w-3 h-3" />
                        PAYANT
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-3 ${
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

                  <div className="space-y-2 mb-3 text-xs">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        <strong>{reservation.userId.name}</strong>
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDate(reservation.date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {reservation.timeSlots
                          .map((slot) => formatTimeSlot(slot.start, slot.end))
                          .join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span>{reservation.estimatedParticipants} pers.</span>
                    </div>
                  </div>

                  <div className="mb-3 flex-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motif:
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {reservation.reason}
                    </p>
                  </div>

                  {reservation.adminComment && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Commentaire:
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {reservation.adminComment}
                      </p>
                    </div>
                  )}

                  {/* Informations de paiement */}
                  {(reservation.totalPrice > 0 || reservation.depositAmount > 0) && (
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Tarification:
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          reservation.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : reservation.paymentStatus === 'check_deposited'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            : reservation.paymentStatus === 'refunded'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                        }`}>
                          {reservation.paymentStatus === 'paid'
                            ? 'Payé'
                            : reservation.paymentStatus === 'check_deposited'
                            ? 'Chèque déposé'
                            : reservation.paymentStatus === 'refunded'
                            ? 'Remboursé'
                            : 'En attente'}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="font-semibold">{formatPrice(reservation.totalPrice)}</span>
                        </div>
                        {reservation.depositAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Caution:</span>
                            <span className="font-semibold">{formatPrice(reservation.depositAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-green-200 dark:border-green-800 pt-1">
                          <span className="font-medium">Total:</span>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            {formatPrice(reservation.totalPrice + reservation.depositAmount)}
                          </span>
                        </div>
                      </div>
                      {reservation.status === 'approved' && (
                        <button
                          onClick={() => setPaymentModalReservation(reservation)}
                          className="mt-2 w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                        >
                          <DollarSign className="h-3 w-3" />
                          Gérer le paiement
                        </button>
                      )}
                    </div>
                  )}

                  {reservation.status === 'pending' && (
                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="success"
                        onClick={() => openCommentModal(reservation.id, 'approved')}
                        disabled={processingId === reservation.id}
                        className="w-full text-xs py-2"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => openCommentModal(reservation.id, 'rejected')}
                        disabled={processingId === reservation.id}
                        className="w-full text-xs py-2"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {new Date(reservation.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            );
            })}
            </div>
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
      {commentModal && (() => {
        const reservation = reservations.find(r => r.id === commentModal.reservationId);
        const isYearly = reservation ? isPartOfYearlyReservation(reservation) : false;
        const relatedCount = reservation ? countRelatedReservations(reservation) : 0;
        const isPaidReservation = reservation ? (reservation.totalPrice > 0 || reservation.depositAmount > 0) : false;
        const requiresConfirmation = isPaidReservation && commentModal.action === 'approved';
        const isConfirmationValid = !requiresConfirmation || confirmationText.trim().toLowerCase() === 'reservation payée';

        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {commentModal.action === 'approved' ? 'Approuver' : 'Refuser'} la réservation
            </h3>

            {isYearly && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-purple-900 dark:text-purple-100">
                    Réservation annuelle détectée
                  </span>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Cette réservation fait partie d'un groupe de <strong>{relatedCount} réservations</strong>.
                </p>
                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToGroup}
                    onChange={(e) => setApplyToGroup(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-purple-900 dark:text-purple-100">
                    Appliquer cette action à toutes les réservations du groupe
                  </span>
                </label>
              </div>
            )}

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

            {requiresConfirmation && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    Réservation payante - Confirmation requise
                  </span>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Cette réservation implique un paiement de <strong>{formatPrice((reservation?.totalPrice || 0) + (reservation?.depositAmount || 0))}</strong>.
                  Pour des raisons de sécurité, veuillez taper <strong>&ldquo;reservation payée&rdquo;</strong> ci-dessous pour confirmer.
                </p>
                <label className="block text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Tapez &ldquo;reservation payée&rdquo; pour confirmer (obligatoire)
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    confirmationText && !isConfirmationValid
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-amber-300 dark:border-amber-600 focus:ring-amber-500'
                  }`}
                  placeholder="reservation payée"
                  autoComplete="off"
                />
                {confirmationText && !isConfirmationValid && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Le texte ne correspond pas. Veuillez taper exactement &ldquo;reservation payée&rdquo;
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setCommentModal(null);
                  setComment('');
                  setApplyToGroup(false);
                  setConfirmationText('');
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant={commentModal.action === 'approved' ? 'success' : 'danger'}
                onClick={() => handleAction(commentModal.reservationId, commentModal.action, applyToGroup)}
                isLoading={processingId === commentModal.reservationId}
                disabled={
                  processingId === commentModal.reservationId ||
                  (commentModal.action === 'rejected' && !comment.trim()) ||
                  !isConfirmationValid
                }
                className="flex-1"
              >
                {applyToGroup ? `Confirmer (${relatedCount})` : 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Payment Modal */}
      {paymentModalReservation && (
        <PaymentModal
          isOpen={true}
          onClose={() => setPaymentModalReservation(null)}
          reservation={paymentModalReservation}
          onSuccess={() => {
            fetchReservations();
            setPaymentModalReservation(null);
          }}
        />
      )}
    </div>
  );
}
