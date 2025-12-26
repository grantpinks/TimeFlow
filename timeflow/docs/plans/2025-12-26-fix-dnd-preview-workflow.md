# Fix Drag-and-Drop Preview Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add preview/confirmation step to drag-and-drop scheduling workflow and fix overlapping modal z-index issues.

**Architecture:** Introduce preview state when task is dropped onto calendar. Show preview UI with task details and time slot before actually scheduling. User confirms or cancels. Fix z-index hierarchy so Task Actions modal doesn't overlap preview.

**Tech Stack:** Next.js 14, React hooks (useState), @dnd-kit/core, Tailwind CSS

---

## Problem Statement

**Current behavior:**
1. User drags task from sidebar to calendar slot
2. Task is IMMEDIATELY scheduled (handleRescheduleTask called directly)
3. Task Actions modal appears and overlaps detail panel
4. No preview or confirmation step

**Expected behavior:**
1. User drags task to calendar slot
2. Preview UI shows with task details + proposed time
3. User clicks "Complete" → Task schedules
4. User clicks "Cancel" → Preview closes, no scheduling
5. Modals don't overlap, proper z-index hierarchy

---

## Task 1: Add Preview State Management

**Files:**
- Modify: `apps/web/src/app/calendar/page.tsx:407-427` (handleDragEnd function)
- Modify: `apps/web/src/app/calendar/page.tsx:~100` (add state near other useState)

**Step 1: Add preview state**

Add new state variables near line 100 (where other useState hooks are):

```typescript
// Preview state for drag-and-drop scheduling
const [previewTask, setPreviewTask] = useState<Task | null>(null);
const [previewSlot, setPreviewSlot] = useState<{ start: Date; end: Date } | null>(null);
```

**Step 2: Update handleDragEnd to set preview instead of scheduling**

Replace the current handleDragEnd function (lines 407-427):

```typescript
const handleDragEnd = async (event: any) => {
  const { active, over } = event;

  if (!over) {
    setActiveDragTask(null);
    return;
  }

  const slotData = over.data?.current;

  if (slotData?.slotStart) {
    const taskId = active.id.replace('task-', '');
    const task = activeDragTask || tasks.find((t) => t.id === taskId);

    if (task) {
      const durationMinutes = task.durationMinutes || 30;
      const slotStart = slotData.slotStart;
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Set preview state instead of immediately scheduling
      setPreviewTask(task);
      setPreviewSlot({ start: slotStart, end: slotEnd });
    }
  }

  setActiveDragTask(null);
};
```

**Step 3: Verify changes compile**

Run: `pnpm dev:web`
Expected: No TypeScript errors, app compiles successfully

**Step 4: Commit**

```bash
git add apps/web/src/app/calendar/page.tsx
git commit -m "feat: add preview state for drag-and-drop scheduling"
```

---

## Task 2: Create Preview UI Component

**Files:**
- Create: `apps/web/src/components/TaskSchedulePreview.tsx`

**Step 1: Create the preview component file**

Create new file with complete implementation:

