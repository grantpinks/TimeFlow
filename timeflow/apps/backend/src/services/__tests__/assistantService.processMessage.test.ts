import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe('processMessage (confirm-only actions)', () => {
  it('never returns auto-apply actions; only confirmable previews', async () => {
    const { prisma } = await import('../../config/prisma.js');
    const calendarService = await import('../googleCalendarService.js');

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
    vi.mocked(prisma.task.count).mockResolvedValue(1);
    vi.mocked(prisma.task.findMany).mockResolvedValue([{
      id: 'task-1',
      title: 'Test task',
      description: null,
      priority: 1,
      durationMinutes: 60,
      dueDate: null,
      status: 'unscheduled',
      userId: 'user-1',
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(calendarService.getEvents).mockResolvedValue([]);

    // Mock LLM response that would normally generate an apply_schedule action
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `
I've scheduled your tasks for you.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [
    {
      "taskId": "task-1",
      "start": "2025-12-23T10:00:00Z",
      "end": "2025-12-23T11:00:00Z"
    }
  ],
  "summary": "Scheduled 1 task",
  "conflicts": [],
  "confidence": "high"
}
\`\`\`
              `,
            },
          },
        ],
      }),
    });

    const result = await processMessage('user-1', 'Schedule my tasks.');

    // Should return preview actions only, never auto-apply
    if (result.message.metadata?.action) {
      expect(['preview_schedule', 'create_task_draft', 'draft_reply']).toContain(
        result.message.metadata.action.type
      );
    }
    // Should have suggestions with schedule preview for scheduling requests
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions?.blocks).toHaveLength(1);
  });
});
