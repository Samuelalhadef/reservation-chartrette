'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, X, CheckCircle, XCircle, Calendar, Repeat, LayoutGrid, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isToday, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReservationModal from './ReservationModal';
import YearlyReservationModal from './YearlyReservationModal';
import MonthCalendarView from './MonthCalendarView';

interface RoomCalendarProps {
  roomId: string;
  roomName: string;
  roomCapacity: number;
  reservations?: any[];
  buildingId?: string;
}

export default function RoomCalendar({ roomId, roomName, roomCapacity, reservations: initialReservations = [], buildingId }: RoomCalendarProps) {
  const { data: session } = useSession();
  // Initialiser le calendrier sur le premier jour réservable (10 jours dans le futur)
  const [currentWeek, setCurrentWeek] = useState(() => {
    const firstBookableDay = new Date();
    firstBookableDay.setDate(firstBookableDay.getDate() + 10);
    return firstBookableDay;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ date: Date; hour: number } | null>(null);
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<any>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(() => {
    const firstBookableDay = new Date();
    firstBookableDay.setDate(firstBookableDay.getDate() + 10);
    return firstBookableDay;
  });
  const [isYearlyModalOpen, setIsYearlyModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const firstBookableDay = new Date();
    firstBookableDay.setDate(firstBookableDay.getDate() + 10);
    return firstBookableDay;
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // Générer les heures de 8h à minuit (dernier créneau 23h-00h)
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8h, dernier créneau 23h-00h (minuit)

  // Rafraîchir les réservations
  const refreshReservations = async () => {
    try {
      const response = await fetch(`/api/reservations?roomId=${roomId}`);
      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des réservations:', error);
    }
  };

  // Détecte si une réservation fait partie d'un groupe (réservation annuelle)
  const isYearlyReservation = (reservation: any) => {
    const similarReservations = reservations.filter(r =>
      r.userId === reservation.userId &&
      r.roomId === reservation.roomId &&
      r.reason === reservation.reason &&
      r.id !== reservation.id &&
      Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000
    );
    return similarReservations.length > 0;
  };

  // Vérifier si une date est dans la plage valide (minimum 10 jours à l'avance)
  const isDateInValidRange = (day: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(day);
    checkDate.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 10);

    // La date doit être au minimum 10 jours dans le futur
    return checkDate >= minDate;
  };

  // Vérifier si un créneau est réservé
  const getSlotReservation = (day: Date, hour: number) => {
    for (const reservation of reservations) {
      // Ignorer les réservations annulées pour tout le monde
      if (reservation.status === 'cancelled') {
        continue;
      }
      const resDate = new Date(reservation.date);
      if (isSameDay(resDate, day)) {
        const timeSlots = reservation.timeSlots || [];
        for (const slot of timeSlots) {
          const slotStart = parseInt(slot.start.split(':')[0]);
          const slotEnd = parseInt(slot.end.split(':')[0]);
          if (hour >= slotStart && hour < slotEnd) {
            return reservation;
          }
        }
      }
    }
    return null;
  };

  // Gestion de la sélection de créneaux
  const handleSlotClick = (day: Date, hour: number) => {
    // Vérifier si la date est dans la plage valide
    if (!isDateInValidRange(day)) {
      alert('Réservation 10 jours à l\'avance minimum');
      return;
    }

    // Vérifier si le créneau est déjà réservé
    const reservation = getSlotReservation(day, hour);
    if (reservation) {
      // Si c'est une réservation de l'utilisateur, ouvrir la modale d'annulation
      handleReservationClick(reservation);
      return;
    }
    if (!selectionStart) {
      // Premier clic : définir le début de la sélection
      setSelectionStart({ date: day, hour });
      setSelectedSlots(null);
    } else if (isSameDay(selectionStart.date, day)) {
      // Deuxième clic : définir la fin de la sélection (même jour)
      const startHour = Math.min(selectionStart.hour, hour);
      const endHour = Math.max(selectionStart.hour, hour);
      setSelectedSlots({ date: day, startHour, endHour });
      setSelectionStart(null);
    } else {
      // Clic sur un autre jour : réinitialiser
      setSelectionStart({ date: day, hour });
      setSelectedSlots(null);
    }
  };

  // Vérifier si un créneau est sélectionné
  const isSlotSelected = (day: Date, hour: number): boolean => {
    if (!selectedSlots) return false;
    if (!isSameDay(selectedSlots.date, day)) return false;
    return hour >= selectedSlots.startHour && hour <= selectedSlots.endHour;
  };

  // Vérifier si c'est le début de la sélection temporaire
  const isSlotSelectionStart = (day: Date, hour: number): boolean => {
    if (!selectionStart) return false;
    return isSameDay(selectionStart.date, day) && selectionStart.hour === hour;
  };

  // Valider la sélection et ouvrir la modale de réservation
  const handleValidateSelection = () => {
    if (selectedSlots) {
      setIsModalOpen(true);
    }
  };

  // Annuler la sélection
  const handleCancelSelection = () => {
    setSelectedSlots(null);
    setSelectionStart(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlots(null);
    setSelectionStart(null);
  };

  // Vérifier si la réservation appartient à l'utilisateur actuel
  const canCancelReservation = (reservation: any) => {
    if (!session?.user) return false;
    return reservation.userId === session.user.id || session.user.role === 'admin';
  };

  // Ouvrir la modale d'annulation
  const handleReservationClick = (reservation: any) => {
    if (canCancelReservation(reservation) && reservation.status !== 'cancelled' && reservation.status !== 'rejected') {
      setReservationToCancel(reservation);
      setCancelModalOpen(true);
    }
  };

  // Annuler une réservation
  const handleCancelReservation = async () => {
    if (!reservationToCancel) return;

    setIsCanceling(true);
    try {
      console.log('Annulation de la réservation:', reservationToCancel.id);

      const response = await fetch(`/api/reservations/${reservationToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Réponse du serveur:', response.status);

      if (!response.ok) {
        let errorMessage = 'Erreur lors de l\'annulation';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
          console.error('Erreur serveur:', data);
        } catch (e) {
          console.error('Impossible de parser la réponse d\'erreur');
        }
        throw new Error(errorMessage);
      }

      // Rafraîchir les réservations
      await refreshReservations();
      setCancelModalOpen(false);
      setReservationToCancel(null);

      // Message de succès
      alert('Réservation annulée avec succès!');
    } catch (error: any) {
      console.error('Erreur d\'annulation complète:', error);
      alert(error.message || 'Erreur lors de l\'annulation de la réservation. Veuillez réessayer.');
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-xl overflow-hidden">
      {/* En-tête du calendrier */}
      <div className="bg-gradient-to-r from-primary-700 to-accent-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Emploi du temps
            </h2>
            <p className="text-primary-100">
              {viewMode === 'week'
                ? `Semaine du ${format(weekStart, 'd', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`
                : format(currentMonth, 'MMMM yyyy', { locale: fr }).replace(/^./, (c) => c.toUpperCase())
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Toggle Semaine / Mois */}
            <div className="flex bg-white/20 rounded-lg p-0.5 backdrop-blur-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'month'
                    ? 'bg-white text-primary-700 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Mois
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'week'
                    ? 'bg-white text-primary-700 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Semaine
              </button>
            </div>
            <button
              onClick={() => setIsYearlyModalOpen(true)}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              <Calendar className="w-5 h-5" />
              <span className="hidden sm:inline">Réservation à l'année</span>
              <span className="sm:hidden">Annuelle</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={viewMode === 'week' ? goToPreviousWeek : () => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                title={viewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={viewMode === 'week' ? goToToday : () => setCurrentMonth(new Date())}
                className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg transition-colors font-semibold text-primary-700"
              >
                Aujourd'hui
              </button>
              <button
                onClick={viewMode === 'week' ? goToNextWeek : () => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                title={viewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vue Mois */}
      {viewMode === 'month' && (
        <MonthCalendarView
          currentMonth={currentMonth}
          reservations={reservations}
          onDayClick={(day) => {
            setCurrentWeek(day);
            setSelectedMobileDay(day);
            setViewMode('week');
          }}
          onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
          onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
          onGoToToday={() => setCurrentMonth(new Date())}
          isDateInValidRange={isDateInValidRange}
        />
      )}

      {/* Vue Desktop (grille) */}
      <div className={`${viewMode === 'month' ? 'hidden' : 'hidden md:block'} overflow-x-auto p-4 sm:p-6`}>
        <div className="min-w-full" style={{ width: 'max-content' }}>
          {/* En-tête des jours */}
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '80px repeat(7, 140px)' }}>
            <div className="h-20"></div>
            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`text-center p-3 rounded-xl shadow-sm ${
                    today
                      ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white'
                      : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-primary-900/40 dark:to-primary-800/40'
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                    today ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`text-2xl font-bold ${today ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille horaire */}
          <div className="grid gap-2" style={{ gridTemplateColumns: '80px repeat(7, 140px)' }}>
            {hours.map((hour) => (
              <React.Fragment key={`hour-row-${hour}`}>
                <div
                  className="text-center py-4 text-sm font-bold text-slate-600 dark:text-slate-300 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-primary-900/40 dark:to-primary-800/40 rounded-lg flex items-center justify-center"
                >
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const today = isToday(day);
                  const selected = isSlotSelected(day, hour);
                  const selectionStartSlot = isSlotSelectionStart(day, hour);
                  const reservation = getSlotReservation(day, hour);
                  const isReserved = reservation !== null;
                  const isOwnReservation = isReserved && canCancelReservation(reservation);
                  const isApprovedReservation = isReserved && reservation.status === 'approved';
                  const isYearlyApprovedReservation = isApprovedReservation && isYearlyReservation(reservation);
                  const isRejectedReservation = isReserved && reservation.status === 'rejected' && isOwnReservation;
                  const isPendingReservation = isReserved && reservation.status === 'pending';
                  // Un créneau est hors de portée seulement s'il n'est PAS réservé et qu'il est avant J+7
                  const isOutOfRange = !isReserved && !isDateInValidRange(day);

                  return (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      onClick={() => handleSlotClick(day, hour)}
                      disabled={(isReserved && !isOwnReservation) || isRejectedReservation || isOutOfRange}
                      className={`
                        min-h-[70px] p-3 rounded-xl border-2 transition-all duration-200 relative group
                        ${isOutOfRange
                          ? 'border-slate-300 dark:border-primary-700/60 bg-slate-100 dark:bg-primary-900/40 cursor-not-allowed opacity-50'
                          : isRejectedReservation
                          ? 'border-red-700 dark:border-red-600 bg-gradient-to-br from-red-200 to-rose-200 dark:from-red-900 dark:to-rose-900 cursor-not-allowed'
                          : isYearlyApprovedReservation && isOwnReservation
                          ? 'border-primary-900 dark:border-primary-700 bg-gradient-to-br from-primary-700 to-primary-800 dark:from-primary-900 dark:to-primary-950 cursor-pointer hover:from-primary-800 hover:to-primary-900 dark:hover:from-primary-800 dark:hover:to-primary-900 hover:shadow-lg hover:scale-105'
                          : isYearlyApprovedReservation && !isOwnReservation
                          ? 'border-primary-900 dark:border-primary-700 bg-gradient-to-br from-primary-700 to-primary-800 dark:from-primary-900 dark:to-primary-950 cursor-not-allowed'
                          : isReserved && isApprovedReservation && isOwnReservation
                          ? 'border-accent-600 dark:border-accent-500 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900 dark:to-accent-800 cursor-pointer hover:from-accent-200 hover:to-accent-300 dark:hover:from-accent-800 dark:hover:to-accent-700 hover:shadow-lg hover:scale-105'
                          : isReserved && isApprovedReservation && !isOwnReservation
                          ? 'border-accent-600 dark:border-accent-500 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900 dark:to-accent-800 cursor-not-allowed'
                          : isPendingReservation && isOwnReservation
                          ? 'border-slate-500 dark:border-primary-600 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-primary-700 dark:to-primary-800 cursor-pointer hover:from-slate-400 hover:to-slate-500 dark:hover:from-primary-600 dark:hover:to-primary-700 hover:shadow-lg hover:scale-105'
                          : isPendingReservation && !isOwnReservation
                          ? 'border-slate-500 dark:border-primary-600 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-primary-700 dark:to-primary-800 cursor-not-allowed'
                          : selected
                          ? 'border-accent-500 dark:border-accent-600 bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900 dark:to-accent-800 shadow-lg scale-105'
                          : selectionStartSlot
                          ? 'border-orange-500 dark:border-orange-600 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 shadow-md scale-102'
                          : today
                          ? 'border-primary-300 dark:border-primary-600 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 hover:from-primary-100 hover:to-primary-200 dark:hover:from-primary-900 dark:hover:to-primary-800'
                          : 'border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 hover:bg-gradient-to-br hover:from-primary-50 hover:to-white dark:hover:from-primary-900/40 dark:hover:to-primary-800/40'
                        }
                        ${!selected && !isReserved && !isOutOfRange && 'hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-lg hover:scale-105'}
                      `}
                      title={`${
                        isReserved
                          ? (isRejectedReservation ? 'Réservation refusée' : isApprovedReservation ? 'Réservation validée' : 'En attente') + ` par ${reservation.association?.name || reservation.user?.name || 'Association'}`
                          : isOutOfRange
                          ? 'Réservation 10 jours à l\'avance minimum'
                          : selected
                          ? 'Sélectionné'
                          : selectionStartSlot
                          ? 'Début de sélection'
                          : 'Réserver'
                      } le ${format(day, 'dd/MM/yyyy')} à ${hour}:00`}
                    >
                      <div className={`text-xs font-medium transition-colors ${
                        isOutOfRange
                          ? 'text-slate-500 dark:text-slate-400'
                          : isRejectedReservation
                          ? 'text-red-900 dark:text-red-200 font-semibold'
                          : isYearlyApprovedReservation
                          ? 'text-white dark:text-primary-100 font-semibold'
                          : isReserved && isApprovedReservation
                          ? 'text-accent-900 dark:text-accent-200 font-semibold'
                          : isPendingReservation
                          ? 'text-slate-900 dark:text-slate-200 font-semibold'
                          : selected
                          ? 'text-accent-700 dark:text-accent-300 font-bold'
                          : selectionStartSlot
                          ? 'text-orange-700 dark:text-orange-300 font-bold'
                          : 'text-accent-600 dark:text-accent-400 group-hover:text-primary-700 dark:group-hover:text-accent-300'
                      }`}>
                        {isOutOfRange ? (
                          <span className="text-[10px]">Réservation 10j min</span>
                        ) : isReserved ? (
                          <div className="flex flex-col items-center justify-center">
                            {isRejectedReservation ? (
                              <>
                                <XCircle className="w-5 h-5 mb-1 text-red-900 dark:text-red-200" />
                                <span className="text-[10px] leading-tight text-center text-red-900 dark:text-red-200 font-semibold">Votre réservation</span>
                                <span className="text-[10px] leading-tight text-center text-red-900 dark:text-red-200 font-semibold">est refusée</span>
                                <span className="text-[10px] font-bold mt-1 text-center leading-tight text-red-950 dark:text-red-100">({reservation.association?.name || reservation.user?.name || 'Association'})</span>
                              </>
                            ) : isYearlyApprovedReservation ? (
                              <>
                                <Repeat className="w-5 h-5 mb-1 text-white dark:text-primary-100" />
                                <span className="text-[10px] leading-tight text-center text-white dark:text-primary-100 font-bold">Réservation annuelle</span>
                                <span className="text-[10px] font-bold mt-1 text-center leading-tight text-white dark:text-primary-50">({reservation.association?.name || reservation.user?.name || 'Association'})</span>
                                {isOwnReservation && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <X className="w-3 h-3 text-white dark:text-primary-100" />
                                    <span className="text-[9px] text-white dark:text-primary-100">Cliquez pour annuler</span>
                                  </div>
                                )}
                              </>
                            ) : isApprovedReservation ? (
                              <>
                                <CheckCircle className="w-5 h-5 mb-1 text-accent-900 dark:text-accent-100" />
                                <span className="text-[10px] leading-tight text-center text-accent-900 dark:text-accent-100 font-semibold">Réservation validée</span>
                                <span className="text-[10px] font-bold mt-1 text-center leading-tight text-accent-950 dark:text-accent-50">({reservation.association?.name || reservation.user?.name || 'Association'})</span>
                                {isOwnReservation && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <X className="w-3 h-3 text-accent-900 dark:text-accent-100" />
                                    <span className="text-[9px] text-accent-900 dark:text-accent-100">Cliquez pour annuler</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-slate-900 dark:text-slate-200">En cours de</span>
                                <span className="text-[10px] text-slate-900 dark:text-slate-200">réservation par</span>
                                <span className="font-bold mt-1 text-center leading-tight text-slate-950 dark:text-slate-100">{reservation.association?.name || reservation.user?.name || 'Association'}</span>
                                {isOwnReservation && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <X className="w-3 h-3 text-slate-900 dark:text-slate-200" />
                                    <span className="text-[9px] text-slate-900 dark:text-slate-200">Cliquez pour annuler</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : selected ? '✓ Sélectionné' : selectionStartSlot ? '⏱ Début' : '✓ Disponible'}
                      </div>
                      {!selected && !isReserved && <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-accent-500/0 group-hover:from-primary-500/5 group-hover:to-accent-500/5 rounded-xl transition-all"></div>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Vue Mobile (liste par jour) */}
      <div className={`${viewMode === 'month' ? 'hidden' : 'md:hidden'} p-4`}>
        {/* Carrousel de jours */}
        <div className="flex gap-2 overflow-x-auto mb-4 pb-2 scrollbar-hide">
          {weekDays.map((day) => {
            const today = isToday(day);
            const isSelected = isSameDay(day, selectedMobileDay);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedMobileDay(day)}
                className={`flex-shrink-0 text-center p-3 rounded-xl shadow-sm min-w-[80px] transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white scale-105'
                    : today
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white opacity-70'
                    : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-primary-900/40 dark:to-primary-800/40'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  isSelected || today ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {format(day, 'EEE.', { locale: fr })}
                </div>
                <div className={`text-2xl font-bold ${isSelected || today ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Liste des créneaux pour le jour sélectionné */}
        <div className="space-y-2">
          {hours.map((hour) => {
            const reservation = getSlotReservation(selectedMobileDay, hour);
            const isReserved = reservation !== null;
            const isOutOfRange = !isReserved && !isDateInValidRange(selectedMobileDay);
            const selected = isSlotSelected(selectedMobileDay, hour);
            const selectionStartSlot = isSlotSelectionStart(selectedMobileDay, hour);
            const isOwnReservation = isReserved && canCancelReservation(reservation);
            const isApprovedReservation = isReserved && reservation.status === 'approved';
            const isPendingReservation = isReserved && reservation.status === 'pending';
            const isRejectedReservation = isReserved && reservation.status === 'rejected' && isOwnReservation;

            return (
              <button
                key={`mobile-${hour}`}
                onClick={() => handleSlotClick(selectedMobileDay, hour)}
                disabled={(isReserved && !isOwnReservation) || isRejectedReservation || isOutOfRange}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isOutOfRange
                    ? 'border-slate-300 bg-slate-100 dark:bg-primary-900/40 dark:border-primary-700/60 cursor-not-allowed opacity-50'
                    : isRejectedReservation
                    ? 'border-red-500 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900 dark:to-rose-900 cursor-not-allowed'
                    : isReserved && isApprovedReservation && isOwnReservation
                    ? 'border-accent-500 bg-gradient-to-r from-accent-100 to-accent-200 dark:from-accent-900 dark:to-accent-800 cursor-pointer hover:from-accent-200 hover:to-accent-300'
                    : isReserved && isApprovedReservation && !isOwnReservation
                    ? 'border-accent-500 bg-gradient-to-r from-accent-100 to-accent-200 dark:from-accent-900 dark:to-accent-800 cursor-not-allowed'
                    : isPendingReservation && isOwnReservation
                    ? 'border-slate-500 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-primary-700 dark:to-primary-800 cursor-pointer hover:from-slate-300 hover:to-slate-400'
                    : isPendingReservation && !isOwnReservation
                    ? 'border-slate-500 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-primary-700 dark:to-primary-800 cursor-not-allowed'
                    : selected
                    ? 'border-accent-500 bg-gradient-to-r from-accent-100 to-accent-200 dark:from-accent-900 dark:to-accent-800 shadow-lg scale-105'
                    : selectionStartSlot
                    ? 'border-orange-500 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 shadow-md'
                    : 'border-slate-200 bg-white dark:bg-primary-800/40 dark:border-primary-700/60 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-accent-500/10'
                }`}
              >
                <div className={`flex-shrink-0 w-16 text-center rounded-lg p-2 transition-colors ${
                  selected
                    ? 'bg-accent-600 dark:bg-accent-700'
                    : selectionStartSlot
                    ? 'bg-orange-600 dark:bg-orange-700'
                    : isReserved && isApprovedReservation
                    ? 'bg-accent-500 dark:bg-accent-600'
                    : isPendingReservation
                    ? 'bg-slate-500 dark:bg-primary-600'
                    : isRejectedReservation
                    ? 'bg-red-500 dark:bg-red-600'
                    : 'bg-slate-100 dark:bg-primary-900/40'
                }`}>
                  <div className={`text-base font-bold ${
                    selected || selectionStartSlot || isReserved
                      ? 'text-white'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {hour}:00
                  </div>
                </div>
                <div className="flex-1 text-left">
                  {isRejectedReservation ? (
                    <div>
                      <div className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Réservation refusée
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {reservation.association?.name || reservation.user?.name || 'Association'}
                      </div>
                    </div>
                  ) : isReserved && isApprovedReservation ? (
                    <div>
                      <div className="text-sm font-bold text-accent-700 dark:text-accent-300 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Réservation validée
                      </div>
                      <div className="text-xs text-accent-600 dark:text-accent-400 mt-0.5">
                        {reservation.association?.name || reservation.user?.name || 'Association'}
                      </div>
                      {isOwnReservation && (
                        <div className="text-xs text-accent-700 dark:text-accent-300 mt-1 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          Cliquez pour annuler
                        </div>
                      )}
                    </div>
                  ) : isPendingReservation ? (
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        En attente de validation
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {reservation.association?.name || reservation.user?.name || 'Association'}
                      </div>
                      {isOwnReservation && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          Cliquez pour annuler
                        </div>
                      )}
                    </div>
                  ) : isOutOfRange ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Réservation 10j min
                    </div>
                  ) : selected ? (
                    <div className="text-sm text-accent-700 dark:text-accent-300 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Créneau de fin sélectionné
                    </div>
                  ) : selectionStartSlot ? (
                    <div className="text-sm text-orange-700 dark:text-orange-300 font-bold">
                      ⏱ Créneau de début
                      <div className="text-xs font-normal mt-1">Cliquez sur l'heure de fin</div>
                    </div>
                  ) : (
                    <div className="text-sm text-accent-600 dark:text-accent-400 font-medium flex items-center gap-1">
                      <span>✓</span> Disponible
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende (vue semaine uniquement) */}
      <div className={`${viewMode === 'month' ? 'hidden' : ''} p-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 border-t border-slate-200 dark:border-primary-700/60`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            💡 Cliquez sur l'heure de début puis sur l'heure de fin pour sélectionner plusieurs créneaux
          </p>
          <div className="flex gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border border-slate-200"></div>
              <span className="text-slate-600 dark:text-slate-400">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-accent-100 to-accent-200 border border-accent-600"></div>
              <span className="text-slate-600 dark:text-slate-400">Réservation validée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-primary-700 to-primary-800 border border-primary-900"></div>
              <span className="text-slate-600 dark:text-slate-400">Réservation annuelle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-slate-300 to-slate-400 border border-slate-500"></div>
              <span className="text-slate-600 dark:text-slate-400">En attente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-red-200 to-rose-200 border border-red-700"></div>
              <span className="text-slate-600 dark:text-slate-400">Réservation refusée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-primary-600 to-primary-700"></div>
              <span className="text-slate-600 dark:text-slate-400">Aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>

      {/* Petite modale de validation rapide */}
      {selectedSlots && !isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-primary-800/40 rounded-xl shadow-2xl p-4 sm:p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">✓</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  {selectedSlots.endHour - selectedSlots.startHour + 1} créneau(x) sélectionné(s)
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  De {selectedSlots.startHour}:00 à {selectedSlots.endHour + 1 === 24 ? '00' : selectedSlots.endHour + 1}:00
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {format(selectedSlots.date, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelSelection}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-primary-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-primary-600 transition-colors font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateSelection}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent-600 to-accent-700 text-white rounded-lg hover:from-accent-700 hover:to-accent-800 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de réservation */}
      {selectedSlots && (
        <ReservationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          date={selectedSlots.date}
          startHour={selectedSlots.startHour}
          endHour={selectedSlots.endHour}
          roomId={roomId}
          roomName={roomName}
          roomCapacity={roomCapacity}
          userName={session?.user?.name || ''}
          onSuccess={refreshReservations}
          buildingId={buildingId}
        />
      )}

      {/* Modale de réservation à l'année */}
      <YearlyReservationModal
        isOpen={isYearlyModalOpen}
        onClose={() => setIsYearlyModalOpen(false)}
        roomId={roomId}
        roomName={roomName}
        roomCapacity={roomCapacity}
        userName={session?.user?.name || ''}
        onSuccess={refreshReservations}
        buildingId={buildingId}
      />

      {/* Modale de confirmation d'annulation */}
      {cancelModalOpen && reservationToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCancelModalOpen(false);
              setReservationToCancel(null);
            }
          }}
        >
          <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-2xl max-w-md w-full">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 relative">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setReservationToCancel(null);
                }}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">
                Annuler la réservation
              </h2>
              <p className="text-red-100">
                Êtes-vous sûr ?
              </p>
            </div>

            {/* Contenu */}
            <div className="p-6">
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Vous êtes sur le point d'annuler la réservation suivante :
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Date :</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {format(new Date(reservationToCancel.date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Créneaux :</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {reservationToCancel.timeSlots?.map((slot: any) => `${slot.start}-${slot.end}`).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Raison :</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-right">
                      {reservationToCancel.reason}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Cette action ne peut pas être annulée.
              </p>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setReservationToCancel(null);
                  }}
                  disabled={isCanceling}
                  className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-primary-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Non, garder
                </button>
                <button
                  onClick={handleCancelReservation}
                  disabled={isCanceling}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCanceling ? 'Annulation...' : 'Oui, annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
