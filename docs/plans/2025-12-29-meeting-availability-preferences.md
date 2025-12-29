# Meeting Availability Preferences Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user-configurable meeting-specific availability preferences (meeting hours, blocked days, per-day schedules) separate from general wake/sleep times.

**Architecture:** Extend User model with meeting-specific JSON fields following existing `dailySchedule` pattern. Update availability calculation to use meeting preferences when building slots for scheduling links. Add settings UI section mirroring wake/sleep configuration pattern.

**Tech Stack:** Prisma, TypeScript, Zod validation, React, Tailwind CSS, Luxon

---

## Task 1: Add Meeting Preference Types to Shared Package

**Files:**
- Modify: `timeflow/packages/shared/src/types/user.ts`

**Step 1: Add meeting day configuration types**

Add after the existing `DailyScheduleConfig` interface (around line 20):

```typescript
/**
 * Meeting availability for a specific day
 */
export interface MeetingDayConfig {
  isAvailable: boolean;           // Whether meetings are allowed on this day
  startTime?: string;              // HH:mm - earliest meeting time (if different from wakeTime)
  endTime?: string;                // HH:mm - latest meeting time (if different from sleepTime)
  maxMeetings?: number;            // Max meetings allowed on this day
}

/**
 * Per-day meeting availability configuration
 */
export interface DailyMeetingConfig {
  monday?: MeetingDayConfig;
  tuesday?: MeetingDayConfig;
  wednesday?: MeetingDayConfig;
  thursday?: MeetingDayConfig;
  friday?: MeetingDayConfig;
  saturday?: MeetingDayConfig;
  sunday?: MeetingDayConfig;
}
```

**Step 2: Update UserProfile interface**

Add to `UserProfile` interface (around line 45):

```typescript
export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;

  // Meeting-specific preferences
  meetingStartTime?: string | null;        // Default earliest meeting time
  meetingEndTime?: string | null;          // Default latest meeting time
  blockedDaysOfWeek?: string[];            // Days where NO meetings allowed (e.g., ["saturday", "sunday"])
  dailyMeetingSchedule?: DailyMeetingConfig | null;  // Per-day meeting config
}
```

**Step 3: Update UserPreferencesUpdate interface**

Add to `UserPreferencesUpdate` interface (around line 60):

```typescript
export interface UserPreferencesUpdate {
  wakeTime?: string;
  sleepTime?: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
  timeZone?: string;
  defaultTaskDurationMinutes?: number;
  defaultCalendarId?: string;

  // Meeting-specific preferences
  meetingStartTime?: string | null;
  meetingEndTime?: string | null;
  blockedDaysOfWeek?: string[];
  dailyMeetingSchedule?: DailyMeetingConfig | null;
}
```

**Step 4: Build the package**

Run: `cd timeflow/packages/shared && pnpm build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit**

```bash
cd timeflow
git add packages/shared/src/types/user.ts
git commit -m "feat: add meeting availability preference types

- Add MeetingDayConfig and DailyMeetingConfig types
- Extend UserProfile with meeting-specific fields
- Add fields to UserPreferencesUpdate for API updates"
```

---

## Task 2: Update Prisma Schema for Meeting Preferences

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`

**Step 1: Add meeting preference fields to User model**

In the `User` model (around line 30), add these fields after `dailyScheduleConstraints`:

```prisma
model User {
  // ... existing fields ...
  dailyScheduleConstraints   Json?               // Constraints version

  // Meeting-specific availability preferences
  meetingStartTime           String?             // HH:mm - default earliest meeting time
  meetingEndTime             String?             // HH:mm - default latest meeting time
  blockedDaysOfWeek          String[]            @default([])  // Days blocked for meetings
  dailyMeetingSchedule       Json?               // Per-day meeting config

  // ... relationships ...
}
```

**Step 2: Create migration**

Run: `cd timeflow/apps/backend && pnpm prisma migrate dev --name add_meeting_preferences`
Expected: Migration created successfully

**Step 3: Generate Prisma Client**

Run: `cd timeflow/apps/backend && pnpm prisma generate`
Expected: Client generated with new fields

**Step 4: Verify migration**

Run: `cd timeflow/apps/backend && pnpm prisma migrate status`
Expected: All migrations applied, no pending

**Step 5: Commit**

