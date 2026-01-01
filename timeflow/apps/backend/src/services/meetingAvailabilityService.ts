import { DateTime } from 'luxon';
import type { AvailabilitySlot } from '@timeflow/shared';

interface BusyInterval {
  start: string;
  end: string;
  transparency?: 'opaque' | 'transparent';
}

interface BuildAvailabilitySlotsParams {
  rangeStart: string;
  rangeEnd: string;
  durationsMinutes: number[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  busyIntervals: BusyInterval[];
  timeZone: string;
  wakeTime: string; // HH:mm
  sleepTime: string; // HH:mm
  dailySchedule: any; // User's daily schedule

  // Meeting-specific preferences
  meetingStartTime?: string | null;
  meetingEndTime?: string | null;
  blockedDaysOfWeek?: string[];
  dailyMeetingSchedule?: any;

  // Constraints
  maxBookingHorizonDays?: number;
  dailyCap?: number;
}

/**
 * Filter out transparent events (events that don't block availability)
 */
export function filterBusyEvents(events: BusyInterval[]): BusyInterval[] {
  return events.filter((event) => {
    // Keep events that are explicitly opaque or have no transparency field (default to opaque)
    return !event.transparency || event.transparency === 'opaque';
  });
}

/**
 * Build available time slots for meeting scheduling
 */
export function buildAvailabilitySlots(params: BuildAvailabilitySlotsParams): AvailabilitySlot[] {
  const {
    rangeStart,
    rangeEnd,
    durationsMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    busyIntervals,
    timeZone,
    wakeTime,
  sleepTime,
  meetingStartTime,
  meetingEndTime,
  blockedDaysOfWeek,
  dailyMeetingSchedule,
  maxBookingHorizonDays,
  dailyCap,
} = params;

  const start = DateTime.fromISO(rangeStart, { zone: timeZone });
  const rawEnd = DateTime.fromISO(rangeEnd, { zone: timeZone });

  // Clamp rangeEnd to booking horizon if provided
  const end =
    maxBookingHorizonDays && maxBookingHorizonDays > 0
      ? DateTime.min(rawEnd, start.plus({ days: maxBookingHorizonDays }).endOf('day'))
      : rawEnd;

  // Map day of week numbers to day names (1=monday, 7=sunday)
  const dayNames: Record<number, string> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  // Build free time blocks based on meeting preferences or wake/sleep times
  const freeBlocks: Array<{ start: DateTime; end: DateTime }> = [];

  let current = start;
  while (current < end) {
    const dayStart = current.startOf('day');
    const dayOfWeek = current.weekday; // Luxon: 1=Monday, 7=Sunday
    const dayName = dayNames[dayOfWeek];

    // Check if this day is blocked for meetings
    if (blockedDaysOfWeek && blockedDaysOfWeek.includes(dayName)) {
      current = current.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Check if this day is marked as unavailable in dailyMeetingSchedule
    if (dailyMeetingSchedule?.[dayName]?.isAvailable === false) {
      current = current.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Determine start/end times for this day
    // Priority: per-day schedule > global meeting times > wake/sleep times
    let dayStartTime: string;
    let dayEndTime: string;

    if (dailyMeetingSchedule?.[dayName]?.startTime && dailyMeetingSchedule?.[dayName]?.endTime) {
      // Use per-day meeting schedule
      dayStartTime = dailyMeetingSchedule[dayName].startTime;
      dayEndTime = dailyMeetingSchedule[dayName].endTime;
    } else if (meetingStartTime && meetingEndTime) {
      // Use global meeting times
      dayStartTime = meetingStartTime;
      dayEndTime = meetingEndTime;
    } else {
      // Fall back to wake/sleep times
      dayStartTime = wakeTime;
      dayEndTime = sleepTime;
    }

    const [startHour, startMinute] = dayStartTime.split(':').map(Number);
    const [endHour, endMinute] = dayEndTime.split(':').map(Number);

    const startDateTime = dayStart.set({ hour: startHour, minute: startMinute });
    const endDateTime = dayStart.set({ hour: endHour, minute: endMinute });

    const blockStart = current < startDateTime ? startDateTime : current;
    const blockEnd = end < endDateTime ? end : endDateTime;

    if (blockStart < blockEnd) {
      freeBlocks.push({ start: blockStart, end: blockEnd });
    }

    current = current.plus({ days: 1 }).startOf('day');
  }

  // Expand busy intervals with buffers
  const expandedBusy = busyIntervals.map((interval) => {
    const busyStart = DateTime.fromISO(interval.start, { zone: timeZone });
    const busyEnd = DateTime.fromISO(interval.end, { zone: timeZone });

    return {
      start: busyStart.minus({ minutes: bufferBeforeMinutes }),
      end: busyEnd.plus({ minutes: bufferAfterMinutes }),
    };
  });

  // Subtract busy intervals from free blocks
  let availableBlocks = freeBlocks;
  for (const busy of expandedBusy) {
    const newBlocks: Array<{ start: DateTime; end: DateTime }> = [];

    for (const block of availableBlocks) {
      // No overlap
      if (busy.end <= block.start || busy.start >= block.end) {
        newBlocks.push(block);
        continue;
      }

      // Busy completely covers block - skip it
      if (busy.start <= block.start && busy.end >= block.end) {
        continue;
      }

      // Busy starts after block start - keep the part before
      if (busy.start > block.start) {
        newBlocks.push({ start: block.start, end: busy.start });
      }

      // Busy ends before block end - keep the part after
      if (busy.end < block.end) {
        newBlocks.push({ start: busy.end, end: block.end });
      }
    }

    availableBlocks = newBlocks;
  }

  // Generate 15-minute grid slots for each duration
  const slots: AvailabilitySlot[] = [];

  for (const duration of durationsMinutes) {
    for (const block of availableBlocks) {
      let slotStart = block.start;

      // Round up to nearest 15 minutes
      const remainder = slotStart.minute % 15;
      if (remainder !== 0) {
        slotStart = slotStart.plus({ minutes: 15 - remainder });
      }

      while (slotStart.plus({ minutes: duration }) <= block.end) {
        const slotEnd = slotStart.plus({ minutes: duration });

        slots.push({
          start: slotStart.toISO()!,
          end: slotEnd.toISO()!,
          durationMinutes: duration,
        });

        slotStart = slotStart.plus({ minutes: 15 });
      }
    }
  }

  if (!dailyCap || dailyCap <= 0) {
    return slots;
  }

  // Enforce daily cap: group by day in user time zone and keep earliest slots per day
  const slotsByDay: Record<string, AvailabilitySlot[]> = {};

  for (const slot of slots) {
    const day = DateTime.fromISO(slot.start, { zone: timeZone }).toISODate();
    if (!slotsByDay[day]) {
      slotsByDay[day] = [];
    }
    slotsByDay[day].push(slot);
  }

  const capped: AvailabilitySlot[] = [];
  for (const day of Object.keys(slotsByDay)) {
    const daySlots = slotsByDay[day].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    capped.push(...daySlots.slice(0, dailyCap));
  }

  // Sort final slots chronologically
  return capped.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
