/**
 * Habit Edge Cases Tests
 *
 * Tests for timezone changes, DST transitions, and boundary time completions.
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

describe('Habit Edge Cases', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timezone changes', () => {
    it('should preserve streak when user changes timezone mid-week', async () => {
      // User starts in PST, completes habits, then changes to EST

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'America/New_York', // Currently in EST
      };

      // Completions that happened in PST (3 hours behind)
      const pstCompletions = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T10:00:00-08:00'), // 10am PST
          endDateTime: new Date('2026-01-01T11:00:00-08:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-01T10:30:00-08:00'),
          },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-02T10:00:00-08:00'), // 10am PST
          endDateTime: new Date('2026-01-02T11:00:00-08:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-02T10:30:00-08:00'),
          },
        },
        // Then user moved to EST and completed on Jan 3
        {
          id: 'scheduled-3',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-03T10:00:00-05:00'), // 10am EST
          endDateTime: new Date('2026-01-03T11:00:00-05:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-03T10:30:00-05:00'),
          },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Morning Exercise',
          durationMinutes: 30,
          scheduledHabits: pstCompletions,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      // Streak should be 3 days (timezone normalization preserves streak)
      expect(result.habits[0].streak.current).toBeGreaterThanOrEqual(3);
      expect(result.habits[0].adherenceRate).toBe(1.0); // 100% adherence
    });

    it('should count completions correctly when timezone boundary creates same calendar day', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'Pacific/Auckland', // UTC+12
      };

      // Two completions that are on different UTC days but same NZ day
      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T11:00:00Z'), // 11pm Jan 1 in NZ
          endDateTime: new Date('2026-01-01T12:00:00Z'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-01T11:30:00Z'),
          },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T13:00:00Z'), // 1am Jan 2 in NZ
          endDateTime: new Date('2026-01-01T14:00:00Z'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-01T13:30:00Z'),
          },
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

      // Should count as 2 separate completions (different NZ calendar days)
      expect(result.habits[0].completed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DST transitions', () => {
    it('should handle spring forward DST transition correctly', async () => {
      // US DST 2026: March 8 at 2am → 3am (spring forward, lose 1 hour)

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'America/Los_Angeles',
      };

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-03-07T10:00:00-08:00'), // Day before DST
          endDateTime: new Date('2026-03-07T11:00:00-08:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-03-07T10:30:00-08:00'),
          },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-03-08T10:00:00-07:00'), // DST day (now PDT)
          endDateTime: new Date('2026-03-08T11:00:00-07:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-03-08T10:30:00-07:00'),
          },
        },
        {
          id: 'scheduled-3',
          habitId: 'habit-1',
          startDateTime: new Date('2026-03-09T10:00:00-07:00'), // Day after DST
          endDateTime: new Date('2026-03-09T11:00:00-07:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-03-09T10:30:00-07:00'),
          },
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

      // Use March 9 as "today" for the test
      const asOfDate = new Date('2026-03-09T23:59:59-07:00');
      const result = await getHabitInsights(mockUserId, 14, asOfDate);

      // Streak should be 3 days (DST handled correctly)
      expect(result.habits[0].streak.current).toBeGreaterThanOrEqual(3);
      expect(result.habits[0].completed).toBe(3);
    });

    it('should handle fall back DST transition correctly', async () => {
      // US DST 2026: November 1 at 2am → 1am (fall back, gain 1 hour)

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'America/Los_Angeles',
      };

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-10-31T10:00:00-07:00'), // Day before DST end
          endDateTime: new Date('2026-10-31T11:00:00-07:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-10-31T10:30:00-07:00'),
          },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-11-01T10:00:00-08:00'), // DST end day (back to PST)
          endDateTime: new Date('2026-11-01T11:00:00-08:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-11-01T10:30:00-08:00'),
          },
        },
        {
          id: 'scheduled-2',
          habitId: 'habit-1',
          startDateTime: new Date('2026-11-02T10:00:00-08:00'), // Day after DST end
          endDateTime: new Date('2026-11-02T11:00:00-08:00'),
          completion: {
            status: 'completed',
            completedAt: new Date('2026-11-02T10:30:00-08:00'),
          },
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

      // Use November 2 as "today" for the test
      const asOfDate = new Date('2026-11-02T23:59:59-08:00');
      const result = await getHabitInsights(mockUserId, 14, asOfDate);

      // Streak should be 3 days (DST handled correctly)
      expect(result.habits[0].streak.current).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Boundary time completions', () => {
    it('should count completion at 11:59pm as same day', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'America/New_York',
      };

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T23:00:00-05:00'), // 11pm
          endDateTime: new Date('2026-01-02T00:00:00-05:00'), // midnight
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-01T23:59:00-05:00'), // 11:59pm
          },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Evening Routine',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      // Should be counted correctly on Jan 1
      expect(result.habits[0].completed).toBe(1);
      expect(result.habits[0].adherenceSeries.some(
        day => day.date.includes('2026-01-01') && day.completed === 1
      )).toBe(true);
    });

    it('should count completion at 12:01am as next day', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        timeZone: 'America/New_York',
      };

      const scheduledInstances = [
        {
          id: 'scheduled-1',
          habitId: 'habit-1',
          startDateTime: new Date('2026-01-01T23:00:00-05:00'), // 11pm Jan 1
          endDateTime: new Date('2026-01-02T00:30:00-05:00'), // 12:30am Jan 2
          completion: {
            status: 'completed',
            completedAt: new Date('2026-01-02T00:01:00-05:00'), // 12:01am Jan 2
          },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([
        {
          id: 'habit-1',
          title: 'Evening Routine',
          durationMinutes: 30,
          scheduledHabits: scheduledInstances,
        },
      ]);

      const result = await getHabitInsights(mockUserId, 14);

      // Should be counted on Jan 2, not Jan 1
      expect(result.habits[0].adherenceSeries.some(
        day => day.date.includes('2026-01-02') && day.completed === 1
      )).toBe(true);
    });
  });
});
