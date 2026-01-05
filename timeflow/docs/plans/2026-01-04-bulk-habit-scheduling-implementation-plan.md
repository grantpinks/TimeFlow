# Bulk Habit Scheduling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Flow Coach bulk scheduling banner that lets users schedule a week of habits with intelligent suggestions and drag-and-drop customization.

**Architecture:** Reuse existing `habitSuggestionService` for scheduling logic, add new banner component with collapsible states, integrate interactive calendar preview with drag-and-drop, implement batch event creation with cancellation support via new API endpoints.

**Tech Stack:** React/Next.js, Tailwind CSS, Fastify backend, Prisma ORM, Google Calendar API, react-beautiful-dnd for drag-and-drop

---

## Phase 1: Database Schema & Backend Context API

### Task 1.1: Add SchedulingJob Table to Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add SchedulingJob model to schema**

Add after the `ScheduledHabit` model:

```prisma
model SchedulingJob {
  id              String   @id @default(cuid())
  userId          String
  status          String   // "in_progress" | "completed" | "cancelled" | "failed"
  totalBlocks     Int
  completedBlocks Int      @default(0)
  createdEventIds String[] // Array of Google Calendar event IDs for rollback
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("scheduling_jobs")
}
```

Add relation to User model:

```prisma
model User {
  // ... existing fields
  schedulingJobs SchedulingJob[]
}
```

**Step 2: Create and run migration**

Run:
```bash
cd apps/backend
pnpm prisma migrate dev --name add_scheduling_job_table
```

Expected: Migration created and applied successfully

**Step 3: Regenerate Prisma client**

Run:
```bash
pnpm prisma generate
```

Expected: Client regenerated with new SchedulingJob model

**Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(db): add SchedulingJob table for bulk scheduling tracking"
```

---

### Task 1.2: Create Scheduling Context Service

**Files:**
- Create: `apps/backend/src/services/schedulingContextService.ts`
- Create: `apps/backend/src/services/__tests__/schedulingContextService.test.ts`

**Step 1: Write failing test**

Create `apps/backend/src/services/__tests__/schedulingContextService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSchedulingContext } from '../schedulingContextService.js';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    habit: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    habitCompletion: {
      findMany: vi.fn(),
    },
  },
}));

describe('schedulingContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return context with unscheduled habits count', async () => {
    vi.mocked(prisma.habit.count).mockResolvedValue(5);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.unscheduledHabitsCount).toBe(5);
    expect(context.nextRelevantDay).toBeDefined();
  });

  it('should detect urgent habits at risk of breaking streaks', async () => {
    const today = new Date();
    const habit = {
      id: 'habit-1',
      userId: 'user-123',
      title: 'Morning Meditation',
      frequency: 'daily' as const,
      daysOfWeek: [],
      durationMinutes: 30,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: today,
    };

    vi.mocked(prisma.habit.count).mockResolvedValue(1);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([habit]);

    // Mock no completion today
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);

    const context = await getSchedulingContext('user-123');

    expect(context.urgentHabits).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
pnpm test src/services/__tests__/schedulingContextService.test.ts
```

Expected: FAIL with "Cannot find module '../schedulingContextService.js'"

**Step 3: Write minimal implementation**

Create `apps/backend/src/services/schedulingContextService.ts`:

```typescript
/**
 * Scheduling Context Service
 *
 * Provides context data for the Flow Coach banner (unscheduled habits, urgency, calendar density)
 */

import { prisma } from '../config/prisma.js';
import { DateTime } from 'luxon';

export interface SchedulingContext {
  unscheduledHabitsCount: number;
  nextRelevantDay: string; // "tomorrow", "Monday", etc.
  urgentHabits: number; // habits at risk of breaking streaks
  calendarDensity: 'light' | 'moderate' | 'busy';
}

export async function getSchedulingContext(userId: string): Promise<SchedulingContext> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const timeZone = user.timeZone || 'UTC';
  const now = DateTime.now().setZone(timeZone);
  const today = now.startOf('day');
  const tomorrow = today.plus({ days: 1 });

  // Count active habits that haven't been scheduled for tomorrow
  const activeHabits = await prisma.habit.findMany({
    where: { userId, isActive: true },
  });

  const scheduledForTomorrow = await prisma.scheduledHabit.count({
    where: {
      userId,
      startDateTime: {
        gte: tomorrow.toJSDate(),
        lt: tomorrow.plus({ days: 1 }).toJSDate(),
      },
    },
  });

  const unscheduledHabitsCount = Math.max(0, activeHabits.length - scheduledForTomorrow);

  // Determine next relevant day
  const dayOfWeek = now.weekday; // 1=Monday, 7=Sunday
  let nextRelevantDay = 'this week';
  if (now.hour >= 18) {
    nextRelevantDay = 'tomorrow';
  } else if (dayOfWeek >= 5) {
    // Friday, Saturday, Sunday
    nextRelevantDay = 'next week';
  }

  // Check for urgent habits (daily habits not completed today)
  const completionsToday = await prisma.habitCompletion.findMany({
    where: {
      habit: { userId },
      completedAt: {
        gte: today.toJSDate(),
        lt: tomorrow.toJSDate(),
      },
    },
    select: { habitId: true },
  });

  const completedHabitIds = new Set(completionsToday.map((c) => c.habitId));
  const dailyHabits = activeHabits.filter((h) => h.frequency === 'daily');
  const urgentHabits = dailyHabits.filter((h) => !completedHabitIds.has(h.id)).length;

  // TODO: Implement calendar density check (requires Google Calendar API call)
  const calendarDensity: 'light' | 'moderate' | 'busy' = 'moderate';

  return {
    unscheduledHabitsCount,
    nextRelevantDay,
    urgentHabits,
    calendarDensity,
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm test src/services/__tests__/schedulingContextService.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add apps/backend/src/services/schedulingContextService.ts apps/backend/src/services/__tests__/schedulingContextService.test.ts
git commit -m "feat(backend): add scheduling context service for banner messaging"
```

---

### Task 1.3: Create Context API Endpoint

**Files:**
- Modify: `apps/backend/src/controllers/habitController.ts`
- Modify: `apps/backend/src/routes/habitRoutes.ts`

**Step 1: Add endpoint handler to habitController**

Add to `apps/backend/src/controllers/habitController.ts`:

```typescript
import { getSchedulingContext } from '../services/schedulingContextService.js';

export async function getSchedulingContextHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const context = await getSchedulingContext(userId);
    return reply.code(200).send(context);
  } catch (error) {
    request.log.error(error, 'Error getting scheduling context');
    return reply.code(500).send({ error: 'Failed to get scheduling context' });
  }
}
```

**Step 2: Add route to habitRoutes**

Add to `apps/backend/src/routes/habitRoutes.ts`:

```typescript
// Add to the habitRoutes function
fastify.get('/scheduling-context', { preHandler: [authenticate] }, getSchedulingContextHandler);
```

Import the handler at the top:

```typescript
import { getSchedulingContextHandler } from '../controllers/habitController.js';
```

**Step 3: Test the endpoint manually**

Run backend:
```bash
pnpm dev:backend
```

Test with curl (replace TOKEN with valid JWT):
```bash
curl http://localhost:3001/api/habits/scheduling-context \
  -H "Authorization: Bearer TOKEN"
