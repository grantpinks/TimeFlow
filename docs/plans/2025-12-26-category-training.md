# Category Training & Custom Event Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users create custom categories with colors and train AI categorization using descriptions, include/exclude keywords, and example events, while minimizing AI usage with a hybrid rules + AI approach.

**Architecture:** Add a CategoryTrainingProfile table tied 1:1 with Category, store keyword rules plus example event snapshots/IDs, and use a hybrid categorizer that picks a category via keyword scoring when confident, falling back to AI only when ambiguous. Frontend adds a training workflow accessible from Tasks (modal), Calendar (link), and Settings (link), plus an opt-in training checkbox when manually re-categorizing events.

**Tech Stack:** Next.js/React, Fastify, Prisma/Postgres, Vitest, OpenAI SDK

---

### Task 0: Create a dedicated worktree

**Files:**
- None

**Step 1: Create worktree**

Run:
```bash
git worktree add ../timeflow-category-training -b feat/category-training
```
Expected: new worktree directory created.

**Step 2: Move into worktree**

Run:
```bash
cd ../timeflow-category-training
```
Expected: working directory changes to the new worktree.

**Step 3: Commit (optional checkpoint)**

```bash
git status
```
Expected: clean status.

---

### Task 1: Add CategoryTrainingProfile model + shared types

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Create: `timeflow/packages/shared/src/types/categoryTraining.ts`
- Modify: `timeflow/packages/shared/src/types/index.ts`

**Step 1: Write a failing test (schema validation)**

Create `timeflow/apps/backend/src/services/__tests__/categoryTrainingService.test.ts` with a minimal “service exists” import that fails until service is added:
```ts
import { describe, it, expect } from 'vitest';
import { upsertTrainingProfile } from '../categoryTrainingService';

describe('categoryTrainingService', () => {
  it('exports upsertTrainingProfile', () => {
    expect(typeof upsertTrainingProfile).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: FAIL with module not found for `categoryTrainingService`.

**Step 3: Add Prisma model + shared type**

Update `timeflow/apps/backend/prisma/schema.prisma`:
```prisma
model CategoryTrainingProfile {
  id                    String   @id @default(cuid())
  userId                String
  categoryId            String   @unique
  description           String?
  includeKeywords       String[]
  excludeKeywords       String[]
  exampleEventIds       String[]
  exampleEventsSnapshot Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category              Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Update `Category` model with relation:
```prisma
  trainingProfile       CategoryTrainingProfile?
```

Create `timeflow/packages/shared/src/types/categoryTraining.ts`:
```ts
export interface CategoryTrainingExampleSnapshot {
  eventId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendeeDomains?: string[];
  calendarId?: string;
  provider?: string;
}

export interface CategoryTrainingProfile {
  id: string;
  userId: string;
  categoryId: string;
  description?: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  exampleEventIds: string[];
  exampleEventsSnapshot: CategoryTrainingExampleSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCategoryTrainingRequest {
  description?: string;
  includeKeywords: string[];
  excludeKeywords?: string[];
  exampleEventIds?: string[];
  exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
}
```

Update `timeflow/packages/shared/src/types/index.ts`:
```ts
export * from './categoryTraining.js';
```

**Step 4: Run Prisma migration**

Run:
```bash
pnpm -C timeflow/apps/backend prisma:migrate -- --name add_category_training_profile
pnpm -C timeflow/apps/backend prisma:generate
```
Expected: migration created and applied.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/prisma/schema.prisma timeflow/apps/backend/prisma/migrations timeflow/packages/shared/src/types/categoryTraining.ts timeflow/packages/shared/src/types/index.ts timeflow/apps/backend/src/services/__tests__/categoryTrainingService.test.ts
git commit -m "feat: add category training profile schema and types"
```

---

### Task 2: Add category training service + endpoints

**Files:**
- Create: `timeflow/apps/backend/src/services/categoryTrainingService.ts`
- Create: `timeflow/apps/backend/src/controllers/categoryTrainingController.ts`
- Modify: `timeflow/apps/backend/src/routes/categoryRoutes.ts`

**Step 1: Write failing tests**

Extend `timeflow/apps/backend/src/services/__tests__/categoryTrainingService.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeKeywords } from '../categoryTrainingService';

