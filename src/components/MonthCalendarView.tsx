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
              className="text-center text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-2"
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
                    ? 'opacity-30 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    : today
                    ? 'border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 shadow-md'
                    : !isValid && !hasReservations
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-50'
                    : hasReservations
                    ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
                  }
                `}
              >
                {/* Day number */}
                <span
                  className={`text-sm sm:text-base font-bold leading-none ${
                    today
                      ? 'text-blue-600 dark:text-blue-400'
                      : inCurrentMonth
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
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
                                ? 'bg-green-700 text-white'
                                : isApproved
                                ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                                : isPending
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                        +{getDayReservations(day).length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Valid range indicator for empty days */}
                {!hasReservations && isValid && inCurrentMonth && (
                  <div className="mt-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 dark:bg-green-500"></div>
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
            <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-800 border border-green-300 dark:border-green-600"></div>
            <span className="text-gray-600 dark:text-gray-400">Validée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-700 border border-green-900"></div>
            <span className="text-gray-600 dark:text-gray-400">Annuelle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-500"></div>
            <span className="text-gray-600 dark:text-gray-400">En attente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-gray-600 dark:text-gray-400">Disponible</span>
          </div>
        </div>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          Cliquez sur un jour pour voir les créneaux disponibles et réserver
        </p>
      </div>
    </div>
  );
}
