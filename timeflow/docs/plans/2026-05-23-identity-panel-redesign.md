# Identity Panel Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the two stacked identity sections on Today (FlowEvolutionHero + IdentityDashboardBanner) with a single unified IdentityPanel: identity pill selector → two clear tabs ("Today" with consistency ribbon, "Progression" with XP + next-action callout + upcoming milestones).

**Architecture:**
- Two new backend endpoints: `GET /api/habits/consistency` and `GET /api/identities/:id/upcoming-unlocks`
- One new top-level frontend component `IdentityPanel` replaces both `FlowEvolutionHero` and `IdentityDashboardBanner` on Today page
- Two sub-components: `IdentityTodayTab` and `IdentityProgressionTab`
- Identity selector state lives in IdentityPanel and drives both tabs

**Tech Stack:** TypeScript, Fastify, Prisma, React, Tailwind, Framer Motion, Vitest (backend tests), existing `@timeflow/shared` types

---

## Reference: Key Files

| File | Role |
|---|---|
| `apps/backend/src/routes/habitRoutes.ts` | Register new consistency route |
| `apps/backend/src/controllers/habitController.ts` | New consistency handler |
| `apps/backend/src/routes/identityRoutes.ts` | Register new upcoming-unlocks route |
| `apps/backend/src/controllers/identityController.ts` | New upcoming-unlocks handler |
| `apps/backend/src/config/identityUnlockCatalog.ts` | `UNLOCK_CATALOG` — source for upcoming unlocks |
| `apps/backend/src/services/identityEvolutionService.ts` | `xpToNextLevel`, `BASE_XP = 10`, `DAILY_CAP = 80` |
| `apps/web/src/app/today/page.tsx` | Wire in new IdentityPanel, remove old two sections |
| `apps/web/src/lib/api.ts` | Add two new API client functions |
| `packages/shared/src/types/identity.ts` | Add new shared DTOs |
| `apps/web/src/components/identity/FlowEvolutionHero.tsx` | Keep — used on Habits page; do NOT delete |
| `apps/web/src/components/identity/IdentityDashboardBanner.tsx` | Keep — used on Habits page; do NOT delete |

## XP Formula Reference (do not re-derive)

- Base XP per qualifying habit completion: **10**
- Consistency bonus: `Math.min(streak, 7) * 2` (max +14)
- Average XP per completion (no streak): **10**
- Level cost L → L+1: `L * L * 50`
- `xpToNextLevel` returned by evolution-state endpoint
- Sessions needed estimate: `Math.ceil(xpToNextLevel / 10)` (conservative, ignores streak bonus)

## Unlock Catalog Reference

`UNLOCK_CATALOG` entries have `{ unlockKey, grantedByLevel: number|null, grantedByStage: string|null, displayName, description }`.
Upcoming = not yet in `IdentityUnlock` table, sorted by level threshold asc, then stage threshold.

---

## Task 1: Shared DTOs

**Files:**
- Modify: `packages/shared/src/types/identity.ts`

**Step 1: Add the two new response types**

At the bottom of `packages/shared/src/types/identity.ts` add:

```typescript
/** One habit's 7-day completion grid for the consistency ribbon. */
export interface HabitConsistencyEntry {
  habitId: string;
  habitName: string;
  /** ISO date strings for the window, oldest first. Always 7 entries. */
  dates: string[];
  /** Parallel to dates: true = completed, false = not completed (including future dates). */
  completions: boolean[];
  /** Number of completions in the window. */
  completionCount: number;
  /** Total days in window that have passed (for rate denominator). */
  elapsedDays: number;
}

export interface HabitConsistencyResponse {
  identityId: string;
  windowDays: number;
  habits: HabitConsistencyEntry[];
}

/** A single not-yet-earned unlock the user is working toward. */
export interface UpcomingUnlockEntry {
  unlockKey: string;
  unlockType: string;
  displayName: string;
  description: string;
  /** Level required (null if stage-gated). */
  grantedByLevel: number | null;
  /** Stage required (null if level-gated). */
  grantedByStage: string | null;
}

export interface UpcomingUnlocksResponse {
  identityId: string;
  upcoming: UpcomingUnlockEntry[];
  /** XP still needed to reach the next level. Echoed for convenience. */
  xpToNextLevel: number;
  /** Estimated habit sessions needed (xpToNextLevel / 10, rounded up). */
  sessionsNeeded: number;
}
```