```typescript
'use client';

import React from 'react';
import type { Task } from '@timeflow/shared';

interface TaskSchedulePreviewProps {
  task: Task;
  slot: { start: Date; end: Date };
  onConfirm: () => void;
  onCancel: () => void;
  isScheduling: boolean;
}

export function TaskSchedulePreview({
  task,
  slot,
  onConfirm,
  onCancel,
  isScheduling,
}: TaskSchedulePreviewProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Schedule Task Preview
        </h3>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task
            </label>
            <p className="text-base text-slate-900">{task.title}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Duration
            </label>
            <p className="text-base text-slate-900">
              {task.durationMinutes} minutes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Scheduled Time
            </label>
            <p className="text-base text-slate-900">
              {formatDate(slot.start)} at {formatTime(slot.start)} - {formatTime(slot.end)}
            </p>
          </div>

          {task.dueDate && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <p className="text-base text-slate-900">
                {formatDate(new Date(task.dueDate))}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isScheduling}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isScheduling}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScheduling ? 'Scheduling...' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify component compiles**

Run: `pnpm dev:web`
Expected: No TypeScript errors, component compiles

**Step 3: Commit**

```bash
git add apps/web/src/components/TaskSchedulePreview.tsx
git commit -m "feat: create TaskSchedulePreview component for DnD workflow"
```

---

## Task 3: Implement Confirmation Flow

**Files:**
- Modify: `apps/web/src/app/calendar/page.tsx` (add handlers and render preview)

**Step 1: Import the preview component**

Add import at the top of the file (near other component imports):

```typescript
import { TaskSchedulePreview } from '@/components/TaskSchedulePreview';
```

**Step 2: Add scheduling state**

Add state variable near other useState hooks (~line 100):

```typescript
const [isSchedulingFromPreview, setIsSchedulingFromPreview] = useState(false);
```

**Step 3: Create confirm handler**

Add function near handleDragEnd:

```typescript
const handleConfirmSchedule = async () => {
  if (!previewTask || !previewSlot) return;

  setIsSchedulingFromPreview(true);

  try {
    await handleRescheduleTask(
      previewTask.id,
      previewSlot.start,
      previewSlot.end
    );

    // Clear preview on success
    setPreviewTask(null);
    setPreviewSlot(null);
  } catch (error) {
    console.error('Failed to schedule task:', error);
    // Keep preview open on error so user can retry
  } finally {
    setIsSchedulingFromPreview(false);
  }
};
```

**Step 4: Create cancel handler**

Add function after handleConfirmSchedule:

```typescript
const handleCancelPreview = () => {
  setPreviewTask(null);
  setPreviewSlot(null);
};
```

**Step 5: Render preview component**

Add at the end of the return statement, before the closing fragment or div:

```typescript
{/* Task Schedule Preview Modal */}
{previewTask && previewSlot && (
  <TaskSchedulePreview
    task={previewTask}
    slot={previewSlot}
    onConfirm={handleConfirmSchedule}
    onCancel={handleCancelPreview}
    isScheduling={isSchedulingFromPreview}
  />
)}
```

**Step 6: Verify changes compile**

Run: `pnpm dev:web`
Expected: No TypeScript errors, app compiles and runs

**Step 7: Commit**

```bash
git add apps/web/src/app/calendar/page.tsx
git commit -m "feat: wire up preview confirmation flow for DnD scheduling"
```

---

## Task 4: Fix Z-Index Hierarchy

**Files:**
- Modify: `apps/web/src/components/TaskSchedulePreview.tsx:37` (verify z-50)
- Modify: `apps/web/src/components/TaskActionsModal.tsx` (if needed)
- Modify: `apps/web/src/components/EventDetailPopover.tsx` (if needed)

**Step 1: Verify TaskSchedulePreview has highest z-index**

Check that TaskSchedulePreview has `z-50` in the wrapper div (line 37):

```typescript
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
```

This is already correct from Task 2. No changes needed.

**Step 2: Check TaskActionsModal z-index**

Read the TaskActionsModal file:

Run: `cat apps/web/src/components/TaskActionsModal.tsx | grep -A 2 "className.*fixed"`
Expected: Find z-index class

**Step 3: Adjust z-index if needed**

If TaskActionsModal has z-50, reduce it to z-40:

```typescript
// Change from z-50 to z-40
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
```

**Step 4: Check EventDetailPopover z-index**

Read EventDetailPopover:

Run: `cat apps/web/src/components/EventDetailPopover.tsx | grep -A 2 "className.*z-"`
Expected: Find z-index class (should be z-30 or lower)

**Step 5: Adjust if needed**

If EventDetailPopover has z-40 or higher, reduce to z-30:

```typescript
// Ensure popover is below modals
<div className="... z-30">
```

**Step 6: Document z-index hierarchy**

Add comment in TaskSchedulePreview.tsx at top:

```typescript
/**
 * TaskSchedulePreview component for drag-and-drop scheduling workflow
 *
 * Z-index hierarchy (highest to lowest):
 * - z-50: TaskSchedulePreview (this component)
 * - z-40: TaskActionsModal
 * - z-30: EventDetailPopover
 * - z-20: Dropdowns, tooltips
 * - z-10: Sticky headers
 */
