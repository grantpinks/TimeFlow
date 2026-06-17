import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    scheduledTask: {
      update: vi.fn(),
    },
  },
}));

import { updateTask } from '../tasksService.js';
import { prisma } from '../../config/prisma.js';

describe('updateTask scheduleLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists scheduleLocked to the database', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      id: 'task-1',
      userId: 'user-1',
      status: 'scheduled',
      scheduledTask: {
        id: 'st-1',
        eventId: 'evt-1',
        calendarId: 'primary',
        startDateTime: new Date('2026-06-16T14:00:00.000Z'),
        endDateTime: new Date('2026-06-16T15:00:00.000Z'),
      },
    } as any);

    vi.mocked(prisma.task.update).mockResolvedValue({
      id: 'task-1',
      scheduleLocked: true,
    } as any);

    await updateTask('task-1', 'user-1', { scheduleLocked: true });

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ scheduleLocked: true }),
      })
    );
  });
});