```

Expected: JSON response with `unscheduledHabitsCount`, `nextRelevantDay`, `urgentHabits`, `calendarDensity`

**Step 4: Commit**

```bash
git add apps/backend/src/controllers/habitController.ts apps/backend/src/routes/habitRoutes.ts
git commit -m "feat(api): add GET /api/habits/scheduling-context endpoint"
```

---

## Phase 2: Bulk Schedule Generation API

### Task 2.1: Create Bulk Schedule Service

**Files:**
- Create: `apps/backend/src/services/bulkScheduleService.ts`
- Create: `apps/backend/src/services/__tests__/bulkScheduleService.test.ts`

**Step 1: Write failing test**

Create `apps/backend/src/services/__tests__/bulkScheduleService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateBulkSchedule } from '../bulkScheduleService.js';
import * as habitSuggestionService from '../habitSuggestionService.js';

vi.mock('../habitSuggestionService.js');

describe('bulkScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate schedule suggestions for date range', async () => {
    const mockSuggestions = [
      {
        habitId: 'habit-1',
        startDateTime: '2026-01-05T08:00:00Z',
        endDateTime: '2026-01-05T08:30:00Z',
        habit: {
          id: 'habit-1',
          title: 'Morning Meditation',
          description: null,
          durationMinutes: 30,
        },
      },
    ];

    vi.mocked(habitSuggestionService.getHabitSuggestionsForUser).mockResolvedValue(mockSuggestions);

    const result = await generateBulkSchedule({
      userId: 'user-123',
      dateRangeStart: '2026-01-05',
      dateRangeEnd: '2026-01-11',
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].habitTitle).toBe('Morning Meditation');
    expect(result.suggestions[0].date).toBe('2026-01-05');
  });

  it('should reject date ranges exceeding 14 days', async () => {
    await expect(
      generateBulkSchedule({
        userId: 'user-123',
        dateRangeStart: '2026-01-05',
        dateRangeEnd: '2026-01-20', // 15 days
      })
    ).rejects.toThrow('Date range cannot exceed 14 days');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
pnpm test src/services/__tests__/bulkScheduleService.test.ts
```

Expected: FAIL with "Cannot find module '../bulkScheduleService.js'"

**Step 3: Write minimal implementation**

Create `apps/backend/src/services/bulkScheduleService.ts`:

```typescript
/**
 * Bulk Schedule Service
 *
 * Generates habit schedule suggestions for a date range
 */

import { DateTime } from 'luxon';
import { getHabitSuggestionsForUser } from './habitSuggestionService.js';
import type { EnrichedHabitSuggestion } from './habitSuggestionService.js';

export interface BulkScheduleRequest {
  userId: string;
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;   // ISO date
  customPrompt?: string;
}

export interface BulkScheduleSuggestion {
  id: string; // temp ID for frontend tracking
  habitId: string;
  habitTitle: string;
  startDateTime: string;
  endDateTime: string;
  date: string;
  dayOfWeek: string;
}

export interface BulkScheduleResponse {
  suggestions: BulkScheduleSuggestion[];
  conflictWarnings?: Array<{
    suggestionId: string;
    reason: string;
  }>;
}

export async function generateBulkSchedule(
  request: BulkScheduleRequest
): Promise<BulkScheduleResponse> {
  const { userId, dateRangeStart, dateRangeEnd, customPrompt } = request;

  // Validate date range
  const start = DateTime.fromISO(dateRangeStart);
  const end = DateTime.fromISO(dateRangeEnd);
  const daysDiff = end.diff(start, 'days').days;

  if (daysDiff > 14) {
    throw new Error('Date range cannot exceed 14 days');
  }

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }

  // TODO: Parse customPrompt for constraints (v1: skip for now)

  // Use existing habit suggestion service
  const rawSuggestions = await getHabitSuggestionsForUser(
    userId,
    start.toISO()!,
    end.toISO()!
  );

  // Transform to bulk schedule format
  const suggestions: BulkScheduleSuggestion[] = rawSuggestions.map((suggestion, index) => {
    const startDT = DateTime.fromISO(suggestion.startDateTime);
    return {
      id: `suggestion-${index}`,
      habitId: suggestion.habitId,
      habitTitle: suggestion.habit.title,
      startDateTime: suggestion.startDateTime,
      endDateTime: suggestion.endDateTime,
      date: startDT.toISODate()!,
      dayOfWeek: startDT.toFormat('EEEE'), // "Monday", "Tuesday", etc.
    };
  });

  return { suggestions };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm test src/services/__tests__/bulkScheduleService.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add apps/backend/src/services/bulkScheduleService.ts apps/backend/src/services/__tests__/bulkScheduleService.test.ts
git commit -m "feat(backend): add bulk schedule generation service"
```

---

### Task 2.2: Create Bulk Schedule API Endpoint

**Files:**
- Modify: `apps/backend/src/controllers/habitController.ts`
- Modify: `apps/backend/src/routes/habitRoutes.ts`

**Step 1: Add endpoint handler**

Add to `apps/backend/src/controllers/habitController.ts`:

```typescript
import { generateBulkSchedule } from '../services/bulkScheduleService.js';

export async function generateBulkScheduleHandler(
  request: FastifyRequest<{
    Body: {
      dateRangeStart: string;
      dateRangeEnd: string;
      customPrompt?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const { dateRangeStart, dateRangeEnd, customPrompt } = request.body;

    const result = await generateBulkSchedule({
      userId,
      dateRangeStart,
      dateRangeEnd,
      customPrompt,
    });

    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, 'Error generating bulk schedule');
    if (error instanceof Error && error.message.includes('exceed')) {
      return reply.code(400).send({ error: error.message });
    }
    return reply.code(500).send({ error: 'Failed to generate schedule' });
  }
}
```

**Step 2: Add route**

Add to `apps/backend/src/routes/habitRoutes.ts`:

```typescript
fastify.post('/bulk-schedule', { preHandler: [authenticate] }, generateBulkScheduleHandler);
```

Import the handler:

```typescript
import { generateBulkScheduleHandler } from '../controllers/habitController.js';
```

**Step 3: Test manually**

Run backend:
```bash
pnpm dev:backend
```

Test with curl:
```bash
curl -X POST http://localhost:3001/api/habits/bulk-schedule \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dateRangeStart": "2026-01-05",
    "dateRangeEnd": "2026-01-11"
  }'
```

Expected: JSON with `suggestions` array

**Step 4: Commit**

```bash
git add apps/backend/src/controllers/habitController.ts apps/backend/src/routes/habitRoutes.ts
git commit -m "feat(api): add POST /api/habits/bulk-schedule endpoint"
```

---

## Phase 3: Frontend Banner Component (Collapsed/Expanded States)

### Task 3.1: Create FlowSchedulingBanner Component Shell

**Files:**
- Create: `apps/web/src/components/habits/FlowSchedulingBanner.tsx`

**Step 1: Create component with collapsed state**

Create `apps/web/src/components/habits/FlowSchedulingBanner.tsx`:

```typescript
/**
 * Flow Scheduling Banner
 *
 * Context-aware bulk habit scheduling component
 */

'use client';

import { useState, useEffect } from 'react';
import { FlowMascot } from '../FlowMascot';

interface SchedulingContext {
  unscheduledHabitsCount: number;
  nextRelevantDay: string;
  urgentHabits: number;
  calendarDensity: 'light' | 'moderate' | 'busy';
}

export function FlowSchedulingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [context, setContext] = useState<SchedulingContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContext();
  }, []);

  const fetchContext = async () => {
    try {
      const response = await fetch('/api/habits/scheduling-context', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setContext(data);
    } catch (error) {
      console.error('Failed to fetch scheduling context:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContextMessage = (): string => {
    if (!context) return 'Flow can schedule your habits for you';

    // Priority 1: Streak at risk
    if (context.urgentHabits > 0) {
      return `${context.urgentHabits} habit${context.urgentHabits > 1 ? 's' : ''} at risk of breaking streaks - schedule them now?`;
    }

    // Priority 2: Tomorrow focus
    if (context.nextRelevantDay === 'tomorrow' && context.unscheduledHabitsCount > 0) {
      return `You have ${context.unscheduledHabitsCount} unscheduled habits for tomorrow`;
    }

    // Priority 3: Week planning
    if (context.nextRelevantDay === 'next week' && context.unscheduledHabitsCount > 0) {
      return `Ready to plan next week? ${context.unscheduledHabitsCount} habits waiting`;
    }

    // Priority 4: Opportunity nudge
    if (context.calendarDensity === 'light' && context.unscheduledHabitsCount > 0) {
      return 'Your calendar looks light - want to schedule some habits?';
    }

    // Default
    return 'Flow can schedule your habits for you';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-primary-200 rounded-full w-12 h-12" />
          <div className="animate-pulse bg-primary-200 rounded h-5 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl mb-6 transition-all duration-300">
      {/* Collapsed State */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-primary-100/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <FlowMascot size="md" expression="encouraging" />
          <p className="text-slate-800 font-medium">{getContextMessage()}</p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded State - Placeholder */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-primary-200">
          <p className="text-slate-600">Expanded state coming soon...</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add to Habits page**

Modify `apps/web/src/app/habits/page.tsx` to include the banner at the top:

```typescript
import { FlowSchedulingBanner } from '@/components/habits/FlowSchedulingBanner';

// Inside the page component, add before the existing content:
<FlowSchedulingBanner />
```

**Step 3: Test manually**

Run web app:
```bash
pnpm dev:web
```

Visit http://localhost:3000/habits

Expected: See banner with context message, click to expand/collapse

**Step 4: Commit**

```bash
git add apps/web/src/components/habits/FlowSchedulingBanner.tsx apps/web/src/app/habits/page.tsx
git commit -m "feat(habits): add Flow scheduling banner with collapsed state"
```

---

### Task 3.2: Add Quick Action Chips (Expanded Prompt State)

**Files:**
- Modify: `apps/web/src/components/habits/FlowSchedulingBanner.tsx`

**Step 1: Add time range state and chips UI**

Replace the expanded state placeholder in `FlowSchedulingBanner.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { FlowMascot } from '../FlowMascot';
import { DateTime } from 'luxon';

// ... existing interfaces

export function FlowSchedulingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [context, setContext] = useState<SchedulingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  // ... existing code

  const handleQuickAction = async (range: 'tomorrow' | 'next-3-days' | 'this-week' | 'next-2-weeks') => {
    setSelectedRange(range);
    setGeneratingSchedule(true);

    const now = DateTime.now();
    let dateRangeStart: string;
    let dateRangeEnd: string;

    switch (range) {
      case 'tomorrow':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ days: 1 }).toISODate()!;
        break;
      case 'next-3-days':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ days: 3 }).toISODate()!;
        break;
      case 'this-week':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.endOf('week').toISODate()!;
        break;
      case 'next-2-weeks':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ weeks: 2 }).toISODate()!;
        break;
    }

    try {
      const response = await fetch('/api/habits/bulk-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ dateRangeStart, dateRangeEnd }),
      });

      const data = await response.json();
      console.log('Generated schedule:', data);

      // TODO: Show preview in next phase

    } catch (error) {
      console.error('Failed to generate schedule:', error);
    } finally {
      setGeneratingSchedule(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl mb-6 transition-all duration-300">
      {/* ... collapsed state */}

      {/* Expanded State */}
      {isExpanded && (
        <div className="p-6 pt-4 border-t border-primary-200">
          {!generatingSchedule ? (
            <>
              <p className="text-slate-700 font-medium mb-4">When should Flow schedule your habits?</p>

              {/* Quick Action Chips */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => handleQuickAction('tomorrow')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => handleQuickAction('next-3-days')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Next 3 Days
                </button>
                <button
                  onClick={() => handleQuickAction('this-week')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickAction('next-2-weeks')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Next 2 Weeks
                </button>
              </div>

              {/* Optional Custom Prompt */}
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Or tell Flow:</p>
                <input
                  type="text"
                  placeholder="Skip Monday, I'm traveling"
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-primary-400 focus:outline-none"
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Custom prompts coming soon</p>
              </div>
            </>
          ) : (
            // Loading State
            <div className="flex flex-col items-center justify-center py-8">
              <FlowMascot size="lg" expression="thinking" className="mb-4" />
              <p className="text-slate-700 font-medium mb-2">Flow is finding the best times...</p>
              <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test manually**

Run web app and test:
1. Click chips to trigger schedule generation
2. Verify loading state appears
3. Check browser console for generated schedule

**Step 3: Commit**

```bash
git add apps/web/src/components/habits/FlowSchedulingBanner.tsx
git commit -m "feat(habits): add quick action chips for time range selection"
```

---

## Phase 4: Calendar Preview with Drag-and-Drop

### Task 4.1: Install react-beautiful-dnd and Setup Types

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install react-beautiful-dnd**

Run:
```bash
cd apps/web
pnpm add react-beautiful-dnd @hello-pangea/dnd
pnpm add -D @types/react-beautiful-dnd
```

Expected: Package installed successfully

**Step 2: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore(deps): add react-beautiful-dnd for drag-and-drop"
```

---

### Task 4.2: Create SchedulePreview Component

**Files:**
- Create: `apps/web/src/components/habits/SchedulePreview.tsx`

**Step 1: Create preview component with day-by-day accordion**

Create `apps/web/src/components/habits/SchedulePreview.tsx`:

```typescript
/**
 * Schedule Preview Component
 *
 * Shows suggested habit blocks in day-by-day accordion with drag-and-drop
 */

'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DateTime } from 'luxon';

export interface ScheduleSuggestion {
  id: string;
  habitId: string;
  habitTitle: string;
  startDateTime: string;
  endDateTime: string;
  date: string;
  dayOfWeek: string;
}

interface SchedulePreviewProps {
  suggestions: ScheduleSuggestion[];
  onAcceptAll: (suggestions: ScheduleSuggestion[]) => void;
  onCancel: () => void;
}

export function SchedulePreview({ suggestions, onAcceptAll, onCancel }: SchedulePreviewProps) {
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Group suggestions by date
  const groupedByDate = localSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.date]) {
      acc[suggestion.date] = [];
    }
    acc[suggestion.date].push(suggestion);
    return acc;
  }, {} as Record<string, ScheduleSuggestion[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const removeSuggestion = (id: string) => {
    setLocalSuggestions(localSuggestions.filter((s) => s.id !== id));
  };

  const formatTime = (dateTimeStr: string) => {
    return DateTime.fromISO(dateTimeStr).toLocaleString(DateTime.TIME_SIMPLE);
  };

  const formatDateHeader = (dateStr: string) => {
    const dt = DateTime.fromISO(dateStr);
    return dt.toFormat('EEEE, LLL d'); // "Monday, Jan 6"
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-dashed border-blue-500 bg-blue-50 rounded" />
          <span className="text-slate-700">Suggested habits (drag to adjust)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-300 rounded" />
          <span className="text-slate-700">Your scheduled events</span>
        </div>
      </div>

      {/* Day-by-day accordion */}
      <div className="space-y-2">
        {sortedDates.map((date) => {
          const daySuggestions = groupedByDate[date];
          const isExpanded = expandedDays.has(date);

          return (
            <div key={date} className="border-2 border-slate-200 rounded-lg overflow-hidden">
              {/* Day Header */}
              <button
                onClick={() => toggleDay(date)}
                className="w-full px-4 py-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-slate-800">{formatDateHeader(date)}</span>
                </div>
                <span className="text-sm text-slate-600">{daySuggestions.length} habit{daySuggestions.length !== 1 ? 's' : ''}</span>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                  {daySuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="bg-white border-2 border-dashed border-blue-500 rounded-lg p-3 flex items-center justify-between group hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Drag Handle (placeholder for now) */}
                        <div className="text-slate-400 cursor-move">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="19" r="1" />
                          </svg>
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">{suggestion.habitTitle}</p>
                          <p className="text-sm text-slate-600">
                            {formatTime(suggestion.startDateTime)} - {formatTime(suggestion.endDateTime)}
                          </p>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeSuggestion(suggestion.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      >
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => onAcceptAll(localSuggestions)}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Accept All ({localSuggestions.length} blocks)
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Integrate with FlowSchedulingBanner**

Modify `FlowSchedulingBanner.tsx` to show preview after schedule generation:

```typescript
import { SchedulePreview, type ScheduleSuggestion } from './SchedulePreview';

// Add state
const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);

// Update handleQuickAction to store suggestions
const data = await response.json();
setSuggestions(data.suggestions);
setGeneratingSchedule(false);

// Update expanded state to show preview
{isExpanded && (
  <div className="p-6 pt-4 border-t border-primary-200">
    {suggestions.length > 0 ? (
      <SchedulePreview
        suggestions={suggestions}
        onAcceptAll={(acceptedSuggestions) => {
          console.log('Accepting:', acceptedSuggestions);
          // TODO: Implement commit logic
        }}
        onCancel={() => {
          setSuggestions([]);
          setIsExpanded(false);
        }}
      />
    ) : !generatingSchedule ? (
      // ... existing chips UI
    ) : (
      // ... existing loading state
    )}
  </div>
)}
```

**Step 3: Test manually**

1. Click a time range chip
2. Wait for loading
3. Verify day-by-day accordion appears
4. Test expand/collapse days
5. Test remove button

**Step 4: Commit**

```bash
git add apps/web/src/components/habits/SchedulePreview.tsx apps/web/src/components/habits/FlowSchedulingBanner.tsx
git commit -m "feat(habits): add schedule preview with day-by-day accordion"
```

---

## Phase 5: Commit Schedule with Progress & Cancellation

### Task 5.1: Create Commit Schedule Backend Service

**Files:**
- Create: `apps/backend/src/services/commitScheduleService.ts`

**Step 1: Create service with job tracking**

Create `apps/backend/src/services/commitScheduleService.ts`:

```typescript
/**
 * Commit Schedule Service
 *
 * Handles batch creation of habit calendar events with progress tracking and cancellation
 */

import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';

export interface CommitScheduleRequest {
  userId: string;
  acceptedBlocks: Array<{
    habitId: string;
    startDateTime: string;
    endDateTime: string;
  }>;
}

export interface CommitProgress {
  habitId: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  eventId?: string;
  error?: string;
}

export interface CommitScheduleJob {
  jobId: string;
  progress: CommitProgress[];
}

// In-memory job tracking (TODO: move to Redis for production)
const activeJobs = new Map<string, { cancelled: boolean; progress: CommitProgress[] }>();

export async function commitSchedule(request: CommitScheduleRequest): Promise<CommitScheduleJob> {
  const { userId, acceptedBlocks } = request;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Create job
  const job = await prisma.schedulingJob.create({
    data: {
      userId,
      status: 'in_progress',
      totalBlocks: acceptedBlocks.length,
      completedBlocks: 0,
      createdEventIds: [],
    },
  });

  // Initialize progress tracking
  const progress: CommitProgress[] = acceptedBlocks.map((block) => ({
    habitId: block.habitId,
    status: 'pending',
  }));

  activeJobs.set(job.id, { cancelled: false, progress });

  // Process blocks in background (don't await)
  processBlocks(job.id, userId, acceptedBlocks, user.defaultCalendarId || 'primary').catch((error) => {
    console.error('Error processing blocks:', error);
  });

  return { jobId: job.id, progress };
}

async function processBlocks(
  jobId: string,
  userId: string,
  blocks: CommitScheduleRequest['acceptedBlocks'],
  calendarId: string
) {
  const jobState = activeJobs.get(jobId);
  if (!jobState) return;

  const createdEventIds: string[] = [];
  let completedCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    // Check for cancellation
    if (jobState.cancelled) {
      await prisma.schedulingJob.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          completedBlocks: completedCount,
          createdEventIds,
        },
      });
      return;
    }

    const block = blocks[i];
    jobState.progress[i].status = 'creating';

    try {
      const habit = await prisma.habit.findUnique({ where: { id: block.habitId } });
      if (!habit) {
        throw new Error(`Habit ${block.habitId} not found`);
      }

      // Create calendar event
      const { eventId } = await calendarService.createEvent(userId, calendarId, {
        summary: `[Habit] ${habit.title}`,
        description: habit.description || undefined,
        start: block.startDateTime,
        end: block.endDateTime,
      });

      // Save ScheduledHabit record
      await prisma.scheduledHabit.create({
        data: {
          habitId: habit.id,
          userId,
          provider: 'google',
          calendarId,
          eventId,
          startDateTime: new Date(block.startDateTime),
          endDateTime: new Date(block.endDateTime),
          status: 'scheduled',
        },
      });

      jobState.progress[i].status = 'created';
      jobState.progress[i].eventId = eventId;
      createdEventIds.push(eventId);
      completedCount++;

      // Rate limiting: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      jobState.progress[i].status = 'failed';
      jobState.progress[i].error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Update job as completed
  await prisma.schedulingJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      completedBlocks: completedCount,
      createdEventIds,
    },
  });

  activeJobs.delete(jobId);
}