describe('categoryTrainingService', () => {
  it('normalizes keywords to lowercase and trims', () => {
    expect(normalizeKeywords(['  Work ', 'Meeting'])).toEqual(['work', 'meeting']);
  });
});
```

**Step 2: Run tests to confirm failure**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: FAIL with missing `normalizeKeywords`.

**Step 3: Implement service + controller**

Create `timeflow/apps/backend/src/services/categoryTrainingService.ts`:
```ts
import { prisma } from '../config/prisma.js';
import type { CategoryTrainingExampleSnapshot } from '@timeflow/shared';

export function normalizeKeywords(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))
  );
}

function uniqueByEventId(values: CategoryTrainingExampleSnapshot[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.eventId)) return false;
    seen.add(value.eventId);
    return true;
  });
}

export async function getTrainingProfile(userId: string, categoryId: string) {
  return prisma.categoryTrainingProfile.findFirst({
    where: { userId, categoryId },
  });
}

export async function upsertTrainingProfile(
  userId: string,
  categoryId: string,
  data: {
    description?: string;
    includeKeywords: string[];
    excludeKeywords?: string[];
    exampleEventIds?: string[];
    exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
  }
) {
  const includeKeywords = normalizeKeywords(data.includeKeywords);
  const excludeKeywords = normalizeKeywords(data.excludeKeywords || []);
  const exampleEventIds = Array.from(new Set(data.exampleEventIds || []));
  const exampleEventsSnapshot = uniqueByEventId(data.exampleEventsSnapshot || []);

  return prisma.categoryTrainingProfile.upsert({
    where: { categoryId },
    create: {
      userId,
      categoryId,
      description: data.description?.trim() || null,
      includeKeywords,
      excludeKeywords,
      exampleEventIds,
      exampleEventsSnapshot,
    },
    update: {
      description: data.description?.trim() || null,
      includeKeywords,
      excludeKeywords,
      exampleEventIds,
      exampleEventsSnapshot,
    },
  });
}

export async function addTrainingExample(
  userId: string,
  categoryId: string,
  example: CategoryTrainingExampleSnapshot
) {
  const profile = await getTrainingProfile(userId, categoryId);
  if (!profile) {
    return prisma.categoryTrainingProfile.create({
      data: {
        userId,
        categoryId,
        description: null,
        includeKeywords: [],
        excludeKeywords: [],
        exampleEventIds: [example.eventId],
        exampleEventsSnapshot: [example],
      },
    });
  }

  const exampleEventIds = Array.from(new Set([...(profile.exampleEventIds || []), example.eventId]));
  const exampleEventsSnapshot = uniqueByEventId([
    ...(profile.exampleEventsSnapshot as CategoryTrainingExampleSnapshot[] | null || []),
    example,
  ]).slice(0, 5);

  return prisma.categoryTrainingProfile.update({
    where: { categoryId },
    data: { exampleEventIds, exampleEventsSnapshot },
  });
}
```

Create `timeflow/apps/backend/src/controllers/categoryTrainingController.ts`:
```ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as trainingService from '../services/categoryTrainingService.js';

const trainingSchema = z.object({
  description: z.string().max(500).optional(),
  includeKeywords: z.array(z.string().min(1)).min(1),
  excludeKeywords: z.array(z.string().min(1)).optional(),
  exampleEventIds: z.array(z.string()).optional(),
  exampleEventsSnapshot: z
    .array(
      z.object({
        eventId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        attendeeDomains: z.array(z.string()).optional(),
        calendarId: z.string().optional(),
        provider: z.string().optional(),
      })
    )
    .optional(),
});

export async function getCategoryTraining(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
  const profile = await trainingService.getTrainingProfile(userId, request.params.id);
  return reply.send(profile || null);
}

export async function upsertCategoryTraining(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
  const parsed = trainingSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: formatZodError(parsed.error) });
  }

  const profile = await trainingService.upsertTrainingProfile(userId, request.params.id, parsed.data);
  return reply.send(profile);
}
```

Update `timeflow/apps/backend/src/routes/categoryRoutes.ts`:
```ts
import * as categoryTrainingController from '../controllers/categoryTrainingController.js';

  server.get(
    '/categories/:id/training',
    { preHandler: requireAuth },
    categoryTrainingController.getCategoryTraining
  );

  server.put(
    '/categories/:id/training',
    { preHandler: requireAuth },
    categoryTrainingController.upsertCategoryTraining
  );
