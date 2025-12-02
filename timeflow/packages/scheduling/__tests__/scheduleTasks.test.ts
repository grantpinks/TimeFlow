/**
 * Scheduling Engine Tests
 *
 * Tests the core scheduling algorithm with various scenarios
 * as specified in PROJECT_SPEC.md.
 */

import { describe, it, expect } from 'vitest';
import { scheduleTasks } from '../src/scheduleTasks.js';
import type { TaskInput, CalendarEvent, UserPreferences } from '../src/types.js';

const defaultPreferences: UserPreferences = {
  timeZone: 'America/Chicago',
  wakeTime: '08:00',
  sleepTime: '23:00',
};

describe('scheduleTasks', () => {
  describe('Scenario 1: Simple single-day scheduling with one task', () => {
    it('should schedule a single task at wake time', () => {
      const tasks: TaskInput[] = [
        { id: 'task-1', durationMinutes: 30, priority: 2 },
      ];
      const existingEvents: CalendarEvent[] = [];

      const result = scheduleTasks(
        tasks,
        existingEvents,
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-1');
      expect(result[0].start).toContain('2025-12-01T08:00:00');
      expect(result[0].overflowedDeadline).toBeUndefined();
    });

    it('should respect task duration', () => {
      const tasks: TaskInput[] = [
        { id: 'task-1', durationMinutes: 60, priority: 2 },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(1);
      // Should end 1 hour after start
      expect(result[0].start).toContain('08:00:00');
      expect(result[0].end).toContain('09:00:00');
    });
  });

  describe('Scenario 2: Two tasks with different priorities and same due date', () => {
    it('should schedule high priority task first when same due date', () => {
      const tasks: TaskInput[] = [
        {
          id: 'low-priority',
          durationMinutes: 30,
          priority: 3,
          dueDate: '2025-12-01T18:00:00',
        },
        {
          id: 'high-priority',
          durationMinutes: 30,
          priority: 1,
          dueDate: '2025-12-01T18:00:00',
        },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(2);
      // High priority should be scheduled first (earlier time)
      expect(result[0].taskId).toBe('high-priority');
      expect(result[1].taskId).toBe('low-priority');
    });

    it('should schedule earlier due date first regardless of priority', () => {
      const tasks: TaskInput[] = [
        {
          id: 'later-due',
          durationMinutes: 30,
          priority: 1, // High priority but later due
          dueDate: '2025-12-02T18:00:00',
        },
        {
          id: 'earlier-due',
          durationMinutes: 30,
          priority: 3, // Low priority but earlier due
          dueDate: '2025-12-01T18:00:00',
        },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-03T23:00:00'
      );

      expect(result).toHaveLength(2);
      // Earlier due date should be scheduled first
      expect(result[0].taskId).toBe('earlier-due');
      expect(result[1].taskId).toBe('later-due');
    });
  });

  describe('Scenario 3: Task that overflows deadline', () => {
    it('should mark overflowedDeadline when scheduled after due date', () => {
      const tasks: TaskInput[] = [
        {
          id: 'urgent-task',
          durationMinutes: 60,
          priority: 1,
          dueDate: '2025-12-01T09:00:00', // Due at 9am
        },
      ];

      // Busy from 8am to 9am
      const existingEvents: CalendarEvent[] = [
        {
          id: 'meeting',
          start: '2025-12-01T08:00:00-06:00',
          end: '2025-12-01T09:00:00-06:00',
        },
      ];

      const result = scheduleTasks(
        tasks,
        existingEvents,
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(1);
      // Task should be scheduled starting at 9am (after the meeting)
      // But due date is 9am, so end time (10am) > due date
      expect(result[0].overflowedDeadline).toBe(true);
    });

    it('should NOT mark overflowedDeadline when scheduled before due date', () => {
      const tasks: TaskInput[] = [
        {
          id: 'relaxed-task',
          durationMinutes: 30,
          priority: 2,
          dueDate: '2025-12-01T18:00:00', // Due at 6pm, plenty of time
        },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(1);
      expect(result[0].overflowedDeadline).toBeUndefined();
    });
  });

  describe('Scenario 4: Edge case with events filling most of the day', () => {
    it('should find gaps between meetings', () => {
      const tasks: TaskInput[] = [
        { id: 'quick-task', durationMinutes: 30, priority: 2 },
      ];

      // Meetings from 8-10, 10:30-12, 13-17, 17:30-20
      const existingEvents: CalendarEvent[] = [
        { start: '2025-12-01T08:00:00-06:00', end: '2025-12-01T10:00:00-06:00' },
        { start: '2025-12-01T10:30:00-06:00', end: '2025-12-01T12:00:00-06:00' },
        { start: '2025-12-01T13:00:00-06:00', end: '2025-12-01T17:00:00-06:00' },
        { start: '2025-12-01T17:30:00-06:00', end: '2025-12-01T20:00:00-06:00' },
      ];

      const result = scheduleTasks(
        tasks,
        existingEvents,
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(1);
      // Should find the 10:00-10:30 gap
      expect(result[0].start).toContain('10:00:00');
      expect(result[0].end).toContain('10:30:00');
    });

    it('should handle no available slots on a fully booked day', () => {
      const tasks: TaskInput[] = [
        { id: 'task-1', durationMinutes: 60, priority: 1 },
      ];

      // Completely booked from 8am to 11pm
      const existingEvents: CalendarEvent[] = [
        { start: '2025-12-01T08:00:00-06:00', end: '2025-12-01T23:00:00-06:00' },
      ];

      const result = scheduleTasks(
        tasks,
        existingEvents,
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      // Task cannot be scheduled - should be empty
      expect(result).toHaveLength(0);
    });

    it('should schedule remaining tasks on next day when current day is full', () => {
      const tasks: TaskInput[] = [
        { id: 'task-1', durationMinutes: 60, priority: 1 },
      ];

      // Day 1 fully booked
      const existingEvents: CalendarEvent[] = [
        { start: '2025-12-01T08:00:00-06:00', end: '2025-12-01T23:00:00-06:00' },
      ];

      const result = scheduleTasks(
        tasks,
        existingEvents,
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-02T23:00:00' // Range includes next day
      );

      expect(result).toHaveLength(1);
      // Should be scheduled on Dec 2
      expect(result[0].start).toContain('2025-12-02');
    });
  });

  describe('Edge cases', () => {
    it('should handle tasks without due dates (scheduled last)', () => {
      const tasks: TaskInput[] = [
        { id: 'no-due-date', durationMinutes: 30, priority: 1 },
        {
          id: 'has-due-date',
          durationMinutes: 30,
          priority: 3,
          dueDate: '2025-12-01T18:00:00',
        },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(2);
      // Task with due date should be first
      expect(result[0].taskId).toBe('has-due-date');
      expect(result[1].taskId).toBe('no-due-date');
    });

    it('should handle empty task list', () => {
      const result = scheduleTasks(
        [],
        [],
        defaultPreferences,
        '2025-12-01T08:00:00',
        '2025-12-01T23:00:00'
      );

      expect(result).toHaveLength(0);
    });

    it('should respect wake/sleep boundaries', () => {
      const earlyBirdPrefs: UserPreferences = {
        timeZone: 'America/Chicago',
        wakeTime: '05:00',
        sleepTime: '21:00',
      };

      const tasks: TaskInput[] = [
        { id: 'early-task', durationMinutes: 60, priority: 2 },
      ];

      const result = scheduleTasks(
        tasks,
        [],
        earlyBirdPrefs,
        '2025-12-01T00:00:00',
        '2025-12-01T23:59:59'
      );

      expect(result).toHaveLength(1);
      // Should start at 5am wake time, not midnight
      expect(result[0].start).toContain('05:00:00');
    });
  });
});

