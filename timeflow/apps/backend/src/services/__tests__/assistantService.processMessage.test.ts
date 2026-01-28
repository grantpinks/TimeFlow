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

  it('returns reschedule preview when user asks to reschedule existing tasks', async () => {
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
    vi.mocked(prisma.task.count).mockResolvedValue(0); // No unscheduled tasks

    // Mock scheduled tasks for rescheduling
    const scheduledTasks = [{
      id: 'existing-task-1',
      title: 'Meeting at 2pm',
      description: null,
      priority: 1,
      durationMinutes: 60,
      dueDate: null,
      status: 'scheduled',
      userId: 'user-1',
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledTask: {
        id: 'scheduled-1',
        taskId: 'existing-task-1',
        calendarId: 'primary',
        eventId: 'event-1',
        startDateTime: new Date('2025-12-23T14:00:00Z'),
        endDateTime: new Date('2025-12-23T15:00:00Z'),
        overflowedDeadline: false,
      },
    }];

    // Mock unscheduled tasks (empty)
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([]);
    // Mock scheduled tasks for rescheduling
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([{
      id: 'existing-task-1',
      title: 'Meeting at 2pm',
      description: null,
      priority: 1,
      durationMinutes: 60,
      dueDate: null,
      status: 'scheduled',
      userId: 'user-1',
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledTask: {
        id: 'scheduled-1',
        taskId: 'existing-task-1',
        calendarId: 'primary',
        eventId: 'event-1',
        startDateTime: new Date('2025-12-23T14:00:00Z'),
        endDateTime: new Date('2025-12-23T15:00:00Z'),
        overflowedDeadline: false,
      },
    }]);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(calendarService.getEvents).mockResolvedValue([
      {
        id: 'event-1',
        summary: 'TF| Meeting at 2pm',
        start: '2025-12-23T14:00:00Z',
        end: '2025-12-23T15:00:00Z',
      },
    ]);

    // Mock the internal prisma call for scheduled tasks
    vi.mocked(prisma.task).findMany.mockResolvedValueOnce(scheduledTasks);

    // Mock LLM response for reschedule request
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `
I can help you reschedule your tasks. Here's a preview of moving your afternoon task to tomorrow morning.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [
    {
      "taskId": "existing-task-1",
      "start": "2025-12-24T09:00:00Z",
      "end": "2025-12-24T10:30:00Z"
    }
  ],
  "summary": "Rescheduled 1 task to tomorrow morning",
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

    const result = await processMessage('user-1', 'Move my 2pm task to tomorrow morning.');

    expect(result.suggestions?.blocks).toHaveLength(1);
    expect(result.suggestions?.blocks[0].taskId).toBe('existing-task-1');
    expect(result.message.metadata?.action?.type).not.toBe('apply_schedule');
  });
});

describe('processMessage (task creation)', () => {
  it('creates a task draft and suggests a schedule slot', async () => {
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

    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(calendarService.getEvents).mockResolvedValue([]);

    // Mock LLM response suggesting a task with a schedule slot
    // Set up mock before any other operations
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `I'll create a task for submitting taxes and find a good time slot for you.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "taskDraft": {
    "title": "Submit taxes",
    "description": "Complete and submit tax documents",
    "durationMinutes": 120,
    "priority": 1
  },
  "suggestedSlot": {
    "start": "2025-12-24T10:00:00Z",
    "end": "2025-12-24T12:00:00Z"
  }
}
\`\`\``,
            },
          },
        ],
      }),
    });

    const result = await processMessage('user-1', 'Remind me to submit taxes tomorrow morning');

    // Should include task creation language in the response
    expect(result.message.content.toLowerCase()).toContain('task');

    // Should have a task draft action
    expect(result.message.metadata?.action?.type).toBe('create_task_draft');
  });
});
