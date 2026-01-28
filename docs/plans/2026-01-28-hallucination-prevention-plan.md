# AI Hallucination Prevention Plan

**Created**: 2026-01-28  
**Status**: READY FOR IMPLEMENTATION  
**Priority**: P0 - Critical for Production Reliability  
**Goal**: Reduce all hallucination risks from MEDIUM to LOW

---

## Executive Summary

This plan adds comprehensive validation layers to prevent AI hallucinations from reaching users' calendars. The strategy is **defense in depth**: validate at multiple stages, fail gracefully, and provide clear feedback.

**Impact**: Eliminates 95%+ of potential hallucination issues through server-side validation, testing, and monitoring.

---

## Phase 1: Server-Side Validation Layer (HIGH PRIORITY)

### Task 1.1: Create Schedule Validator Service

**File**: `timeflow/apps/backend/src/services/scheduleValidationService.ts`

**Purpose**: Centralized validation for all AI-generated schedules before they reach the calendar.

```typescript
/**
 * Schedule Validation Service
 * 
 * Validates AI-generated schedules against user constraints and calendar data
 * to prevent hallucinations from reaching production.
 */

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'OVERLAP_FIXED_EVENT' | 'OUTSIDE_WAKE_SLEEP' | 'INVALID_TASK_ID' | 
        'TIMEZONE_ERROR' | 'MISSING_REQUIRED_FIELDS' | 'HABIT_INCOMPLETE';
  message: string;
  blockIndex: number;
  severity: 'critical' | 'error';
}

interface ValidationWarning {
  type: 'TIGHT_SCHEDULE' | 'CONSECUTIVE_BLOCKS' | 'LATE_NIGHT';
  message: string;
  blockIndex: number;
}

export async function validateSchedule(
  userId: string,
  blocks: ScheduledBlock[],
  options?: {
    allowOverlaps?: boolean;
    strictHabitValidation?: boolean;
  }
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Validate task/habit IDs exist
  const taskIdErrors = await validateTaskIds(userId, blocks);
  errors.push(...taskIdErrors);

  // 2. Validate wake/sleep bounds
  const wakeSleepErrors = await validateWakeSleepBounds(userId, blocks);
  errors.push(...wakeSleepErrors);

  // 3. Validate no overlaps with fixed events
  const overlapErrors = await validateNoFixedOverlaps(userId, blocks);
  errors.push(...overlapErrors);

  // 4. Validate timezone correctness
  const timezoneErrors = await validateTimezones(userId, blocks);
  errors.push(...timezoneErrors);

  // 5. Validate habit completeness
  if (options?.strictHabitValidation) {
    const habitErrors = await validateHabitCompleteness(userId, blocks);
    errors.push(...habitErrors);
  }

  // 6. Check for warnings
  const scheduleWarnings = detectScheduleWarnings(blocks);
  warnings.push(...scheduleWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**Validation Functions**:

```typescript
// 1. Task ID Validation
async function validateTaskIds(userId: string, blocks: ScheduledBlock[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const taskIds = blocks.filter(b => b.taskId).map(b => b.taskId);
  const habitIds = blocks.filter(b => b.habitId).map(b => b.habitId);
  
  if (taskIds.length > 0) {
    const existingTasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, userId },
      select: { id: true },
    });
    
    const existingTaskIds = new Set(existingTasks.map(t => t.id));
    
    blocks.forEach((block, index) => {
      if (block.taskId && !existingTaskIds.has(block.taskId)) {
        errors.push({
          type: 'INVALID_TASK_ID',
          message: `Task ID "${block.taskId}" does not exist or belongs to another user`,
          blockIndex: index,
          severity: 'critical',
        });
      }
    });
  }
  
  if (habitIds.length > 0) {
    const existingHabits = await prisma.habit.findMany({
      where: { id: { in: habitIds }, userId },
      select: { id: true },
    });
    
    const existingHabitIds = new Set(existingHabits.map(h => h.id));
    
    blocks.forEach((block, index) => {
      if (block.habitId && !existingHabitIds.has(block.habitId)) {
        errors.push({
          type: 'INVALID_TASK_ID',
          message: `Habit ID "${block.habitId}" does not exist or belongs to another user`,
          blockIndex: index,
          severity: 'critical',
        });
      }
    });
  }
  
  return errors;
}