```

**Step 4: Run tests**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: PASS for categoryTrainingService tests.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/categoryTrainingService.ts timeflow/apps/backend/src/controllers/categoryTrainingController.ts timeflow/apps/backend/src/routes/categoryRoutes.ts timeflow/apps/backend/src/services/__tests__/categoryTrainingService.test.ts
git commit -m "feat: add category training service and endpoints"
```

---

### Task 3: Hybrid rules + AI categorization

**Files:**
- Modify: `timeflow/apps/backend/src/services/aiCategorizationService.ts`
- Modify: `timeflow/apps/backend/src/controllers/eventCategorizationController.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/aiCategorizationService.test.ts`

**Step 1: Write failing tests**

Create `timeflow/apps/backend/src/services/__tests__/aiCategorizationService.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scoreEventForCategory, chooseCategoryByRules } from '../aiCategorizationService';

const event = {
  id: 'evt-1',
  summary: 'Design review with Acme team',
  description: 'Discuss Q1 product roadmap',
  start: new Date().toISOString(),
  end: new Date().toISOString(),
};

const profiles = [
  {
    categoryId: 'cat-work',
    name: 'Professional',
    includeKeywords: ['review', 'roadmap'],
    excludeKeywords: ['gym'],
  },
  {
    categoryId: 'cat-personal',
    name: 'Personal',
    includeKeywords: ['gym', 'family'],
    excludeKeywords: [],
  },
];

describe('aiCategorizationService hybrid rules', () => {
  it('scores categories using include keywords', () => {
    const score = scoreEventForCategory(event, profiles[0]);
    expect(score).toBeGreaterThan(0);
  });

  it('chooses category when confident', () => {
    const result = chooseCategoryByRules(event, profiles);
    expect(result?.categoryId).toBe('cat-work');
  });
});
```

**Step 2: Run tests to confirm failure**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: FAIL due to missing exports.

**Step 3: Implement hybrid scoring and prompt enrichment**

Update `timeflow/apps/backend/src/services/aiCategorizationService.ts`:
```ts
interface CategoryTrainingContext {
  categoryId: string;
  name: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  description?: string;
  examples?: { summary: string; description?: string }[];
}

export function scoreEventForCategory(
  event: CalendarEvent,
  category: CategoryTrainingContext
) {
  const text = `${event.summary} ${event.description || ''}`.toLowerCase();
  const includeHits = category.includeKeywords.filter((word) => text.includes(word)).length;
  const excludeHits = category.excludeKeywords.filter((word) => text.includes(word)).length;
  const nameHit = text.includes(category.name.toLowerCase()) ? 1 : 0;

  if (excludeHits > 0) return -999;
  return includeHits + nameHit;
}

export function chooseCategoryByRules(
  event: CalendarEvent,
  categories: CategoryTrainingContext[]
) {
  const scored = categories
    .map((category) => ({ categoryId: category.categoryId, score: scoreEventForCategory(event, category) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const top = scored[0];
  const runnerUp = scored[1];

  if (top.score >= 2 && (!runnerUp || top.score - runnerUp.score >= 1)) {
    return { categoryId: top.categoryId, confidence: Math.min(0.85, 0.6 + top.score * 0.1) };
  }
  return null;
}
```

Then update `categorizeEventWithAI` to accept training contexts and include them in prompt:
```ts
export async function categorizeEventWithAI(
  event: CalendarEvent,
  userCategories: Category[],
  trainingContexts: Record<string, CategoryTrainingContext>
): Promise<CategorizationResult> {
  const categoryOptions = userCategories
    .map((cat) => {
      const training = trainingContexts[cat.id];
      const examples = training?.examples?.map((ex) => `- ${ex.summary}: ${ex.description || 'No description'}`).join('\n') || 'None';
      const include = training?.includeKeywords?.length ? training.includeKeywords.join(', ') : 'None';
      const exclude = training?.excludeKeywords?.length ? training.excludeKeywords.join(', ') : 'None';
      const description = training?.description || 'No description';
      return `- ${cat.name} (ID: ${cat.id})\n  Description: ${description}\n  Include: ${include}\n  Exclude: ${exclude}\n  Examples:\n${examples}`;
    })
    .join('\n');

  // ...existing prompt with categoryOptions injected...
}
```

