import type { DailyScheduleConfig, SchedulePreview } from '@timeflow/shared';
import type { CalendarEvent } from '@timeflow/shared';
import { classifyEvent } from './eventClassifier.js';

/**
 * Validation result for a schedule preview
 */
export interface ValidationResult {
  valid: boolean; // Overall validity - false if any errors
  errors: string[]; // Critical issues that make schedule invalid
  warnings: string[]; // Non-critical issues that user should know about
}

/**
 * User preferences needed for validation
 */
export interface UserPreferences {
  wakeTime: string; // "HH:mm" format (e.g., "08:00")
  sleepTime: string; // "HH:mm" format (e.g., "23:00")
  timeZone: string; // IANA timezone (e.g., "America/Chicago")
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
}

/**
 * Validate a schedule preview against fixed events and user constraints
 *
 * This is the safety net that catches violations the AI might miss:
 * - Overlaps with fixed calendar events (classes, appointments)
 * - Tasks scheduled outside wake/sleep hours
 * - Invalid time ranges or formats
 * - Conflicts between scheduled blocks
 *
 * Sprint 13.7: Server-side validation ensures we NEVER create schedules
 * that conflict with immovable commitments, even if AI makes a mistake.
 *
 * @param preview - The schedule preview from the AI
 * @param calendarEvents - All calendar events (will be classified internally)
 * @param userPrefs - User's wake/sleep times and timezone
 * @param taskIds - Valid task IDs that exist in the database
 * @returns Validation result with errors and warnings
 */