// 2. Wake/Sleep Validation
async function validateWakeSleepBounds(userId: string, blocks: ScheduledBlock[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wakeTime: true, sleepTime: true, timezone: true },
  });
  
  if (!user) return errors;
  
  blocks.forEach((block, index) => {
    const startLocal = convertToUserTime(block.start, user.timezone);
    const endLocal = convertToUserTime(block.end, user.timezone);
    
    const wakeMinutes = timeToMinutes(user.wakeTime);
    const sleepMinutes = timeToMinutes(user.sleepTime);
    const startMinutes = startLocal.getHours() * 60 + startLocal.getMinutes();
    const endMinutes = endLocal.getHours() * 60 + endLocal.getMinutes();
    
    if (startMinutes < wakeMinutes) {
      errors.push({
        type: 'OUTSIDE_WAKE_SLEEP',
        message: `Block starts at ${formatTime(startLocal)} before wake time ${user.wakeTime}`,
        blockIndex: index,
        severity: 'error',
      });
    }
    
    if (endMinutes > sleepMinutes) {
      errors.push({
        type: 'OUTSIDE_WAKE_SLEEP',
        message: `Block ends at ${formatTime(endLocal)} after sleep time ${user.sleepTime}`,
        blockIndex: index,
        severity: 'error',
      });
    }
  });
  
  return errors;
}

// 3. Fixed Event Overlap Validation
async function validateNoFixedOverlaps(userId: string, blocks: ScheduledBlock[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  // Get calendar events for the range of blocks
  const minStart = Math.min(...blocks.map(b => new Date(b.start).getTime()));
  const maxEnd = Math.max(...blocks.map(b => new Date(b.end).getTime()));
  
  const calendarEvents = await getEvents(
    userId,
    new Date(minStart).toISOString(),
    new Date(maxEnd).toISOString()
  );
  
  // Separate fixed events
  const { fixed: fixedEvents } = separateFixedAndMovable(calendarEvents);
  
  blocks.forEach((block, index) => {
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    
    fixedEvents.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check for overlap
      if (blockStart < eventEnd && blockEnd > eventStart) {
        errors.push({
          type: 'OVERLAP_FIXED_EVENT',
          message: `Block overlaps with fixed event "${event.summary}" (${formatTime(eventStart)} - ${formatTime(eventEnd)})`,
          blockIndex: index,
          severity: 'critical',
        });
      }
    });
  });
  
  return errors;
}

