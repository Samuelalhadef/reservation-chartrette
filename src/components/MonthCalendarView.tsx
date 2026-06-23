'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Repeat } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface Reservation {
  id: string;
  userId: string;
  roomId: string;
  date: string;
  timeSlots: { start: string; end: string }[];
  status: string;
  reason: string;
  createdAt: string;
  user?: { name: string; email: string };
  association?: { name: string };
  [key: string]: any;
}

interface MonthCalendarViewProps {
  currentMonth: Date;
  reservations: Reservation[];
  onDayClick: (day: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  isDateInValidRange: (day: Date) => boolean;
}

export default function MonthCalendarView({
  currentMonth,
  reservations,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  isDateInValidRange,
}: MonthCalendarViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Get reservations for a specific day
  const getDayReservations = (day: Date) => {
    return reservations.filter((r) => {
      if (r.status === 'cancelled') return false;
      return isSameDay(new Date(r.date), day);
    });
  };

  // Check if a reservation is yearly
  const isYearlyReservation = (reservation: Reservation) => {
    const similar = reservations.filter(
      (r) =>
        r.userId === reservation.userId &&
        r.roomId === reservation.roomId &&
        r.reason === reservation.reason &&
        r.id !== reservation.id &&
        Math.abs(new Date(r.createdAt).getTime() - new Date(reservation.createdAt).getTime()) < 60000
    );
    return similar.length > 0;
  };

  // Get summary info for a day
  const getDaySummary = (day: Date) => {
    const dayRes = getDayReservations(day);
    const approved = dayRes.filter((r) => r.status === 'approved');
    const pending = dayRes.filter((r) => r.status === 'pending');
    const yearly = approved.filter((r) => isYearlyReservation(r));

    // Calculate total reserved hours
    let totalHours = 0;
    for (const r of dayRes) {
      for (const slot of r.timeSlots || []) {
        const start = parseInt(slot.start.split(':')[0]);
        const end = parseInt(slot.end.split(':')[0]);
        totalHours += end - start;
      }
    }

    return { approved, pending, yearly, totalHours, total: dayRes.length };
  };

  return (
    <div>
      {/* Month grid */}
      <div className="p-4 sm:p-6">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {dayNames.map((name) => (
            <div
              key={name}
              className="text-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide py-2"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day) => {
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const summary = getDaySummary(day);
            const isValid = isDateInValidRange(day);
            const hasReservations = summary.total > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`
                  relative min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border-2 transition-all duration-200 flex flex-col items-start
                  ${!inCurrentMonth
                    ? 'opacity-30 border-slate-200 dark:border-primary-700/60 bg-slate-50 dark:bg-primary-900/40'
                    : today
                    ? 'border-primary-500 dark:border-primary-400 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 shadow-md'
                    : !isValid && !hasReservations
                    ? 'border-slate-200 dark:border-primary-700/60 bg-slate-50 dark:bg-primary-900/40 opacity-50'
                    : hasReservations
                    ? 'border-slate-300 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-lg'
                    : 'border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md'
                  }
                `}
              >
                {/* Day number */}
                <span
                  className={`text-sm sm:text-base font-bold leading-none ${
                    today
                      ? 'text-primary-700 dark:text-accent-300'
                      : inCurrentMonth
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* Reservation indicators */}
                {hasReservations && inCurrentMonth && (
                  <div className="flex flex-col gap-0.5 mt-1 w-full overflow-hidden">
                    {/* Show up to 3 reservation badges */}
                    {getDayReservations(day)
                      .slice(0, 3)
                      .map((r, i) => {
                        const isApproved = r.status === 'approved';
                        const isPending = r.status === 'pending';
                        const isYearly = isApproved && isYearlyReservation(r);
                        const startTime = r.timeSlots?.[0]?.start || '';
                        const endTime = r.timeSlots?.[r.timeSlots.length - 1]?.end || '';

                        return (
                          <div
                            key={r.id || i}
                            className={`
                              rounded px-1 py-0.5 text-[9px] sm:text-[10px] leading-tight truncate w-full font-medium
                              ${isYearly
                                ? 'bg-primary-700 text-white'
                                : isApproved
                                ? 'bg-accent-100 dark:bg-accent-800 text-accent-800 dark:text-accent-200'
                                : isPending
                                ? 'bg-slate-200 dark:bg-primary-700 text-slate-700 dark:text-slate-300'
                                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                              }
                            `}
                            title={`${startTime}-${endTime} ${r.association?.name || r.user?.name || ''}`}
                          >
                            <span className="hidden sm:inline">{startTime}-{endTime}</span>
                            <span className="sm:hidden">{startTime?.split(':')[0]}h</span>
                          </div>
                        );
                      })}
                    {getDayReservations(day).length > 3 && (
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                        +{getDayReservations(day).length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Valid range indicator for empty days */}
                {!hasReservations && isValid && inCurrentMonth && (
                  <div className="mt-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-400 dark:bg-accent-500"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent-100 dark:bg-accent-800 border border-accent-300 dark:border-accent-600"></div>
            <span className="text-slate-600 dark:text-slate-400">Validée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary-700 border border-primary-900"></div>
            <span className="text-slate-600 dark:text-slate-400">Annuelle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-200 dark:bg-primary-700 border border-slate-400 dark:border-primary-500"></div>
            <span className="text-slate-600 dark:text-slate-400">En attente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-400"></div>
            <span className="text-slate-600 dark:text-slate-400">Disponible</span>
          </div>
        </div>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
          Cliquez sur un jour pour voir les créneaux disponibles et réserver
        </p>
      </div>
    </div>
  );
}
