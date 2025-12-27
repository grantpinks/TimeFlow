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
  } = params;

  const start = DateTime.fromISO(rangeStart, { zone: timeZone });
  const end = DateTime.fromISO(rangeEnd, { zone: timeZone });

  // Build free time blocks based on wake/sleep times
  const freeBlocks: Array<{ start: DateTime; end: DateTime }> = [];

  let current = start;
  while (current < end) {
    const dayStart = current.startOf('day');
    const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMinute] = sleepTime.split(':').map(Number);

    const wakeDateTime = dayStart.set({ hour: wakeHour, minute: wakeMinute });
    const sleepDateTime = dayStart.set({ hour: sleepHour, minute: sleepMinute });

    const blockStart = current < wakeDateTime ? wakeDateTime : current;
    const blockEnd = end < sleepDateTime ? end : sleepDateTime;

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

  return slots;
}
