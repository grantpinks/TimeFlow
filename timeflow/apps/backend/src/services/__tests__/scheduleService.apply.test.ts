import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    task: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    habit: { findMany: vi.fn() },
    scheduledTask: { create: vi.fn(), upsert: vi.fn() },
    appliedSchedule: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock('../scheduleValidator.js', () => ({
  validateSchedulePreview: vi.fn(),
  applyValidationToPreview: vi.fn(),
}));

import { applyScheduleBlocks } from '../scheduleService.js';

describe('applyScheduleBlocks', () => {
  it('rejects invalid blocks and returns an undo token on success', async () => {
    const { prisma } = await import('../../config/prisma.js');
    const calendarService = await import('../googleCalendarService.js');
    const scheduleValidator = await import('../scheduleValidator.js');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      timezone: 'America/New_York', // Use proper IANA timezone
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultTaskDurationMinutes: 30,
      dailySchedule: null,
      dailyScheduleConstraints: null,
      defaultCalendarId: 'primary',
      googleAccessToken: 'token',
    } as any);

    vi.mocked(prisma.task.findMany).mockResolvedValue([{
      id: 'task-1'
    } as any]);
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      id: 'task-1',
      title: 'Test task',
      status: 'unscheduled'
    } as any);
    vi.mocked(prisma.task.update).mockResolvedValue({} as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(calendarService.createEvent).mockResolvedValue({ eventId: 'event-1' });
    vi.mocked(calendarService.updateEvent).mockResolvedValue(undefined);
    vi.mocked(calendarService.getEvents).mockResolvedValue([]);
    vi.mocked(prisma.scheduledTask.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.appliedSchedule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appliedSchedule.create).mockResolvedValue({} as any);

    // Mock validation to pass
    vi.mocked(scheduleValidator.validateSchedulePreview).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    const result = await applyScheduleBlocks('user-1', [{
      taskId: 'task-1',
      start: '2025-12-24T14:00:00Z', // 9:00 AM EST (within wake/sleep hours)
      end: '2025-12-24T15:00:00Z',   // 10:00 AM EST
    }]);

    expect(result.tasksScheduled).toBe(1);
    expect(result.undoToken).toBeDefined(); // Should return undo token on success
    expect(typeof result.undoToken).toBe('string');
    expect(result.undoToken?.length).toBeGreaterThan(0);
  });

  it('rejects invalid blocks and does not return undo token on validation failure', async () => {
    const { prisma } = await import('../../config/prisma.js');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      timezone: 'America/New_York',
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultTaskDurationMinutes: 30,
      dailySchedule: null,
      dailyScheduleConstraints: null,
      defaultCalendarId: 'primary',
      googleAccessToken: 'token',
    } as any);

    vi.mocked(prisma.task.findMany).mockResolvedValue([]);

    await expect(
      applyScheduleBlocks('user-1', [{
        taskId: 'fake-task-id', // Non-existent task ID
        start: '2025-12-24T14:00:00Z',
        end: '2025-12-24T15:00:00Z',
      }])
    ).rejects.toThrow('Schedule validation failed');
  });
});