**Step 2: Export them from the shared index**

Find `packages/shared/src/index.ts` (or wherever identity types are re-exported) and ensure `HabitConsistencyResponse`, `HabitConsistencyEntry`, `UpcomingUnlockEntry`, `UpcomingUnlocksResponse` are exported.

**Step 3: Build shared package**

```bash
cd packages/shared && pnpm build
```
Expected: `tsc` exits 0.

**Step 4: Commit**

```bash
git add packages/shared/src/types/identity.ts packages/shared/src/index.ts
git commit -m "feat(shared): add HabitConsistency and UpcomingUnlocks DTOs"
```

---

## Task 2: Backend — Habit Consistency Endpoint

**Files:**
- Modify: `apps/backend/src/controllers/habitController.ts`
- Modify: `apps/backend/src/routes/habitRoutes.ts`
- Test: `apps/backend/src/controllers/__tests__/habitConsistency.test.ts` (create)

**Step 1: Write the failing test**

Create `apps/backend/src/controllers/__tests__/habitConsistency.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServer } from '../../server.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    habit: {
      findMany: vi.fn(),
    },
    habitCompletion: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', identityEvolutionEnabled: true }),
    },
  },
}));

vi.mock('../../middlewares/auth.js', () => ({
  requireAuth: vi.fn((req: any, _reply: any, done: any) => {
    req.user = { id: 'u1' };
    done();
  }),
}));

import { prisma } from '../../config/prisma.js';

describe('GET /api/habits/consistency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if identityId missing', async () => {
    const server = await buildServer();
    const res = await server.inject({ method: 'GET', url: '/api/habits/consistency' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 7-day grid for habits linked to identity', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    (prisma.habit.findMany as any).mockResolvedValue([
      { id: 'h1', title: 'Read 30 min' },
    ]);
    (prisma.habitCompletion.findMany as any).mockResolvedValue([
      { habitId: 'h1', completedAt: yesterday },
    ]);

    const server = await buildServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/habits/consistency?identityId=identity1',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.habits).toHaveLength(1);
    expect(body.habits[0].habitId).toBe('h1');
    expect(body.habits[0].completions).toHaveLength(7);
    // Yesterday's slot should be true
    expect(body.habits[0].completions[5]).toBe(true);
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd apps/backend && pnpm test src/controllers/__tests__/habitConsistency.test.ts
```
Expected: FAIL — "Not a function" or 404 (route not registered yet).

**Step 3: Implement the controller handler**

In `apps/backend/src/controllers/habitController.ts`, add at the bottom:

```typescript
export async function getHabitConsistency(
  request: FastifyRequest<{ Querystring: { identityId?: string; days?: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  const { identityId, days: daysStr } = request.query;

  if (!identityId) {
    return reply.status(400).send({ error: 'identityId is required' });
  }

  const windowDays = Math.min(Math.max(parseInt(daysStr ?? '7', 10) || 7, 1), 30);

  // Build date window: [windowDays days ago ... today], each as YYYY-MM-DD
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - (windowDays - 1));

  // Habits linked to this identity
  const habits = await prisma.habit.findMany({
    where: { userId, identityId },
    select: { id: true, title: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (habits.length === 0) {
    return reply.send({ identityId, windowDays, habits: [] });
  }

  const habitIds = habits.map((h) => h.id);

  const completions = await prisma.habitCompletion.findMany({
    where: {
      habitId: { in: habitIds },
      completedAt: { gte: windowStart },
    },
    select: { habitId: true, completedAt: true },
  });

  // Build a Set of "habitId|YYYY-MM-DD" for O(1) lookup
  const completedSet = new Set<string>();
  for (const c of completions) {
    const dateStr = new Date(c.completedAt).toISOString().split('T')[0];
    completedSet.add(`${c.habitId}|${dateStr}`);
  }

  const todayStr = today.toISOString().split('T')[0];
  const result = habits.map((h) => {
    const completionArr = dates.map((d) => completedSet.has(`${h.id}|${d}`));
    const completionCount = completionArr.filter(Boolean).length;
    // Elapsed = days up to and including today
    const elapsedDays = dates.filter((d) => d <= todayStr).length;

    return {
      habitId: h.id,
      habitName: h.title,
      dates,
      completions: completionArr,
      completionCount,
      elapsedDays,
    };
  });

  return reply.send({ identityId, windowDays, habits: result });
}
```

