'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReservationModal from './ReservationModal';

interface RoomCalendarProps {
  roomId: string;
  roomName: string;
  roomCapacity: number;
  reservations?: any[];
}

export default function RoomCalendar({ roomId, roomName, roomCapacity, reservations: initialReservations = [] }: RoomCalendarProps) {
  const { data: session } = useSession();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ date: Date; hour: number } | null>(null);
  const [reservations, setReservations] = useState<any[]>(initialReservations);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // Générer les heures de 8h à 22h
  const hours = Array.from({ length: 14 }, (_, i) => i + 8);

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

  // Vérifier si un créneau est réservé
  const getSlotReservation = (day: Date, hour: number) => {
    for (const reservation of reservations) {
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
    // Vérifier si le créneau est déjà réservé
    const reservation = getSlotReservation(day, hour);
    if (reservation) {
      return; // Ne rien faire si déjà réservé
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

  // Valider la sélection et ouvrir la modale
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* En-tête du calendrier */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Emploi du temps
            </h2>
            <p className="text-blue-100">
              Semaine du {format(weekStart, 'd', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors font-semibold text-blue-600"
            >
              Aujourd'hui
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
              title="Semaine suivante"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-6">
        <div className="min-w-[900px]">
          {/* En-tête des jours */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            <div className="h-20"></div>
            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`text-center p-3 rounded-xl shadow-sm ${
                    today
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                    today ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`text-2xl font-bold ${today ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille horaire */}
          <div className="grid grid-cols-8 gap-2">
            {hours.map((hour) => (
              <React.Fragment key={`hour-row-${hour}`}>
                <div
                  className="text-right pr-3 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-transparent dark:from-gray-700 dark:to-transparent rounded-l-lg flex items-center justify-end"
                >
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const today = isToday(day);
                  const selected = isSlotSelected(day, hour);
                  const selectionStartSlot = isSlotSelectionStart(day, hour);
                  const reservation = getSlotReservation(day, hour);
                  const isReserved = reservation !== null;

                  return (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      onClick={() => handleSlotClick(day, hour)}
                      disabled={isReserved}
                      className={`
                        min-h-[70px] p-3 rounded-xl border-2 transition-all duration-200 relative group
                        ${isReserved
                          ? 'border-gray-400 dark:border-gray-600 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 cursor-not-allowed opacity-75'
                          : selected
                          ? 'border-green-500 dark:border-green-600 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 shadow-lg scale-105'
                          : selectionStartSlot
                          ? 'border-orange-500 dark:border-orange-600 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 shadow-md scale-102'
                          : today
                          ? 'border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white dark:hover:from-gray-700 dark:hover:to-gray-800'
                        }
                        ${!selected && !isReserved && 'hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:scale-105'}
                      `}
                      title={`${isReserved ? `Réservé par ${reservation.userId}` : selected ? 'Sélectionné' : selectionStartSlot ? 'Début de sélection' : 'Réserver'} le ${format(day, 'dd/MM/yyyy')} à ${hour}:00`}
                    >
                      <div className={`text-xs font-medium transition-colors ${
                        isReserved
                          ? 'text-gray-700 dark:text-gray-300 font-semibold'
                          : selected
                          ? 'text-green-700 dark:text-green-300 font-bold'
                          : selectionStartSlot
                          ? 'text-orange-700 dark:text-orange-300 font-bold'
                          : 'text-green-600 dark:text-green-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {isReserved ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">En cours de</span>
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">réservation par</span>
                            <span className="font-bold mt-1">{reservation.userId}</span>
                          </div>
                        ) : selected ? '✓ Sélectionné' : selectionStartSlot ? '⏱ Début' : '✓ Disponible'}
                      </div>
                      {!selected && !isReserved && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 rounded-xl transition-all"></div>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Boutons de validation / Légende */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700">
        {selectedSlots ? (
          // Afficher les boutons de validation quand une sélection est faite
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-xl border-2 border-green-500 dark:border-green-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <p className="font-bold text-green-900 dark:text-green-100">
                    {selectedSlots.endHour - selectedSlots.startHour + 1} créneau(x) sélectionné(s)
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    De {selectedSlots.startHour}:00 à {selectedSlots.endHour + 1}:00 le {format(selectedSlots.date, 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSelection}
                  className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-semibold border-2 border-gray-300 dark:border-gray-600"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidateSelection}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  Valider la sélection
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Afficher la légende normale
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              💡 Cliquez sur l'heure de début puis sur l'heure de fin pour sélectionner plusieurs créneaux
            </p>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-100 to-green-200 border border-green-300"></div>
                <span className="text-gray-600 dark:text-gray-400">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-400"></div>
                <span className="text-gray-600 dark:text-gray-400">Réservé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-100 to-yellow-100 border border-orange-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Début sélection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-emerald-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Sélectionné</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Aujourd'hui</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
        />
      )}
    </div>
  );
}