```bash
cd timeflow
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: add meeting preference fields to User model

- Add meetingStartTime and meetingEndTime for default meeting hours
- Add blockedDaysOfWeek array for days without meetings
- Add dailyMeetingSchedule JSON for per-day configuration
- Create database migration"
```

---

## Task 3: Update Backend Validation Schema

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/userController.ts`

**Step 1: Import new types**

At the top of the file (around line 5), ensure these imports exist:

```typescript
import type { DailyMeetingConfig } from '@timeflow/shared';
```

**Step 2: Add meeting day config schema**

Add after `dailyScheduleSchema` (around line 35):

```typescript
const meetingDayConfigSchema = z.object({
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime must be HH:mm').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'endTime must be HH:mm').optional(),
  maxMeetings: z.number().int().positive().max(20).optional(),
});

const dailyMeetingScheduleSchema = z
  .object({
    monday: meetingDayConfigSchema.optional(),
    tuesday: meetingDayConfigSchema.optional(),
    wednesday: meetingDayConfigSchema.optional(),
    thursday: meetingDayConfigSchema.optional(),
    friday: meetingDayConfigSchema.optional(),
    saturday: meetingDayConfigSchema.optional(),
    sunday: meetingDayConfigSchema.optional(),
  })
  .optional()
  .nullable();
```

**Step 3: Update preferences schema**

In `preferencesSchema` (around line 65), add:

```typescript
const preferencesSchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'wakeTime must be HH:mm').optional(),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'sleepTime must be HH:mm').optional(),
  dailySchedule: dailyScheduleSchema,
  dailyScheduleConstraints: dailyScheduleSchema,
  timeZone: z.string().min(1).optional(),
  defaultTaskDurationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  defaultCalendarId: z.string().min(1).optional(),

  // Meeting-specific preferences
  meetingStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'meetingStartTime must be HH:mm').optional().nullable(),
  meetingEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'meetingEndTime must be HH:mm').optional().nullable(),
  blockedDaysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  dailyMeetingSchedule: dailyMeetingScheduleSchema,
});
```

**Step 4: Update updatePreferences function**

In the `updatePreferences` function (around line 140), ensure the new fields are included in the Prisma update:

```typescript
const updatedUser = await prisma.user.update({
  where: { id: user.id },
  data: {
    ...(validated.wakeTime && { wakeTime: validated.wakeTime }),
    ...(validated.sleepTime && { sleepTime: validated.sleepTime }),
    ...(validated.dailySchedule !== undefined && { dailySchedule: validated.dailySchedule }),
    ...(validated.dailyScheduleConstraints !== undefined && {
      dailyScheduleConstraints: validated.dailyScheduleConstraints,
    }),
    ...(validated.timeZone && { timeZone: validated.timeZone }),
    ...(validated.defaultTaskDurationMinutes && {
      defaultTaskDurationMinutes: validated.defaultTaskDurationMinutes,
    }),
    ...(validated.defaultCalendarId && { defaultCalendarId: validated.defaultCalendarId }),

    // Meeting preferences
    ...(validated.meetingStartTime !== undefined && { meetingStartTime: validated.meetingStartTime }),
    ...(validated.meetingEndTime !== undefined && { meetingEndTime: validated.meetingEndTime }),
    ...(validated.blockedDaysOfWeek && { blockedDaysOfWeek: validated.blockedDaysOfWeek }),
    ...(validated.dailyMeetingSchedule !== undefined && {
      dailyMeetingSchedule: validated.dailyMeetingSchedule,
    }),
  },
});
```

**Step 5: Run type check**

Run: `cd timeflow/apps/backend && pnpm tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
cd timeflow
git add apps/backend/src/controllers/userController.ts
git commit -m "feat: add validation for meeting preferences in user controller

