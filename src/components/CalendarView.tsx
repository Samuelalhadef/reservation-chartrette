'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, X, CheckCircle, XCircle } from 'lucide-react';
import { formatTimeSlot, formatDate } from '@/lib/utils';

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

interface CalendarViewProps {
  reservations: Reservation[];
  rooms: Room[];
  onApprove: (reservationId: string) => void;
  onReject: (reservationId: string) => void;
}

type CalendarMode = 'week' | 'month';

// Format YYYY-MM-DD sans décalage de fuseau horaire
const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function CalendarView({ reservations, rooms, onApprove, onReject }: CalendarViewProps) {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // Réservation sélectionnée → affichée dans une modale (pas de tooltip au survol)
  const [selected, setSelected] = useState<Reservation | null>(null);

  // ---- Génération des jours ------------------------------------------------
  const getWeekDays = () => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };
  const weekDays = getWeekDays();

  const getMonthDays = () => {
    const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const start = new Date(firstOfMonth);
    const startDay = start.getDay();
    start.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));

    const lastOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const end = new Date(lastOfMonth);
    const endDay = end.getDay();
    end.setDate(end.getDate() + (endDay === 0 ? 0 : 7 - endDay));

    const days: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };
  const monthDays = getMonthDays();

  // ---- Navigation ----------------------------------------------------------
  const goToPrevious = () => {
    if (calendarMode === 'week') {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() - 7);
      setCurrentWeekStart(d);
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };
  const goToNext = () => {
    if (calendarMode === 'week') {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + 7);
      setCurrentWeekStart(d);
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };
  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(new Date(now).setDate(diff)));
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // ---- Filtrage des réservations (on ignore rejetées et annulées) ----------
  const visibleReservations = reservations.filter(
    (r) => r.status !== 'rejected' && r.status !== 'cancelled'
  );

  const getForRoomAndDay = (roomId: string, date: Date) => {
    const key = toDateKey(date);
    return visibleReservations.filter(
      (r) => r.roomId.id === roomId && toDateKey(new Date(r.date)) === key
    );
  };

  const getForDay = (date: Date) => {
    const key = toDateKey(date);
    return visibleReservations.filter((r) => toDateKey(new Date(r.date)) === key);
  };

  // ---- Helpers d'affichage -------------------------------------------------
  const chipClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-accent-500 hover:bg-accent-600 text-white';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      default:
        return 'bg-slate-400 hover:bg-slate-500 text-white';
    }
  };

  const timeRange = (r: Reservation) => {
    const first = r.timeSlots?.[0]?.start ?? '';
    const last = r.timeSlots?.[r.timeSlots.length - 1]?.end ?? '';
    return first && last ? `${first}–${last}` : '';
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
  };
  const formatMonthLabel = () => {
    const label = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  // Petite pastille cliquable représentant une réservation
  const ReservationChip = ({ r, showRoom = false }: { r: Reservation; showRoom?: boolean }) => (
    <button
      onClick={() => setSelected(r)}
      title={`${r.associationId.name} — ${timeRange(r)}`}
      className={`w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight font-medium truncate transition-colors shadow-sm ${chipClass(r.status)}`}
    >
      {showRoom && <span className="font-semibold">{r.roomId.name} · </span>}
      {timeRange(r)} {r.associationId.name}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Barre de navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-primary-800/40 p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 hover:bg-slate-100 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-slate-100 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {calendarMode === 'week' ? formatWeekRange() : formatMonthLabel()}
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-primary-700/60 overflow-hidden">
            {(['week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  calendarMode === mode
                    ? 'bg-primary-700 text-white'
                    : 'bg-white dark:bg-primary-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-primary-900/40'
                }`}
              >
                {mode === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-accent-300 hover:bg-primary-50 dark:hover:bg-accent-500/10 rounded-lg transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>

      {/* ---- Vue Semaine : grille salles × jours ---- */}
      {calendarMode === 'week' ? (
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              {/* En-tête des jours */}
              <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] bg-slate-50 dark:bg-primary-900/40 border-b border-slate-200 dark:border-primary-700/60">
                <div className="px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-primary-700/60">
                  Salles
                </div>
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`px-2 py-2 text-center border-r border-slate-200 dark:border-primary-700/60 last:border-r-0 ${
                      isToday(day) ? 'bg-primary-50 dark:bg-accent-500/10' : ''
                    }`}
                  >
                    <div className={`text-[11px] uppercase font-semibold ${isToday(day) ? 'text-primary-700 dark:text-accent-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold leading-tight ${isToday(day) ? 'text-primary-700 dark:text-accent-300' : 'text-slate-900 dark:text-white'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lignes par salle */}
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-primary-700/60 last:border-b-0"
                >
                  <div className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-primary-700/60 flex items-center">
                    {room.name}
                  </div>
                  {weekDays.map((day, i) => {
                    const dayRes = getForRoomAndDay(room.id, day);
                    return (
                      <div
                        key={i}
                        className={`min-h-[72px] p-1 border-r border-slate-200 dark:border-primary-700/60 last:border-r-0 flex flex-col gap-1 ${
                          isToday(day) ? 'bg-primary-50/40 dark:bg-accent-500/5' : ''
                        }`}
                      >
                        {dayRes.map((r) => (
                          <ReservationChip key={r.id} r={r} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ---- Vue Mois ---- */
        <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-primary-900/40 border-b border-slate-200 dark:border-primary-700/60">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((dayName) => (
              <div
                key={dayName}
                className="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-900 dark:text-white border-r border-slate-200 dark:border-primary-700/60 last:border-r-0"
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day, index) => {
              const dayRes = getForDay(day);
              const visible = dayRes.slice(0, 3);
              const hidden = dayRes.length - visible.length;
              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-1.5 border-r border-b border-slate-200 dark:border-primary-700/60 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 ${
                    isToday(day)
                      ? 'bg-primary-50/40 dark:bg-accent-500/10'
                      : !isCurrentMonth(day)
                      ? 'bg-slate-50/60 dark:bg-primary-900/20'
                      : ''
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      isToday(day)
                        ? 'text-primary-700 dark:text-accent-300'
                        : isCurrentMonth(day)
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {visible.map((r) => (
                    <ReservationChip key={r.id} r={r} showRoom />
                  ))}
                  {hidden > 0 && (
                    <span className="px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      +{hidden} autre{hidden > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-6 bg-white dark:bg-primary-800/40 p-4 rounded-lg shadow">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Légende :</span>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent-500"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Approuvée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-yellow-500"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">En attente</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
          Cliquez sur une réservation pour voir le détail
        </span>
      </div>

      {/* Modale de détail (remplace les tooltips au survol) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="bg-white dark:bg-primary-800/60 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-primary-700/60 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-primary-700/60">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selected.associationId.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selected.roomId.name} — {formatDate(selected.date)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-primary-900/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <span
                className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                  selected.status === 'approved'
                    ? 'bg-accent-100 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}
              >
                {selected.status === 'approved' ? 'Approuvée' : 'En attente'}
              </span>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4 shrink-0" />
                <span>{selected.userId.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{selected.timeSlots.map((s) => formatTimeSlot(s.start, s.end)).join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4 shrink-0" />
                <span>{selected.estimatedParticipants} participants</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">Motif :</span> {selected.reason}
              </div>
              {selected.adminComment && (
                <div className="bg-slate-50 dark:bg-primary-900/40 p-3 rounded-lg text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Commentaire admin :</span> {selected.adminComment}
                </div>
              )}
            </div>

            {selected.status === 'pending' && (
              <div className="flex gap-2 p-5 pt-0">
                <button
                  onClick={() => {
                    onApprove(selected.id);
                    setSelected(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approuver
                </button>
                <button
                  onClick={() => {
                    onReject(selected.id);
                    setSelected(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Refuser
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