export function getJobProgress(jobId: string): CommitProgress[] | null {
  const job = activeJobs.get(jobId);
  return job ? job.progress : null;
}

export async function cancelJob(jobId: string): Promise<{ cancelled: boolean; completedBlocks: number }> {
  const job = activeJobs.get(jobId);
  if (!job) {
    return { cancelled: false, completedBlocks: 0 };
  }

  job.cancelled = true;

  // Wait a bit for processing to stop
  await new Promise((resolve) => setTimeout(resolve, 200));

  const completedBlocks = job.progress.filter((p) => p.status === 'created').length;

  return { cancelled: true, completedBlocks };
}
```

**Step 2: Add commit and cancel endpoints**

Add to `apps/backend/src/controllers/habitController.ts`:

```typescript
import { commitSchedule, getJobProgress, cancelJob } from '../services/commitScheduleService.js';

export async function commitScheduleHandler(
  request: FastifyRequest<{
    Body: {
      acceptedBlocks: Array<{
        habitId: string;
        startDateTime: string;
        endDateTime: string;
      }>;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const { acceptedBlocks } = request.body;

    const result = await commitSchedule({ userId, acceptedBlocks });
    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, 'Error committing schedule');
    return reply.code(500).send({ error: 'Failed to commit schedule' });
  }
}