- Add Zod schemas for meeting day config and daily meeting schedule
- Update preferences schema with meeting-specific fields
- Include new fields in Prisma update operation"
```

---

## Task 4: Update Availability Calculation to Use Meeting Preferences

**Files:**
- Modify: `timeflow/apps/backend/src/services/meetingAvailabilityService.ts`
- Modify: `timeflow/apps/backend/src/controllers/availabilityController.ts`

**Step 1: Update buildAvailabilitySlots interface**

In `meetingAvailabilityService.ts`, update the `BuildAvailabilitySlotsParams` interface (around line 10):

```typescript
interface BuildAvailabilitySlotsParams {
  rangeStart: string;
  rangeEnd: string;
  durationsMinutes: number[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  busyIntervals: BusyInterval[];
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  dailySchedule: any;

  // Meeting-specific preferences
  meetingStartTime?: string | null;
  meetingEndTime?: string | null;
  blockedDaysOfWeek?: string[];
  dailyMeetingSchedule?: any;
}
```

**Step 2: Update buildAvailabilitySlots function**

In the `buildAvailabilitySlots` function (around line 36), update to use meeting preferences:

```typescript
export function buildAvailabilitySlots(params: BuildAvailabilitySlotsParams): AvailabilitySlot[] {
  const {
    rangeStart,
    rangeEnd,
    durationsMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    busyIntervals,
    timeZone,
    wakeTime,
    sleepTime,
    dailySchedule,
    meetingStartTime,
    meetingEndTime,
    blockedDaysOfWeek = [],
    dailyMeetingSchedule,
  } = params;

  const start = DateTime.fromISO(rangeStart, { zone: timeZone });
  const end = DateTime.fromISO(rangeEnd, { zone: timeZone });

  // Map day numbers to names
  const dayNames: { [key: number]: string } = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  // Build free time blocks based on meeting preferences (or fall back to wake/sleep)
  const freeBlocks: Array<{ start: DateTime; end: DateTime }> = [];

  let current = start;
  while (current < end) {
    const dayStart = current.startOf('day');
    const dayName = dayNames[current.weekday];

    // Check if this day is blocked for meetings
    if (blockedDaysOfWeek.includes(dayName)) {
      current = current.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Check per-day meeting config
    const dayMeetingConfig = dailyMeetingSchedule?.[dayName];
    if (dayMeetingConfig && !dayMeetingConfig.isAvailable) {
      current = current.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Determine meeting hours for this day
    let effectiveStartTime: string;
    let effectiveEndTime: string;

    if (dayMeetingConfig?.startTime && dayMeetingConfig?.endTime) {
      // Use per-day meeting config
      effectiveStartTime = dayMeetingConfig.startTime;
      effectiveEndTime = dayMeetingConfig.endTime;
    } else if (meetingStartTime && meetingEndTime) {
      // Use global meeting preferences
      effectiveStartTime = meetingStartTime;
      effectiveEndTime = meetingEndTime;
    } else {
      // Fall back to wake/sleep times
      effectiveStartTime = wakeTime;
      effectiveEndTime = sleepTime;
    }

    const [startHour, startMinute] = effectiveStartTime.split(':').map(Number);
    const [endHour, endMinute] = effectiveEndTime.split(':').map(Number);

    const meetingStart = dayStart.set({ hour: startHour, minute: startMinute });
    const meetingEnd = dayStart.set({ hour: endHour, minute: endMinute });

    const blockStart = current < meetingStart ? meetingStart : current;
    const blockEnd = end < meetingEnd ? end : meetingEnd;

    if (blockStart < blockEnd) {
      freeBlocks.push({ start: blockStart, end: blockEnd });
    }

    current = current.plus({ days: 1 }).startOf('day');
  }

  // Rest of the function remains the same (expanding busy intervals, subtracting, etc.)
  // ... (keep existing code for busy interval processing and slot generation)
```

**Step 3: Update availabilityController to pass meeting preferences**

In `availabilityController.ts`, update the `getAvailability` function (around line 146):

```typescript
// Build availability slots
const slots = buildAvailabilitySlots({
  rangeStart: from,
  rangeEnd: to,
  durationsMinutes: link.durationsMinutes,
  bufferBeforeMinutes: link.bufferBeforeMinutes,
  bufferAfterMinutes: link.bufferAfterMinutes,
  busyIntervals,
  timeZone: user.timeZone,
  wakeTime: user.wakeTime,
  sleepTime: user.sleepTime,
  dailySchedule: user.dailySchedule,

  // Pass meeting preferences
  meetingStartTime: user.meetingStartTime,
  meetingEndTime: user.meetingEndTime,
  blockedDaysOfWeek: user.blockedDaysOfWeek,
  dailyMeetingSchedule: user.dailyMeetingSchedule,
});
```

**Step 4: Run type check**

Run: `cd timeflow/apps/backend && pnpm tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```bash
cd timeflow
git add apps/backend/src/services/meetingAvailabilityService.ts apps/backend/src/controllers/availabilityController.ts
git commit -m "feat: use meeting preferences in availability calculation

- Update buildAvailabilitySlots to accept meeting preferences
- Check blockedDaysOfWeek and skip those days entirely
- Use per-day meeting config or global meeting times
- Fall back to wake/sleep times if no meeting prefs set
- Pass meeting preferences from availabilityController"
```

---

## Task 5: Write Tests for Availability Calculation

**Files:**
- Modify: `timeflow/apps/backend/src/utils/__tests__/availability.test.ts`

**Step 1: Add test for blocked days**

Add this test at the end of the file:

```typescript
describe('Meeting preference handling', () => {
  it('should exclude blocked days from availability', () => {
    const user: UserPreferences = {
      timeZone: 'America/Chicago',
      wakeTime: '09:00',
      sleepTime: '17:00',
      defaultTaskDurationMinutes: 30,
      blockedDaysOfWeek: ['saturday', 'sunday'],
    };

    const rangeStart = DateTime.fromISO('2025-01-04T00:00:00', { zone: user.timeZone }); // Saturday
    const rangeEnd = DateTime.fromISO('2025-01-06T23:59:59', { zone: user.timeZone }); // Monday

    const availability = findAvailability(
      rangeStart,
      rangeEnd,
      30,
      [],
      user,
      []
    );

    // Should only have Monday slots, no Saturday or Sunday
    const hasWeekendSlots = availability.some((slot) => {
      const dt = DateTime.fromISO(slot.start, { zone: user.timeZone });
      return dt.weekday === 6 || dt.weekday === 7;
    });

    expect(hasWeekendSlots).toBe(false);
  });

  it('should use meeting-specific hours instead of wake/sleep times', () => {
    const user: UserPreferences = {
      timeZone: 'America/Chicago',
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultTaskDurationMinutes: 30,
      meetingStartTime: '10:00',
      meetingEndTime: '16:00',
    };

    const rangeStart = DateTime.fromISO('2025-01-06T00:00:00', { zone: user.timeZone }); // Monday
    const rangeEnd = DateTime.fromISO('2025-01-06T23:59:59', { zone: user.timeZone });

    const availability = findAvailability(
      rangeStart,
      rangeEnd,
      30,
      [],
      user,
      []
    );

    // All slots should be between 10:00 and 16:00
    availability.forEach((slot) => {
      const startTime = DateTime.fromISO(slot.start, { zone: user.timeZone });
      const hour = startTime.hour;
      const minute = startTime.minute;
      const timeInMinutes = hour * 60 + minute;

      expect(timeInMinutes).toBeGreaterThanOrEqual(10 * 60); // 10:00
      expect(timeInMinutes).toBeLessThan(16 * 60); // Before 16:00
    });
  });

  it('should use per-day meeting config for specific days', () => {
    const user: UserPreferences = {
      timeZone: 'America/Chicago',
      wakeTime: '08:00',
      sleepTime: '22:00',
      defaultTaskDurationMinutes: 30,
      dailyMeetingSchedule: {
        monday: {
          isAvailable: true,
          startTime: '09:00',
          endTime: '12:00',
        },
        friday: {
          isAvailable: false,
        },
      },
    };

    // Monday - should use custom hours (9-12)
    const mondayStart = DateTime.fromISO('2025-01-06T00:00:00', { zone: user.timeZone });
    const mondayEnd = DateTime.fromISO('2025-01-06T23:59:59', { zone: user.timeZone });

    const mondayAvail = findAvailability(
      mondayStart,
      mondayEnd,
      30,
      [],
      user,
      []
    );

    expect(mondayAvail.length).toBeGreaterThan(0);
    mondayAvail.forEach((slot) => {
      const startTime = DateTime.fromISO(slot.start, { zone: user.timeZone });
      expect(startTime.hour).toBeGreaterThanOrEqual(9);
      expect(startTime.hour).toBeLessThan(12);
    });

    // Friday - should be blocked
    const fridayStart = DateTime.fromISO('2025-01-10T00:00:00', { zone: user.timeZone });
    const fridayEnd = DateTime.fromISO('2025-01-10T23:59:59', { zone: user.timeZone });

    const fridayAvail = findAvailability(
      fridayStart,
      fridayEnd,
      30,
      [],
      user,
      []
    );

    expect(fridayAvail.length).toBe(0);
  });
});
```

**Step 2: Run tests**

Run: `cd timeflow/apps/backend && pnpm test availability.test.ts`
Expected: Tests fail because `findAvailability` doesn't support meeting preferences yet

**Step 3: Update findAvailability function**

In `availability.ts`, update the `findAvailability` function to pass meeting preferences through to `buildFreeSlots` or the availability calculation logic. This will require examining the actual implementation to see where to inject the logic.

Note: The exact implementation depends on how `findAvailability` is structured. The key is to:
1. Check `blockedDaysOfWeek` and skip those days
2. Use `meetingStartTime/meetingEndTime` if available
3. Use `dailyMeetingSchedule[dayName]` for per-day config

**Step 4: Run tests again**

Run: `cd timeflow/apps/backend && pnpm test availability.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
cd timeflow
git add apps/backend/src/utils/__tests__/availability.test.ts apps/backend/src/utils/availability.ts
git commit -m "test: add tests for meeting preference availability logic

- Test blocked days excluded from availability
- Test meeting-specific hours override wake/sleep
- Test per-day meeting config works correctly
- Update findAvailability to support meeting preferences"
```

---

## Task 6: Add Meeting Preferences Section to Settings UI

**Files:**
- Modify: `timeflow/apps/web/src/app/settings/page.tsx`

**Step 1: Add state for meeting preferences**

In the component state section (around line 30), add:

```typescript
// Meeting preference state
const [useMeetingHours, setUseMeetingHours] = useState(false);
const [meetingStartTime, setMeetingStartTime] = useState('09:00');
const [meetingEndTime, setMeetingEndTime] = useState('17:00');
const [blockedDays, setBlockedDays] = useState<string[]>([]);
const [useCustomMeetingSchedule, setUseCustomMeetingSchedule] = useState(false);
const [dailyMeetingSchedule, setDailyMeetingSchedule] = useState<DailyMeetingConfig>({});
```

**Step 2: Initialize meeting preferences from user**

In the `useEffect` that loads user data (around line 80), add:

```typescript
useEffect(() => {
  if (user) {
    setWakeTime(user.wakeTime);
    setSleepTime(user.sleepTime);
    const schedule = user.dailyScheduleConstraints || user.dailySchedule;
    if (schedule && Object.keys(schedule).length > 0) {
      setUseCustomSchedule(true);
      setDailySchedule(schedule);
    }

    // Load meeting preferences
    if (user.meetingStartTime && user.meetingEndTime) {
      setUseMeetingHours(true);
      setMeetingStartTime(user.meetingStartTime);
      setMeetingEndTime(user.meetingEndTime);
    }
    if (user.blockedDaysOfWeek && user.blockedDaysOfWeek.length > 0) {
      setBlockedDays(user.blockedDaysOfWeek);
    }
    const meetingSchedule = user.dailyMeetingSchedule;
    if (meetingSchedule && Object.keys(meetingSchedule).length > 0) {
      setUseCustomMeetingSchedule(true);
      setDailyMeetingSchedule(meetingSchedule);
    }
  }
}, [user]);
```

**Step 3: Update handleSave to include meeting preferences**

In the `handleSave` function (around line 140), add:

```typescript
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);

  try {
    await updatePreferences({
      wakeTime,
      sleepTime,
      dailySchedule: useCustomSchedule ? dailySchedule : null,
      dailyScheduleConstraints: useCustomSchedule ? dailySchedule : null,
      timeZone,
      defaultTaskDurationMinutes: defaultDuration,
      defaultCalendarId: defaultCalendarId || undefined,

      // Meeting preferences
      meetingStartTime: useMeetingHours ? meetingStartTime : null,
      meetingEndTime: useMeetingHours ? meetingEndTime : null,
      blockedDaysOfWeek: blockedDays.length > 0 ? blockedDays : [],
      dailyMeetingSchedule: useCustomMeetingSchedule ? dailyMeetingSchedule : null,
    });

    showToast('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  } finally {
    setIsSaving(false);
  }
};
```

**Step 4: Add Meeting Preferences UI section**

After the existing working hours section (around line 300), add:

```typescript
{/* Meeting Availability Section */}
<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
  <h2 className="text-lg font-semibold text-slate-800 mb-4">Meeting Availability</h2>
  <p className="text-sm text-slate-600 mb-4">
    Configure when you're available for meetings. This is separate from your general working hours.
  </p>

  {/* Meeting Hours Toggle */}
  <div className="mb-6">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={useMeetingHours}
        onChange={(e) => setUseMeetingHours(e.target.checked)}
        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
      />
      <span className="text-sm text-slate-700">
        Set specific hours for meetings (different from work hours)
      </span>
    </label>
  </div>

  {/* Simple Meeting Hours */}
  {useMeetingHours && !useCustomMeetingSchedule && (
    <div className="mb-6 grid grid-cols-2 gap-4 pl-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Meeting Start Time
        </label>
        <input
          type="time"
          value={meetingStartTime}
          onChange={(e) => setMeetingStartTime(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Meeting End Time
        </label>
        <input
          type="time"
          value={meetingEndTime}
          onChange={(e) => setMeetingEndTime(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  )}

  {/* Blocked Days */}
  <div className="mb-6">
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Days Not Available for Meetings
    </label>
    <div className="flex flex-wrap gap-2">
      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => {
            if (blockedDays.includes(day)) {
              setBlockedDays(blockedDays.filter((d) => d !== day));
            } else {
              setBlockedDays([...blockedDays, day]);
            }
          }}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            blockedDays.includes(day)
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
          }`}
        >
          {day.charAt(0).toUpperCase() + day.slice(1)}
        </button>
      ))}
    </div>
    <p className="text-xs text-slate-500 mt-2">
      Select days when you don't want to accept any meetings
    </p>
  </div>

  {/* Custom Per-Day Meeting Schedule Toggle */}
  {useMeetingHours && (
    <div className="mb-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={useCustomMeetingSchedule}
          onChange={(e) => setUseCustomMeetingSchedule(e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <span className="text-sm text-slate-700">
          Set different meeting hours for each day
        </span>
      </label>
    </div>
  )}

  {/* Per-Day Meeting Config */}
  {useMeetingHours && useCustomMeetingSchedule && (
    <div className="pl-6 space-y-4">
      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
        const config = dailyMeetingSchedule[day] || { isAvailable: true };
        return (
          <div key={day} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.isAvailable}
                  onChange={(e) => {
                    setDailyMeetingSchedule({
                      ...dailyMeetingSchedule,
                      [day]: { ...config, isAvailable: e.target.checked },
                    });
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-800">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </span>
              </label>
            </div>

            {config.isAvailable && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Start</label>
                  <input
                    type="time"
                    value={config.startTime || meetingStartTime}
                    onChange={(e) => {
                      setDailyMeetingSchedule({
                        ...dailyMeetingSchedule,
                        [day]: { ...config, startTime: e.target.value },
                      });
                    }}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">End</label>
                  <input
                    type="time"
                    value={config.endTime || meetingEndTime}
                    onChange={(e) => {
                      setDailyMeetingSchedule({
                        ...dailyMeetingSchedule,
                        [day]: { ...config, endTime: e.target.value },
                      });
                    }}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>
```

**Step 5: Import DailyMeetingConfig type**

At the top of the file, update the import:

```typescript
import type { DailyScheduleConfig, DailyMeetingConfig } from '@timeflow/shared';
```

**Step 6: Test the UI**

Run: `cd timeflow && pnpm dev:web`
Navigate to: http://localhost:3000/settings
Expected: Meeting Availability section appears with all controls functional

**Step 7: Commit**

```bash
cd timeflow
git add apps/web/src/app/settings/page.tsx
git commit -m "feat: add meeting availability preferences to settings UI

- Add meeting hours toggle and time inputs
- Add blocked days selector with visual feedback
- Add per-day meeting schedule grid
- Initialize from user preferences
- Save meeting preferences with settings"
```

---

## Task 7: Manual Testing

**Files:**
- None (testing only)

**Step 1: Test default behavior (no meeting preferences)**

1. Start backend: `cd timeflow && pnpm dev:backend`
2. Start web: `cd timeflow && pnpm dev:web`
3. Navigate to booking page: http://localhost:3000/book/[your-slug]
4. Verify availability shows during wake/sleep hours

**Step 2: Test simple meeting hours**

1. Go to Settings
2. Enable "Set specific hours for meetings"
3. Set Meeting Start: 10:00, Meeting End: 15:00
4. Save settings
5. Refresh booking page
6. Verify availability only shows 10:00-15:00 slots

**Step 3: Test blocked days**

1. Go to Settings
2. Click "Saturday" and "Sunday" to block them
3. Save settings
4. Go to booking page
5. Navigate to weekend dates
6. Verify no slots appear on Saturday/Sunday

**Step 4: Test per-day schedule**

1. Go to Settings
2. Enable "Set different meeting hours for each day"
3. Set Monday: 09:00-12:00
4. Uncheck Friday (block it)
5. Save settings
6. Check booking page for Monday (should show 9-12 only)
7. Check booking page for Friday (should show no slots)

**Step 5: Test data persistence**

1. Close browser
2. Reopen and login
3. Go to Settings
4. Verify all meeting preferences are still set correctly

**Step 6: Document test results**

Create file: `timeflow/docs/testing/meeting-preferences-manual-test-results.md`

```markdown
# Meeting Preferences Manual Test Results

**Date:** [Current Date]
**Tested By:** [Your Name]

## Test Cases

| Test Case | Expected | Actual | Pass/Fail |
|-----------|----------|--------|-----------|
| Default behavior (no prefs) | Shows wake-sleep hours | | |
| Simple meeting hours | Shows only 10-15 | | |
| Blocked weekend | No Sat/Sun slots | | |
| Per-day Monday 9-12 | Monday shows 9-12 | | |
| Blocked Friday | Friday shows nothing | | |
| Data persistence | Settings reload correctly | | |

## Issues Found

[List any bugs or unexpected behavior]

## Notes

[Any additional observations]
```

**Step 7: Commit test results**

```bash
cd timeflow
git add docs/testing/meeting-preferences-manual-test-results.md
git commit -m "docs: add manual test results for meeting preferences"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `timeflow/README.md`
- Modify: `timeflow/apps/web/README.md`

**Step 1: Update main README**

In `timeflow/README.md`, add to the Features section:

```markdown
### Meeting Availability Preferences

Configure when you're available for meetings, separate from your general working hours:

- **Meeting Hours**: Set specific start/end times for meetings (e.g., 10 AM - 4 PM)
- **Blocked Days**: Block specific days of the week (e.g., no meetings on Friday/weekends)
- **Per-Day Schedule**: Set different meeting hours for each day of the week
- **Priority**: Meeting preferences override general wake/sleep times for scheduling links

Example use cases:
- Block Friday afternoons for deep work
- Only take meetings 10 AM - 3 PM on Mondays
- Keep weekends completely meeting-free
```

**Step 2: Update web app README**

In `timeflow/apps/web/README.md`, add to Settings documentation:

```markdown
## Settings - Meeting Availability

Users can configure meeting-specific availability in Settings:

### Fields

- `useMeetingHours` - Toggle for meeting-specific hours
- `meetingStartTime` - Earliest meeting time (HH:mm)
- `meetingEndTime` - Latest meeting time (HH:mm)
- `blockedDaysOfWeek` - Array of blocked day names
- `dailyMeetingSchedule` - Per-day meeting configuration

### UI Components

- Simple hours: Two time inputs
- Blocked days: Toggle buttons for each day
- Per-day schedule: Collapsible grid with per-day times

### Data Flow

1. Load user preferences from `useUser()` hook
2. Initialize local state from user data
3. Update state on user interaction
4. Call `updatePreferences()` on save
5. Backend validates and saves to database
```

**Step 3: Commit documentation**

```bash
cd timeflow
git add README.md apps/web/README.md
git commit -m "docs: document meeting availability preferences feature

- Add feature description to main README
- Document settings UI components
- Explain data flow and use cases"
```

---

## Completion Checklist

- [ ] Task 1: Shared types added
- [ ] Task 2: Database schema updated
- [ ] Task 3: Backend validation implemented
- [ ] Task 4: Availability calculation updated
- [ ] Task 5: Tests written and passing
- [ ] Task 6: Settings UI implemented
- [ ] Task 7: Manual testing completed
- [ ] Task 8: Documentation updated

## Notes

- This feature is **backward compatible**: Users without meeting preferences will continue using wake/sleep times
- Meeting preferences are **optional**: All fields are nullable
- The UI follows the **existing pattern** from dailySchedule configuration
- Availability calculation has **clear fallback logic**: meeting prefs → wake/sleep → error

## Future Enhancements

- Max meetings per day enforcement (already in `MeetingDayConfig.maxMeetings`)
- Meeting preference templates (e.g., "Standard 9-5", "Flexible", "Deep Work Focus")
- Per-link meeting overrides (already possible via SchedulingLink model)
- Meeting focus time blocks (automatically block certain hours each day)
