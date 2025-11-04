import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeSlot(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function isDateBlocked(date: Date, blockedDates: { startDate: Date; endDate: Date }[]): boolean {
  return blockedDates.some((blocked) => {
    const blockStart = new Date(blocked.startDate);
    const blockEnd = new Date(blocked.endDate);
    return date >= blockStart && date <= blockEnd;
  });
}

export function generateTimeSlots(start: string = '08:00', end: string = '22:00'): string[] {
  const slots: string[] = [];
  const [startHour] = start.split(':').map(Number);
  const [endHour] = end.split(':').map(Number);

  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  return slots;
}

export function isTimeSlotAvailable(
  slot: string,
  reservedSlots: { start: string; end: string }[]
): boolean {
  const slotHour = parseInt(slot.split(':')[0]);

  return !reservedSlots.some((reserved) => {
    const startHour = parseInt(reserved.start.split(':')[0]);
    const endHour = parseInt(reserved.end.split(':')[0]);
    return slotHour >= startHour && slotHour < endHour;
  });
}
