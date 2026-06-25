import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    habit: { findMany: vi.fn(), findFirst: vi.fn() },
    scheduledTask: { findMany: vi.fn() },
    scheduledHabit: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    habitCompletion: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  getEvents: vi.fn(),
  createEvent: vi.fn(),
}));

import { prisma } from '../../config/prisma.js';
import * as calendarService from '../googleCalendarService.js';
import { acceptSuggestion, getHabitSuggestionsForUser } from '../habitSuggestionService.js';

describe('habitSuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      timeZone: 'America/Chicago',
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultCalendarId: 'primary',
      eventPrefixEnabled: true,
      eventPrefix: 'TimeFlow',
    } as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      {
        id: 'habit-1',
        userId: 'user-1',
        title: 'Run',
        description: null,
        frequency: 'daily',
        daysOfWeek: [],
        durationMinutes: 30,
        preferredTimeOfDay: 'morning',
        isActive: true,
      },
    ] as any);
    vi.mocked(prisma.scheduledTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scheduledHabit.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findFirst).mockResolvedValue(null);
    vi.mocked(calendarService.getEvents).mockResolvedValue([]);
  });

  it('does not suggest a habit already scheduled on that local day', async () => {
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([
      {
        habitId: 'habit-1',
        startDateTime: new Date('2026-06-25T14:00:00.000Z'),
        endDateTime: new Date('2026-06-25T14:30:00.000Z'),
      },
    ] as any);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T00:00:00',
      '2026-06-25T23:59:59'
    );

    expect(suggestions).toEqual([]);
  });

  it('does not suggest a habit already scheduled later on the same local day outside a partial range', async () => {
    vi.mocked(prisma.scheduledHabit.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          habitId: 'habit-1',
          startDateTime: new Date('2026-06-26T01:00:00.000Z'),
          endDateTime: new Date('2026-06-26T01:30:00.000Z'),
        },
      ] as any);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T08:00:00-05:00',
      '2026-06-25T09:00:00-05:00'
    );

    expect(suggestions).toEqual([]);
  });

  it('uses scheduled habits that overlap the range as busy intervals', async () => {
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([
      {
        habitId: 'other-habit',
        startDateTime: new Date('2026-06-25T12:45:00.000Z'),
        endDateTime: new Date('2026-06-25T13:15:00.000Z'),
      },
    ] as any);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T08:00:00-05:00',
      '2026-06-25T09:00:00-05:00'
    );

    expect(suggestions[0]?.start).toContain('2026-06-25T08:15');
    expect(prisma.scheduledHabit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startDateTime: expect.objectContaining({ lt: new Date('2026-06-25T09:00:00-05:00') }),
          endDateTime: expect.objectContaining({ gt: new Date('2026-06-25T08:00:00-05:00') }),
        }),
      })
    );
  });

  it('does not suggest a habit already completed on that local day', async () => {
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([
      {
        habitId: 'habit-1',
        status: 'completed',
        completedAt: new Date('2026-06-25T16:00:00.000Z'),
      },
    ] as any);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T00:00:00',
      '2026-06-25T23:59:59'
    );

    expect(suggestions).toEqual([]);
    expect(prisma.habitCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('does not suggest a habit completed earlier on the same local day outside a partial range', async () => {
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([
      {
        habitId: 'habit-1',
        status: 'completed',
        completedAt: new Date('2026-06-25T12:00:00.000Z'),
      },
    ] as any);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T08:00:00-05:00',
      '2026-06-25T09:00:00-05:00'
    );

    expect(suggestions).toEqual([]);
  });

  it('still suggests a habit skipped earlier that local day', async () => {
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const suggestions = await getHabitSuggestionsForUser(
      'user-1',
      '2026-06-25T00:00:00',
      '2026-06-25T23:59:59'
    );

    expect(suggestions).toHaveLength(1);
    expect(prisma.habitCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('rejects accepting a weekly habit suggestion on a non-due day', async () => {
    vi.mocked(prisma.habit.findFirst).mockResolvedValue({
      id: 'habit-1',
      userId: 'user-1',
      title: 'Run',
      description: null,
      frequency: 'weekly',
      daysOfWeek: ['fri'],
      durationMinutes: 30,
    } as any);

    await expect(
      acceptSuggestion(
        'user-1',
        'habit-1',
        '2026-06-25T09:00:00-05:00',
        '2026-06-25T09:30:00-05:00'
      )
    ).rejects.toThrow('not due');
    expect(calendarService.createEvent).not.toHaveBeenCalled();
  });

  it('rejects accepting a habit already scheduled on that local day', async () => {
    vi.mocked(prisma.habit.findFirst).mockResolvedValue({
      id: 'habit-1',
      userId: 'user-1',
      title: 'Run',
      description: null,
      frequency: 'daily',
      daysOfWeek: [],
      durationMinutes: 30,
    } as any);
    vi.mocked(prisma.scheduledHabit.findFirst).mockResolvedValue({ id: 'scheduled-1' } as any);

    await expect(
      acceptSuggestion(
        'user-1',
        'habit-1',
        '2026-06-25T09:00:00-05:00',
        '2026-06-25T09:30:00-05:00'
      )
    ).rejects.toThrow('already scheduled');
    expect(calendarService.createEvent).not.toHaveBeenCalled();
  });

  it('rejects accepting a suggestion with an invalid end before creating a calendar event', async () => {
    vi.mocked(prisma.habit.findFirst).mockResolvedValue({
      id: 'habit-1',
      userId: 'user-1',
      title: 'Run',
      description: null,
      frequency: 'daily',
      daysOfWeek: [],
      durationMinutes: 30,
    } as any);

    await expect(
      acceptSuggestion(
        'user-1',
        'habit-1',
        '2026-06-25T09:00:00-05:00',
        'not-a-date'
      )
    ).rejects.toThrow('Invalid date');
    expect(calendarService.createEvent).not.toHaveBeenCalled();
  });

  it('rejects accepting a suggestion that ends before it starts', async () => {
    vi.mocked(prisma.habit.findFirst).mockResolvedValue({
      id: 'habit-1',
      userId: 'user-1',
      title: 'Run',
      description: null,
      frequency: 'daily',
      daysOfWeek: [],
      durationMinutes: 30,
    } as any);

    await expect(
      acceptSuggestion(
        'user-1',
        'habit-1',
        '2026-06-25T09:00:00-05:00',
        '2026-06-25T08:30:00-05:00'
      )
    ).rejects.toThrow('after start');
    expect(calendarService.createEvent).not.toHaveBeenCalled();
  });

  it('allows accepting a habit skipped earlier that local day', async () => {
    vi.mocked(prisma.habit.findFirst).mockResolvedValue({
      id: 'habit-1',
      userId: 'user-1',
      title: 'Run',
      description: null,
      frequency: 'daily',
      daysOfWeek: [],
      durationMinutes: 30,
    } as any);
    vi.mocked(prisma.scheduledHabit.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.habitCompletion.findFirst).mockResolvedValue(null);
    vi.mocked(calendarService.createEvent).mockResolvedValue({ eventId: 'event-1' });
    vi.mocked(prisma.scheduledHabit.create).mockResolvedValue({ id: 'scheduled-1' } as any);

    await expect(
      acceptSuggestion(
        'user-1',
        'habit-1',
        '2026-06-25T09:00:00-05:00',
        '2026-06-25T09:30:00-05:00'
      )
    ).resolves.toEqual({ id: 'scheduled-1' });
    expect(prisma.habitCompletion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'completed' }),
      })
    );
  });
});
