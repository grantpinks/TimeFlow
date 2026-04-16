/**
 * Phase B — Sprint 25: Flow AI Reliability
 *
 * Golden tests for sanitizeAssistantContent.
 * Each test represents a real adversarial LLM output pattern that must be
 * stripped before the content reaches the client.
 *
 * The function is not exported, so we test it through processMessage via
 * mock LLM responses, OR we extract it for unit testing using a thin wrapper.
 * Here we test via the exported processMessage with controlled fetch mocks so
 * the actual sanitization pipeline runs end-to-end.
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
    conversation: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('../googleCalendarService.js', () => ({ getEvents: vi.fn() }));
vi.mock('../schedulingLinkService.js', () => ({
  getSchedulingLinks: vi.fn().mockResolvedValue([]),
  createSchedulingLink: vi.fn(),
}));

import { processMessage } from '../assistantService.js';
import { prisma } from '../../config/prisma.js';
import * as googleCalendarService from '../googleCalendarService.js';

const BASE_USER = {
  id: 'user-sanitize',
  timeZone: 'UTC',
  wakeTime: '08:00',
  sleepTime: '23:00',
  defaultTaskDurationMinutes: 30,
  dailySchedule: null,
  dailyScheduleConstraints: null,
  defaultCalendarId: 'primary',
  meetingStartTime: null,
  meetingEndTime: null,
  googleAccessToken: 'tok',
  googleAccessTokenExpiry: new Date(Date.now() + 3600_000),
};

function mockLlm(body: string) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ choices: [{ message: { content: body } }] }),
  } as any);
}

async function getAssistantContent(llmOutput: string, message = 'What can you help with?') {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER as any);
  vi.mocked(prisma.task.count).mockResolvedValue(0);
  vi.mocked(prisma.task.findMany).mockResolvedValue([]);
  vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
  vi.mocked(googleCalendarService.getEvents).mockResolvedValue([]);
  vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

  mockLlm(llmOutput);
  const result = await processMessage('user-sanitize', message);
  return result.message.content;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertNoTechnicalLeakage(content: string) {
  // Must not contain raw JSON field names
  expect(content).not.toMatch(/"taskId"\s*:/i);
  expect(content).not.toMatch(/"habitId"\s*:/i);
  expect(content).not.toMatch(/"blocks"\s*:/i);
  expect(content).not.toMatch(/"conflicts"\s*:/i);
  expect(content).not.toMatch(/"confidence"\s*:/i);
  // Must not contain [STRUCTURED_OUTPUT] marker
  expect(content).not.toMatch(/\[STRUCTURED_OUTPUT\]/i);
  // Must not contain raw ISO timestamps
  expect(content).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  // Must not contain opening code fence
  expect(content).not.toMatch(/```/);
}

// ─── B1.1: Standard [STRUCTURED_OUTPUT] at end ───────────────────────────────

describe('Phase B1 — [STRUCTURED_OUTPUT] stripped', () => {
  it('removes [STRUCTURED_OUTPUT] and its JSON payload from the end', async () => {
    const llmOutput = `## Your Schedule

Here is what I planned.

[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [],
  "summary": "No tasks.",
  "conflicts": [],
  "confidence": "high"
}
\`\`\``;

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    expect(content).toContain('Here is what I planned');
  });

  it('removes [STRUCTURED_OUTPUT] even when it appears mid-response', async () => {
    const llmOutput = `Some text before. [STRUCTURED_OUTPUT] {"blocks":[],"confidence":"high"} Some text after.`;
    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    // Text after the marker is also removed (marker signals end of natural language)
    expect(content).toContain('Some text before');
  });
});

// ─── B1.2: Closed fenced code blocks ─────────────────────────────────────────

describe('Phase B1 — closed fenced code blocks stripped', () => {
  it('removes a standard ```json ... ``` block', async () => {
    const llmOutput = `I've planned your day.

\`\`\`json
{
  "taskId": "cm4abc123",
  "start": "2025-12-24T09:00:00.000Z"
}
\`\`\`

Let me know if this works!`;

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    expect(content).toContain("I've planned your day");
    expect(content).toContain('Let me know');
  });

  it('removes a ``` block with no language tag', async () => {
    const llmOutput = `Here you go.
\`\`\`
{ "blocks": [], "conflicts": [] }
\`\`\``;

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
  });
});

// ─── B1.3: Unclosed fenced blocks ────────────────────────────────────────────

describe('Phase B1 — unclosed fenced blocks stripped', () => {
  it('removes an unclosed ```json block (no closing fence)', async () => {
    const llmOutput = `Your tasks are ready.

\`\`\`json
{
  "blocks": [
    { "taskId": "cm4realid", "start": "2025-12-24T09:00:00.000Z" }
  ],`;
    // No closing ``` — LLM was cut off mid-output

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    expect(content).toContain('Your tasks are ready');
  });
});

// ─── B1.4: Inline JSON object leakage ────────────────────────────────────────

describe('Phase B1 — inline JSON objects stripped', () => {
  it('removes inline JSON containing taskId', async () => {
    const llmOutput = `I scheduled your task {"taskId":"cm4xyz","start":"2025-12-24T09:00:00.000Z"} for tomorrow.`;
    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
  });

  it('removes inline JSON containing habitId', async () => {
    const llmOutput = `Your habit block is ready: {"habitId":"habit_abc","title":"Morning Run"}`;
    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
  });
});

// ─── B1.5: ISO timestamp leakage ─────────────────────────────────────────────

describe('Phase B1 — ISO 8601 timestamps stripped', () => {
  it('removes ISO timestamps from prose', async () => {
    const llmOutput = `I will schedule your task at 2025-12-24T09:00:00.000Z in the morning.`;
    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    // The surrounding text should survive
    expect(content).toContain('I will schedule your task at');
    expect(content).toContain('in the morning');
  });

  it('removes multiple ISO timestamps', async () => {
    const llmOutput = `From 2025-12-24T09:00:00.000Z to 2025-12-24T10:00:00.000Z your calendar is free.`;
    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
  });
});

// ─── B1.6: CUID / UUID leakage ───────────────────────────────────────────────

describe('Phase B1 — CUID and UUID patterns stripped', () => {
  it('removes a CUID from prose', async () => {
    // CUIDs start with "cm" + 20-30 alphanumeric chars
    const llmOutput = `Your task cm4nqfxyz000aabc12345678 has been placed at 9 AM.`;
    const content = await getAssistantContent(llmOutput);
    expect(content).not.toMatch(/cm[a-z0-9]{20,}/i);
    expect(content).toContain('has been placed at 9 AM');
  });

  it('removes a UUID v4 from prose', async () => {
    const llmOutput = `Task 550e8400-e29b-41d4-a716-446655440000 is scheduled.`;
    const content = await getAssistantContent(llmOutput);
    expect(content).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/i);
    expect(content).toContain('is scheduled');
  });
});

// ─── B1.7: Technical field names in prose lines ───────────────────────────────

describe('Phase B1 — lines with technical field names stripped', () => {
  it('drops a line containing taskId: even outside JSON', async () => {
    const llmOutput = `I found your tasks.
taskId: cm4abc123
Your schedule is ready.`;

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    expect(content).toContain('I found your tasks');
    expect(content).toContain('Your schedule is ready');
  });

  it('drops a line containing "blocks": []', async () => {
    const llmOutput = `Here is the plan.
"blocks": []
Apply when ready.`;

    const content = await getAssistantContent(llmOutput);
    assertNoTechnicalLeakage(content);
    expect(content).toContain('Here is the plan');
    expect(content).toContain('Apply when ready');
  });
});

// ─── B1.8: Scheduling mode empty-content fallback ────────────────────────────

describe('Phase B1 — empty-content fallback messages', () => {
  it('returns a helpful fallback when the entire LLM response was technical', async () => {
    // A response that is entirely JSON with no natural language
    const llmOutput = `[STRUCTURED_OUTPUT]
\`\`\`json
{"blocks":[],"summary":"","conflicts":[],"confidence":"high"}
\`\`\``;

    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER as any);
    vi.mocked(prisma.task.count).mockResolvedValue(1);
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        id: 'task-001', title: 'Test Task', durationMinutes: 30,
        priority: 2, status: 'unscheduled', dueDate: null,
        scheduledTask: null, description: null, categoryId: null,
        userId: 'user-sanitize', createdAt: new Date(), updatedAt: new Date(),
      },
    ] as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(googleCalendarService.getEvents).mockResolvedValue([]);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    // Mock the LLM — first call returns all-JSON, no natural language portion
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: llmOutput } }] }),
    } as any);

    const result = await processMessage('user-sanitize', 'Schedule my tasks.');
    const content = result.message.content;

    // Content must not be empty or contain raw technical output
    expect(content.length).toBeGreaterThan(0);
    assertNoTechnicalLeakage(content);
  });
});

// ─── B1.9: Clean scheduling response passes through unchanged ─────────────────

describe('Phase B1 — clean responses pass through intact', () => {
  it('does not modify a clean conversational response', async () => {
    // Test the sanitizer in conversation mode — no retry loop, single LLM call.
    const llmOutput = `## Your Schedule for Today

I've planned **2 tasks** around your morning.

**Morning Block** (9:00 AM - 11:00 AM):
- **Pack for Florida** — 9:00 AM - 10:00 AM (HIGH priority)

Review the preview below and click **Apply Schedule** to add these tasks to your calendar.`;

    // Use a conversational query so mode detection stays in "conversation"
    const content = await getAssistantContent(llmOutput, 'What did you prepare for me?');
    // Should preserve the original content
    expect(content).toContain('Your Schedule for Today');
    expect(content).toContain('Pack for Florida');
    expect(content).toContain('Apply Schedule');
    // And must still be clean
    assertNoTechnicalLeakage(content);
  });

  it('does not strip friendly time ranges (only ISO timestamps are removed)', async () => {
    // Use a conversational prompt that won't be re-routed to availability mode
    const llmOutput = `You have a free window from 9:00 AM to 11:30 AM. That's a great time for focused work!`;
    const content = await getAssistantContent(llmOutput, 'Tell me about my productivity habits.');
    expect(content).toContain('9:00 AM');
    expect(content).toContain('11:30 AM');
    assertNoTechnicalLeakage(content);
  });
});