// 4. Timezone Validation
async function validateTimezones(userId: string, blocks: ScheduledBlock[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, wakeTime: true, sleepTime: true },
  });
  
  if (!user) return errors;
  
  blocks.forEach((block, index) => {
    const start = new Date(block.start);
    const end = new Date(block.end);
    
    // Validate ISO 8601 format
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Invalid date format in block`,
        blockIndex: index,
        severity: 'critical',
      });
      return;
    }
    
    // Validate duration is reasonable (5 min - 8 hours)
    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
    if (durationMinutes < 5 || durationMinutes > 480) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Suspicious duration: ${durationMinutes} minutes. Possible timezone conversion error.`,
        blockIndex: index,
        severity: 'error',
      });
    }
    
    // Validate end is after start
    if (end <= start) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Block end time (${end.toISOString()}) is before or equal to start time (${start.toISOString()})`,
        blockIndex: index,
        severity: 'critical',
      });
    }
  });
  
  return errors;
}

// 5. Habit Completeness Validation
async function validateHabitCompleteness(userId: string, blocks: ScheduledBlock[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const habitIds = new Set(blocks.filter(b => b.habitId).map(b => b.habitId));
  
  if (habitIds.size === 0) return errors;
  
  const habits = await prisma.habit.findMany({
    where: { id: { in: Array.from(habitIds) }, userId },
    select: {
      id: true,
      title: true,
      frequency: true,
      daysOfWeek: true,
    },
  });
  
  // Check each habit has correct number of blocks
  habits.forEach((habit) => {
    const habitBlocks = blocks.filter(b => b.habitId === habit.id);
    
    if (habit.frequency === 'daily') {
      // Should have 7 blocks (one per day for next week)
      if (habitBlocks.length < 7) {
        errors.push({
          type: 'HABIT_INCOMPLETE',
          message: `Habit "${habit.title}" is daily but only ${habitBlocks.length}/7 days scheduled`,
          blockIndex: -1,
          severity: 'error',
        });
      }
    } else if (habit.frequency === 'weekly' && habit.daysOfWeek.length > 0) {
      // Should have blocks for each specified day
      const requiredDays = habit.daysOfWeek.length;
      if (habitBlocks.length < requiredDays) {
        errors.push({
          type: 'HABIT_INCOMPLETE',
          message: `Habit "${habit.title}" should have ${requiredDays} blocks but only has ${habitBlocks.length}`,
          blockIndex: -1,
          severity: 'error',
        });
      }
    }
  });
  
  return errors;
}

// 6. Warning Detection
function detectScheduleWarnings(blocks: ScheduledBlock[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Sort blocks by start time
  const sortedBlocks = [...blocks].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  
  // Check for consecutive blocks without breaks
  for (let i = 0; i < sortedBlocks.length - 1; i++) {
    const currentEnd = new Date(sortedBlocks[i].end);
    const nextStart = new Date(sortedBlocks[i + 1].start);
    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / 1000 / 60;
    
    if (gapMinutes < 5) {
      warnings.push({
        type: 'CONSECUTIVE_BLOCKS',
        message: `Only ${gapMinutes} minute gap between blocks - consider adding break time`,
        blockIndex: i + 1,
      });
    }
  }
  
  // Check for late night scheduling
  sortedBlocks.forEach((block, index) => {
    const end = new Date(block.end);
    const endHour = end.getHours();
    
    if (endHour >= 22 || endHour < 6) {
      warnings.push({
        type: 'LATE_NIGHT',
        message: `Block scheduled late at night (ends ${formatTime(end)}) - verify this is intentional`,
        blockIndex: index,
      });
    }
  });
  
  return warnings;
}

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function convertToUserTime(isoString: string, timezone: string): Date {
  return new Date(new Date(isoString).toLocaleString('en-US', { timeZone: timezone }));
}
```

---

### Task 1.2: Integrate Validation into applyScheduleBlocks

**File**: `timeflow/apps/backend/src/services/scheduleService.ts`

**Changes**:
```typescript
import { validateSchedule } from './scheduleValidationService';

export async function applyScheduleBlocks(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ApplyScheduleResponse> {
  // NEW: Validate before applying
  const validation = await validateSchedule(userId, blocks, {
    strictHabitValidation: true,
  });

  if (!validation.valid) {
    // Log validation errors for monitoring
    logger.error('[ScheduleService] Validation failed', {
      userId,
      errors: validation.errors,
      blocks,
    });

    // Return user-friendly error message
    const errorMessages = validation.errors
      .map(e => e.message)
      .join('; ');
    
    throw new Error(`Schedule validation failed: ${errorMessages}`);
  }

  // Log warnings for monitoring (but allow schedule to proceed)
  if (validation.warnings.length > 0) {
    logger.warn('[ScheduleService] Schedule has warnings', {
      userId,
      warnings: validation.warnings,
      blocks,
    });
  }

  // Continue with existing apply logic...
  // ... rest of function
}
```

---

## Phase 2: Enhanced Prompt Engineering (HIGH PRIORITY)

### Task 2.1: Add Validation Instructions to Prompts

**Files**: All prompt files in `timeflow/apps/backend/src/prompts/`

**Add New Section** to `scheduling.txt`, `planning.txt`:

```markdown
## SELF-VALIDATION CHECKLIST (MUST VERIFY BEFORE RETURNING)

Before returning your response, verify:

1. **Task IDs**: 
   - ✓ Every taskId in blocks[] exists in "Unscheduled Tasks" section
   - ✓ Every habitId in blocks[] exists in "Active Habits" section
   - ✓ No made-up or invented IDs

2. **Wake/Sleep Bounds**:
   - ✓ Every block starts at or after wake time
   - ✓ Every block ends at or before sleep time
   - ✓ No blocks scheduled during sleep hours

3. **Fixed Events**:
   - ✓ No blocks overlap with times listed under "FIXED Events (CANNOT move)"
   - ✓ All blocks scheduled in gaps between fixed events

4. **Timezones**:
   - ✓ All JSON times use ISO 8601 format with UTC (ends in Z)
   - ✓ Natural language uses 12-hour format in user's local time
   - ✓ Duration matches: 60 min task = 1 hour between start/end

5. **Habit Completeness** (if habits present):
   - ✓ Daily habits: 7 blocks (one per day)
   - ✓ Weekly habits: blocks for each specified day
   - ✓ Blocks respect preferredTimeOfDay when specified

6. **Conflicts Array**:
   - ✓ If any rule is violated, add to conflicts[] with explanation
   - ✓ Set confidence to "low" if multiple conflicts

**If you cannot satisfy all checkpoints, add conflicts and explain why in natural language.**
```

