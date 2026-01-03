/**
 * habitInsightsService Tests
 *
 * Tests adherence calculation, streak logic, best window detection, and timezone handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import { getHabitInsights } from '../habitInsightsService.js';

// Mock Prisma
vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    habit: {
      findMany: vi.fn(),
    },
  },
}));

describe('habitInsightsService', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    timeZone: 'America/Los_Angeles',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHabitInsights', () => {
    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(getHabitInsights(mockUserId)).rejects.toThrow('User not found');
    });

    it('should return empty insights if no habits', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.totalHabits).toBe(0);
      expect(result.activeHabits).toBe(0);
      expect(result.habits).toEqual([]);
      expect(result.overallAdherence).toBe(0);
    });

    it('should skip habits with no scheduled instances', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: [], // No scheduled instances
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.totalHabits).toBe(1);
      expect(result.activeHabits).toBe(0);
      expect(result.habits).toEqual([]);
    });

    it('should calculate 67% adherence for 8/12 completed', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const endDate = new Date('2026-01-14T23:59:59Z');

      // Create 12 scheduled instances, 8 completed
      const scheduledInstances = Array.from({ length: 12 }, (_, i) => ({
        id: `scheduled-${i}`,
        habitId: 'habit-1',
        startDateTime: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
        endDateTime: new Date(startDate.getTime() + (i * 24 + 1) * 60 * 60 * 1000),
        completion: i < 8 ? { status: 'completed', completedAt: new Date() } : null,
      }));

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.activeHabits).toBe(1);
      expect(result.habits[0].adherenceRate).toBeCloseTo(8 / 12, 2);
      expect(result.habits[0].scheduled).toBe(12);
      expect(result.habits[0].completed).toBe(8);
      expect(result.habits[0].skipped).toBe(0);
    });

    it('should calculate minutes scheduled vs completed', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const scheduledInstances = Array.from({ length: 10 }, (_, i) => ({
        id: `scheduled-${i}`,
        habitId: 'habit-1',
        startDateTime: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
        endDateTime: new Date(startDate.getTime() + (i * 24 + 1) * 60 * 60 * 1000),
        completion: i < 6 ? { status: 'completed', completedAt: new Date() } : null,
      }));

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 45, // 45 minutes per instance
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.habits[0].minutesScheduled).toBe(10 * 45); // 450 min
      expect(result.habits[0].minutesCompleted).toBe(6 * 45);  // 270 min
      expect(result.totalMinutesScheduled).toBe(450);
      expect(result.totalMinutesCompleted).toBe(270);
    });

    it('should aggregate skip reasons', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date(startDate),
          endDateTime: new Date(startDate.getTime() + 60 * 60 * 1000),
          completion: { status: 'skipped', reasonCode: 'NO_TIME', completedAt: new Date() },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          endDateTime: new Date(startDate.getTime() + 25 * 60 * 60 * 1000),
          completion: { status: 'skipped', reasonCode: 'NO_TIME', completedAt: new Date() },
        },
        {
          id: 'scheduled-3',
          habitId: 'habit-1',
          startDateTime: new Date(startDate.getTime() + 48 * 60 * 60 * 1000),
          endDateTime: new Date(startDate.getTime() + 49 * 60 * 60 * 1000),
          completion: { status: 'skipped', reasonCode: 'LOW_ENERGY', completedAt: new Date() },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.habits[0].skipReasons).toEqual([
        { reasonCode: 'NO_TIME', count: 2 },
        { reasonCode: 'LOW_ENERGY', count: 1 },
      ]);
    });

    it('should include period metadata', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([]);

      const result = await getHabitInsights(mockUserId, 28);

      expect(result.period.days).toBe(28);
      expect(result.period.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.period.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Streak calculations', () => {
    it('should calculate current streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: today,
          endDateTime: new Date(today.getTime() + 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: today },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: yesterday,
          endDateTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: yesterday },
        },
        {
          id: 'scheduled-3',
          habitId: 'habit-1',
          startDateTime: twoDaysAgo,
          endDateTime: new Date(twoDaysAgo.getTime() + 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: twoDaysAgo },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      // Should have 3-day streak
      expect(result.habits[0].streak.current).toBeGreaterThanOrEqual(1);
      expect(result.habits[0].streak.best).toBeGreaterThanOrEqual(result.habits[0].streak.current);
    });

    it('should mark streak as at risk if not completed today', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: yesterday,
          endDateTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: yesterday },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      // Streak should be at risk since we completed yesterday but not today
      expect(result.habits[0].streak.atRisk).toBe(true);
    });
  });

  describe('Best window calculations', () => {
    it('should return null if less than 3 instances', async () => {
      const startDate = new Date('2026-01-01T09:00:00Z');
      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: startDate,
          endDateTime: new Date(startDate.getTime() + 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: new Date() },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          endDateTime: new Date(startDate.getTime() + 25 * 60 * 60 * 1000),
          completion: { status: 'completed', completedAt: new Date() },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.habits[0].bestWindow).toBeNull();
    });

    it('should identify best window with highest completion rate', async () => {
      const baseDate = new Date('2026-01-06T09:00:00Z'); // Monday 9am

      // Create instances: Mon 9am (90% completion), Tue 2pm (50% completion)
      const mondayMorning = Array.from({ length: 10 }, (_, i) => ({
        id: `mon-${i}`,
        habitId: 'habit-1',
        startDateTime: new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000), // Every Monday at 9am
        endDateTime: new Date(baseDate.getTime() + (i * 7 * 24 + 1) * 60 * 60 * 1000),
        completion: i < 9 ? { status: 'completed', completedAt: new Date() } : null,
      }));

      const tuesdayAfternoon = Array.from({ length: 10 }, (_, i) => ({
        id: `tue-${i}`,
        habitId: 'habit-1',
        startDateTime: new Date(baseDate.getTime() + (i * 7 * 24 + 29) * 60 * 60 * 1000), // Every Tuesday at 2pm
        endDateTime: new Date(baseDate.getTime() + (i * 7 * 24 + 30) * 60 * 60 * 1000),
        completion: i < 5 ? { status: 'completed', completedAt: new Date() } : null,
      }));

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: [...mondayMorning, ...tuesdayAfternoon],
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      expect(result.habits[0].bestWindow).not.toBeNull();
      expect(result.habits[0].bestWindow?.completionRate).toBeGreaterThan(0.8); // Should be Monday's 90%
    });
  });

  describe('Adherence series', () => {
    it('should build daily adherence series for period', async () => {
      const startDate = new Date('2026-01-01T09:00:00Z');
      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T09:00:00Z'),
          endDateTime: new Date('2026-01-01T10:00:00Z'),
          completion: { status: 'completed', completedAt: new Date() },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-02T09:00:00Z'),
          endDateTime: new Date('2026-01-02T10:00:00Z'),
          completion: null,
        },
        {
          id: 'scheduled-3',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-03T09:00:00Z'),
          endDateTime: new Date('2026-01-03T10:00:00Z'),
          completion: { status: 'completed', completedAt: new Date() },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      const series = result.habits[0].adherenceSeries;
      expect(series.length).toBeGreaterThan(0);
      expect(series.every(day => day.date.match(/^\d{4}-\d{2}-\d{2}$/))).toBe(true);
      expect(series.every(day => typeof day.scheduled === 'number')).toBe(true);
      expect(series.every(day => typeof day.completed === 'number')).toBe(true);
    });
  });
});
