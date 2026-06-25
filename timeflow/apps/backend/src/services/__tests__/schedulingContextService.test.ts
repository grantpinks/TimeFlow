import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSchedulingContext } from '../schedulingContextService.js';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    habit: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    scheduledHabit: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    habitCompletion: {
      findMany: vi.fn(),
    },
  },
}));

describe('schedulingContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return context with unscheduled habits count', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);

    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'habit-1', frequency: 'daily', daysOfWeek: [] },
      { id: 'habit-2', frequency: 'daily', daysOfWeek: [] },
      { id: 'habit-3', frequency: 'daily', daysOfWeek: [] },
      { id: 'habit-4', frequency: 'daily', daysOfWeek: [] },
      { id: 'habit-5', frequency: 'daily', daysOfWeek: [] },
    ] as any);

    vi.mocked(prisma.scheduledHabit.count).mockResolvedValue(0);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.unscheduledHabitsCount).toBe(5);
    expect(context.nextRelevantDay).toBeDefined();
  });

  it('should detect urgent habits at risk of breaking streaks', async () => {
    const today = new Date();
    const habit = {
      id: 'habit-1',
      userId: 'user-123',
      title: 'Morning Meditation',
      frequency: 'daily',
      daysOfWeek: [],
      durationMinutes: 30,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: today,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);

    vi.mocked(prisma.habit.findMany).mockResolvedValue([habit] as any);
    vi.mocked(prisma.scheduledHabit.count).mockResolvedValue(0);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.urgentHabits).toBe(1);
  });

  it('should return zero unscheduled habits when all habits are scheduled', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);

    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'habit-1', frequency: 'daily', daysOfWeek: [] },
      { id: 'habit-2', frequency: 'daily', daysOfWeek: [] },
    ] as any);

    // All habits have scheduled instances for the next 7 days
    vi.mocked(prisma.scheduledHabit.count).mockResolvedValue(2);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([
      { habitId: 'habit-1' },
      { habitId: 'habit-2' },
    ] as any);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.unscheduledHabitsCount).toBe(0);
  });

  it('should handle users with no active habits', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);

    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scheduledHabit.count).mockResolvedValue(0);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.unscheduledHabitsCount).toBe(0);
    expect(context.urgentHabits).toBe(0);
  });

  it('should determine next relevant day based on day of week', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);

    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'habit-1', frequency: 'daily', daysOfWeek: [] },
    ] as any);

    vi.mocked(prisma.scheduledHabit.count).mockResolvedValue(0);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(['this week', 'tomorrow', 'next week']).toContain(context.nextRelevantDay);
  });

  it('counts only habits due tomorrow as unscheduled', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T15:00:00.000Z')); // Wednesday; tomorrow is Thursday

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      timeZone: 'America/Chicago',
    } as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'daily', frequency: 'daily', daysOfWeek: [] },
      { id: 'weekly-due', frequency: 'weekly', daysOfWeek: ['thu'] },
      { id: 'weekly-off', frequency: 'weekly', daysOfWeek: ['fri'] },
      { id: 'custom-due', frequency: 'custom', daysOfWeek: ['thu'] },
    ] as any);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([{ habitId: 'daily' }] as any);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.unscheduledHabitsCount).toBe(2);
  });
});
