'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { formatTimeSlot, formatDate } from '@/lib/utils';
import Button from '@/components/Button';

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

type TimeSlotPeriod = 'morning' | 'afternoon' | 'evening';

export default function CalendarView({ reservations, rooms, onApprove, onReject }: CalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Debug: Log data when component mounts or data changes
  useEffect(() => {
    console.log('=== CalendarView Debug ===');
    console.log('Reservations:', reservations);
    console.log('Rooms:', rooms);
    console.log('Number of reservations:', reservations.length);
    console.log('Number of rooms:', rooms.length);

    if (reservations.length > 0) {
      console.log('First reservation example:', reservations[0]);
      console.log('First reservation date:', new Date(reservations[0].date));
      console.log('First reservation timeSlots:', reservations[0].timeSlots);
      console.log('Time periods:', getTimePeriod(reservations[0].timeSlots));
    }
  }, [reservations, rooms]);

  // Generate week days
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
  };

  // Determine time period from time slots
  const getTimePeriod = (timeSlots: { start: string; end: string }[]): TimeSlotPeriod[] => {
    const periods: TimeSlotPeriod[] = [];

    timeSlots.forEach(slot => {
      const startHour = parseInt(slot.start.split(':')[0]);

      if (startHour >= 8 && startHour < 12) {
        if (!periods.includes('morning')) periods.push('morning');
      }
      if (startHour >= 12 && startHour < 18) {
        if (!periods.includes('afternoon')) periods.push('afternoon');
      }
      if (startHour >= 18 && startHour < 23) {
        if (!periods.includes('evening')) periods.push('evening');
      }
    });

    return periods;
  };

  // Get reservations for a specific room, date, and period
  const getReservationsForCell = (roomId: string, date: Date, period: TimeSlotPeriod) => {
    // Format date without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const filtered = reservations.filter(res => {
      // Skip rejected reservations
      if (res.status === 'rejected') return false;

      // Parse reservation date without timezone issues
      const resDate = new Date(res.date);
      const resYear = resDate.getFullYear();
      const resMonth = String(resDate.getMonth() + 1).padStart(2, '0');
      const resDay = String(resDate.getDate()).padStart(2, '0');
      const resDateStr = `${resYear}-${resMonth}-${resDay}`;

      // Check room match
      const roomMatch = res.roomId.id === roomId;

      // Check date match
      const dateMatch = resDateStr === dateStr;

      // Check period match
      const periods = getTimePeriod(res.timeSlots);
      const periodMatch = periods.includes(period);

      // Debug logging
      if (roomMatch && dateMatch) {
        console.log(`🔍 Found reservation for ${res.roomId.name} on ${dateStr}`);
        console.log(`   Period: ${period}, Periods in reservation: [${periods.join(', ')}]`);
        console.log(`   Match: ${periodMatch}, Status: ${res.status}`);
      }

      return roomMatch && dateMatch && periodMatch;
    });

    if (filtered.length > 0) {
      console.log(`✅ Returning ${filtered.length} reservation(s) for ${roomId} on ${dateStr} ${period}`);
    }

    return filtered;
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-accent-500 dark:bg-accent-600';
      case 'pending':
        return 'bg-yellow-500 dark:bg-yellow-600';
      default:
        return 'bg-slate-300 dark:bg-primary-700';
    }
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPeriodLabel = (period: TimeSlotPeriod) => {
    switch (period) {
      case 'morning':
        return 'Matin (8h-12h)';
      case 'afternoon':
        return 'Après-midi (12h-18h)';
      case 'evening':
        return 'Soir (18h-22h)';
    }
  };

  const handleMouseEnter = (cellId: string, event: React.MouseEvent) => {
    // Cancel any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setHoveredCell(cellId);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleMouseLeave = () => {
    // Delay closing to allow moving mouse to tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCell(null);
    }, 300); // 300ms delay
  };

  const handleTooltipMouseEnter = () => {
    // Cancel close timeout when entering tooltip
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    // Close tooltip when leaving it
    setHoveredCell(null);
  };

  return (
    <div className="space-y-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white dark:bg-primary-800/40 p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-slate-50 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-slate-50 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {formatWeekRange()}
        </h2>

        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-accent-300 hover:bg-primary-50 dark:hover:bg-accent-500/10 rounded-lg transition-colors"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-primary-900/40">
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-primary-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-primary-700/60 min-w-[200px]">
                  Salles
                </th>
                {weekDays.map((day, index) => (
                  <th
                    key={index}
                    className={`px-2 py-3 text-center text-sm font-semibold border-r border-slate-200 dark:border-primary-700/60 min-w-[180px] ${
                      isToday(day)
                        ? 'bg-primary-50 dark:bg-accent-500/10 text-primary-700 dark:text-accent-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-bold">
                        {day.getDate()}
                      </span>
                      <span className="text-xs">
                        {day.toLocaleDateString('fr-FR', { month: 'short' })}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-primary-700/60">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-primary-900/40 transition-colors">
                  <td className="sticky left-0 z-10 bg-white dark:bg-primary-800/40 hover:bg-slate-50 dark:hover:bg-primary-900/40 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-primary-700/60">
                    {room.name}
                  </td>
                  {weekDays.map((day, dayIndex) => {
                    const periods: TimeSlotPeriod[] = ['morning', 'afternoon', 'evening'];
                    return (
                      <td
                        key={dayIndex}
                        className={`px-2 py-2 border-r border-slate-200 dark:border-primary-700/60 ${
                          isToday(day) ? 'bg-primary-50/30 dark:bg-accent-500/10' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1 min-h-[120px]">
                          {periods.map((period, index) => {
                            const cellReservations = getReservationsForCell(room.id, day, period);
                            const cellId = `${room.id}-${day.toISOString()}-${period}`;
                            const hasReservations = cellReservations.length > 0;
                            const firstReservation = cellReservations[0];

                            return (
                              <div
                                key={period}
                                className={`relative flex-1 min-h-[36px] rounded transition-all flex items-center justify-center ${
                                  hasReservations
                                    ? `${getStatusColor(firstReservation.status)} hover:opacity-90 cursor-pointer shadow-sm`
                                    : 'bg-slate-100 dark:bg-primary-900/40'
                                }`}
                                onMouseEnter={(e) => hasReservations && handleMouseEnter(cellId, e)}
                                onMouseLeave={handleMouseLeave}
                                title={hasReservations ? `${getPeriodLabel(period)} - ${firstReservation.associationId.name}` : getPeriodLabel(period)}
                              >
                                {hasReservations ? (
                                  <>
                                    {cellReservations.length > 1 && (
                                      <div className="absolute top-1 right-1 bg-white dark:bg-primary-800/40 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow border border-slate-300">
                                        {cellReservations.length}
                                      </div>
                                    )}
                                    <span className="text-[10px] text-white font-bold uppercase">
                                      {period === 'morning' ? 'M' : period === 'afternoon' ? 'A' : 'S'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">
                                    {period === 'morning' ? 'M' : period === 'afternoon' ? 'A' : 'S'}
                                  </span>
                                )}

                                {/* Tooltip */}
                                {hoveredCell === cellId && (
                                  <div
                                    className="fixed z-50 w-80 bg-white dark:bg-primary-800/40 rounded-lg shadow-2xl border border-slate-200 dark:border-primary-700/60 p-4"
                                    style={{
                                      left: `${tooltipPosition.x}px`,
                                      top: `${tooltipPosition.y - 10}px`,
                                      transform: 'translate(-50%, -100%)'
                                    }}
                                    onMouseEnter={handleTooltipMouseEnter}
                                    onMouseLeave={handleTooltipMouseLeave}
                                  >
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                      <div className="font-semibold text-sm text-slate-900 dark:text-white border-b pb-2">
                                        {getPeriodLabel(period)}
                                      </div>

                                      {cellReservations.map((reservation) => (
                                        <div key={reservation.id} className="space-y-2 pb-3 border-b border-slate-200 dark:border-primary-700/60 last:border-0">
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                              {reservation.associationId.name}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                reservation.status === 'approved'
                                                  ? 'bg-accent-100 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300'
                                                  : reservation.status === 'rejected'
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                              }`}
                                            >
                                              {reservation.status === 'approved' ? 'Approuvée' : reservation.status === 'rejected' ? 'Rejetée' : 'En attente'}
                                            </span>
                                          </div>

                                          <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              <span>{reservation.userId.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              <span>
                                                {reservation.timeSlots.map(slot =>
                                                  formatTimeSlot(slot.start, slot.end)
                                                ).join(', ')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              <span>{reservation.estimatedParticipants} participants</span>
                                            </div>
                                          </div>

                                          <div className="text-xs text-slate-600 dark:text-slate-300">
                                            <span className="font-medium">Motif:</span> {reservation.reason}
                                          </div>

                                          {reservation.adminComment && (
                                            <div className="text-xs bg-slate-50 dark:bg-primary-900/40 p-2 rounded">
                                              <span className="font-medium text-slate-600 dark:text-slate-300">Admin:</span>{' '}
                                              <span className="text-slate-600 dark:text-slate-300">{reservation.adminComment}</span>
                                            </div>
                                          )}

                                          {reservation.status === 'pending' && (
                                            <div className="flex gap-2 pt-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onApprove(reservation.id);
                                                  setHoveredCell(null);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded text-xs font-medium transition-colors"
                                              >
                                                <CheckCircle className="w-3 h-3" />
                                                Approuver
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onReject(reservation.id);
                                                  setHoveredCell(null);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                                              >
                                                <XCircle className="w-3 h-3" />
                                                Refuser
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 bg-white dark:bg-primary-800/40 p-4 rounded-lg shadow">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Légende :</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-500 dark:bg-accent-600 shadow-sm"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Approuvée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-yellow-500 dark:bg-yellow-600 shadow-sm"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-primary-900/40 border border-slate-300 dark:border-primary-700/60"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Libre</span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 ml-4">
          M = Matin (8h-12h) • A = Après-midi (12h-18h) • S = Soir (18h-22h)
        </div>
      </div>
    </div>
  );
}
