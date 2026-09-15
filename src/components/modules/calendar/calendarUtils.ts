import { CalendarEvent } from '../../../types';

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  events: CalendarEvent[];
}

export const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  FAMILY: {
    label: 'Family Event',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: '#EA580C',
  },
  SCHOOL: {
    label: 'School & Academics',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: '#2563EB',
  },
  ACTIVITY: {
    label: 'Sports & Activities',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: '#16A34A',
  },
  WORK: {
    label: 'Work & Commitments',
    bg: 'bg-stone-100',
    text: 'text-stone-800',
    border: 'border-stone-300',
    dot: '#44403C',
  },
  APPOINTMENT: {
    label: 'Medical & Dental',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: '#0D9488',
  },
  SPECIAL: {
    label: 'Special Occasion',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: '#9333EA',
  },
};

export function formatToDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Checks if a specific event occurs on a given date (YYYY-MM-DD), taking into account recurrence rules
 */
export function eventOccursOnDate(event: CalendarEvent, targetDateStr: string): boolean {
  if (event.Deleted_At) return false;
  if (!event.Start_Time) return false;

  const eventStartStr = event.Start_Time.slice(0, 10);
  const rule = event.Recurrence_Rule || 'NONE';

  // If before the initial event date, it cannot occur
  if (targetDateStr < eventStartStr) return false;

  // If there's an until date, check if target date is past it
  if (event.Recurrence_Until && targetDateStr > event.Recurrence_Until.slice(0, 10)) {
    return false;
  }

  if (rule === 'NONE') {
    return eventStartStr === targetDateStr;
  }

  const targetDate = parseLocalDate(targetDateStr);
  const eventStartDate = parseLocalDate(eventStartStr);

  if (rule === 'DAILY') {
    return true;
  }

  if (rule === 'SCHOOL_DAYS') {
    const day = targetDate.getDay();
    // Monday (1) to Friday (5)
    return day >= 1 && day <= 5;
  }

  if (rule === 'WEEKLY') {
    return targetDate.getDay() === eventStartDate.getDay();
  }

  if (rule === 'BIWEEKLY') {
    if (targetDate.getDay() !== eventStartDate.getDay()) return false;
    const diffTime = targetDate.getTime() - eventStartDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays % 14 === 0;
  }

  if (rule === 'MONTHLY') {
    return targetDate.getDate() === eventStartDate.getDate();
  }

  return false;
}

/**
 * Generates the full 35-42 days grid for a calendar month
 */
export function generateMonthGrid(year: number, month: number, events: CalendarEvent[]): CalendarDay[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const totalDays = lastDayOfMonth.getDate();

  const todayStr = formatToDateString(new Date());

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    const dateString = formatToDateString(prevDate);
    const dayEvents = events.filter(e => eventOccursOnDate(e, dateString));
    days.push({
      date: prevDate,
      dateString,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
      events: dayEvents,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const currDate = new Date(year, month, day);
    const dateString = formatToDateString(currDate);
    const dayEvents = events.filter(e => eventOccursOnDate(e, dateString));
    days.push({
      date: currDate,
      dateString,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
      events: dayEvents,
    });
  }

  // Next month leading days to complete full weeks
  const remaining = (7 - (days.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const nextDate = new Date(year, month + 1, day);
    const dateString = formatToDateString(nextDate);
    const dayEvents = events.filter(e => eventOccursOnDate(e, dateString));
    days.push({
      date: nextDate,
      dateString,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
      events: dayEvents,
    });
  }

  return days;
}

export function formatEventTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
