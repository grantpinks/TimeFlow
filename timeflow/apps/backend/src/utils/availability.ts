import { DateTime } from 'luxon';
import type { CalendarEvent, DailyScheduleConfig } from '@timeflow/shared';
import type { UserPreferences } from './scheduleValidator';

type TimeInterval = { start: number; end: number };

type AvailabilityRange = {
  start: DateTime;
  end: DateTime;
  label: string;
};

function roundToIncrement(
  dateTime: DateTime,
  incrementMinutes: number,
  direction: 'ceil' | 'floor'
): DateTime {
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
  now: DateTime
): AvailabilityRange {
  const lower = message.toLowerCase();

  if (lower.includes('tomorrow')) {
    const start = now.plus({ days: 1 }).startOf('day');
    return {
      start,
      end: start.endOf('day'),
      label: 'tomorrow',
    };
  }

  if (lower.includes('today')) {
    return {
      start: now.startOf('day'),
      end: now.endOf('day'),
      label: 'today',
    };
  }

  if (lower.includes('next week')) {
    const start = now.plus({ weeks: 1 }).startOf('week');
    return {
      start,
      end: start.plus({ days: 6 }).endOf('day'),
      label: 'next week',
    };
  }

  if (lower.includes('this week') || lower.includes('week')) {
    return {
      start: now.startOf('day'),
      end: now.plus({ days: 6 }).endOf('day'),
      label: 'this week',
    };
  }

  return {
    start: now.startOf('day'),
    end: now.plus({ days: 6 }).endOf('day'),
    label: 'the next 7 days',
  };
}

function buildBusyIntervals(events: CalendarEvent[], timeZone: string): TimeInterval[] {
  return events
    .map((event) => {
      const start = DateTime.fromISO(event.start, { zone: timeZone });
      const end = DateTime.fromISO(event.end, { zone: timeZone });

      if (!start.isValid || !end.isValid) {
        return null;
      }

      return {
        start: start.toMillis(),
        end: end.toMillis(),
      };
    })
    .filter((interval): interval is TimeInterval => interval !== null)
    .sort((a, b) => a.start - b.start);
}

function buildFreeSlots(
  rangeStart: DateTime,
  rangeEnd: DateTime,
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

  while (currentDay <= endDay) {
    const dayOfWeek = currentDay.weekday;
    const dayName = dayNames[dayOfWeek];
    const daySchedule = dailySchedule?.[dayName];

    const wakeTime = daySchedule?.wakeTime || preferences.wakeTime;
    const sleepTime = daySchedule?.sleepTime || preferences.sleepTime;

    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

    const dayStart = currentDay.set({ hour: wakeHour, minute: wakeMin, second: 0, millisecond: 0 });
    const dayEnd = currentDay.set({ hour: sleepHour, minute: sleepMin, second: 0, millisecond: 0 });

    if (dayEnd > dayStart) {
      const slotStart = DateTime.max(dayStart, rangeStart);
      const slotEnd = DateTime.min(dayEnd, rangeEnd);

      if (slotEnd > slotStart) {
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
  const now = DateTime.fromJSDate(options.now ?? new Date(), {
    zone: options.userPrefs.timeZone,
  });
  const range = resolveAvailabilityRange(options.message, options.userPrefs.timeZone, now);
  const maxSlotsPerDay = options.maxSlotsPerDay ?? 4;

  const inRangeEvents = options.calendarEvents.filter((event) => {
    const start = DateTime.fromISO(event.start, { zone: options.userPrefs.timeZone });
    const end = DateTime.fromISO(event.end, { zone: options.userPrefs.timeZone });
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
    const dayLabel = DateTime.fromMillis(slot.start, { zone: options.userPrefs.timeZone }).toFormat(
      'ccc, MMM d'
    );
    if (!grouped.has(dayLabel)) {
      grouped.set(dayLabel, []);
    }
    grouped.get(dayLabel)!.push(slot);
  });

  const lines: string[] = [];
  for (const [day, slots] of grouped.entries()) {
    const formatted = slots
      .sort((a, b) => a.start - b.start)
      .slice(0, maxSlotsPerDay)
      .map((slot) => {
        const start = DateTime.fromMillis(slot.start, { zone: options.userPrefs.timeZone });
        const end = DateTime.fromMillis(slot.end, { zone: options.userPrefs.timeZone });
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