**Step 4: Register the route**

In `apps/backend/src/routes/habitRoutes.ts`, before the first `server.get('/habits',...)` line, add:

```typescript
  // GET /api/habits/consistency?identityId=X&days=7
  server.get(
    '/habits/consistency',
    { preHandler: requireAuth },
    habitController.getHabitConsistency
  );
```

Also add to the import at top of `habitRoutes.ts`:
```typescript
import { ..., getHabitConsistency } from '../controllers/habitController.js';
```
(add `getHabitConsistency` to the existing import list)

**Step 5: Run tests to verify passing**

```bash
cd apps/backend && pnpm test src/controllers/__tests__/habitConsistency.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/backend/src/controllers/habitController.ts \
        apps/backend/src/routes/habitRoutes.ts \
        apps/backend/src/controllers/__tests__/habitConsistency.test.ts
git commit -m "feat(api): add GET /habits/consistency endpoint for 7-day habit grid"
```

---

## Task 3: Backend — Upcoming Unlocks Endpoint

**Files:**
- Modify: `apps/backend/src/controllers/identityController.ts`
- Modify: `apps/backend/src/routes/identityRoutes.ts`
- Test: `apps/backend/src/controllers/__tests__/upcomingUnlocks.test.ts` (create)

**Step 1: Write the failing test**

Create `apps/backend/src/controllers/__tests__/upcomingUnlocks.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../../server.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', identityEvolutionEnabled: true }),
    },
    identityUnlock: {
      findMany: vi.fn().mockResolvedValue([
        { unlockKey: 'flow_palette_default' }, // already earned
      ]),
    },
    identity: {
      findFirst: vi.fn().mockResolvedValue({ id: 'identity1', xp: 55 }),
    },
  },
}));

vi.mock('../../middlewares/auth.js', () => ({
  requireAuth: vi.fn((req: any, _reply: any, done: any) => {
    req.user = { id: 'u1' };
    done();
  }),
}));

describe('GET /api/identities/:id/upcoming-unlocks', () => {
  it('returns max 3 not-yet-earned unlocks sorted by level/stage', async () => {
    const server = await buildServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/identities/identity1/upcoming-unlocks',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.upcoming.length).toBeLessThanOrEqual(3);
    expect(body.upcoming.every((u: any) => u.unlockKey !== 'flow_palette_default')).toBe(true);
    expect(body).toHaveProperty('xpToNextLevel');
    expect(body).toHaveProperty('sessionsNeeded');
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd apps/backend && pnpm test src/controllers/__tests__/upcomingUnlocks.test.ts
```
Expected: FAIL — 404 (route not yet registered).

**Step 3: Implement the controller handler**

In `apps/backend/src/controllers/identityController.ts`, add near the bottom (before the closing line):