export function validateSchedulePreview(
  preview: SchedulePreview,
  calendarEvents: CalendarEvent[],
  userPrefs: UserPreferences,
  taskIds: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Separate fixed vs movable events
  const fixedEvents = calendarEvents.filter(event => {
    const classification = classifyEvent(event);
    return classification.isFixed;
  });

  // Validate each block
  for (const block of preview.blocks) {
    if (!block.taskId) {
      continue;
    }
    // Validation 1: Task ID exists
    if (!taskIds.includes(block.taskId)) {
      errors.push(`Error: Invalid task ID: ${block.taskId}`);
      continue; // Skip further validation for this block
    }

    // Validation 2: Valid ISO 8601 timestamps
    const startDate = new Date(block.start);
    const endDate = new Date(block.end);

    if (isNaN(startDate.getTime())) {
      errors.push(`Error: Invalid start time for task ${block.taskId}: ${block.start}`);
      continue;
    }

    if (isNaN(endDate.getTime())) {
      errors.push(`Error: Invalid end time for task ${block.taskId}: ${block.end}`);
      continue;
    }

    // Validation 3: Start before end
    if (startDate >= endDate) {
      errors.push(`Error: Start time must be before end time for task ${block.taskId}`);
      continue;
    }

    // Validation 4: No overlap with FIXED events
    const overlappingFixed = fixedEvents.filter(event =>
      hasTimeOverlap(block.start, block.end, event.start, event.end)
    );

    if (overlappingFixed.length > 0) {
      for (const fixedEvent of overlappingFixed) {
        const classification = classifyEvent(fixedEvent);
        errors.push(
          `Error: Overlaps with fixed event: "${fixedEvent.summary}" [${classification.reason}]`
        );
      }
    }

    // Validation 5: Within wake/sleep hours
    const wakeCheck = isWithinWakeHours(block.start, block.end, userPrefs);
    if (!wakeCheck.valid) {
      const reason = wakeCheck.reason || 'Task violates wake/sleep constraints';
      if (wakeCheck.crossesMidnight) {
        errors.push(`Error: ${reason}`);
      } else {
        const wakeTime = wakeCheck.wakeTime || userPrefs.wakeTime;
        const sleepTime = wakeCheck.sleepTime || userPrefs.sleepTime;
        warnings.push(
          `Warning: Task scheduled outside wake hours (${wakeTime} - ${sleepTime}): ${reason}`
        );
      }
    }

    // Validation 6: No overlap with other blocks in this schedule
    const overlappingBlocks = preview.blocks.filter(
      otherBlock =>
        otherBlock !== block &&
        hasTimeOverlap(block.start, block.end, otherBlock.start, otherBlock.end)
    );

    if (overlappingBlocks.length > 0) {
      errors.push(
        `Error: Task ${block.taskId} overlaps with ${overlappingBlocks.length} other scheduled task(s)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if two time ranges overlap
 *
 * Two ranges overlap if:
 * - Range A starts before Range B ends AND
 * - Range A ends after Range B starts
 *
 * @param start1 - ISO datetime string for first range start
 * @param end1 - ISO datetime string for first range end
 * @param start2 - ISO datetime string for second range start
 * @param end2 - ISO datetime string for second range end
 * @returns True if ranges overlap
 */
export function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Date = new Date(start1);
  const end1Date = new Date(end1);
  const start2Date = new Date(start2);
  const end2Date = new Date(end2);

  // Check for overlap: A starts before B ends AND A ends after B starts
  return start1Date < end2Date && end1Date > start2Date;
}

/**
 * Check if a scheduled block is within user's wake/sleep hours
 *
 * Converts UTC times to user's local timezone and checks against wake/sleep hours.
 *
 * @param start - ISO datetime string (UTC)
 * @param end - ISO datetime string (UTC)
 * @param userPrefs - User's wake/sleep times and timezone
 * @returns Validation result
 */
export function isWithinWakeHours(
  start: string,
  end: string,
  userPrefs: UserPreferences
): { valid: boolean; reason?: string; crossesMidnight?: boolean; wakeTime?: string; sleepTime?: string } {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Convert UTC times to user's local timezone
  const startLocal = new Date(
    startDate.toLocaleString('en-US', { timeZone: userPrefs.timeZone })
  );
  const endLocal = new Date(
    endDate.toLocaleString('en-US', { timeZone: userPrefs.timeZone })
  );

  if (startLocal.toDateString() !== endLocal.toDateString()) {
    const startTimeStr = formatTime(startLocal.getHours(), startLocal.getMinutes());
    const endTimeStr = formatTime(endLocal.getHours(), endLocal.getMinutes());
    return {
      valid: false,
      crossesMidnight: true,
      reason: `Block crosses midnight (${startTimeStr} to ${endTimeStr}). This is only allowed by manual drag.`,
    };
  }

  const dayNames: Array<keyof DailyScheduleConfig> = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const dayName = dayNames[startLocal.getDay()];
  const dailySchedule = userPrefs.dailyScheduleConstraints || userPrefs.dailySchedule;
  const daySchedule = dailySchedule?.[dayName];

  const resolvedWakeTime = daySchedule?.wakeTime || userPrefs.wakeTime;
  const resolvedSleepTime = daySchedule?.sleepTime || userPrefs.sleepTime;

  // Parse wake/sleep times (format: "HH:mm")
  const [wakeHour, wakeMinute] = resolvedWakeTime.split(':').map(Number);
  const [sleepHour, sleepMinute] = resolvedSleepTime.split(':').map(Number);

  // Get hour and minute in local timezone
  const startHour = startLocal.getHours();
  const startMinuteVal = startLocal.getMinutes();
  const endHour = endLocal.getHours();
  const endMinuteVal = endLocal.getMinutes();

  // Convert to minutes since midnight for easier comparison
  const startMinutes = startHour * 60 + startMinuteVal;
  const endMinutes = endHour * 60 + endMinuteVal;
  const wakeMinutes = wakeHour * 60 + wakeMinute;
  const sleepMinutes = sleepHour * 60 + sleepMinute;

  // Check if task starts before wake time
  if (startMinutes < wakeMinutes) {
    const wakeTimeStr = formatTime(wakeHour, wakeMinute);
    const startTimeStr = formatTime(startHour, startMinuteVal);
    return {
      valid: false,
      reason: `Task starts at ${startTimeStr}, before wake time ${wakeTimeStr}`,
      wakeTime: resolvedWakeTime,
      sleepTime: resolvedSleepTime,
    };
  }

  // Check if task ends after sleep time
  if (endMinutes > sleepMinutes) {
    const sleepTimeStr = formatTime(sleepHour, sleepMinute);
    const endTimeStr = formatTime(endHour, endMinuteVal);
    return {
      valid: false,
      reason: `Task ends at ${endTimeStr}, after sleep time ${sleepTimeStr}`,
      wakeTime: resolvedWakeTime,
      sleepTime: resolvedSleepTime,
    };
  }

  return { valid: true, wakeTime: resolvedWakeTime, sleepTime: resolvedSleepTime };
}

/**
 * Format hour and minute as 12-hour time string
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns Formatted time string (e.g., "8:00 AM", "11:30 PM")
 */
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight
  const minuteStr = minute.toString().padStart(2, '0');
  return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Apply validation results to a schedule preview
 *
 * Modifies the preview in place by:
 * - Adding errors and warnings to the conflicts array
 * - Lowering confidence if issues found
 *
 * @param preview - Schedule preview to modify
 * @param validation - Validation results
 * @returns Modified preview (same object reference)
 */
export function applyValidationToPreview(
  preview: SchedulePreview,
  validation: ValidationResult
): SchedulePreview {
  // Add all errors and warnings to conflicts array
  preview.conflicts = [
    ...preview.conflicts,
    ...validation.errors,
    ...validation.warnings,
  ];

  // Lower confidence if issues found
  if (validation.errors.length > 0) {
    preview.confidence = 'low';
  } else if (validation.warnings.length > 0 && preview.confidence === 'high') {
    preview.confidence = 'medium';
  }

  return preview;
}

/**
 * Quick validation check - returns true if schedule is safe to apply
 *
 * This is a convenience function for the most critical checks.
 * Use full validateSchedulePreview() for detailed feedback.
 *
 * @param preview - Schedule preview
 * @param fixedEvents - Fixed calendar events
 * @returns True if no critical errors (overlaps with fixed events)
 */
export function isSafeToApply(
  preview: SchedulePreview,
  fixedEvents: CalendarEvent[]
): boolean {
  for (const block of preview.blocks) {
    const overlappingFixed = fixedEvents.filter(event =>
      hasTimeOverlap(block.start, block.end, event.start, event.end)
    );

    if (overlappingFixed.length > 0) {
      return false; // Critical: overlaps with fixed event
    }
  }

  return true;
}