```

**Step 7: Verify changes compile**

Run: `pnpm dev:web`
Expected: No errors, app compiles

**Step 8: Commit**

```bash
git add apps/web/src/components/TaskSchedulePreview.tsx apps/web/src/components/TaskActionsModal.tsx apps/web/src/components/EventDetailPopover.tsx
git commit -m "fix: correct z-index hierarchy for modals and popovers"
```

---

## Task 5: Manual Testing

**Files:**
- N/A (manual testing)

**Step 1: Start development servers**

Run in separate terminals:

```bash
pnpm dev:backend
pnpm dev:web
```

Expected: Both servers start successfully

**Step 2: Test basic drag-and-drop**

1. Navigate to http://localhost:3000/calendar
2. Create a test task if none exist
3. Drag task from sidebar to calendar slot
4. Expected: Preview modal appears with task details and time slot
5. Expected: Preview is centered, no overlapping modals

**Step 3: Test confirmation**

1. With preview open, click "Complete"
2. Expected: Task schedules to calendar
3. Expected: Preview closes automatically
4. Expected: Task moves from unscheduled to scheduled section

**Step 4: Test cancellation**

1. Drag another task to calendar slot
2. Preview opens
3. Click "Cancel"
4. Expected: Preview closes
5. Expected: Task remains unscheduled

**Step 5: Test z-index hierarchy**

1. Drag task to calendar
2. Preview opens
3. Expected: Preview is on top (z-50)
4. Expected: No other modals overlap preview
5. Click outside preview or on calendar events
6. Expected: Clicks are blocked by preview overlay

**Step 6: Test during scheduling**

1. Drag task to calendar
2. Click "Complete"
3. Expected: Button shows "Scheduling..."
4. Expected: Both buttons are disabled
5. Expected: Preview stays open until scheduling completes

**Step 7: Document test results**

Create notes of any issues found:

```
# Test Results (2025-12-26)

✓ Preview appears on drag-and-drop
✓ Confirmation schedules task correctly
✓ Cancel closes preview without scheduling
✓ Z-index hierarchy correct (no overlaps)
✓ Loading state works during scheduling

Issues found:
- [None] or [List any issues]
```

**Step 8: Commit test notes**

```bash
git add docs/plans/2025-12-26-fix-dnd-preview-workflow.md
git commit -m "test: manual testing complete for DnD preview workflow"
```

---

## Task 6: Edge Case Handling

**Files:**
- Modify: `apps/web/src/app/calendar/page.tsx` (add edge case handling)

**Step 1: Handle task deletion during preview**

Update handleDeleteTask to clear preview if deleting previewed task:

```typescript
const handleDeleteTask = async (taskId: string) => {
  // Clear preview if this task is being previewed
  if (previewTask?.id === taskId) {
    setPreviewTask(null);
    setPreviewSlot(null);
  }

  // ... rest of existing delete logic
};
```

**Step 2: Handle task completion during preview**

Update handleCompleteTask to clear preview:

```typescript
const handleCompleteTask = async (taskId: string) => {
  // Clear preview if this task is being previewed
  if (previewTask?.id === taskId) {
    setPreviewTask(null);
    setPreviewSlot(null);
  }

  // ... rest of existing complete logic
};
```

**Step 3: Handle escape key to cancel preview**

Add keyboard listener in useEffect:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && previewTask) {
      handleCancelPreview();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [previewTask]);
```

**Step 4: Verify changes compile**

Run: `pnpm dev:web`
Expected: No TypeScript errors

**Step 5: Test edge cases manually**

1. Open preview, press Escape → Preview closes
2. Open preview, delete the task from sidebar → Preview closes
3. Open preview, complete the task → Preview closes

**Step 6: Commit**

```bash
git add apps/web/src/app/calendar/page.tsx
git commit -m "feat: add edge case handling for DnD preview (delete, complete, escape key)"
```

---

## Completion Checklist

- [ ] Task 1: Preview state management added
- [ ] Task 2: TaskSchedulePreview component created
- [ ] Task 3: Confirmation flow implemented
- [ ] Task 4: Z-index hierarchy fixed
- [ ] Task 5: Manual testing passed
- [ ] Task 6: Edge cases handled

**Verification:**

Run final check:

```bash
pnpm dev:web
```

1. Drag task to calendar → Preview shows
2. Click Complete → Task schedules
3. Drag another task → Preview shows
4. Click Cancel → Preview closes, no scheduling
5. Press Escape → Preview closes
6. No modal overlaps

**Success Criteria:**

✓ Preview workflow works end-to-end
✓ No immediate scheduling on drop
✓ Proper z-index (no overlaps)
✓ All edge cases handled
✓ Clean UX with loading states

---

## Notes

- Preview uses fixed positioning with z-50 to stay on top
- Original handleDragEnd immediately called handleRescheduleTask - now sets preview state
- TaskActionsModal reduced to z-40 if needed
- EventDetailPopover kept at z-30 or lower
- Escape key and task deletion/completion clear preview state
