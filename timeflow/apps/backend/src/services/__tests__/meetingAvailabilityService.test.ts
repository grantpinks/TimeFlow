import { describe, expect, it } from 'vitest';
import { buildAvailabilitySlots, filterBusyEvents } from '../meetingAvailabilityService';
import { DateTime } from 'luxon';

describe('meetingAvailabilityService', () => {
  it('applies buffers and builds 15-minute slots', () => {
    const slots = buildAvailabilitySlots({
      rangeStart: '2026-01-10T09:00:00.000Z',
      rangeEnd: '2026-01-10T12:00:00.000Z',
      durationsMinutes: [30],
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      busyIntervals: [
        { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
      ],
      timeZone: 'UTC',
      wakeTime: '09:00',
      sleepTime: '17:00',
      dailySchedule: null,
    });
    expect(slots.some((s) => s.start === '2026-01-10T09:00:00.000Z')).toBe(true);
    expect(slots.some((s) => s.start === '2026-01-10T10:00:00.000Z')).toBe(false);
  });

  it('ignores transparent events', () => {
    const events = [
      { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T11:00:00.000Z', transparency: 'transparent' as const },
      { start: '2026-01-10T12:00:00.000Z', end: '2026-01-10T13:00:00.000Z', transparency: 'opaque' as const },
    ];
    const busy = filterBusyEvents(events);
    expect(busy).toHaveLength(1);
    expect(busy[0].transparency).toBe('opaque');
  });

  it('includes events without transparency (defaults to opaque)', () => {
    const events = [
      { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T11:00:00.000Z' },
      { start: '2026-01-10T12:00:00.000Z', end: '2026-01-10T13:00:00.000Z', transparency: 'transparent' as const },
    ];
    const busy = filterBusyEvents(events);
    expect(busy).toHaveLength(1);
    expect(busy[0].start).toBe('2026-01-10T10:00:00.000Z');
  });

  it('clamps slots to max booking horizon', () => {
    const rangeStart = '2026-01-10T00:00:00.000Z';
    const rangeEnd = '2026-01-20T23:59:59.999Z';
    const slots = buildAvailabilitySlots({
      rangeStart,
      rangeEnd,
      durationsMinutes: [30],
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      busyIntervals: [],
      timeZone: 'UTC',
      wakeTime: '08:00',
      sleepTime: '18:00',
      dailySchedule: null,
      maxBookingHorizonDays: 2,
    });

    const latestSlot = slots.reduce((latest, slot) => (slot.start > latest ? slot.start : latest), slots[0]?.start ?? '');
    expect(DateTime.fromISO(latestSlot).toMillis()).toBeLessThanOrEqual(
      DateTime.fromISO(rangeStart, { zone: 'UTC' }).plus({ days: 2 }).endOf('day').toMillis()
    );
  });

  it('enforces daily cap by keeping earliest slots per day', () => {
    const slots = buildAvailabilitySlots({
      rangeStart: '2026-01-10T08:00:00.000Z',
      rangeEnd: '2026-01-10T12:00:00.000Z',
      durationsMinutes: [30],
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      busyIntervals: [],
      timeZone: 'UTC',
      wakeTime: '08:00',
      sleepTime: '12:00',
      dailySchedule: null,
      dailyCap: 2,
    });

    expect(slots).toHaveLength(2);
    expect(slots[0].start).toBe('2026-01-10T08:00:00.000Z');
    expect(slots[1].start).toBe('2026-01-10T08:15:00.000Z');
  });
});

describe('Meeting preference handling in buildAvailabilitySlots', () => {
  const baseParams = {
    durationsMinutes: [30],
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    busyIntervals: [],
    timeZone: 'America/Chicago',
    wakeTime: '08:00',
    sleepTime: '22:00',
    dailySchedule: null,
  };

  it('should exclude blocked days from availability', () => {
    // Test for Saturday/Sunday blocked (Jan 10-11, 2026 are Saturday/Sunday)
    const slots = buildAvailabilitySlots({
      ...baseParams,
      rangeStart: '2026-01-10T00:00:00.000-06:00', // Saturday
      rangeEnd: '2026-01-12T23:59:59.999-06:00', // Monday
      blockedDaysOfWeek: ['saturday', 'sunday'],
    });

    // Verify no slots on Saturday or Sunday
    const slotsOnWeekend = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.weekday === 6 || dt.weekday === 7; // 6=Saturday, 7=Sunday
    });

    expect(slotsOnWeekend).toHaveLength(0);

    // Verify slots exist on Monday
    const slotsOnMonday = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.weekday === 1; // Monday
    });

    expect(slotsOnMonday.length).toBeGreaterThan(0);
  });

  it('should use meeting-specific hours instead of wake/sleep times', () => {
    // Jan 5, 2026 is a Monday
    const slots = buildAvailabilitySlots({
      ...baseParams,
      rangeStart: '2026-01-05T00:00:00.000-06:00',
      rangeEnd: '2026-01-05T23:59:59.999-06:00',
      meetingStartTime: '10:00',
      meetingEndTime: '16:00',
    });

    // All slots should be between 10:00 and 16:00
    slots.forEach((slot) => {
      const startDt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      const endDt = DateTime.fromISO(slot.end, { zone: 'America/Chicago' });

      expect(startDt.hour).toBeGreaterThanOrEqual(10);
      expect(endDt.hour).toBeLessThanOrEqual(16);
    });

    // Verify no slots before 10:00
    const slotsBefore10 = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.hour < 10;
    });
    expect(slotsBefore10).toHaveLength(0);

    // Verify no slots starting at or after 16:00
    const slotsAfter16 = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.hour >= 16;
    });
    expect(slotsAfter16).toHaveLength(0);

    // Verify slots exist in the 10-16 window
    expect(slots.length).toBeGreaterThan(0);
  });

  it('should use per-day meeting config for specific days', () => {
    // Jan 5-9, 2026 is Monday-Friday
    const slots = buildAvailabilitySlots({
      ...baseParams,
      rangeStart: '2026-01-05T00:00:00.000-06:00', // Monday
      rangeEnd: '2026-01-09T23:59:59.999-06:00', // Friday
      dailyMeetingSchedule: {
        monday: {
          startTime: '09:00',
          endTime: '12:00',
          isAvailable: true,
        },
        friday: {
          isAvailable: false,
        },
      },
    });

    // Verify Monday has slots only between 9-12
    const mondaySlots = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.weekday === 1;
    });

    expect(mondaySlots.length).toBeGreaterThan(0);
    mondaySlots.forEach((slot) => {
      const startDt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      const endDt = DateTime.fromISO(slot.end, { zone: 'America/Chicago' });

      expect(startDt.hour).toBeGreaterThanOrEqual(9);
      expect(endDt.hour).toBeLessThanOrEqual(12);
    });

    // Verify Friday has no slots (unavailable)
    const fridaySlots = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.weekday === 5;
    });

    expect(fridaySlots).toHaveLength(0);
  });

  it('should fall back to wake/sleep when no meeting preferences', () => {
    // Jan 5, 2026 is a Monday
    const slots = buildAvailabilitySlots({
      ...baseParams,
      rangeStart: '2026-01-05T00:00:00.000-06:00',
      rangeEnd: '2026-01-05T23:59:59.999-06:00',
      // No meeting preferences set
      meetingStartTime: null,
      meetingEndTime: null,
      blockedDaysOfWeek: undefined,
      dailyMeetingSchedule: undefined,
    });

    // Verify slots use wake/sleep times (8:00 - 22:00)
    expect(slots.length).toBeGreaterThan(0);

    slots.forEach((slot) => {
      const startDt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      const endDt = DateTime.fromISO(slot.end, { zone: 'America/Chicago' });

      expect(startDt.hour).toBeGreaterThanOrEqual(8);
      expect(endDt.hour).toBeLessThanOrEqual(22);
    });

    // Verify slots exist before 10:00 (proving it's not using meeting times)
    const slotsBefore10 = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.hour < 10;
    });
    expect(slotsBefore10.length).toBeGreaterThan(0);
  });

  it('should prioritize per-day config over global meeting times', () => {
    // Jan 5, 2026 is a Monday
    const slots = buildAvailabilitySlots({
      ...baseParams,
      rangeStart: '2026-01-05T00:00:00.000-06:00',
      rangeEnd: '2026-01-05T23:59:59.999-06:00',
      meetingStartTime: '10:00', // Global says 10-16
      meetingEndTime: '16:00',
      dailyMeetingSchedule: {
        monday: {
          startTime: '14:00', // Per-day says 14-18 for Monday
          endTime: '18:00',
          isAvailable: true,
        },
      },
    });

    // Verify all slots are between 14:00 and 18:00 (per-day config wins)
    expect(slots.length).toBeGreaterThan(0);

    slots.forEach((slot) => {
      const startDt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      const endDt = DateTime.fromISO(slot.end, { zone: 'America/Chicago' });

      expect(startDt.hour).toBeGreaterThanOrEqual(14);
      expect(endDt.hour).toBeLessThanOrEqual(18);
    });

    // Verify no slots in the 10-14 range (proving per-day overrides global)
    const slotsBefore14 = slots.filter((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: 'America/Chicago' });
      return dt.hour < 14;
    });
    expect(slotsBefore14).toHaveLength(0);
  });
});