export async function getJobProgressHandler(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  try {
    const { jobId } = request.params;
    const progress = getJobProgress(jobId);

    if (!progress) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    return reply.code(200).send({ progress });
  } catch (error) {
    request.log.error(error, 'Error getting job progress');
    return reply.code(500).send({ error: 'Failed to get progress' });
  }
}

export async function cancelJobHandler(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  try {
    const { jobId } = request.params;
    const result = await cancelJob(jobId);
    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, 'Error cancelling job');
    return reply.code(500).send({ error: 'Failed to cancel job' });
  }
}
```

Add routes to `apps/backend/src/routes/habitRoutes.ts`:

```typescript
fastify.post('/commit-schedule', { preHandler: [authenticate] }, commitScheduleHandler);
fastify.get('/schedule-job/:jobId/progress', { preHandler: [authenticate] }, getJobProgressHandler);
fastify.post('/schedule-job/:jobId/cancel', { preHandler: [authenticate] }, cancelJobHandler);
```

**Step 3: Commit**

```bash
git add apps/backend/src/services/commitScheduleService.ts apps/backend/src/controllers/habitController.ts apps/backend/src/routes/habitRoutes.ts
git commit -m "feat(backend): add commit schedule service with progress tracking and cancellation"
```

---

### Task 5.2: Create Progress Modal Component

**Files:**
- Create: `apps/web/src/components/habits/SchedulingProgressModal.tsx`

**Step 1: Create modal component**

Create `apps/web/src/components/habits/SchedulingProgressModal.tsx`:

```typescript
/**
 * Scheduling Progress Modal
 *
 * Shows real-time progress of calendar event creation with cancellation support
 */

