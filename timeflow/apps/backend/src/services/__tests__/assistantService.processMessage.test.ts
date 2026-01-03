import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    task: { count: vi.fn(), findMany: vi.fn() },
    habit: { findMany: vi.fn() },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  getEvents: vi.fn(),
}));

vi.mock('../schedulingLinkService.js', () => ({
  getSchedulingLinks: vi.fn(),
  createSchedulingLink: vi.fn(),
}));

import { processMessage } from '../assistantService.js';

describe('processMessage (meetings)', () => {
  it('returns a clarifying question when a scheduling link is missing', async () => {
    const { prisma } = await import('../../config/prisma.js');
    const calendarService = await import('../googleCalendarService.js');
    const schedulingLinkService = await import('../schedulingLinkService.js');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      timeZone: 'UTC',
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultTaskDurationMinutes: 30,
      dailySchedule: null,
      dailyScheduleConstraints: null,
      defaultCalendarId: 'primary',
      meetingStartTime: null,
      meetingEndTime: null,
    } as any);
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(calendarService.getEvents).mockResolvedValue([]);
    vi.mocked(schedulingLinkService.getSchedulingLinks).mockResolvedValue([]);

    const result = await processMessage('user-1', 'Schedule a meeting with Alex.');

    expect(result.message.content.toLowerCase()).toContain('scheduling link');
  });
});