```typescript
export async function getUpcomingUnlocks(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  if (!(await requireEvolutionEnabled(userId, reply))) return;

  const identityId = request.params.id;

  // Get identity XP to compute xpToNextLevel
  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { xp: true },
  });
  if (!identity) {
    return reply.status(404).send({ error: 'Identity not found' });
  }

  // Already-earned unlock keys for this identity
  const earned = await prisma.identityUnlock.findMany({
    where: { identityId, userId },
    select: { unlockKey: true },
  });
  const earnedKeys = new Set(earned.map((e) => e.unlockKey));

  // Filter catalog to not-yet-earned, sort level-gated asc then stage-gated
  const remaining = UNLOCK_CATALOG.filter((e) => !earnedKeys.has(e.unlockKey));
  const sorted = remaining.sort((a, b) => {
    const aVal = a.grantedByLevel ?? 999;
    const bVal = b.grantedByLevel ?? 999;
    return aVal - bVal;
  });
  const upcoming = sorted.slice(0, 3).map((e) => ({
    unlockKey: e.unlockKey,
    unlockType: e.unlockType,
    displayName: e.displayName,
    description: e.description,
    grantedByLevel: e.grantedByLevel,
    grantedByStage: e.grantedByStage,
  }));

  const xpRemaining = xpToNextLevel(identity.xp);
  const sessionsNeeded = Math.ceil(xpRemaining / 10);

  return reply.send({ identityId, upcoming, xpToNextLevel: xpRemaining, sessionsNeeded });
}
```

Also ensure `xpToNextLevel` is imported at the top of `identityController.ts`. Check if it's already there:
```typescript
import { xpToNextLevel } from '../services/identityEvolutionService.js';
```
Add if missing.

**Step 4: Register the route**

In `apps/backend/src/routes/identityRoutes.ts`, add before the CRUD block:

```typescript
  server.get(
    '/identities/:id/upcoming-unlocks',
    { preHandler: requireAuth },
    identityController.getUpcomingUnlocks
  );
```

**Step 5: Run tests to verify passing**

```bash
cd apps/backend && pnpm test src/controllers/__tests__/upcomingUnlocks.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/backend/src/controllers/identityController.ts \
        apps/backend/src/routes/identityRoutes.ts \
        apps/backend/src/controllers/__tests__/upcomingUnlocks.test.ts
git commit -m "feat(api): add GET /identities/:id/upcoming-unlocks endpoint"
```

---

## Task 4: Frontend API Client

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add the two new API functions**

Find the block around `getEvolutionState` and `getIdentityProgress` in `apps/web/src/lib/api.ts`. After them, add:

```typescript
export function getHabitConsistency(
  identityId: string,
  days = 7
): Promise<import('@timeflow/shared').HabitConsistencyResponse> {
  return request(`/habits/consistency?identityId=${encodeURIComponent(identityId)}&days=${days}`);
}

export function getUpcomingUnlocks(
  identityId: string
): Promise<import('@timeflow/shared').UpcomingUnlocksResponse> {
  return request(`/identities/${encodeURIComponent(identityId)}/upcoming-unlocks`);
}
```

**Step 2: Build web (type-check only)**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors related to the new functions.

**Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add getHabitConsistency and getUpcomingUnlocks API client functions"
```

---

## Task 5: IdentityTodayTab Component

**Files:**
- Create: `apps/web/src/components/identity/IdentityTodayTab.tsx`

This component receives the consistency data and renders:
1. Today's summary line (X done · Ym · streak N 🔥)
2. Consistency ribbon (7-day grid per habit)
3. "Not yet done today" list

**Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HabitConsistencyEntry } from '@timeflow/shared';

interface IdentityTodayTabProps {
  habits: HabitConsistencyEntry[];
  loading?: boolean;
  /** Today's completions and minutes from identity progress */
  todayDone: number;
  todayMinutes: number;
  /** Current streak in days for the selected identity */
  streakDays?: number;
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/** Returns day-of-week label for a YYYY-MM-DD string */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
}

export function IdentityTodayTab({
  habits,
  loading = false,
  todayDone,
  todayMinutes,
  streakDays = 0,
}: IdentityTodayTabProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const notDoneToday = useMemo(
    () =>
      habits.filter((h) => {
        const todayIdx = h.dates.indexOf(todayStr);
        return todayIdx !== -1 && !h.completions[todayIdx];
      }),
    [habits, todayStr]
  );

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (habits.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        No habits linked to this identity yet.{' '}
        <a href="/habits" className="text-teal-600 underline-offset-2 hover:underline">
          Add one
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {todayDone} done
        </span>
        {todayMinutes > 0 && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            ⏱ {fmtMinutes(todayMinutes)}
          </span>
        )}
        {streakDays >= 2 && (
          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            🔥 {streakDays}-day streak
          </span>
        )}
      </div>

      {/* Consistency ribbon */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Habit consistency · last 7 days
        </p>
        <ul className="space-y-2">
          {habits.map((h) => {
            const rate = h.elapsedDays > 0 ? h.completionCount / h.elapsedDays : 0;
            const pct = Math.round(rate * 100);
            return (
              <motion.li
                key={h.habitId}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                {/* Habit name */}
                <span className="w-36 shrink-0 truncate text-xs font-medium text-slate-700">
                  {h.habitName}
                </span>

                {/* 7-day dot grid */}
                <div className="flex items-center gap-1">
                  {h.dates.map((date, i) => {
                    const isToday = date === todayStr;
                    const done = h.completions[i];
                    const isFuture = date > todayStr;
                    return (
                      <div
                        key={date}
                        title={`${date}: ${done ? 'done' : isFuture ? 'upcoming' : 'missed'}`}
                        className={`h-5 w-5 rounded-full border text-center text-[9px] font-bold leading-5 ${
                          done
                            ? 'border-teal-400 bg-teal-400 text-white'
                            : isFuture
                            ? 'border-slate-200 bg-slate-50 text-slate-400'
                            : 'border-slate-200 bg-white text-slate-400'
                        } ${isToday ? 'ring-2 ring-teal-300 ring-offset-1' : ''}`}
                      >
                        {done ? '✓' : dayLabel(date)[0]}
                      </div>
                    );
                  })}
                </div>

                {/* Rate */}
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-500">
                  {h.completionCount}/{h.elapsedDays}
                </span>

                {/* Mini bar */}
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Not yet done today */}
      {notDoneToday.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            Still to do today
          </p>
          <ul className="space-y-1">
            {notDoneToday.map((h) => (
              <li key={h.habitId} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                {h.habitName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/identity/IdentityTodayTab.tsx
git commit -m "feat(web): add IdentityTodayTab with 7-day consistency ribbon"
```

---

## Task 6: IdentityProgressionTab Component