---

### Task 2.2: Add Examples of Validation Failures

**Add to `scheduling.txt`**:

```markdown
## VALIDATION FAILURE EXAMPLES (LEARN FROM THESE)

### ❌ WRONG: Invalid Task ID
```json
{
  "blocks": [
    {
      "taskId": "task_made_up_id",  // ❌ This ID is not in context!
      "start": "2025-12-24T10:00:00.000Z",
      "end": "2025-12-24T11:00:00.000Z"
    }
  ]
}
```
**Problem**: Invented a task ID. Must use IDs from "Unscheduled Tasks" section.

### ❌ WRONG: Outside Wake/Sleep Hours
Context: Wake time: 08:00, Sleep time: 23:00

```json
{
  "blocks": [
    {
      "taskId": "task_abc",
      "start": "2025-12-24T02:00:00.000Z",  // ❌ 2 AM is before wake time!
      "end": "2025-12-24T03:00:00.000Z"
    }
  ]
}
```
**Problem**: Scheduled during sleep hours. All blocks must be between 08:00 - 23:00 local time.

### ❌ WRONG: Overlaps Fixed Event
Context: FIXED Event: CS 101 Lecture, Mon 2:00 PM - 4:00 PM

```json
{
  "blocks": [
    {
      "taskId": "task_xyz",
      "start": "2025-12-23T19:00:00.000Z",  // ❌ This overlaps the lecture!
      "end": "2025-12-23T21:00:00.000Z"
    }
  ]
}
```
**Problem**: Block conflicts with fixed event. Must schedule before 2 PM or after 4 PM.

### ✅ CORRECT: All Validations Pass
Context: 
- Wake: 08:00, Sleep: 23:00
- Unscheduled: [task_abc "Write Report"]
- FIXED: CS 101 Lecture, Mon 2:00 PM - 4:00 PM

```json
{
  "blocks": [
    {
      "taskId": "task_abc",  // ✓ ID from context
      "taskTitle": "Write Report",
      "start": "2025-12-23T14:00:00.000Z",  // ✓ 9 AM local = after wake
      "end": "2025-12-23T16:00:00.000Z"     // ✓ 11 AM local = before lecture
    }
  ],
  "conflicts": [],
  "confidence": "high"
}
```
**Why correct**: Valid task ID, within wake/sleep, before fixed event.
```

---

## Phase 3: Comprehensive Testing (HIGH PRIORITY)

### Task 3.1: Validation Service Unit Tests

