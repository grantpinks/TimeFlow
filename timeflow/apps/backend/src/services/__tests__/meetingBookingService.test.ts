import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTime } from 'luxon';
import { isSlotAvailable, bookMeeting } from '../meetingBookingService';
import { prisma } from '../../config/prisma.js';
import * as googleCalendarService from '../googleCalendarService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    schedulingLink: { findUnique: vi.fn() },
    meeting: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    meetingActionToken: { create: vi.fn(), update: vi.fn() },
    scheduledTask: { findMany: vi.fn() },
    scheduledHabit: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  createEvent: vi.fn().mockResolvedValue('google-event'),
  getEvents: vi.fn().mockResolvedValue([]),
  updateEvent: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../appleCalendarService.js', () => ({
  createEvent: vi.fn().mockResolvedValue('apple-event'),
  updateEvent: vi.fn().mockResolvedValue(undefined),
  cancelEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../gmailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const baseLink = {
  id: 'link1',
  userId: 'user1',
  name: 'Test',
  slug: 'test',
  isActive: true,
  durationsMinutes: [30],
  bufferBeforeMinutes: 10,
  bufferAfterMinutes: 10,
  maxBookingHorizonDays: 2,
  dailyCap: 1,
  calendarProvider: 'google' as const,
  calendarId: 'cal1',
  googleMeetEnabled: true,
  user: {
    id: 'user1',
    timeZone: 'UTC',
    wakeTime: '08:00',
    sleepTime: '18:00',
    dailySchedule: null,
    meetingStartTime: null,
    meetingEndTime: null,
    blockedDaysOfWeek: [],
    dailyMeetingSchedule: null,
    googleAccessToken: 'token',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(prisma));
  vi.mocked(googleCalendarService.getEvents).mockResolvedValue([]);
});

describe('meetingBookingService', () => {
  it('rejects overlapping slot with existing meeting', () => {
    const ok = isSlotAvailable(
      { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
      [{ startDateTime: new Date('2026-01-10T10:15:00.000Z'), endDateTime: new Date('2026-01-10T10:45:00.000Z') }]
    );
    expect(ok).toBe(false);
  });

  it('rejects booking beyond max booking horizon', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    (prisma.schedulingLink.findUnique as any).mockResolvedValue(baseLink);
    (prisma.meeting.findMany as any).mockResolvedValue([]);
    (prisma.scheduledTask.findMany as any).mockResolvedValue([]);
    (prisma.scheduledHabit.findMany as any).mockResolvedValue([]);

    await expect(
      bookMeeting('test', {
        inviteeName: 'A',
        inviteeEmail: 'a@example.com',
        startDateTime: '2026-01-10T10:00:00.000Z',
        durationMinutes: 30,
      })
    ).rejects.toThrow(/horizon/i);
  });

  it('enforces daily cap before booking', async () => {
    (prisma.schedulingLink.findUnique as any).mockResolvedValue({
      ...baseLink,
      dailyCap: 1,
      maxBookingHorizonDays: 90,
    });
    (prisma.meeting.findMany as any)
      // First call: daily cap query (returns one existing meeting)
      .mockResolvedValueOnce([{ startDateTime: new Date('2026-01-10T09:00:00.000Z'), endDateTime: new Date('2026-01-10T09:30:00.000Z') }])
      // Second call: overlap check
      .mockResolvedValueOnce([]);
    (prisma.scheduledTask.findMany as any).mockResolvedValue([]);
    (prisma.scheduledHabit.findMany as any).mockResolvedValue([]);

    await expect(
      bookMeeting('test', {
        inviteeName: 'A',
        inviteeEmail: 'a@example.com',
        startDateTime: '2026-01-10T10:00:00.000Z',
        durationMinutes: 30,
      })
    ).rejects.toThrow(/cap/);
  });

  it('rejects when blocking tasks or habits overlap', async () => {
    (prisma.schedulingLink.findUnique as any).mockResolvedValue({
      ...baseLink,
      maxBookingHorizonDays: 90,
    });
    (prisma.meeting.findMany as any).mockResolvedValue([]);
    (prisma.scheduledTask.findMany as any).mockResolvedValue([
      { startDateTime: new Date('2026-01-10T09:50:00.000Z'), endDateTime: new Date('2026-01-10T10:20:00.000Z') },
    ]);
    (prisma.scheduledHabit.findMany as any).mockResolvedValue([]);

    await expect(
      bookMeeting('test', {
        inviteeName: 'A',
        inviteeEmail: 'a@example.com',
        startDateTime: '2026-01-10T10:00:00.000Z',
        durationMinutes: 30,
      })
    ).rejects.toThrow(/no longer available/);
  });

  it('rejects when calendar events conflict within buffer', async () => {
    (prisma.schedulingLink.findUnique as any).mockResolvedValue({
      ...baseLink,
      maxBookingHorizonDays: 90,
      dailyCap: null,
    });
    (prisma.meeting.findMany as any).mockResolvedValue([]);
    (prisma.scheduledTask.findMany as any).mockResolvedValue([]);
    (prisma.scheduledHabit.findMany as any).mockResolvedValue([]);
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([
      {
        start: '2026-01-10T09:40:00.000Z',
        end: '2026-01-10T09:55:00.000Z',
        summary: 'Prep',
      },
    ]);

    await expect(
      bookMeeting('test', {
        inviteeName: 'A',
        inviteeEmail: 'a@example.com',
        startDateTime: '2026-01-10T10:00:00.000Z',
        durationMinutes: 30,
      })
    ).rejects.toThrow(/no longer available/);
  });
});
