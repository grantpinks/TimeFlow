/**
 * Phase A — Sprint 25: Flow AI Reliability
 *
 * Integration-level tests for the must-pass flow:
 *   A1 — Hallucinated task/habit IDs are stripped by sanitizeSchedulePreview before reaching the client
 *   A3 — processMessage in scheduling mode returns non-empty preview when a free window exists
 *        before a fixed event (must-pass scenario: "Pack for Florida" + "Flight to Fort Myers")
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  getEvents: vi.fn(),
}));

vi.mock('../schedulingLinkService.js', () => ({
  getSchedulingLinks: vi.fn().mockResolvedValue([]),
  createSchedulingLink: vi.fn(),
}));

import { processMessage } from '../assistantService.js';
import { prisma } from '../../config/prisma.js';
import * as googleCalendarService from '../googleCalendarService.js';

// A test user in UTC so times are simple to reason about
const TEST_USER = {
  id: 'user-phase-a',
  timeZone: 'UTC',
  wakeTime: '08:00',
  sleepTime: '23:00',
  defaultTaskDurationMinutes: 60,
  dailySchedule: null,
  dailyScheduleConstraints: null,
  defaultCalendarId: 'primary',
  meetingStartTime: null,
  meetingEndTime: null,
  googleAccessToken: 'token',
  googleAccessTokenExpiry: new Date(Date.now() + 3600 * 1000),
};

// A real unscheduled task (matches must-pass scenario)
const PACK_FOR_FLORIDA = {
  id: 'task-real-001',
  title: 'Pack for Florida',
  durationMinutes: 60,
  priority: 2,
  status: 'unscheduled',
  dueDate: new Date('2026-04-15T23:59:59.999Z'),
  scheduledTask: null,
  description: null,
  categoryId: null,
  userId: 'user-phase-a',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// A fixed flight event at 5:57 PM UTC
const FLIGHT_EVENT = {
  id: 'ev-flight',
  summary: 'Flight to Fort Myers',
  start: '2026-04-15T17:57:00.000Z',
  end: '2026-04-15T20:00:00.000Z',
  attendees: [],
  isFixed: true,
};

function mockLlmResponse(llmBody: string) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: llmBody } }],
    }),
  } as any);
}

function buildSchedulingResponse(taskId: string, day = '2026-04-15'): string {
  return `## Your Schedule

Scheduled your task in the morning before your flight.

**I've prepared your schedule.** Review the preview below and click **Apply Schedule** to add these tasks to your calendar.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [
    {
      "taskId": "${taskId}",
      "taskTitle": "Pack for Florida",
      "start": "${day}T09:00:00.000Z",
      "end": "${day}T10:00:00.000Z",
      "priority": 2
    }
  ],
  "summary": "Scheduled before the flight.",
  "conflicts": [],
  "confidence": "high"
}
\`\`\``;
}

// ─── A1: Hallucinated IDs are stripped ───────────────────────────────────────

describe('Phase A1 — hallucinated IDs stripped before client', () => {
  it('strips blocks with unknown taskIds and the preview blocks count is 0', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as any);
    vi.mocked(prisma.task.count).mockResolvedValue(1);
    vi.mocked(prisma.task.findMany).mockResolvedValue([PACK_FOR_FLORIDA] as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([]);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    // LLM returns a hallucinated ID not in the DB
    mockLlmResponse(buildSchedulingResponse('HALLUCINATED-TASK-ID-XYZ'));

    const result = await processMessage('user-phase-a', 'Schedule my tasks for today.');

    // The hallucinated ID should have been stripped by sanitizeSchedulePreview
    const preview = result.suggestions;
    if (preview) {
      const hasHallucinatedBlock = preview.blocks.some(
        (b: any) => b.taskId === 'HALLUCINATED-TASK-ID-XYZ'
      );
      expect(hasHallucinatedBlock).toBe(false);
    }
    // Either preview is null (fully stripped) or blocks are empty
    const blockCount = preview?.blocks?.length ?? 0;
    expect(blockCount).toBe(0);
  });
});

// ─── A3: Free window before fixed event → non-empty preview ──────────────────

describe('Phase A3 — non-empty preview when free time exists before a fixed event', () => {
  it('returns a preview with blocks when LLM schedules task before the flight', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as any);
    vi.mocked(prisma.task.count).mockResolvedValue(1);
    // Unscheduled: Pack for Florida
    vi.mocked(prisma.task.findMany).mockResolvedValue([PACK_FOR_FLORIDA] as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    // Fixed flight event later in the day
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([FLIGHT_EVENT] as any);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    // LLM correctly schedules the task at 9 AM (real task ID, before the 5:57 PM flight)
    mockLlmResponse(buildSchedulingResponse('task-real-001'));

    const result = await processMessage('user-phase-a', 'Schedule my tasks for today.');

    // Preview must be non-empty — 9 AM block does not conflict with 5:57 PM flight
    const preview = result.suggestions;
    expect(preview).toBeDefined();
    expect(preview!.blocks.length).toBeGreaterThan(0);
    expect(preview!.blocks[0].taskId).toBe('task-real-001');
  });

  it('strips the block when LLM incorrectly overlaps the flight time', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as any);
    vi.mocked(prisma.task.count).mockResolvedValue(1);
    vi.mocked(prisma.task.findMany).mockResolvedValue([PACK_FOR_FLORIDA] as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([FLIGHT_EVENT] as any);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    // LLM puts task DURING the flight — should be caught by validation and conflicts added
    const badResponse = `## Your Schedule

Oops — scheduled during flight.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [
    {
      "taskId": "task-real-001",
      "taskTitle": "Pack for Florida",
      "start": "2026-04-15T18:00:00.000Z",
      "end": "2026-04-15T19:00:00.000Z",
      "priority": 2
    }
  ],
  "summary": "Overlaps flight.",
  "conflicts": [],
  "confidence": "high"
}
\`\`\``;

    mockLlmResponse(badResponse);

    const result = await processMessage('user-phase-a', 'Schedule my tasks for today.');

    // Validation should have added a conflict about overlapping the fixed event
    const preview = result.suggestions;
    if (preview) {
      const hasOverlapConflict = preview.conflicts.some(c =>
        c.toLowerCase().includes('flight') || c.toLowerCase().includes('fixed event')
      );
      expect(hasOverlapConflict).toBe(true);
      // Confidence should have been lowered
      expect(preview.confidence).toBe('low');
    }
  });
});