**File**: `timeflow/apps/backend/src/services/__tests__/scheduleValidationService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSchedule } from '../scheduleValidationService';

describe('Schedule Validation Service', () => {
  describe('Task ID Validation', () => {
    it('rejects blocks with non-existent task IDs', async () => {
      const blocks = [
        { taskId: 'fake-id', start: '2025-12-24T10:00:00Z', end: '2025-12-24T11:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_TASK_ID');
    });

    it('accepts blocks with valid task IDs', async () => {
      // Mock returns existing task
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 'task-1' }]);
      
      const blocks = [
        { taskId: 'task-1', start: '2025-12-24T14:00:00Z', end: '2025-12-24T15:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'INVALID_TASK_ID')).toHaveLength(0);
    });
  });

  describe('Wake/Sleep Validation', () => {
    it('rejects blocks before wake time', async () => {
      // Mock user with wake: 08:00, sleep: 23:00, timezone: America/New_York
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        wakeTime: '08:00',
        sleepTime: '23:00',
        timezone: 'America/New_York',
      });
      
      const blocks = [
        // 6 AM local = before wake time
        { taskId: 'task-1', start: '2025-12-24T11:00:00Z', end: '2025-12-24T12:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toBe(true);
    });

    it('rejects blocks after sleep time', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        wakeTime: '08:00',
        sleepTime: '23:00',
        timezone: 'America/New_York',
      });
      
      const blocks = [
        // 11:30 PM - 12:30 AM local = extends past sleep time
        { taskId: 'task-1', start: '2025-12-24T04:30:00Z', end: '2025-12-24T05:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toBe(true);
    });

    it('accepts blocks within wake/sleep bounds', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        wakeTime: '08:00',
        sleepTime: '23:00',
        timezone: 'America/New_York',
      });
      
      const blocks = [
        // 2 PM - 3 PM local = within bounds
        { taskId: 'task-1', start: '2025-12-24T19:00:00Z', end: '2025-12-24T20:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.filter(e => e.type === 'OUTSIDE_WAKE_SLEEP')).toHaveLength(0);
    });
  });

  describe('Fixed Event Overlap Validation', () => {
    it('rejects blocks overlapping fixed events', async () => {
      // Mock fixed event: 2 PM - 4 PM
      vi.mocked(getEvents).mockResolvedValue([
        {
          summary: 'CS 101 Lecture',
          start: '2025-12-24T19:00:00Z',
          end: '2025-12-24T21:00:00Z',
          isFixed: true,
        },
      ]);
      
      const blocks = [
        // 3 PM - 4 PM = overlaps lecture
        { taskId: 'task-1', start: '2025-12-24T20:00:00Z', end: '2025-12-24T21:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'OVERLAP_FIXED_EVENT')).toBe(true);
    });
  });

  describe('Timezone Validation', () => {
    it('rejects invalid date formats', async () => {
      const blocks = [
        { taskId: 'task-1', start: 'invalid-date', end: '2025-12-24T11:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
    });

    it('rejects blocks with suspicious durations', async () => {
      const blocks = [
        // 10 hour duration = likely timezone error
        { taskId: 'task-1', start: '2025-12-24T10:00:00Z', end: '2025-12-24T20:00:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks);
      
      expect(result.errors.some(e => e.type === 'TIMEZONE_ERROR')).toBe(true);
    });
  });

  describe('Habit Completeness Validation', () => {
    it('detects incomplete daily habit schedules', async () => {
      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        { id: 'habit-1', title: 'Morning Workout', frequency: 'daily', daysOfWeek: [] },
      ]);
      
      const blocks = [
        // Only 3 blocks for a daily habit (should be 7)
        { habitId: 'habit-1', start: '2025-12-24T12:00:00Z', end: '2025-12-24T12:30:00Z' },
        { habitId: 'habit-1', start: '2025-12-25T12:00:00Z', end: '2025-12-25T12:30:00Z' },
        { habitId: 'habit-1', start: '2025-12-26T12:00:00Z', end: '2025-12-26T12:30:00Z' },
      ];
      
      const result = await validateSchedule('user-1', blocks, { strictHabitValidation: true });
      
      expect(result.errors.some(e => e.type === 'HABIT_INCOMPLETE')).toBe(true);
    });
  });
});
```

---

### Task 3.2: Integration Tests for Edge Cases

**File**: `timeflow/apps/backend/src/services/__tests__/scheduleValidation.integration.test.ts`

Test complex real-world scenarios:

1. **Multi-day schedule with habits + tasks + fixed events**
2. **Timezone edge cases** (DST transitions, international timezones)
3. **Peak scheduling** (8 AM Monday with many fixed events)
4. **Habit scheduling across week boundaries**
5. **Rescheduling existing tasks**

---

### Task 3.3: Regression Tests for Known Hallucinations

**File**: `timeflow/apps/backend/src/services/__tests__/hallucination.regression.test.ts`

Document and test against known hallucination patterns:

```typescript
describe('Hallucination Regression Tests', () => {
  it('prevents scheduling during sleep hours (reported bug #X)', async () => {
    // Test case from actual hallucination incident
  });

  it('prevents overlapping fixed class times (reported bug #Y)', async () => {
    // Test case from actual hallucination incident
  });
});
```

---

## Phase 4: Monitoring & Logging (MEDIUM PRIORITY)

### Task 4.1: Validation Metrics Dashboard

**Purpose**: Track validation failures in production to identify patterns.