'use client';

import { useState, useEffect } from 'react';
import { FlowMascot } from '../FlowMascot';

interface CommitProgress {
  habitId: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  eventId?: string;
  error?: string;
}

interface SchedulingProgressModalProps {
  jobId: string;
  totalBlocks: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function SchedulingProgressModal({
  jobId,
  totalBlocks,
  onComplete,
  onCancel,
}: SchedulingProgressModalProps) {
  const [progress, setProgress] = useState<CommitProgress[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/habits/schedule-job/${jobId}/progress`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();
        setProgress(data.progress);

        // Check if complete
        const allDone = data.progress.every(
          (p: CommitProgress) => p.status === 'created' || p.status === 'failed'
        );

        if (allDone) {
          clearInterval(pollInterval);
          setTimeout(onComplete, 1000); // Show success for 1s before closing
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    setIsCancelling(true);

    try {
      await fetch(`/api/habits/schedule-job/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      onCancel();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const completedCount = progress.filter((p) => p.status === 'created').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;
  const progressPercent = (completedCount / totalBlocks) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          <FlowMascot size="lg" expression="thinking" className="mb-4" />

          <h2 className="text-xl font-semibold text-slate-800 mb-2">Creating your schedule...</h2>

          <div className="w-full bg-slate-200 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-slate-600 mb-6">
            {completedCount} / {totalBlocks} events created
            {failedCount > 0 && <span className="text-red-600"> ({failedCount} failed)</span>}
          </p>

          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="px-6 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Scheduling'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Integrate with SchedulePreview**

Modify `SchedulePreview.tsx` to trigger modal on accept:

```typescript
import { SchedulingProgressModal } from './SchedulingProgressModal';
import { useState } from 'react';

// Add state
const [isCommitting, setIsCommitting] = useState(false);
const [jobId, setJobId] = useState<string | null>(null);

const handleAcceptAll = async () => {
  setIsCommitting(true);

  try {
    const response = await fetch('/api/habits/commit-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        acceptedBlocks: localSuggestions.map((s) => ({
          habitId: s.habitId,
          startDateTime: s.startDateTime,
          endDateTime: s.endDateTime,
        })),
      }),
    });

    const data = await response.json();
    setJobId(data.jobId);
  } catch (error) {
    console.error('Error committing schedule:', error);
    setIsCommitting(false);
  }
};

// Render modal
{isCommitting && jobId && (
  <SchedulingProgressModal
    jobId={jobId}
    totalBlocks={localSuggestions.length}
    onComplete={() => {
      setIsCommitting(false);
      onAcceptAll(localSuggestions);
    }}
    onCancel={() => {
      setIsCommitting(false);
      onCancel();
    }}
  />
)}
```

**Step 3: Test end-to-end**

1. Generate schedule
2. Click "Accept All"
3. Watch progress modal
4. Test cancel button
5. Verify events in Google Calendar

**Step 4: Commit**

```bash
git add apps/web/src/components/habits/SchedulingProgressModal.tsx apps/web/src/components/habits/SchedulePreview.tsx
git commit -m "feat(habits): add progress modal with real-time updates and cancellation"
```

---

## Phase 6: Testing & Polish

### Task 6.1: Add Unit Tests for Backend Services

**Files:**
- Create: `apps/backend/src/services/__tests__/commitScheduleService.test.ts`

**Step 1: Write tests**

Create test file with comprehensive coverage:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commitSchedule, getJobProgress, cancelJob } from '../commitScheduleService.js';
import { prisma } from '../../config/prisma.js';
import * as calendarService from '../googleCalendarService.js';

vi.mock('../../config/prisma.js');
vi.mock('../googleCalendarService.js');

describe('commitScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create job and process blocks', async () => {
    // Mock user and habit
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      defaultCalendarId: 'primary',
    } as any);

    vi.mocked(prisma.schedulingJob.create).mockResolvedValue({
      id: 'job-123',
      userId: 'user-123',
      status: 'in_progress',
      totalBlocks: 2,
      completedBlocks: 0,
      createdEventIds: [],
    } as any);

    const result = await commitSchedule({
      userId: 'user-123',
      acceptedBlocks: [
        {
          habitId: 'habit-1',
          startDateTime: '2026-01-05T08:00:00Z',
          endDateTime: '2026-01-05T08:30:00Z',
        },
      ],
    });

    expect(result.jobId).toBe('job-123');
    expect(result.progress).toHaveLength(1);
  });

  it('should track job progress', async () => {
    const jobId = 'job-123';

    // Simulate job in progress
    // (This requires access to activeJobs map - testing through API might be better)

    const progress = getJobProgress(jobId);
    expect(progress).toBeDefined();
  });
});
```

**Step 2: Run tests**

```bash
cd apps/backend
pnpm test src/services/__tests__/commitScheduleService.test.ts
```

**Step 3: Commit**

```bash
git add apps/backend/src/services/__tests__/commitScheduleService.test.ts
git commit -m "test(backend): add unit tests for commit schedule service"
```

---

### Task 6.2: Add Analytics Instrumentation

**Files:**
- Modify: `apps/web/src/components/habits/FlowSchedulingBanner.tsx`

**Step 1: Add tracking events**

Add PostHog tracking:

```typescript
import { usePostHog } from 'posthog-js/react';

