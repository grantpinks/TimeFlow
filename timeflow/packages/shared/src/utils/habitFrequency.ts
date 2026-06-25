import type { HabitFrequency } from '../types/habit.js';

type HabitSchedulePattern = {
  frequency: HabitFrequency | string;
  daysOfWeek?: string[] | null;
};

const DAY_ALIASES: Record<string, string> = {
  sunday: 'sun',
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
};

function normalizeDayCode(day: string): string {
  const normalized = day.trim().toLowerCase();
  return DAY_ALIASES[normalized] ?? normalized.slice(0, 3);
}

export function getDayCodeForDate(date: Date | string, timeZone = 'UTC'): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  })
    .format(value)
    .toLowerCase();
}

export function isHabitDueOnDate(
  habit: HabitSchedulePattern,
  date: Date | string,
  timeZone = 'UTC'
): boolean {
  if (habit.frequency === 'daily') {
    return true;
  }

  const selectedDays = (habit.daysOfWeek ?? [])
    .map(normalizeDayCode)
    .filter(Boolean);

  if (habit.frequency === 'weekly') {
    return selectedDays.length > 0 && selectedDays.includes(getDayCodeForDate(date, timeZone));
  }

  if (habit.frequency === 'custom') {
    return selectedDays.length === 0 || selectedDays.includes(getDayCodeForDate(date, timeZone));
  }

  return false;
}