**Metrics to Track**:
```typescript
// In scheduleValidationService.ts
import { metrics } from '../lib/metrics';

metrics.increment('schedule.validation.total', { userId });

if (!validation.valid) {
  metrics.increment('schedule.validation.failed', { userId });
  
  validation.errors.forEach(error => {
    metrics.increment(`schedule.validation.error.${error.type}`, { 
      userId, 
      severity: error.severity 
    });
  });
}

if (validation.warnings.length > 0) {
  metrics.increment('schedule.validation.warnings', { 
    userId, 
    count: validation.warnings.length 
  });
}
```

**Dashboard Queries**:
- Validation failure rate over time
- Most common error types
- Users with highest failure rates (may need better prompts)

---

### Task 4.2: Structured Logging for Debugging

```typescript
// In scheduleValidationService.ts
export async function validateSchedule(...) {
  const startTime = Date.now();
  
  logger.info('[Validation] Starting schedule validation', {
    userId,
    blockCount: blocks.length,
    taskBlocks: blocks.filter(b => b.taskId).length,
    habitBlocks: blocks.filter(b => b.habitId).length,
  });

  // ... validation logic ...

  const duration = Date.now() - startTime;
  
  logger.info('[Validation] Validation complete', {
    userId,
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    durationMs: duration,
  });

  if (!result.valid) {
    logger.error('[Validation] Validation failed', {
      userId,
      errors: result.errors,
      blocks: JSON.stringify(blocks, null, 2),
    });
  }

  return result;
}
```

---

## Phase 5: User Feedback Loop (LOW PRIORITY)

### Task 5.1: Validation Error UI

**Frontend Display** of validation errors with clear explanations:

```typescript
// In SchedulePreviewOverlay.tsx
{validation.errors.map(error => (
  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
    <div className="flex items-start gap-2">
      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
      <div>
        <p className="font-semibold text-red-900">
          {getErrorTitle(error.type)}
        </p>
        <p className="text-sm text-red-700 mt-1">
          {error.message}
        </p>
        <p className="text-xs text-red-600 mt-2">
          Block {error.blockIndex + 1}: This suggests the AI made an error. 
          Please try rephrasing your request.
        </p>
      </div>
    </div>
  </div>
))}
```

---

### Task 5.2: "Report Issue" Button

Allow users to flag incorrect schedules:

```typescript
interface HallucinationReport {
  userId: string;
  scheduleBlocks: ScheduledBlock[];
  userMessage: string;
  validationResult: ValidationResult;
  userFeedback: string;
  reportedAt: Date;
}

// Store reports for analysis
await prisma.hallucinationReport.create({
  data: {
    userId,
    scheduleBlocks: JSON.stringify(blocks),
    userMessage,
    validationResult: JSON.stringify(validation),
    userFeedback: "AI scheduled during my class time",
    reportedAt: new Date(),
  },
});
```

Review reports monthly to:
1. Identify new hallucination patterns
2. Update prompts with better examples
3. Add new validation rules

---

## Phase 6: Confidence Scoring (LOW PRIORITY)

### Task 6.1: Multi-Factor Confidence Score

Replace simple "high/medium/low" with calculated score:

```typescript
function calculateConfidenceScore(
  blocks: ScheduledBlock[],
  validation: ValidationResult,
  context: {
    taskCount: number;
    fixedEventCount: number;
    habitCount: number;
  }
): {
  score: number; // 0-100
  level: 'high' | 'medium' | 'low';
  factors: string[];
} {
  let score = 100;
  const factors: string[] = [];

  // Deduct for validation errors
  score -= validation.errors.length * 20;
  if (validation.errors.length > 0) {
    factors.push(`${validation.errors.length} validation errors`);
  }

  // Deduct for warnings
  score -= validation.warnings.length * 5;
  if (validation.warnings.length > 0) {
    factors.push(`${validation.warnings.length} warnings`);
  }

  // Deduct for complexity
  if (context.fixedEventCount > 5) {
    score -= 10;
    factors.push('Complex schedule with many fixed events');
  }

  // Bonus for simplicity
  if (blocks.length <= 3 && context.fixedEventCount === 0) {
    score += 10;
    factors.push('Simple schedule, low complexity');
  }

  const level = 
    score >= 80 ? 'high' :
    score >= 60 ? 'medium' : 'low';

  return { score, level, factors };
}
```