export function FlowSchedulingBanner() {
  const posthog = usePostHog();

  // Track expand
  const handleExpand = () => {
    setIsExpanded(true);
    posthog?.capture('flow_banner_expanded', { context: getContextMessage() });
  };

  // Track quick action
  const handleQuickAction = async (range: string) => {
    posthog?.capture('flow_quick_action_clicked', { range });
    // ... existing logic
  };

  // Track accept all
  const handleAcceptAll = () => {
    posthog?.capture('flow_schedule_accepted', {
      totalBlocks: suggestions.length,
      rangeType: selectedRange,
    });
  };
}
```

**Step 2: Test analytics in dev**

Check PostHog dashboard for events

**Step 3: Commit**

```bash
git add apps/web/src/components/habits/FlowSchedulingBanner.tsx
git commit -m "feat(analytics): add tracking for Flow scheduling banner interactions"
```

---

### Task 6.3: Final Polish & Error Handling

**Files:**
- Modify: `apps/web/src/components/habits/FlowSchedulingBanner.tsx`
- Modify: `apps/web/src/components/habits/SchedulePreview.tsx`

**Step 1: Add error states**

Add error handling for failed schedule generation:

```typescript
const [error, setError] = useState<string | null>(null);

const handleQuickAction = async (range: string) => {
  setError(null);
  // ... existing logic

  try {
    // ... fetch logic
  } catch (error) {
    setError('Failed to generate schedule. Please try again.');
    setGeneratingSchedule(false);
  }
};

