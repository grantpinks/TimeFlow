/**
 * Schedule Validation Service Tests
 * 
 * Comprehensive tests for all validation functions to prevent hallucinations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateSchedule } from '../scheduleValidationService';
import type { ApplyScheduleBlock } from '@timeflow/shared';

// Mock dependencies
vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    task: { findMany: vi.fn() },
    habit: { findMany: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  getEvents: vi.fn(),
}));

vi.mock('../../utils/eventClassifier.js', () => ({
  separateFixedAndMovable: vi.fn(),
}));

import { prisma } from '../../config/prisma.js';
import * as googleCalendarService from '../googleCalendarService.js';
import * as eventClassifier from '../../utils/eventClassifier.js';

describe('Schedule Validation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'America/New_York',
      wakeTime: '08:00',
      sleepTime: '23:00',
      defaultTaskDuration: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
      googleAccessToken: 'token',
      googleRefreshToken: 'refresh',
      googleTokenExpiry: new Date(Date.now() + 3600000),
      receiveEmailNotifications: true,
      emailNotificationHour: 9,
      lastEmailNotification: null,
      weeklyReviewDay: 0,
      lastWeeklyReview: null,
      meetingHoursStart: null,
      meetingHoursEnd: null,
      useMeetingHours: false,
      defaultCalendarId: null,
      categoryTrainingEnabled: true,
      introSeenAt: new Date(),
      primaryGoogleCalendar: null,
      gmailPushEnabled: false,
      gmailWatchExpiry: null,
      dailySchedule: null,
      dailyScheduleConstraints: null,
    } as any);
    
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([]);
    vi.mocked(eventClassifier.separateFixedAndMovable).mockReturnValue({
      fixed: [],
      movable: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task ID Validation', () => {
    it('rejects blocks with non-existent task IDs', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'fake-id', start: '2025-12-24T15:00:00Z', end: '2025-12-24T16:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_TASK_ID');
      expect(result.errors[0].message).toContain('fake-id');
    });

    it('accepts blocks with valid task IDs', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 'task-1' } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'task-1', start: '2025-12-24T14:00:00Z', end: '2025-12-24T15:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'INVALID_TASK_ID')).toHaveLength(0);
    });

    it('rejects blocks with non-existent habit IDs', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
      
      const blocks: ApplyScheduleBlock[] = [
        { habitId: 'fake-habit', title: 'Workout', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_TASK_ID')).toBe(true);
      expect(result.errors.some(e => e.message.includes('fake-habit'))).toBe(true);
    });

    it('accepts blocks with valid habit IDs', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { id: 'habit-1' } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        { habitId: 'habit-1', title: 'Workout', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'INVALID_TASK_ID')).toHaveLength(0);
    });
  });

  describe('Wake/Sleep Validation', () => {
    it('rejects blocks before wake time', async () => {
      // User: wake 08:00, sleep 23:00, timezone America/New_York (EST, UTC-5)
      const blocks: ApplyScheduleBlock[] = [
        // 6:00 AM EST = 11:00 UTC (before wake time)
        { taskId: 'task-1', start: '2025-12-24T11:00:00Z', end: '2025-12-24T12:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toBe(true);
      expect(result.errors.some(e => e.message.includes('before wake time'))).toBe(true);
    });

    it('rejects blocks after sleep time', async () => {
      // User: wake 08:00, sleep 23:00, timezone America/New_York (EST, UTC-5)
      const blocks: ApplyScheduleBlock[] = [
        // 11:00 PM - 12:00 AM EST = extends past sleep time
        { taskId: 'task-1', start: '2025-12-25T04:00:00Z', end: '2025-12-25T05:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toBe(true);
      expect(result.errors.some(e => e.message.includes('after sleep time'))).toBe(true);
    });

    it('accepts blocks within wake/sleep bounds', async () => {
      // User: wake 08:00, sleep 23:00, timezone America/New_York (EST, UTC-5)
      const blocks: ApplyScheduleBlock[] = [
        // 2:00 PM - 3:00 PM EST = within bounds
        { taskId: 'task-1', start: '2025-12-24T19:00:00Z', end: '2025-12-24T20:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toHaveLength(0);
    });

    it('handles edge case: block ending exactly at sleep time', async () => {
      // User: wake 08:00, sleep 23:00, timezone America/New_York (EST, UTC-5)
      const blocks: ApplyScheduleBlock[] = [
        // 10:00 PM - 11:00 PM EST = ends exactly at sleep time (should be valid)
        { taskId: 'task-1', start: '2025-12-25T03:00:00Z', end: '2025-12-25T04:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      // Should be valid - ending at sleep time is allowed
      expect(result.errors.filter(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toHaveLength(0);
    });
  });

  describe('Fixed Event Overlap Validation', () => {
    it('rejects blocks overlapping fixed events', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      // Mock fixed event: 2:00 PM - 4:00 PM EST
      vi.mocked(googleCalendarService.getEvents).mockResolvedValue([
        {
          id: 'event-1',
          summary: 'CS 101 Lecture',
          start: '2025-12-24T19:00:00Z', // 2 PM EST
          end: '2025-12-24T21:00:00Z',   // 4 PM EST
          isFixed: true,
        } as any,
      ]);
      
      vi.mocked(eventClassifier.separateFixedAndMovable).mockReturnValue({
        fixed: [{
          id: 'event-1',
          summary: 'CS 101 Lecture',
          start: '2025-12-24T19:00:00Z',
          end: '2025-12-24T21:00:00Z',
        } as any],
        movable: [],
      });
      
      const blocks: ApplyScheduleBlock[] = [
        // 3:00 PM - 4:00 PM EST = overlaps lecture
        { taskId: 'task-1', start: '2025-12-24T20:00:00Z', end: '2025-12-24T21:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OVERLAP_FIXED_EVENT')).toBe(true);
      expect(result.errors.some(e => e.message.includes('CS 101 Lecture'))).toBe(true);
    });

    it('accepts blocks before fixed events', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      vi.mocked(googleCalendarService.getEvents).mockResolvedValue([
        {
          id: 'event-1',
          summary: 'Meeting',
          start: '2025-12-24T19:00:00Z', // 2 PM EST
          end: '2025-12-24T20:00:00Z',   // 3 PM EST
        } as any,
      ]);
      
      vi.mocked(eventClassifier.separateFixedAndMovable).mockReturnValue({
        fixed: [{
          id: 'event-1',
          summary: 'Meeting',
          start: '2025-12-24T19:00:00Z',
          end: '2025-12-24T20:00:00Z',
        } as any],
        movable: [],
      });
      
      const blocks: ApplyScheduleBlock[] = [
        // 12:00 PM - 1:00 PM EST = before meeting
        { taskId: 'task-1', start: '2025-12-24T17:00:00Z', end: '2025-12-24T18:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'OVERLAP_FIXED_EVENT')).toHaveLength(0);
    });

    it('accepts blocks after fixed events', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      vi.mocked(googleCalendarService.getEvents).mockResolvedValue([
        {
          id: 'event-1',
          summary: 'Meeting',
          start: '2025-12-24T19:00:00Z', // 2 PM EST
          end: '2025-12-24T20:00:00Z',   // 3 PM EST
        } as any,
      ]);
      
      vi.mocked(eventClassifier.separateFixedAndMovable).mockReturnValue({
        fixed: [{
          id: 'event-1',
          summary: 'Meeting',
          start: '2025-12-24T19:00:00Z',
          end: '2025-12-24T20:00:00Z',
        } as any],
        movable: [],
      });
      
      const blocks: ApplyScheduleBlock[] = [
        // 4:00 PM - 5:00 PM EST = after meeting
        { taskId: 'task-1', start: '2025-12-24T21:00:00Z', end: '2025-12-24T22:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'OVERLAP_FIXED_EVENT')).toHaveLength(0);
    });
  });

  describe('Timezone Validation', () => {
    it('rejects invalid date formats', async () => {
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'task-1', start: 'invalid-date', end: '2025-12-24T16:00:00Z' } as any,
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
    });

    it('rejects blocks with suspicious long durations', async () => {
      const blocks: ApplyScheduleBlock[] = [
        // 10 hour duration = likely timezone error
        { taskId: 'task-1', start: '2025-12-24T10:00:00Z', end: '2025-12-24T20:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
      expect(result.errors.some(e => e.message.includes('Suspicious duration'))).toBe(true);
    });

    it('rejects blocks with too short durations', async () => {
      const blocks: ApplyScheduleBlock[] = [
        // 2 minute duration = too short
        { taskId: 'task-1', start: '2025-12-24T15:00:00Z', end: '2025-12-24T15:02:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true);
    });

    it('rejects blocks where end is before start', async () => {
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'task-1', start: '2025-12-24T16:00:00Z', end: '2025-12-24T15:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
      expect(result.errors.some(e => e.message.includes('before or equal to start'))).toBe(true);
    });

    it('accepts blocks with reasonable durations', async () => {
      const blocks: ApplyScheduleBlock[] = [
        // 1 hour = reasonable
        { taskId: 'task-1', start: '2025-12-24T15:00:00Z', end: '2025-12-24T16:00:00Z' },
      ];
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'TIMEZONE_ERROR')).toHaveLength(0);
    });
  });

  describe('Habit Completeness Validation', () => {
    it('detects incomplete daily habit schedules', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { 
          id: 'habit-1', 
          title: 'Morning Workout', 
          frequency: 'daily', 
          daysOfWeek: [] 
        } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        // Only 3 blocks for a daily habit (should be 7)
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-25T12:00:00Z', end: '2025-12-25T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-26T12:00:00Z', end: '2025-12-26T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks, { strictHabitValidation: true });
      
      expect(result.errors.some(e => e.type === 'HABIT_INCOMPLETE')).toBe(true);
      expect(result.errors.some(e => e.message.includes('3/7 days'))).toBe(true);
    });

    it('detects incomplete weekly habit schedules', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { 
          id: 'habit-1', 
          title: 'Journal', 
          frequency: 'weekly', 
          daysOfWeek: ['Monday', 'Wednesday', 'Friday'] 
        } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        // Only 1 block for a 3-day weekly habit
        { habitId: 'habit-1', title: 'Journal', start: '2025-12-23T13:00:00Z', end: '2025-12-23T13:20:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks, { strictHabitValidation: true });
      
      expect(result.errors.some(e => e.type === 'HABIT_INCOMPLETE')).toBe(true);
    });

    it('accepts complete daily habit schedules', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { 
          id: 'habit-1', 
          title: 'Morning Workout', 
          frequency: 'daily', 
          daysOfWeek: [] 
        } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        // 7 blocks for daily habit
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-25T12:00:00Z', end: '2025-12-25T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-26T12:00:00Z', end: '2025-12-26T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-27T12:00:00Z', end: '2025-12-27T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-28T12:00:00Z', end: '2025-12-28T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-29T12:00:00Z', end: '2025-12-29T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-30T12:00:00Z', end: '2025-12-30T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks, { strictHabitValidation: true });
      
      expect(result.errors.filter(e => e.type === 'HABIT_INCOMPLETE')).toHaveLength(0);
    });

    it('skips habit validation when strictHabitValidation is false', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { 
          id: 'habit-1', 
          title: 'Morning Workout', 
          frequency: 'daily', 
          daysOfWeek: [] 
        } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        // Only 2 blocks but strictHabitValidation is false
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
        { habitId: 'habit-1', title: 'Morning Workout', start: '2025-12-25T12:00:00Z', end: '2025-12-25T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks, { strictHabitValidation: false });
      
      expect(result.errors.filter(e => e.type === 'HABIT_INCOMPLETE')).toHaveLength(0);
    });
  });

  describe('Warning Detection', () => {
    it('warns about consecutive blocks without breaks', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 'task-1' } as any,
        { id: 'task-2' } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'task-1', start: '2025-12-24T14:00:00Z', end: '2025-12-24T15:00:00Z' },
        // Next block starts immediately after (no break)
        { taskId: 'task-2', start: '2025-12-24T15:00:00Z', end: '2025-12-24T16:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.warnings.some(w => w.type === 'CONSECUTIVE_BLOCKS')).toBe(true);
    });

    it('warns about late night scheduling', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' } as any]);
      
      const blocks: ApplyScheduleBlock[] = [
        // Ends at 11 PM (late night)
        { taskId: 'task-1', start: '2025-12-25T03:00:00Z', end: '2025-12-25T04:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.warnings.some(w => w.type === 'LATE_NIGHT')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('validates multiple blocks with mixed tasks and habits', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 'task-1' } as any,
        { id: 'task-2' } as any,
      ]);
      
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { id: 'habit-1' } as any,
      ]);
      
      const blocks: ApplyScheduleBlock[] = [
        { taskId: 'task-1', start: '2025-12-24T14:00:00Z', end: '2025-12-24T15:00:00Z' },
        { habitId: 'habit-1', title: 'Workout', start: '2025-12-24T16:00:00Z', end: '2025-12-24T16:30:00Z' },
        { taskId: 'task-2', start: '2025-12-24T17:00:00Z', end: '2025-12-24T18:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns all applicable errors for invalid schedule', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      
      const blocks: ApplyScheduleBlock[] = [
        // Invalid task ID + outside wake hours
        { taskId: 'fake-id', start: '2025-12-24T10:00:00Z', end: '2025-12-24T11:00:00Z' }, // 5 AM EST
        // Invalid duration
        { taskId: 'task-2', start: '2025-12-24T15:00:00Z', end: '2025-12-24T15:02:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.type === 'INVALID_TASK_ID')).toBe(true);
      expect(result.errors.some(e => e.type === 'OUTSIDE_WAKE_SLEEP' || e.type === 'TIMEZONE_ERROR')).toBe(true);
    });
  });
});
