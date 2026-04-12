# Identity Completion Feedback Loop — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user completes a task or habit, the identity progress widget updates in real-time and a celebration modal shows the identity impact ("This advances your Health & Fitness identity!").

**Architecture:**
- No new backend endpoints needed — `completeTask` and `completeHabitInstance` already exist and identity progress is recalculated fresh from `GET /api/identities/progress`. The frontend just needs to (1) refresh progress after any completion and (2) show a celebration modal using the before/after delta.
- A shared `useIdentityProgress` hook centralises progress fetching and exposes a `refresh()` function that all completion handlers call.
- The celebration modal is a lightweight Framer Motion overlay — it receives the identity that gained progress and disappears after 3 seconds or on dismiss.

**Tech Stack:** Next.js 14 App Router, React, Framer Motion, Tailwind CSS, TypeScript, existing `api.ts` client

---

## Task 1: Create `useIdentityProgress` hook

**Files:**
- Create: `apps/web/src/hooks/useIdentityProgress.ts`

**What it does:** Centralises identity progress fetching into one hook with a `refresh()` function. All pages that show identity progress use this instead of fetching inline.

**Step 1: Create the file**

```typescript
// apps/web/src/hooks/useIdentityProgress.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { IdentityProgressResponse } from '@timeflow/shared';

export function useIdentityProgress(date?: string) {
  const [progress, setProgress] = useState<IdentityProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getIdentityProgress(targetDate);
      setProgress(data);
      setError(null);
    } catch (err) {
      setError('Failed to load identity progress');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { progress, loading, error, refresh: fetch };
}
```

**Step 2: Verify it compiles**

```bash
cd timeflow/apps/web && npx tsc --noEmit 2>&1 | grep useIdentityProgress
```
Expected: no output (no errors).

**Step 3: Commit**

```bash
cd timeflow && git add apps/web/src/hooks/useIdentityProgress.ts && git commit -m "feat: add useIdentityProgress hook with refresh()"
```

---

## Task 2: Create `IdentityCelebrationModal` component

**Files:**
- Create: `apps/web/src/components/identity/IdentityCelebrationModal.tsx`

**What it does:** A full-screen overlay with a centered card that appears for 3 seconds after completing something linked to an identity. Shows the identity icon, name, color, and a count of today's completions.

**Step 1: Create the component**

```tsx
// apps/web/src/components/identity/IdentityCelebrationModal.tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IdentityDayProgress } from '@timeflow/shared';

interface Props {
  identity: IdentityDayProgress | null;
  onDismiss: () => void;
}

export function IdentityCelebrationModal({ identity, onDismiss }: Props) {
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!identity) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [identity, onDismiss]);

  return (
    <AnimatePresence>
      {identity && (
        <motion.div
          key="celebration-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onDismiss}
        >
          <motion.div
            key="celebration-card"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identity icon with colored ring */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 20 }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: identity.color + '20', border: `3px solid ${identity.color}` }}
            >
              {identity.icon}
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: identity.color }}>
                Identity Progress
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{identity.name}</h2>
              <p className="text-slate-500 text-sm mb-4">
                {identity.completedCount === 1
                  ? "You've completed your first item today!"
                  : `${identity.completedCount} items completed today · ${identity.totalMinutes} min`}
              </p>
            </motion.div>

            {/* Progress dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex justify-center gap-2 mb-5"
            >
              {Array.from({ length: Math.min(identity.completedCount, 7) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, type: 'spring' }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: identity.color }}
                />
              ))}
            </motion.div>

            <button
              onClick={onDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              tap to dismiss
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Verify it compiles**

```bash
cd timeflow/apps/web && npx tsc --noEmit 2>&1 | grep IdentityCelebration
```
Expected: no output.

**Step 3: Commit**

```bash
cd timeflow && git add apps/web/src/components/identity/IdentityCelebrationModal.tsx && git commit -m "feat: add IdentityCelebrationModal component"
```

---

## Task 3: Wire task completion to identity progress on Today page

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`

**What it does:** After completing a task, refresh identity progress and show the celebration modal if the task was linked to an identity.

**Step 1: Find the existing `handleCompleteTask` in `today/page.tsx`**

```bash
grep -n "handleCompleteTask\|completeTask\|onComplete" timeflow/apps/web/src/app/today/page.tsx | head -20
```

