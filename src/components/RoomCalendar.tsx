'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, X, CheckCircle, XCircle, Calendar, Repeat, Clock, LayoutGrid, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isToday, isSameDay } from 'date-fns';
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

// Catégorie visuelle d'un créneau, calculée une seule fois et réutilisée
// entre la vue desktop et la vue mobile pour rester cohérent.
type SlotKind =
  | 'outOfRange'
  | 'rejected'
  | 'yearly'
  | 'approved'
  | 'pending'
  | 'selected'
  | 'selectionStart'
  | 'today'
  | 'available';

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

  // Générer les heures de 8h à 23h (dernier créneau 23h-24h)
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8h → 23h, dernier créneau 23h-24h

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
    // Si le créneau est déjà réservé, on gère l'annulation EN PREMIER, sans
    // appliquer le délai minimum : l'annulation d'une réservation existante
    // (par son propriétaire ou un admin) n'est soumise à aucune contrainte de
    // temps. Le droit d'annuler est vérifié dans handleReservationClick.
    const reservation = getSlotReservation(day, hour);
    if (reservation) {
      handleReservationClick(reservation);
      return;
    }

    // Plus aucune réservation : il s'agit d'une nouvelle demande, on impose le
    // délai minimum de 10 jours.
    if (!isDateInValidRange(day)) {
      alert('Réservation 10 jours à l\'avance minimum');
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
      const response = await fetch(`/api/reservations/${reservationToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de l\'annulation';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // réponse non parsable, on garde le message générique
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

  // --- Calcul de l'état visuel d'un créneau (partagé desktop / mobile) -------
  const getSlotState = (day: Date, hour: number) => {
    const reservation = getSlotReservation(day, hour);
    const isReserved = reservation !== null;
    const isOwn = isReserved && canCancelReservation(reservation);
    const status = reservation?.status;
    const approved = isReserved && status === 'approved';
    const pending = isReserved && status === 'pending';
    const rejected = isReserved && status === 'rejected' && isOwn;
    const yearly = approved && isYearlyReservation(reservation);
    const outOfRange = !isReserved && !isDateInValidRange(day);
    const selected = isSlotSelected(day, hour);
    const selectionStartSlot = isSlotSelectionStart(day, hour);

    let kind: SlotKind = 'available';
    if (outOfRange) kind = 'outOfRange';
    else if (rejected) kind = 'rejected';
    else if (yearly) kind = 'yearly';
    else if (approved) kind = 'approved';
    else if (pending) kind = 'pending';
    else if (selected) kind = 'selected';
    else if (selectionStartSlot) kind = 'selectionStart';
    else if (isToday(day)) kind = 'today';

    // Désactivé : réservé par quelqu'un d'autre, refusé, ou hors plage
    const disabled = (isReserved && !isOwn) || rejected || outOfRange;

    const assoName = reservation?.association?.name || reservation?.user?.name || 'Association';

    return { reservation, isReserved, isOwn, kind, disabled, assoName };
  };

  // Classes de la cellule (vue desktop) selon la catégorie
  const cellClassByKind: Record<SlotKind, string> = {
    outOfRange: 'border-slate-200 dark:border-primary-700/60 bg-slate-100 dark:bg-primary-900/40 opacity-50 cursor-not-allowed',
    rejected: 'border-red-300 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 cursor-not-allowed',
    yearly: 'border-primary-700 dark:border-primary-500 bg-primary-700 dark:bg-primary-800 text-white cursor-pointer hover:bg-primary-800 dark:hover:bg-primary-700',
    approved: 'border-accent-400 dark:border-accent-600 bg-accent-50 dark:bg-accent-900/40 text-accent-900 dark:text-accent-100 hover:border-accent-500',
    pending: 'border-slate-400 dark:border-primary-600 bg-slate-100 dark:bg-primary-700/50 text-slate-800 dark:text-slate-100 hover:border-slate-500',
    selected: 'border-accent-500 bg-accent-100 dark:bg-accent-900/60 text-accent-800 dark:text-accent-100 ring-2 ring-accent-400/60 ring-inset',
    selectionStart: 'border-orange-400 bg-orange-50 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 ring-2 ring-orange-300/60 ring-inset',
    today: 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-accent-300 hover:border-primary-400',
    available: 'border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 text-accent-600 dark:text-accent-400 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/70 dark:hover:bg-primary-900/40',
  };

  // Contenu compact d'une cellule réservée (icône + libellé court)
  const renderReservedContent = (kind: SlotKind, assoName: string, isOwn: boolean, compact = false) => {
    const Icon = kind === 'rejected' ? XCircle : kind === 'yearly' ? Repeat : kind === 'approved' ? CheckCircle : Clock;
    const label =
      kind === 'rejected' ? 'Refusée' : kind === 'yearly' ? 'Annuelle' : kind === 'approved' ? 'Validée' : 'En attente';
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full px-0.5 text-center leading-tight">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[9px] font-semibold">{label}</span>
        {!compact && <span className="text-[9px] font-medium truncate w-full opacity-90">{assoName}</span>}
        {isOwn && <span className="text-[8px] opacity-75">Annuler</span>}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-xl overflow-hidden">
      {/* En-tête du calendrier */}
      <div className="bg-gradient-to-r from-primary-700 to-accent-700 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Emploi du temps</h2>
            <p className="text-sm text-primary-100">
              {viewMode === 'week'
                ? `Semaine du ${format(weekStart, 'd', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`
                : format(currentMonth, 'MMMM yyyy', { locale: fr }).replace(/^./, (c) => c.toUpperCase())}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Semaine / Mois */}
            <div className="flex bg-white/20 rounded-lg p-0.5 backdrop-blur-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  viewMode === 'month' ? 'bg-white text-primary-700 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Mois
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  viewMode === 'week' ? 'bg-white text-primary-700 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Semaine
              </button>
            </div>

            <button
              onClick={() => setIsYearlyModalOpen(true)}
              className="px-4 py-2 bg-primary-800/80 hover:bg-primary-800 text-white rounded-lg transition-colors font-semibold shadow-sm flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              <span className="hidden sm:inline">Réservation à l&apos;année</span>
              <span className="sm:hidden">Annuelle</span>
            </button>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={viewMode === 'week' ? goToPreviousWeek : () => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                title={viewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={viewMode === 'week' ? goToToday : () => setCurrentMonth(new Date())}
                className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 rounded-lg transition-colors font-semibold text-primary-700 text-sm"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={viewMode === 'week' ? goToNextWeek : () => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                title={viewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
              >
                <ChevronRight className="w-5 h-5 text-white" />
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

      {/* Vue Semaine — Desktop (grille horaire) */}
      {viewMode === 'week' && (
        <div className="hidden md:block p-4 sm:p-6">
          <div className="overflow-x-auto">
            {/* min-w garantit la lisibilité ; sur grand écran les colonnes
                remplissent l'espace grâce à minmax(0,1fr) */}
            <div className="min-w-[720px]">
              {/* En-tête des jours */}
              <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1.5 mb-1.5">
                <div />
                {weekDays.map((day) => {
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`text-center py-2 rounded-lg ${
                        today
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-50 dark:bg-primary-900/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-wide ${today ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {format(day, 'EEE', { locale: fr })}
                      </div>
                      <div className={`text-lg font-bold leading-tight ${today ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grille horaire */}
              <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1.5">
                {hours.map((hour) => (
                  <React.Fragment key={`hour-row-${hour}`}>
                    <div className="flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {hour}:00
                    </div>
                    {weekDays.map((day) => {
                      const state = getSlotState(day, hour);
                      return (
                        <button
                          key={`${day.toISOString()}-${hour}`}
                          onClick={() => handleSlotClick(day, hour)}
                          disabled={state.disabled}
                          title={`${
                            state.isReserved
                              ? `${state.kind === 'rejected' ? 'Réservation refusée' : state.kind === 'yearly' ? 'Réservation annuelle' : state.kind === 'approved' ? 'Réservation validée' : 'En attente'} — ${state.assoName}`
                              : state.kind === 'outOfRange'
                              ? 'Réservation 10 jours à l\'avance minimum'
                              : state.kind === 'selected'
                              ? 'Sélectionné'
                              : state.kind === 'selectionStart'
                              ? 'Début de sélection'
                              : 'Réserver'
                          } — ${format(day, 'dd/MM/yyyy')} à ${hour}:00`}
                          className={`min-h-[56px] p-1 rounded-lg border-2 transition-colors duration-150 flex items-center justify-center text-xs font-medium ${cellClassByKind[state.kind]}`}
                        >
                          {state.isReserved ? (
                            renderReservedContent(state.kind, state.assoName, state.isOwn, true)
                          ) : state.kind === 'outOfRange' ? (
                            <span className="text-[9px]">10j min</span>
                          ) : state.kind === 'selected' ? (
                            <span className="text-[10px] font-bold">✓</span>
                          ) : state.kind === 'selectionStart' ? (
                            <span className="text-[10px] font-bold">⏱</span>
                          ) : (
                            <span className="text-[10px] opacity-60">Libre</span>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Semaine — Mobile (liste par jour) */}
      {viewMode === 'week' && (
        <div className="md:hidden p-4">
          {/* Carrousel de jours */}
          <div className="flex gap-2 overflow-x-auto mb-4 pb-2 -mx-1 px-1">
            {weekDays.map((day) => {
              const today = isToday(day);
              const isSelected = isSameDay(day, selectedMobileDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedMobileDay(day)}
                  className={`flex-shrink-0 text-center py-2 px-3 rounded-xl min-w-[64px] transition-colors ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : today
                      ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-accent-300'
                      : 'bg-slate-50 dark:bg-primary-900/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? 'text-primary-100' : 'opacity-70'}`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className="text-xl font-bold leading-tight">{format(day, 'd')}</div>
                </button>
              );
            })}
          </div>

          {/* Liste des créneaux pour le jour sélectionné */}
          <div className="space-y-1.5">
            {hours.map((hour) => {
              const state = getSlotState(selectedMobileDay, hour);
              return (
                <button
                  key={`mobile-${hour}`}
                  onClick={() => handleSlotClick(selectedMobileDay, hour)}
                  disabled={state.disabled}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors duration-150 ${cellClassByKind[state.kind]}`}
                >
                  <span className="flex-shrink-0 w-14 text-center font-bold text-sm">{hour}:00</span>
                  <span className="flex-1 min-w-0">
                    {state.isReserved ? (
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {state.kind === 'rejected'
                            ? 'Réservation refusée'
                            : state.kind === 'yearly'
                            ? 'Réservation annuelle'
                            : state.kind === 'approved'
                            ? 'Réservation validée'
                            : 'En attente de validation'}
                        </span>
                        <span className="text-xs truncate opacity-80">{state.assoName}</span>
                        {state.isOwn && <span className="text-[11px] opacity-70 mt-0.5">Cliquez pour annuler</span>}
                      </span>
                    ) : state.kind === 'outOfRange' ? (
                      <span className="text-sm">Réservation 10 jours à l&apos;avance minimum</span>
                    ) : state.kind === 'selected' ? (
                      <span className="text-sm font-bold">✓ Créneau de fin sélectionné</span>
                    ) : state.kind === 'selectionStart' ? (
                      <span className="text-sm font-bold">⏱ Créneau de début — cliquez sur l&apos;heure de fin</span>
                    ) : (
                      <span className="text-sm font-medium">Disponible</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Légende (vue semaine uniquement) */}
      {viewMode === 'week' && (
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-primary-900/40 border-t border-slate-200 dark:border-primary-700/60">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
            💡 Cliquez sur l&apos;heure de début puis sur l&apos;heure de fin pour sélectionner plusieurs créneaux
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-slate-200 bg-white dark:bg-primary-800/40"></span>
              <span className="text-slate-600 dark:text-slate-400">Disponible</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-accent-400 bg-accent-50 dark:bg-accent-900/40"></span>
              <span className="text-slate-600 dark:text-slate-400">Validée</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-primary-700 bg-primary-700"></span>
              <span className="text-slate-600 dark:text-slate-400">Annuelle</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-slate-400 bg-slate-100 dark:bg-primary-700/50"></span>
              <span className="text-slate-600 dark:text-slate-400">En attente</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-red-300 bg-red-50 dark:bg-red-900/30"></span>
              <span className="text-slate-600 dark:text-slate-400">Refusée</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border-2 border-primary-300 bg-primary-50 dark:bg-primary-950"></span>
              <span className="text-slate-600 dark:text-slate-400">Aujourd&apos;hui</span>
            </span>
          </div>
        </div>
      )}

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
                  De {selectedSlots.startHour}:00 à {selectedSlots.endHour + 1}:00
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
              <h2 className="text-2xl font-bold text-white mb-2">Annuler la réservation</h2>
              <p className="text-red-100">Êtes-vous sûr ?</p>
            </div>

            {/* Contenu */}
            <div className="p-6">
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Vous êtes sur le point d&apos;annuler la réservation suivante :
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
