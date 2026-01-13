import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rescheduleHabitInstance } from '../habitRescheduleService.js';
import { prisma } from '../../config/prisma.js';
import * as calendarService from '../googleCalendarService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    scheduledHabit: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  updateEvent: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('habitRescheduleService', () => {
  it('updates the calendar event and scheduled habit record', async () => {
    vi.mocked(prisma.scheduledHabit.findFirst).mockResolvedValue({
      id: 'scheduled-habit-1',
      userId: 'user-1',
      calendarId: 'primary',
      eventId: 'event-123',
      startDateTime: new Date('2026-01-02T10:00:00.000Z'),
      endDateTime: new Date('2026-01-02T10:30:00.000Z'),
    } as any);

    vi.mocked(prisma.scheduledHabit.update).mockResolvedValue({} as any);

    await rescheduleHabitInstance(
      'user-1',
      'scheduled-habit-1',
      '2026-01-02T12:00:00.000Z',
      '2026-01-02T12:30:00.000Z'
    );

    expect(calendarService.updateEvent).toHaveBeenCalledWith(
      'user-1',
      'primary',
      'event-123',
      {
        start: '2026-01-02T12:00:00.000Z',
        end: '2026-01-02T12:30:00.000Z',
      }
    );
    expect(prisma.scheduledHabit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'scheduled-habit-1' },
        data: expect.objectContaining({
          startDateTime: new Date('2026-01-02T12:00:00.000Z'),
          endDateTime: new Date('2026-01-02T12:30:00.000Z'),
        }),
      })
    );
  });
});