**Step 2: Add imports at the top of `today/page.tsx`**

Find the existing identity-related imports and add:

```typescript
import { useIdentityProgress } from '@/hooks/useIdentityProgress';
import { IdentityCelebrationModal } from '@/components/identity/IdentityCelebrationModal';
import type { IdentityDayProgress } from '@timeflow/shared';
```

**Step 3: Add state and hook inside `TodayPage` component**

After existing `useState` declarations, add:

```typescript
const { progress, refresh: refreshProgress } = useIdentityProgress();
const [celebration, setCelebration] = useState<IdentityDayProgress | null>(null);
```

**Step 4: Replace `handleCompleteTask` to capture before/after delta**

Find and replace the existing `handleCompleteTask` function:

```typescript
const handleCompleteTask = async (taskId: string) => {
  try {
    // Capture which identity this task belongs to (before completing)
    const task = tasks.find((t: any) => t.id === taskId);
    const linkedIdentityId = task?.identityId ?? null;

    await api.completeTask(taskId);
    await fetchTodayData(); // existing refresh function name — check what it's called

    // Refresh identity progress and show celebration if task had identity
    if (linkedIdentityId) {
      await refreshProgress();
      const updated = progress?.identities.find((i) => i.identityId === linkedIdentityId);
      if (updated) setCelebration(updated);
    }
  } catch (err) {
    console.error('Failed to complete task:', err);
  }
};
```

> **Note:** Check the actual function name used to refresh today's data (may be `fetchTodayEvents`, `loadData`, etc.) — search with `grep -n "const fetch\|loadData\|fetchToday" apps/web/src/app/today/page.tsx`.

**Step 5: Add `IdentityCelebrationModal` to the JSX return**

Just before the closing `</Layout>` tag in today/page.tsx, add:

```tsx
<IdentityCelebrationModal
  identity={celebration}
  onDismiss={() => setCelebration(null)}
/>
```

**Step 6: Verify no type errors**

```bash
cd timeflow/apps/web && npx tsc --noEmit 2>&1 | grep "today/page"
```
Expected: no output.

**Step 7: Commit**

```bash
cd timeflow && git add apps/web/src/app/today/page.tsx && git commit -m "feat: refresh identity progress and show celebration on task complete (Today page)"
```

---

## Task 4: Wire habit completion to identity progress on Today page

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`

**What it does:** After completing a habit instance, refresh identity progress and show celebration if the habit is linked to an identity.

**Step 1: Find `handleCompleteHabit` in today/page.tsx**

```bash
grep -n "handleCompleteHabit\|completeHabit" timeflow/apps/web/src/app/today/page.tsx
```

**Step 2: Replace `handleCompleteHabit`**

Find the existing function and replace:

```typescript
const handleCompleteHabit = async (scheduledHabitId: string) => {
  try {
    // Find the scheduled habit to get identityId from linked habit
    const scheduledHabit = todayItems?.find(
      (item: any) => item.sourceId === scheduledHabitId || item.id === scheduledHabitId
    );
    const linkedIdentityId = scheduledHabit?.identityId ?? null;

    await api.completeHabitInstance(scheduledHabitId);
    await fetchTodayData(); // use actual function name

    if (linkedIdentityId) {
      await refreshProgress();
      const updated = progress?.identities.find((i) => i.identityId === linkedIdentityId);
      if (updated) setCelebration(updated);
    }
  } catch (err) {
    console.error('Failed to complete habit:', err);
  }
};
```

> **Note:** The scheduled habit items in today's data may or may not carry `identityId`. If not, skip the identity lookup for now — the progress refresh still happens, the celebration just won't trigger for habits without identity context. This can be improved later (Task 6).

**Step 3: Verify no type errors**

```bash
cd timeflow/apps/web && npx tsc --noEmit 2>&1 | grep "today/page"
```
Expected: no output.

**Step 4: Commit**

```bash
cd timeflow && git add apps/web/src/app/today/page.tsx && git commit -m "feat: refresh identity progress on habit complete (Today page)"
```

---

## Task 5: Wire task completion to identity progress in TaskList component

**Files:**
- Modify: `apps/web/src/components/TaskList.tsx`

**What it does:** The Tasks page and embedded task lists also have a complete action. Wire the same pattern there.

**Step 1: Find how TaskList handles task completion**

```bash
grep -n "onComplete\|completeTask\|handleComplete" timeflow/apps/web/src/components/TaskList.tsx | head -10
```

**Step 2: Add imports to TaskList.tsx**

```typescript
import { useIdentityProgress } from '@/hooks/useIdentityProgress';
import { IdentityCelebrationModal } from '@/components/identity/IdentityCelebrationModal';
import type { IdentityDayProgress } from '@timeflow/shared';
```

**Step 3: Add hook + state inside the TaskList component**

```typescript
const { progress, refresh: refreshProgress } = useIdentityProgress();
const [celebration, setCelebration] = useState<IdentityDayProgress | null>(null);
```

**Step 4: Wrap existing complete handler to add identity refresh**

Find where `api.completeTask` is called (or `onComplete` is triggered) and add:

```typescript
const handleCompleteTask = async (taskId: string) => {
  const task = tasks.find((t) => t.id === taskId);
  const linkedIdentityId = task?.identityId ?? null;

  await api.completeTask(taskId);
  onTasksChanged?.(); // existing refresh call

  if (linkedIdentityId) {
    await refreshProgress();
    const updated = progress?.identities.find((i) => i.identityId === linkedIdentityId);
    if (updated) setCelebration(updated);
  }
};
```

**Step 5: Add modal to JSX**

```tsx
<IdentityCelebrationModal
  identity={celebration}
  onDismiss={() => setCelebration(null)}
