import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rescheduleTask } from '../scheduleService';
import { prisma } from '../../config/prisma.js';
import * as calendarService from '../googleCalendarService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    task: { findFirst: vi.fn(), update: vi.fn() },
    scheduledTask: { create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scheduleService.rescheduleTask', () => {
  it('stores the calendar event id when scheduling an unscheduled task', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      defaultCalendarId: 'primary',
    } as any);

    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      id: 'task-1',
      userId: 'user-1',
      title: 'Test task',
      description: null,
      scheduledTask: null,
    } as any);

    vi.mocked(calendarService.createEvent).mockResolvedValue({
      eventId: 'google-event-1',
    });

    vi.mocked(prisma.scheduledTask.create).mockResolvedValue({} as any);
    vi.mocked(prisma.task.update).mockResolvedValue({} as any);

    await rescheduleTask(
      'user-1',
      'task-1',
      '2026-01-02T10:00:00.000Z',
      '2026-01-02T10:30:00.000Z'
    );

    expect(prisma.scheduledTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'google-event-1',
        }),
      })
    );
  });
});
