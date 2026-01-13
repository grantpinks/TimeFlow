import type { CalendarEvent, DailyScheduleConfig } from '@timeflow/shared';
import type { UserPreferences } from './scheduleValidator';
import {
  fromISO,
  fromJSDate,
  fromMillis,
  maxDateTime,
  minDateTime,
  SafeDateTime,
} from './luxonHelpers.js';

type TimeInterval = { start: number; end: number };

type AvailabilityRange = {
  start: SafeDateTime;
  end: SafeDateTime;
  label: string;
};

function roundToIncrement(
  dateTime: SafeDateTime,
  incrementMinutes: number,
  direction: 'ceil' | 'floor'
): SafeDateTime {
  const totalMinutes = dateTime.hour * 60 + dateTime.minute;
  const roundedMinutes =
    direction === 'ceil'
      ? Math.ceil(totalMinutes / incrementMinutes) * incrementMinutes
      : Math.floor(totalMinutes / incrementMinutes) * incrementMinutes;
  const maxAlignedMinutes = Math.floor((24 * 60 - 1) / incrementMinutes) * incrementMinutes;
  const clampedMinutes = Math.min(Math.max(roundedMinutes, 0), maxAlignedMinutes);
  return dateTime.startOf('day').plus({ minutes: clampedMinutes });
}

function resolveAvailabilityRange(
  message: string,
  timeZone: string,
  now: SafeDateTime
): AvailabilityRange {
  const lower = message.toLowerCase();

  const buildRange = (start: SafeDateTime, spanDays: number, label: string): AvailabilityRange => {
    const end = start.plus({ days: spanDays }).endOf('day');
    return { start, end, label };
  };

  const todayStart = now.startOf('day');

  if (lower.includes('tomorrow')) {
    const tomorrowStart = now.plus({ days: 1 }).startOf('day');
    return buildRange(tomorrowStart, 0, 'tomorrow');
  }

  if (lower.includes('today')) {
    return buildRange(todayStart, 0, 'today');
  }

  if (lower.includes('next week')) {
    const startOfNextWeek = now.plus({ weeks: 1 }).startOf('week');
    return buildRange(startOfNextWeek, 6, 'next week');
  }

  if (lower.includes('this week') || lower.includes('week')) {
    return buildRange(todayStart, 6, 'this week');
  }

  return buildRange(todayStart, 6, 'the next 7 days');
}

function buildBusyIntervals(events: CalendarEvent[], timeZone: string): TimeInterval[] {
  return events
    .map((event) => {
      const start = fromISO(event.start, { zone: timeZone });
      const end = fromISO(event.end, { zone: timeZone });

      return {
        start: start.toMillis(),
        end: end.toMillis(),
      };
    })
    .filter((interval): interval is TimeInterval => interval !== null)
    .sort((a, b) => a.start - b.start);
}

function buildFreeSlots(
  rangeStart: SafeDateTime,
  rangeEnd: SafeDateTime,
  preferences: UserPreferences
): TimeInterval[] {
  const slots: TimeInterval[] = [];
  const dailySchedule: DailyScheduleConfig | null =
    preferences.dailyScheduleConstraints || preferences.dailySchedule || null;

  const dayNames: { [key: number]: keyof DailyScheduleConfig } = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  let currentDay = rangeStart.startOf('day');
  const endDay = rangeEnd.endOf('day');

  while (currentDay.valueOf() <= endDay.valueOf()) {
    const dayOfWeek = currentDay.weekday;
    const dayName = dayNames[dayOfWeek];
    const daySchedule = dailySchedule?.[dayName];

    const wakeTime = daySchedule?.wakeTime || preferences.wakeTime;
    const sleepTime = daySchedule?.sleepTime || preferences.sleepTime;

    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

    const dayStart = currentDay.set({ hour: wakeHour, minute: wakeMin, second: 0, millisecond: 0 });
    const dayEnd = currentDay.set({ hour: sleepHour, minute: sleepMin, second: 0, millisecond: 0 });

    if (dayEnd.valueOf() > dayStart.valueOf()) {
      const slotStart = maxDateTime(dayStart, rangeStart);
      const slotEnd = minDateTime(dayEnd, rangeEnd);

      if (slotEnd.valueOf() > slotStart.valueOf()) {
        slots.push({
          start: slotStart.toMillis(),
          end: slotEnd.toMillis(),
        });
      }
    }

    currentDay = currentDay.plus({ days: 1 });
  }

  return slots;
}

function subtractIntervals(freeSlots: TimeInterval[], busyIntervals: TimeInterval[]): TimeInterval[] {
  let result = [...freeSlots];

  for (const busy of busyIntervals) {
    const newResult: TimeInterval[] = [];

    for (const free of result) {
      if (busy.end <= free.start || busy.start >= free.end) {
        newResult.push(free);
        continue;
      }

      if (busy.start > free.start) {
        newResult.push({ start: free.start, end: busy.start });
      }

      if (busy.end < free.end) {
        newResult.push({ start: busy.end, end: free.end });
      }
    }

    result = newResult;
  }

  return result.sort((a, b) => a.start - b.start);
}

export function buildAvailabilitySummary(options: {
  message: string;
  calendarEvents: CalendarEvent[];
  userPrefs: UserPreferences;
  now?: Date;
  maxSlotsPerDay?: number;
}): string {
  const now = fromJSDate(options.now ?? new Date(), {
    zone: options.userPrefs.timeZone,
  });
  const range = resolveAvailabilityRange(options.message, options.userPrefs.timeZone, now);
  const maxSlotsPerDay = options.maxSlotsPerDay ?? 4;

  const inRangeEvents = options.calendarEvents.filter((event) => {
    const start = fromISO(event.start, { zone: options.userPrefs.timeZone });
    const end = fromISO(event.end, { zone: options.userPrefs.timeZone });
    if (!start.isValid || !end.isValid) {
      return false;
    }
    return start < range.end && end > range.start;
  });

  const busyIntervals = buildBusyIntervals(inRangeEvents, options.userPrefs.timeZone);
  const freeSlots = buildFreeSlots(range.start, range.end, options.userPrefs);
  const openSlots = subtractIntervals(freeSlots, busyIntervals);

  if (openSlots.length === 0) {
    return `I couldn't find any open slots for ${range.label} based on your calendar.`;
  }

  const grouped = new Map<string, TimeInterval[]>();
  openSlots.forEach((slot) => {
    const dayLabel = fromMillis(slot.start, { zone: options.userPrefs.timeZone }).toFormat(
      'ccc, MMM d'
    );
    const bucket = grouped.get(dayLabel);
    if (bucket) {
      bucket.push(slot);
    } else {
      grouped.set(dayLabel, [slot]);
    }
  });

  const lines: string[] = [];
  for (const [day, slots] of grouped.entries()) {
    const formatted = slots
      .sort((a, b) => a.start - b.start)
      .slice(0, maxSlotsPerDay)
      .map((slot) => {
        const start = fromMillis(slot.start, { zone: options.userPrefs.timeZone });
        const end = fromMillis(slot.end, { zone: options.userPrefs.timeZone });
        const roundedStart = roundToIncrement(start, 5, 'ceil');
        const roundedEnd = roundToIncrement(end, 5, 'floor');
        if (roundedEnd <= roundedStart) {
          return null;
        }
        return `${roundedStart.toFormat('h:mm a')} - ${roundedEnd.toFormat('h:mm a')}`;
      })
      .filter((slot): slot is string => Boolean(slot))
      .join(', ');
    lines.push(`- ${day}: ${formatted}`);
  }

  return [`Here are your open slots for ${range.label}:`, ...lines].join('\n');
}
