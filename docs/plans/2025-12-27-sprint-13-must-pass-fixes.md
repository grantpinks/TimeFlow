# Sprint 13 Must-Pass QA Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Sprint 13 must-pass QA issues (empty schedule preview, invalid IDs, history persistence) and document the QA rerun using a gpt-4o override while keeping gpt-4o-mini as the default model.

**Architecture:** Add server-side schedule preview sanitization and date-only due-date normalization, tighten scheduling prompt constraints, and make `/api/assistant/history` return persisted conversation messages. Keep default model unchanged; use an environment override for QA rerun.

**Tech Stack:** Fastify, Prisma, Vitest, Luxon, Next.js, shared types.

---

### Task 1: Normalize date-only due dates for scheduling + prompt context

**Files:**
- Create: `timeflow/apps/backend/src/utils/dateUtils.ts`
- Create: `timeflow/apps/backend/src/utils/__tests__/dateUtils.test.ts`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/scheduleService.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { normalizeDateOnlyToEndOfDay } from '../dateUtils.js';

describe('normalizeDateOnlyToEndOfDay', () => {
  it('converts UTC-midnight date-only to end-of-day in user timezone', () => {
    const tz = 'America/Chicago';
    const input = new Date('2025-12-26T00:00:00.000Z');

    const normalized = normalizeDateOnlyToEndOfDay(input, tz);
    const local = DateTime.fromJSDate(normalized, { zone: tz });

    expect(local.toISODate()).toBe('2025-12-26');
    expect(local.hour).toBe(23);
    expect(local.minute).toBe(59);
    expect(local.second).toBe(59);
  });

  it('keeps non-midnight timestamps unchanged', () => {
    const tz = 'America/Chicago';
    const input = new Date('2025-12-26T15:30:00.000Z');

    const normalized = normalizeDateOnlyToEndOfDay(input, tz);
    expect(normalized.toISOString()).toBe(input.toISOString());
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/backend test -- src/utils/__tests__/dateUtils.test.ts`
Expected: FAIL with "Cannot find module '../dateUtils.js'" (or missing export)

**Step 3: Write minimal implementation**

```ts
import { DateTime } from 'luxon';

export function normalizeDateOnlyToEndOfDay(date: Date, timeZone: string): Date {
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (!isUtcMidnight) {
    return date;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const endOfDay = DateTime.fromObject(
    { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    { zone: timeZone }
  ).toUTC();

  return endOfDay.toJSDate();
}
```

**Step 4: Wire helper into assistant context**

- In `assistantService.ts`, use the normalized due date for `dueInfo` and `urgent` checks.

```ts
const effectiveDueDate = task.dueDate
  ? normalizeDateOnlyToEndOfDay(task.dueDate, user.timeZone)
  : null;

const dueInfo = effectiveDueDate
  ? `due: ${effectiveDueDate.toLocaleString('en-US', { ... })}`
  : 'no due date';

const urgent = effectiveDueDate && effectiveDueDate.getTime() < now.getTime() + 24 * 60 * 60 * 1000
  ? ' URGENT'
  : '';
```

**Step 5: Wire helper into scheduling inputs**

- In `scheduleService.ts`, normalize before `scheduleTasks` input:

```ts
const normalizedDueDate = t.dueDate
  ? normalizeDateOnlyToEndOfDay(t.dueDate, user.timeZone || 'UTC')
  : null;

const taskInputs: TaskInput[] = tasks.map((t) => ({
  id: t.id,
  durationMinutes: t.durationMinutes,
  priority: t.priority as 1 | 2 | 3,
  dueDate: normalizedDueDate?.toISOString(),
}));
```

**Step 6: Run tests to verify they pass**

Run: `pnpm -C timeflow/apps/backend test -- src/utils/__tests__/dateUtils.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add timeflow/apps/backend/src/utils/dateUtils.ts \
  timeflow/apps/backend/src/utils/__tests__/dateUtils.test.ts \
  timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/services/scheduleService.ts

git commit -m "fix: normalize date-only due dates for scheduling"
```

---

### Task 2: Sanitize schedule previews + tighten scheduling prompt

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`
- Modify: `timeflow/apps/backend/src/prompts/scheduling.txt`

**Step 1: Write the failing test**

```ts
describe('sanitizeSchedulePreview', () => {
  it('drops blocks with unknown taskId and records conflicts', () => {
    const preview: SchedulePreview = {
      blocks: [
        { taskId: 'task-valid', start: '2025-01-01T08:00:00.000Z', end: '2025-01-01T09:00:00.000Z' },
        { taskId: 'task-unknown', start: '2025-01-01T10:00:00.000Z', end: '2025-01-01T11:00:00.000Z' },
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const sanitized = sanitizeSchedulePreview(preview, ['task-valid'], []);
    expect(sanitized.blocks).toHaveLength(1);
    expect(sanitized.blocks[0].taskId).toBe('task-valid');
    expect(sanitized.conflicts.some((msg) => msg.includes('unknown taskId'))).toBe(true);
  });

  it('returns empty blocks with a warning when all blocks are invalid', () => {
    const preview: SchedulePreview = {
      blocks: [
        { taskId: 'task-unknown', start: '2025-01-01T10:00:00.000Z', end: '2025-01-01T11:00:00.000Z' },
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const sanitized = sanitizeSchedulePreview(preview, [], []);
    expect(sanitized.blocks).toHaveLength(0);
    expect(sanitized.conflicts.some((msg) => msg.includes('No valid blocks'))).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/backend test -- src/services/__tests__/assistantService.test.ts`
Expected: FAIL with "sanitizeSchedulePreview is not defined"

**Step 3: Implement helper + wire into processMessage**

- Add helper in `assistantService.ts` and export in `__test__`.

```ts
function sanitizeSchedulePreview(
  preview: SchedulePreview,
  validTaskIds: string[],
  validHabitIds: string[]
): SchedulePreview {
  const conflicts = [...preview.conflicts];
  const blocks = preview.blocks.filter((block) => {
    if (block.taskId) {
      if (!validTaskIds.includes(block.taskId)) {
        conflicts.push(`Dropped block with unknown taskId: ${block.taskId}`);
        return false;
      }
      return true;
    }
    if (block.habitId) {
      if (!validHabitIds.includes(block.habitId)) {
        conflicts.push(`Dropped block with unknown habitId: ${block.habitId}`);
        return false;
      }
      return true;
    }
    conflicts.push('Dropped block missing taskId/habitId');
    return false;
  });

  if (preview.blocks.length > 0 && blocks.length === 0) {
    conflicts.push('No valid blocks remain after sanitization.');
  }

  return {
    ...preview,
    blocks,
    conflicts,
    confidence: conflicts.length > 0 && preview.confidence === 'high' ? 'medium' : preview.confidence,
  };
}
```

- Update `buildContextPrompt` to also return `habitIds` and call sanitization after `parseResponse` and before validation.

**Step 4: Tighten scheduling prompt rules**

Add to `scheduling.txt`:
- Explicit rule to ONLY use taskId/habitId from the context lists.
- Explicit rule that fixed events only block their time windows and tasks should be scheduled before/after on the same day when possible.

**Step 5: Run tests to verify they pass**

Run: `pnpm -C timeflow/apps/backend test -- src/services/__tests__/assistantService.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/services/__tests__/assistantService.test.ts \
  timeflow/apps/backend/src/prompts/scheduling.txt

git commit -m "fix: sanitize assistant schedule previews"
```

---

### Task 3: Implement assistant history retrieval

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/assistantController.ts`
- Modify: `timeflow/apps/backend/src/services/conversationService.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/conversationService.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { getLatestConversationHistory } from '../conversationService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
    },
  },
}));

describe('getLatestConversationHistory', () => {
  it('returns empty array when no conversation exists', async () => {
    const { prisma } = await import('../../config/prisma.js');
    prisma.conversation.findFirst.mockResolvedValue(null);

    const result = await getLatestConversationHistory('user-1');
    expect(result).toEqual([]);
  });

  it('returns messages ordered oldest to newest', async () => {
    const { prisma } = await import('../../config/prisma.js');
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: new Date('2025-01-01T00:00:00.000Z'), metadata: null },
        { id: 'm2', role: 'assistant', content: 'Hello', createdAt: new Date('2025-01-01T00:01:00.000Z'), metadata: null },
      ],
    });

    const result = await getLatestConversationHistory('user-1');
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Hi');
    expect(result[1].content).toBe('Hello');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/backend test -- src/services/__tests__/conversationService.test.ts`
Expected: FAIL with "getLatestConversationHistory is not exported"

**Step 3: Implement service + controller integration**

- In `conversationService.ts`:

```ts
export async function getLatestConversationHistory(userId: string): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation) {
    return [];
  }

  return convertToChatMessages(conversation.messages);
}
```

- In `assistantController.ts`:

```ts
export async function getHistory(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const messages = await conversationService.getLatestConversationHistory(user.id);
  return reply.status(200).send({ messages });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm -C timeflow/apps/backend test -- src/services/__tests__/conversationService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/assistantController.ts \
  timeflow/apps/backend/src/services/conversationService.ts \
  timeflow/apps/backend/src/services/__tests__/conversationService.test.ts

git commit -m "fix: return persisted assistant history"
```

---

### Task 4: Re-run must-pass QA with model override + update docs

**Files:**
- Modify: `timeflow/docs/SPRINT_13_MUST_PASS_RUN.md`

**Step 1: Re-run must-pass flow with model override**

- Keep `OPENAI_MODEL=gpt-4o-mini` as default in `timeflow/apps/backend/.env`.
- Temporarily override for QA run:
  - PowerShell example: `$env:OPENAI_MODEL='gpt-4o'; pnpm -C timeflow/apps/backend dev`
- Run the must-pass flow:
  - Ask -> Schedule -> Preview -> Apply
  - Verify preview blocks > 0
  - Verify no invalid task IDs/habit IDs in preview
  - Verify `/api/assistant/history` returns messages

**Step 2: Update QA run doc**

- Record model used (override) and results.
- Add any remaining failures with exact error messages.

**Step 3: Commit**

```bash
git add timeflow/docs/SPRINT_13_MUST_PASS_RUN.md

git commit -m "docs: update sprint 13 must-pass QA run"
```

---

## Execution Notes

- User requested to work on main branch (no worktree), so skip worktree setup.
- Default model remains `gpt-4o-mini`; only QA uses an env override.
- If any tests fail due to environment, document the failure and proceed with manual verification steps.

---

Plan complete and saved to `docs/plans/2025-12-27-sprint-13-must-pass-fixes.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