Update `batchCategorizeEvents` to run rules first and only call AI when needed:
```ts
export async function batchCategorizeEvents(
  events: CalendarEvent[],
  userCategories: Category[],
  trainingContexts: Record<string, CategoryTrainingContext>
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();
  const categoryContexts = userCategories.map((cat) => ({
    categoryId: cat.id,
    name: cat.name,
    includeKeywords: trainingContexts[cat.id]?.includeKeywords || [cat.name.toLowerCase()],
    excludeKeywords: trainingContexts[cat.id]?.excludeKeywords || [],
    description: trainingContexts[cat.id]?.description,
    examples: trainingContexts[cat.id]?.examples,
  }));

  for (const event of events) {
    const ruleResult = chooseCategoryByRules(event, categoryContexts);
    if (ruleResult) {
      results.set(event.id, {
        categoryId: ruleResult.categoryId,
        confidence: ruleResult.confidence,
        reasoning: 'Keyword match',
      });
      continue;
    }

    const aiResult = await categorizeEventWithAI(event, userCategories, trainingContexts);
    results.set(event.id, aiResult);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
```

Update `eventCategorizationController.categorizeAllEvents` to build training context:
```ts
const trainingProfiles = await categoryTrainingService.getTrainingProfiles(user.id);
const trainingContexts = Object.fromEntries(
  trainingProfiles.map((profile) => [
    profile.categoryId,
    {
      categoryId: profile.categoryId,
      name: userCategories.find((c) => c.id === profile.categoryId)?.name || '',
      includeKeywords: profile.includeKeywords || [],
      excludeKeywords: profile.excludeKeywords || [],
      description: profile.description || undefined,
      examples: (profile.exampleEventsSnapshot || []).map((ex: any) => ({
        summary: ex.summary,
        description: ex.description,
      })),
    },
  ])
);

const aiResults = await aiCategorizationService.batchCategorizeEvents(
  uncategorized,
  userCategories,
  trainingContexts
);
```

**Step 4: Run tests**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: PASS for hybrid scoring tests.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/aiCategorizationService.ts timeflow/apps/backend/src/controllers/eventCategorizationController.ts timeflow/apps/backend/src/services/__tests__/aiCategorizationService.test.ts

git commit -m "feat: add hybrid rules + AI categorization"
```

---

### Task 4: Wire training data into API client

**Files:**
- Modify: `timeflow/apps/web/src/lib/api.ts`

**Step 1: Write failing test (type check)**

No frontend test framework available. Skip test and move to implementation.

**Step 2: Implement API helpers**

Add types and endpoints in `timeflow/apps/web/src/lib/api.ts`:
```ts
export interface CategoryTrainingExampleSnapshot {
  eventId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendeeDomains?: string[];
  calendarId?: string;
  provider?: string;
}

export interface UpdateCategoryTrainingRequest {
  description?: string;
  includeKeywords: string[];
  excludeKeywords?: string[];
  exampleEventIds?: string[];
  exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
}

export async function getCategoryTraining(categoryId: string) {
  return request(`/categories/${categoryId}/training`);
}