/>
```

**Step 6: Verify no type errors**

```bash
cd timeflow/apps/web && npx tsc --noEmit 2>&1 | grep "TaskList"
```
Expected: no output.

**Step 7: Commit**

```bash
cd timeflow && git add apps/web/src/components/TaskList.tsx && git commit -m "feat: wire identity celebration to task completion in TaskList"
```

---

## Task 6: Wire What's Now Widget into Today page (18.21)

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`

**What it does:** The `WhatsNowWidget` component was already built (18.20 ✅) but never added to the Today page layout. This task places it in the correct position.

**Step 1: Find the WhatsNowWidget component**

```bash
find timeflow/apps/web/src -name "*WhatsNow*" -o -name "*whats-now*" | head -5
```

**Step 2: Check its props**

```bash
grep -n "export\|interface\|Props\|prop" $(find timeflow/apps/web/src -name "*WhatsNow*") | head -20
```

**Step 3: Add import to today/page.tsx**

```typescript
import { WhatsNowWidget } from '@/components/WhatsNowWidget'; // adjust path from step 1
```

**Step 4: Place widget in JSX**

In the Today page JSX, find the `IdentityProgressWidget` and place `WhatsNowWidget` directly below it:

```tsx
{/* What's Now — current and upcoming */}
<WhatsNowWidget />
```

> **Note:** Check the component's required props first (step 2) and pass whatever it needs (likely `events` and `tasks` which are already fetched on this page).

**Step 5: Verify build**

```bash
cd timeflow && npm run build:web 2>&1 | tail -10
```
Expected: exit 0, no type errors.

**Step 6: Commit**

```bash
cd timeflow && git add apps/web/src/app/today/page.tsx && git commit -m "feat: integrate WhatsNowWidget into Today page (18.21)"
```

---

## Task 7: Push and verify production

**Step 1: Push all commits**

```bash
cd timeflow && git push origin main
```

**Step 2: Watch Render deploy**

```bash
bash scripts/fetch-render-logs.sh --watch
```
Expected: `✅ Migrations complete!` then `🟢 LIVE`.

**Step 3: Watch Vercel deploy**

```bash
bash scripts/fetch-vercel-logs.sh --watch
```
Expected: `🟢 READY`.

**Step 4: Manual smoke test**

1. Open `time-flow.app`
2. Create a task linked to an identity
3. Complete the task — celebration modal should appear with identity icon + count
4. Check Today page header — identity pill count should have incremented
5. Repeat with a habit if you have scheduled habits

---

## Summary of roadmap items completed by this plan

| ID | Task | Status after plan |
|----|------|-------------------|
| 18.21 | Integrate What's Now Widget into Today page | ✅ Done in Task 6 |
| 18.29 | Wire task completion to identity progress updates | ✅ Done in Tasks 3 + 5 |
| 18.30 | Wire habit completion to identity progress updates | ✅ Done in Task 4 |
| 18.31 | Completion celebration modal showing identity impact | ✅ Done in Task 2 |