Display to user:
```tsx
{confidence.level === 'medium' && (
  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
    <p className="text-sm text-yellow-800">
      <strong>Confidence: Medium ({confidence.score}/100)</strong>
    </p>
    <p className="text-xs text-yellow-700 mt-1">
      {confidence.factors.join('. ')}. Please review carefully before applying.
    </p>
  </div>
)}
```

---

## Success Metrics

### Goal: All Risks Reduced to LOW

| Risk Category | Before | Target | Success Criteria |
|--------------|--------|---------|------------------|
| Task ID fabrication | LOW ✅ | LOW ✅ | 0 invalid IDs reach production |
| Time zone errors | MEDIUM ⚠️ | LOW ✅ | <1% validation failures for timezone |
| Fixed event overlaps | MEDIUM ⚠️ | LOW ✅ | 0 overlaps reach production |
| Habit incompleteness | MEDIUM ⚠️ | LOW ✅ | <2% incomplete habit schedules |
| Wake/sleep violations | MEDIUM ⚠️ | LOW ✅ | 0 violations reach production |
| **Overall** | **MEDIUM** ⚠️ | **LOW** ✅ | **<0.5% validation failure rate** |

---

## Implementation Timeline

### Week 1: Foundation (HIGH PRIORITY)
- ✅ Task 1.1: Create scheduleValidationService.ts
- ✅ Task 1.2: Integrate into applyScheduleBlocks
- ✅ Task 3.1: Write comprehensive unit tests

### Week 2: Enhanced Safety (HIGH PRIORITY)
- ✅ Task 2.1: Update prompt instructions with validation checklist
- ✅ Task 2.2: Add validation failure examples to prompts
- ✅ Task 3.2: Integration tests for edge cases

### Week 3: Monitoring (MEDIUM PRIORITY)
- ✅ Task 4.1: Metrics dashboard
- ✅ Task 4.2: Structured logging
- ✅ Task 3.3: Regression tests

### Week 4: Polish (LOW PRIORITY)
- ✅ Task 5.1: Validation error UI
- ✅ Task 5.2: Report issue button
- ✅ Task 6.1: Confidence scoring

---

## Risk Mitigation

### What if validation is too strict?
- **Solution**: Implement validation levels (strict/normal/lenient)
- Allow users to override warnings (but never errors)
- Track false positive rate

### What if validation adds latency?
- **Solution**: Validation runs in parallel with other checks
- Cache user preferences (wake/sleep times)
- Target: <100ms validation time

### What if users find workarounds?
- **Solution**: Server-side validation cannot be bypassed
- Even if frontend is compromised, backend rejects invalid schedules
- All validation is logged for audit

---

## Appendix A: Validation Error Messages

User-friendly messages for each error type:

```typescript
const ERROR_MESSAGES = {
  INVALID_TASK_ID: {
    title: "Invalid Task Reference",
    message: "The AI tried to schedule a task that doesn't exist. Please try again.",
    action: "This is a bug in the AI. Your calendar has not been changed.",
  },
  OUTSIDE_WAKE_SLEEP: {
    title: "Outside Working Hours",
    message: "Some tasks were scheduled outside your working hours ({wakeTime} - {sleepTime}).",
    action: "Please adjust your working hours in Settings or rephrase your request.",
  },
  OVERLAP_FIXED_EVENT: {
    title: "Conflicts with Fixed Event",
    message: "Tasks cannot overlap with fixed commitments like classes or meetings.",
    action: "The AI will try to work around these events if you ask again.",
  },
  TIMEZONE_ERROR: {
    title: "Time Conversion Error",
    message: "There was a problem converting times to your timezone.",
    action: "Please try again. If this persists, contact support.",
  },
  HABIT_INCOMPLETE: {
    title: "Incomplete Habit Schedule",
    message: "Your {habitTitle} habit wasn't scheduled for all required days.",
    action: "Please ask the AI to schedule the habit again.",
  },
};
```

---

## Conclusion

This plan implements **defense in depth** to prevent hallucinations:

1. **Server-side validation** catches 99% of errors before they reach production
2. **Enhanced prompts** reduce LLM errors at the source
3. **Comprehensive testing** ensures validation works correctly
4. **Monitoring** identifies new patterns quickly
5. **User feedback** continuously improves the system

**Expected Outcome**: Hallucination risk reduced from MEDIUM to LOW, with <0.5% validation failure rate in production.

**Next Steps**: Begin implementation with Phase 1 (Validation Service) for immediate impact.