**Files:**
- Create: `apps/web/src/components/identity/IdentityProgressionTab.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { IdentityEvolutionState, UpcomingUnlocksResponse } from '@timeflow/shared';
import { levelProgressRatio } from './FlowEvolutionHero';
import { MasteryTrialCard } from './MasteryTrialCard';

const STAGE_ORDER = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf'] as const;
const STAGE_LABELS: Record<string, string> = { FutureSelf: 'Future self' };

function stageLabel(s: string) {
  return STAGE_LABELS[s] ?? s;
}

interface IdentityProgressionTabProps {
  evolution: IdentityEvolutionState | null;
  upcoming: UpcomingUnlocksResponse | null;
  loading?: boolean;
  timeZone: string;
}

export function IdentityProgressionTab({
  evolution,
  upcoming,
  loading = false,
  timeZone,
}: IdentityProgressionTabProps) {
  const reduceMotion = useReducedMotion();

  const xpPct = useMemo(
    () => (evolution ? Math.round(levelProgressRatio(evolution) * 100) : 0),
    [evolution]
  );

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!evolution) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        No progression data yet. Complete habits linked to this identity on Today to begin.
      </p>
    );
  }

  const currentStageIdx = STAGE_ORDER.indexOf(evolution.stage as (typeof STAGE_ORDER)[number]);
  const sessionsNeeded = upcoming?.sessionsNeeded ?? Math.ceil((evolution.xpToNextLevel ?? 0) / 10);
  const nextUnlock = upcoming?.upcoming[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Stage path timeline */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Stage path</p>
        <div className="flex items-center gap-1.5">
          {STAGE_ORDER.map((stage, i) => {
            const isPast = i < currentStageIdx;
            const isCurrent = i === currentStageIdx;
            const isFuture = i > currentStageIdx;
            return (
              <div key={stage} className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    isCurrent
                      ? 'border border-teal-300 bg-teal-100 text-teal-900'
                      : isPast
                      ? 'border border-teal-200 bg-teal-50 text-teal-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {isCurrent && <span className="mr-1">●</span>}
                  {stageLabel(stage)}
                </span>
                {i < STAGE_ORDER.length - 1 && (
                  <span className={`text-[10px] ${isPast ? 'text-teal-300' : 'text-slate-200'}`}>
                    ──
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-800">
            Level {evolution.level} · {stageLabel(evolution.stage)}
          </span>
          <span className="tabular-nums text-slate-500">
            {evolution.xpToNextLevel > 0
              ? `${evolution.xpToNextLevel} XP to Level ${evolution.level + 1}`
              : 'Level maxed for this band'}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-100"
          role="progressbar"
          aria-valuenow={xpPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="XP toward next level"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
            initial={reduceMotion ? { width: `${xpPct}%` } : { width: '0%' }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Next action callout */}
      {sessionsNeeded > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
          <span className="mt-0.5 text-lg" aria-hidden>🎯</span>
          <div className="text-sm text-slate-800">
            <span className="font-semibold">Complete {sessionsNeeded} more habit session{sessionsNeeded !== 1 ? 's' : ''} </span>
            to reach Level {evolution.level + 1}
            {nextUnlock ? (
              <> and unlock <span className="font-semibold text-teal-700">{nextUnlock.displayName}</span>.</>
            ) : (
              '.'
            )}
          </div>
        </div>
      )}

      {/* Upcoming milestones */}
      {upcoming && upcoming.upcoming.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Coming up</p>
          <ul className="space-y-1.5">
            {upcoming.upcoming.map((u) => (
              <li key={u.unlockKey} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm">
                  {u.unlockType === 'flow_palette' ? '🎨' : u.unlockType === 'flow_emote' ? '✨' : '🏗️'}
                </span>
                <span className="flex-1 text-xs text-slate-700">
                  <span className="font-semibold">{u.displayName}</span>
                  {u.grantedByLevel && (
                    <span className="ml-1.5 text-slate-400">Level {u.grantedByLevel}</span>
                  )}
                  {u.grantedByStage && (
                    <span className="ml-1.5 text-slate-400">{stageLabel(u.grantedByStage)} stage</span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">{u.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trial card — only if active */}
      {evolution.trialState === 'Active' && (
        <MasteryTrialCard evolution={evolution} timeZone={timeZone} />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/identity/IdentityProgressionTab.tsx
git commit -m "feat(web): add IdentityProgressionTab with XP bar, next action, milestones"
```

---

## Task 7: IdentityPanel — Unified Container Component

**Files:**
- Create: `apps/web/src/components/identity/IdentityPanel.tsx`
- Create hook: `apps/web/src/hooks/useIdentityConsistency.ts`
- Create hook: `apps/web/src/hooks/useUpcomingUnlocks.ts`

**Step 1: Create useIdentityConsistency hook**

```typescript
// apps/web/src/hooks/useIdentityConsistency.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { HabitConsistencyResponse } from '@timeflow/shared';

export function useIdentityConsistency(identityId: string | null, sessionReady: boolean) {
  const [data, setData] = useState<HabitConsistencyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!identityId || !sessionReady) { setData(null); return; }
    setLoading(true);
    try {
      const res = await api.getHabitConsistency(identityId, 7);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [identityId, sessionReady]);

  useEffect(() => { void fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
```

**Step 2: Create useUpcomingUnlocks hook**

```typescript
// apps/web/src/hooks/useUpcomingUnlocks.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { UpcomingUnlocksResponse } from '@timeflow/shared';

export function useUpcomingUnlocks(identityId: string | null, sessionReady: boolean) {
  const [data, setData] = useState<UpcomingUnlocksResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!identityId || !sessionReady) { setData(null); return; }
    setLoading(true);
    try {
      const res = await api.getUpcomingUnlocks(identityId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [identityId, sessionReady]);

  useEffect(() => { void fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
```

**Step 3: Create IdentityPanel**