export async function upsertCategoryTraining(categoryId: string, data: UpdateCategoryTrainingRequest) {
  return request(`/categories/${categoryId}/training`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateEventCategorization(
  eventId: string,
  categoryId: string,
  provider: string = 'google',
  training?: { useForTraining: boolean; example?: CategoryTrainingExampleSnapshot }
): Promise<void> {
  return request<void>(`/events/${eventId}/categorization?provider=${provider}`, {
    method: 'PUT',
    body: JSON.stringify({ categoryId, train: training?.useForTraining, example: training?.example }),
  });
}
```

**Step 3: Commit**

```bash
git add timeflow/apps/web/src/lib/api.ts

git commit -m "feat: add category training api client"
```

---

### Task 5: Categories page training UI

**Files:**
- Create: `timeflow/apps/web/src/components/CategoryTrainingPanel.tsx`
- Modify: `timeflow/apps/web/src/app/categories/page.tsx`

**Step 1: Build training panel component**

Create `timeflow/apps/web/src/components/CategoryTrainingPanel.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';

interface CategoryTrainingPanelProps {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

export function CategoryTrainingPanel({ categoryId, categoryName, onClose }: CategoryTrainingPanelProps) {
  const [description, setDescription] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [availableEvents, setAvailableEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategoryTraining(categoryId).then((profile) => {
      if (!profile) return;
      setDescription(profile.description || '');
      setIncludeKeywords((profile.includeKeywords || []).join(', '));
      setExcludeKeywords((profile.excludeKeywords || []).join(', '));
      setSelectedEvents(profile.exampleEventsSnapshot || []);
    });
  }, [categoryId]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    api.getCalendarEvents(start.toISOString(), end.toISOString()).then((events) => {
      setAvailableEvents(
        events.map((event) => ({
          eventId: event.id || '',
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
        }))
      );
    });
  }, []);

  const toggleEvent = (event: api.CategoryTrainingExampleSnapshot) => {
    setSelectedEvents((prev) => {
      const exists = prev.some((item) => item.eventId === event.eventId);
      if (exists) return prev.filter((item) => item.eventId !== event.eventId);
      return [...prev, event].slice(0, 5);
    });
  };

  const handleSave = async () => {
    const include = includeKeywords.split(',').map((item) => item.trim()).filter(Boolean);
    if (include.length === 0) {
      setError('Include keywords are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.upsertCategoryTraining(categoryId, {
        description: description.trim() || undefined,
        includeKeywords: include,
        excludeKeywords: excludeKeywords.split(',').map((item) => item.trim()).filter(Boolean),
        exampleEventIds: selectedEvents.map((event) => event.eventId),
        exampleEventsSnapshot: selectedEvents,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save training');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Train category</p>
          <h3 className="text-lg font-semibold text-slate-900">{categoryName}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          rows={2}
          placeholder="e.g., Meetings with customers, project reviews, and client calls"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Include keywords (required)</label>
        <input
          value={includeKeywords}
          onChange={(e) => setIncludeKeywords(e.target.value)}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="review, client, roadmap"
        />
        <p className="text-xs text-slate-500 mt-1">Separate keywords with commas.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Exclude keywords</label>
        <input
          value={excludeKeywords}
          onChange={(e) => setExcludeKeywords(e.target.value)}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="gym, dentist"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Example events</label>
        <div className="mt-2 grid gap-2 max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {availableEvents.map((event) => (
            <label key={event.eventId} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedEvents.some((item) => item.eventId === event.eventId)}
                onChange={() => toggleEvent(event)}
              />
              <span>{event.summary}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">Pick up to 5 events for better AI accuracy.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 text-sm bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg">
          {saving ? 'Saving...' : 'Save training'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Wire panel into Categories page**

Update `timeflow/apps/web/src/app/categories/page.tsx`:
- Add a `trainingCategoryId` state.
- Add a “Train” button per category to open the panel.
- Render `<CategoryTrainingPanel />` below the list when active.

**Step 3: Commit**

```bash
git add timeflow/apps/web/src/components/CategoryTrainingPanel.tsx timeflow/apps/web/src/app/categories/page.tsx

git commit -m "feat: add category training panel"
```

---

### Task 6: Tasks page “Custom…” modal workflow

**Files:**
- Create: `timeflow/apps/web/src/components/CategoryTrainingModal.tsx`
- Modify: `timeflow/apps/web/src/components/TaskList.tsx`

**Step 1: Implement modal**

Create `timeflow/apps/web/src/components/CategoryTrainingModal.tsx` with two steps:
- Step 1: name + color (required)
- Step 2: reuse the training form inputs (description, include/exclude keywords, example events)
- On completion, call `api.createCategory` then `api.upsertCategoryTraining`, then pass category ID back to TaskList.

**Step 2: Wire “Custom…” option into TaskList**

Update both category selects in `TaskList.tsx` to add:
```tsx
<option value="__custom__">Custom...</option>
```
On change:
- If value is `__custom__`, open modal and keep select unchanged until category created.
- When modal completes, set `categoryId` or `editingState.categoryId` to the new category.

Add a small “Manage categories” link below the select that navigates to `/categories`.

**Step 3: Commit**

```bash
git add timeflow/apps/web/src/components/CategoryTrainingModal.tsx timeflow/apps/web/src/components/TaskList.tsx

git commit -m "feat: add custom category modal workflow"
```

---

### Task 7: Calendar link, Settings section, manual training checkbox

**Files:**
- Modify: `timeflow/apps/web/src/app/calendar/page.tsx`
- Modify: `timeflow/apps/web/src/app/settings/page.tsx`
- Modify: `timeflow/apps/web/src/components/EventDetailPopover.tsx`
- Modify: `timeflow/apps/web/src/components/CalendarView.tsx`
- Modify: `timeflow/apps/backend/src/controllers/eventCategorizationController.ts`

**Step 1: Add link to Categories page in Calendar and Settings**

- In `calendar/page.tsx`, add a lightweight button/link near “Categorize Events”:
```tsx
<a href="/categories" className="text-sm text-primary-600 hover:text-primary-700">Train categories</a>
```
- In `settings/page.tsx`, add a card section:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
  <h2 className="text-lg font-semibold text-slate-800 mb-2">Categories & AI Training</h2>
  <p className="text-slate-600 mb-4">Manage custom categories and teach the AI how to auto-sort events.</p>
  <a href="/categories" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm">
    Manage categories
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </a>
</div>
```

**Step 2: Add training checkbox to EventDetailPopover**

Update `EventDetailPopover.tsx` under the category select:
```tsx
const [useForTraining, setUseForTraining] = useState(false);

<div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={useForTraining} onChange={(e) => setUseForTraining(e.target.checked)} />
    Use this change to train AI
  </label>
  <div className="relative group">
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-[10px]">?</span>
    <div className="absolute left-0 mt-2 w-56 rounded-lg bg-slate-900 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition">
      When enabled, this event is saved as an example for future auto-categorization.
    </div>
  </div>
</div>
```

Pass categories into `EventDetailPopover` from `CalendarView.tsx`:
```tsx
<EventDetailPopover
  categories={categories}
  ...
/>
```

Update `CalendarView.tsx` to pass the full event snapshot to `onCategoryChange`:
```tsx
onCategoryChange?.(eventId, newCategoryId, useForTraining, {
  eventId: event.id.replace('event-', ''),
  summary: event.title,
  description: event.description,
  start: event.start.toISOString(),
  end: event.end.toISOString(),
});
```

Update `calendar/page.tsx` to accept training inputs:
```tsx
const handleCategoryChange = async (eventId: string, categoryId: string, train = false, example?: api.CategoryTrainingExampleSnapshot) => {
  await api.updateEventCategorization(eventId, categoryId, 'google', { useForTraining: train, example });
  // refresh cache
};
```

**Step 3: Accept training in backend update**

Update `eventCategorizationController.updateEventCategorization` to parse optional `train` and `example` fields and call `categoryTrainingService.addTrainingExample` when `train === true`.

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/calendar/page.tsx timeflow/apps/web/src/app/settings/page.tsx timeflow/apps/web/src/components/EventDetailPopover.tsx timeflow/apps/web/src/components/CalendarView.tsx timeflow/apps/backend/src/controllers/eventCategorizationController.ts

git commit -m "feat: add training entry points and opt-in examples"
```

---

### Task 8: Final verification

**Files:**
- None

**Step 1: Run backend tests**

Run:
```bash
pnpm -C timeflow/apps/backend test -- --runInBand
```
Expected: PASS.

**Step 2: Smoke test UI**

Run:
```bash
pnpm -C timeflow/apps/web dev
```
Expected: Tasks modal opens on “Custom…”, Categories page shows training panel, Settings and Calendar links navigate correctly, category change checkbox appears in event popover.

**Step 3: Commit (optional)**

```bash
git status
```
Expected: clean status.
```