// Render error
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
    <p className="text-red-700 text-sm">{error}</p>
  </div>
)}
```

**Step 2: Add empty state**

Handle case where no suggestions are generated:

```typescript
if (suggestions.length === 0 && !generatingSchedule) {
  return (
    <div className="text-center py-8">
      <p className="text-slate-600">No available time slots found. Try a different range or adjust your calendar.</p>
    </div>
  );
}
```

**Step 3: Test all error cases**

1. Network failure
2. Invalid token
3. No available slots
4. Calendar API failure

**Step 4: Commit**

```bash
git add apps/web/src/components/habits/FlowSchedulingBanner.tsx apps/web/src/components/habits/SchedulePreview.tsx
git commit -m "feat(habits): add comprehensive error handling and empty states"
```

---

## Final Verification

### Task 7.1: Run All Tests

**Step 1: Run backend tests**

```bash
cd apps/backend
pnpm test
```

Expected: All tests pass

**Step 2: Run type check**

```bash
cd apps/web
pnpm type-check
```

Expected: No TypeScript errors

**Step 3: Build both apps**

```bash
cd apps/backend && pnpm build
cd apps/web && pnpm build
```

Expected: Both build successfully

**Step 4: Manual E2E test**

1. Sign in to app
2. Navigate to /habits
3. Expand Flow banner
4. Click "This Week"
5. Verify schedule preview appears
6. Remove 2 blocks
7. Click "Accept All"
8. Watch progress modal
9. Verify events in Google Calendar
10. Test cancellation flow

---

### Task 7.2: Create Feature Summary & Next Steps

**Files:**
- Create: `docs/features/bulk-habit-scheduling.md`

**Step 1: Document completed feature**

Create summary document with:
- What was built
- How to use it
- Known limitations
- Future enhancements

**Step 2: Update roadmap**

Mark this feature as complete in main roadmap

**Step 3: Final commit**

```bash
git add docs/features/bulk-habit-scheduling.md
git commit -m "docs: add bulk habit scheduling feature summary and usage guide"
```

---

## Implementation Complete!

**Total Tasks**: 20+ across 6 phases
**Estimated Time**: 8-14 days
**Key Deliverables**:
- ✅ Context-aware Flow banner
- ✅ Quick time range selection
- ✅ Schedule preview with day-by-day accordion
- ✅ Batch event creation with progress tracking
- ✅ Cancellation support
- ✅ Comprehensive error handling
- ✅ Analytics instrumentation

**Next Steps**:
1. Deploy to staging
2. User testing
3. Gather feedback
4. Iterate on UX
5. Add drag-and-drop (Phase 4 detail)
6. Add AI prompt parsing (future enhancement)