```tsx
// apps/web/src/components/identity/IdentityPanel.tsx
'use client';

import { useState, useMemo } from 'react';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { useIdentityConsistency } from '@/hooks/useIdentityConsistency';
import { useUpcomingUnlocks } from '@/hooks/useUpcomingUnlocks';
import { IdentityTodayTab } from './IdentityTodayTab';
import { IdentityProgressionTab } from './IdentityProgressionTab';
import { FlowMascot } from '@/components/FlowMascot';

type TabId = 'today' | 'progression';

interface IdentityPanelProps {
  identities: IdentityDayProgress[];
  evolutionStates: IdentityEvolutionState[];
  evolutionMode: EvolutionSurfaceMode;
  sessionReady: boolean;
  timeZone: string;
  loading?: boolean;
}

function greeting(totalDone: number): string {
  const h = new Date().getHours();
  if (totalDone === 0) {
    if (h < 12) return "Your day is wide open — let's start strong!";
    if (h < 17) return 'Afternoon already. Pick one identity and go.';
    return 'Evening is still time to grow.';
  }
  if (h < 12) return `Nice start — ${totalDone} done before noon!`;
  if (h < 17) return `Solid afternoon. ${totalDone} completions so far.`;
  if (h < 20) return `Good evening! ${totalDone} done today.`;
  return `Wrapping up with ${totalDone} completions. Well done!`;
}

export function IdentityPanel({
  identities,
  evolutionStates,
  evolutionMode,
  sessionReady,
  timeZone,
  loading = false,
}: IdentityPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(
    identities[0]?.identityId ?? null
  );

  // Keep selection valid if identities list changes
  const validId = useMemo(() => {
    if (!selectedIdentityId) return identities[0]?.identityId ?? null;
    return identities.find((i) => i.identityId === selectedIdentityId)
      ? selectedIdentityId
      : identities[0]?.identityId ?? null;
  }, [selectedIdentityId, identities]);

  const selectedIdentity = identities.find((i) => i.identityId === validId) ?? null;
  const selectedEvolution = evolutionStates.find((s) => s.identityId === validId) ?? null;

  const totalDone = identities.reduce((s, i) => s + i.completedCount, 0);

  const { data: consistencyData, loading: consistencyLoading } = useIdentityConsistency(
    validId,
    sessionReady
  );
  const { data: upcomingData, loading: upcomingLoading } = useUpcomingUnlocks(
    evolutionMode === 'active' ? validId : null,
    sessionReady
  );

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

      {/* ── Greeting strip ─────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-primary-50/40 px-4 py-3">
        <FlowMascot size="sm" expression="happy" />
        <p className="text-sm font-semibold text-slate-800">{greeting(totalDone)}</p>
      </div>

      {/* ── Identity pill selector ─────────────────────────── */}
      {identities.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2.5 scrollbar-none">
          {identities.map((id) => (
            <button
              key={id.identityId}
              type="button"
              onClick={() => setSelectedIdentityId(id.identityId)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                validId === id.identityId
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{id.icon}</span>
              <span>{id.name}</span>
              {id.completedCount > 0 && (
                <span className={`rounded-full px-1 text-[10px] font-bold ${validId === id.identityId ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {id.completedCount}✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab switcher ───────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
        {(['today', 'progression'] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'today' ? 'Today' : 'Progression'}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      <div className="px-4 py-4">
        {activeTab === 'today' ? (
          <IdentityTodayTab
            habits={consistencyData?.habits ?? []}
            loading={consistencyLoading}
            todayDone={selectedIdentity?.completedCount ?? 0}
            todayMinutes={selectedIdentity?.totalMinutes ?? 0}
          />
        ) : (
          <IdentityProgressionTab
            evolution={selectedEvolution}
            upcoming={upcomingData}
            loading={upcomingLoading}
            timeZone={timeZone}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/identity/IdentityPanel.tsx \
        apps/web/src/hooks/useIdentityConsistency.ts \
        apps/web/src/hooks/useUpcomingUnlocks.ts
git commit -m "feat(web): add IdentityPanel unified component with pill selector and Today/Progression tabs"
```

---

## Task 8: Wire IdentityPanel into Today Page

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`

**Step 1: Find the existing two identity section renders**

Search `today/page.tsx` for `IdentityDashboardBanner` and `showEvolutionStrip`. These are the two sections to replace.

**Step 2: Add the import**

At the top of `today/page.tsx`, add:
```typescript
import { IdentityPanel } from '@/components/identity/IdentityPanel';
```

**Step 3: Replace the two identity sections**

Find the JSX where `<IdentityDashboardBanner ... />` is rendered (it will be inside the main layout). Replace the entire `<IdentityDashboardBanner ... />` block (including any wrapping `showEvolutionStrip` / `FlowEvolutionHero` logic above it) with:

```tsx
<IdentityPanel
  identities={identityProgress?.identities ?? []}
  evolutionStates={evolutionStates}
  evolutionMode={evolutionMode}
  sessionReady={sessionReady}
  timeZone={user?.timeZone ?? 'America/Chicago'}
  loading={identityProgressLoading}
/>
```

Where `identityProgress`, `evolutionStates`, `evolutionMode`, `sessionReady`, `identityProgressLoading` come from the existing hooks already in the page (`useIdentityProgress`, `useEvolutionSurface`, `useUser`). Match variable names to what's actually in the file.

**Step 4: Remove now-unused imports**

Remove imports of `IdentityDashboardBanner` and `FlowEvolutionHero` from `today/page.tsx` if they're no longer used anywhere else in that file. (Do NOT remove them from the project — they're still used on the Habits page.)

**Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add apps/web/src/app/today/page.tsx
git commit -m "feat(web): replace FlowEvolutionHero + IdentityDashboardBanner with unified IdentityPanel on Today page"
```

---

## Task 9: Smoke Test End-to-End

**Step 1: Start backend locally**

```bash
cd apps/backend && pnpm dev
```

**Step 2: Test new endpoints manually**

```bash
# Replace TOKEN with a real JWT from localStorage
curl "http://localhost:3001/api/habits/consistency?identityId=YOUR_IDENTITY_ID" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3001/api/identities/YOUR_IDENTITY_ID/upcoming-unlocks" \
  -H "Authorization: Bearer TOKEN"
```
Expected: Both return JSON with the correct shapes from Task 1 DTOs.

**Step 3: Start web locally**

```bash
cd apps/web && pnpm dev
```

Open Today page. Verify:
- [ ] Greeting strip shows at top
- [ ] Identity pill tabs appear if you have >1 identity
- [ ] "Today" / "Progression" tab switcher is clearly visible
- [ ] Today tab shows 7-day consistency grid
- [ ] Progression tab shows XP bar, next action callout, coming up list
- [ ] Switching identity pills updates both tabs
- [ ] No console errors

**Step 4: Final commit if any polish needed**

```bash
git add -A
git commit -m "fix(web): identity panel polish from smoke test"
```

---

## Task 10: Deploy

Push to `main` — Render auto-deploys backend, Vercel auto-deploys frontend.

```bash
git push origin main
```

Watch Render logs for migration output (no new migrations needed for this feature). Watch Vercel build for type errors.

---

## Summary of New Files

| File | Type |
|---|---|
| `packages/shared/src/types/identity.ts` | Modified — 2 new DTOs |
| `apps/backend/src/controllers/habitController.ts` | Modified — new handler |
| `apps/backend/src/routes/habitRoutes.ts` | Modified — new route |
| `apps/backend/src/controllers/identityController.ts` | Modified — new handler |
| `apps/backend/src/routes/identityRoutes.ts` | Modified — new route |
| `apps/web/src/lib/api.ts` | Modified — 2 new client functions |
| `apps/web/src/hooks/useIdentityConsistency.ts` | New |
| `apps/web/src/hooks/useUpcomingUnlocks.ts` | New |
| `apps/web/src/components/identity/IdentityPanel.tsx` | New |
| `apps/web/src/components/identity/IdentityTodayTab.tsx` | New |
| `apps/web/src/components/identity/IdentityProgressionTab.tsx` | New |
| `apps/web/src/app/today/page.tsx` | Modified — swap two sections for IdentityPanel |
