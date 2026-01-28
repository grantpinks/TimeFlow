/**
 * Schedule Validation Service
 * 
 * Validates AI-generated schedules against user constraints and calendar data
 * to prevent hallucinations from reaching production.
 * 
 * This is a critical safety layer that catches:
 * - Invalid task/habit IDs (hallucinated references)
 * - Scheduling outside wake/sleep hours
 * - Overlaps with fixed calendar events
 * - Timezone conversion errors
 * - Incomplete habit schedules
 */

import { prisma } from '../config/prisma.js';
import { getEvents } from './googleCalendarService.js';
import { separateFixedAndMovable } from '../utils/eventClassifier.js';
import type { ApplyScheduleBlock } from '@timeflow/shared';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'OVERLAP_FIXED_EVENT' | 'OUTSIDE_WAKE_SLEEP' | 'INVALID_TASK_ID' | 
        'TIMEZONE_ERROR' | 'MISSING_REQUIRED_FIELDS' | 'HABIT_INCOMPLETE';
  message: string;
  blockIndex: number;
  severity: 'critical' | 'error';
}

export interface ValidationWarning {
  type: 'TIGHT_SCHEDULE' | 'CONSECUTIVE_BLOCKS' | 'LATE_NIGHT';
  message: string;
  blockIndex: number;
}

interface ValidationOptions {
  allowOverlaps?: boolean;
  strictHabitValidation?: boolean;
}

/**
 * Main validation function - validates entire schedule
 */
export async function validateSchedule(
  userId: string,
  blocks: ApplyScheduleBlock[],
  options: ValidationOptions = {}
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
  if (!options.allowOverlaps) {
    const overlapErrors = await validateNoFixedOverlaps(userId, blocks);
    errors.push(...overlapErrors);
  }

  // 4. Validate timezone correctness
  const timezoneErrors = validateTimezones(blocks);
  errors.push(...timezoneErrors);

  // 5. Validate habit completeness
  if (options.strictHabitValidation) {
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

/**
 * Validates that all task IDs and habit IDs exist and belong to the user
 */
async function validateTaskIds(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const taskIds = blocks
    .filter(b => b.taskId)
    .map(b => b.taskId as string);
  
  const habitIds = blocks
    .filter(b => b.habitId)
    .map(b => b.habitId as string);
  
  // Validate task IDs
  if (taskIds.length > 0) {
    const existingTasks = await prisma.task.findMany({
      where: { 
        id: { in: taskIds }, 
        userId 
      },
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
  
  // Validate habit IDs
  if (habitIds.length > 0) {
    const existingHabits = await prisma.habit.findMany({
      where: { 
        id: { in: habitIds }, 
        userId 
      },
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

/**
 * Validates that all blocks are within user's wake/sleep hours
 */
async function validateWakeSleepBounds(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      wakeTime: true, 
      sleepTime: true, 
      timezone: true 
    },
  });
  
  if (!user) {
    errors.push({
      type: 'MISSING_REQUIRED_FIELDS',
      message: 'User not found',
      blockIndex: -1,
      severity: 'critical',
    });
    return errors;
  }
  
  blocks.forEach((block, index) => {
    try {
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
      
      // Check if block ends after sleep time
      // Handle midnight crossing: if endMinutes < startMinutes, block crosses midnight
      const crossesMidnight = endMinutes < startMinutes;
      const endsAfterSleep = crossesMidnight || endMinutes > sleepMinutes;
      
      if (endsAfterSleep) {
        errors.push({
          type: 'OUTSIDE_WAKE_SLEEP',
          message: `Block ends at ${formatTime(endLocal)} after sleep time ${user.sleepTime}`,
          blockIndex: index,
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Failed to convert times to user timezone: ${error instanceof Error ? error.message : 'Unknown error'}`,
        blockIndex: index,
        severity: 'error',
      });
    }
  });
  
  return errors;
}

/**
 * Validates that blocks don't overlap with fixed calendar events
 */
async function validateNoFixedOverlaps(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (blocks.length === 0) return errors;
  
  try {
    // Get calendar events for the range of blocks
    const times = blocks.map(b => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));
    
    const minStart = Math.min(...times.map(t => t.start));
    const maxEnd = Math.max(...times.map(t => t.end));
    
    const calendarEvents = await getEvents(
      userId,
      new Date(minStart).toISOString(),
      new Date(maxEnd).toISOString()
    );
    
    // Separate fixed events
    const { fixed: fixedEvents } = separateFixedAndMovable(calendarEvents);
    
    // Check each block for overlaps
    blocks.forEach((block, index) => {
      const blockStart = new Date(block.start);
      const blockEnd = new Date(block.end);
      
      fixedEvents.forEach((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // Check for overlap: block starts before event ends AND block ends after event starts
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
  } catch (error) {
    console.error('[ValidationService] Error checking fixed event overlaps:', error);
    // Don't block scheduling if calendar API fails - log as warning instead
  }
  
  return errors;
}

/**
 * Validates timezone correctness and date formats
 */
function validateTimezones(blocks: ApplyScheduleBlock[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
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
    if (durationMinutes < 5) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Duration too short: ${durationMinutes.toFixed(1)} minutes. Minimum is 5 minutes.`,
        blockIndex: index,
        severity: 'error',
      });
    } else if (durationMinutes > 480) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Suspicious duration: ${durationMinutes.toFixed(0)} minutes (${(durationMinutes / 60).toFixed(1)} hours). Possible timezone conversion error.`,
        blockIndex: index,
        severity: 'error',
      });
    }
    
    // Validate end is after start
    if (end <= start) {
      errors.push({
        type: 'TIMEZONE_ERROR',
        message: `Block end time is before or equal to start time`,
        blockIndex: index,
        severity: 'critical',
      });
    }
  });
  
  return errors;
}

/**
 * Validates that habits have blocks for all required days
 */
async function validateHabitCompleteness(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const habitIds = new Set(
    blocks.filter(b => b.habitId).map(b => b.habitId as string)
  );
  
  if (habitIds.size === 0) return errors;
  
  const habits = await prisma.habit.findMany({
    where: { 
      id: { in: Array.from(habitIds) }, 
      userId 
    },
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
          message: `Habit "${habit.title}" should have ${requiredDays} blocks (${habit.daysOfWeek.join(', ')}) but only has ${habitBlocks.length}`,
          blockIndex: -1,
          severity: 'error',
        });
      }
    }
  });
  
  return errors;
}

/**
 * Detects potential issues that are warnings but not blocking errors
 */
function detectScheduleWarnings(blocks: ApplyScheduleBlock[]): ValidationWarning[] {
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
        message: `Only ${gapMinutes.toFixed(0)} minute gap between blocks - consider adding break time`,
        blockIndex: i + 1,
      });
    }
  }
  
  // Check for late night scheduling
  sortedBlocks.forEach((block, index) => {
    const end = new Date(block.end);
    const endHour = end.getUTCHours(); // Using UTC hours for consistent check
    
    // Check if ends between 10 PM and 6 AM (any timezone)
    if (endHour >= 22 || endHour < 6) {
      warnings.push({
        type: 'LATE_NIGHT',
        message: `Block scheduled late at night - verify this is intentional`,
        blockIndex: index,
      });
    }
  });
  
  return warnings;
}

/**
 * Helper: Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper: Format time for user-friendly display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper: Convert UTC ISO string to user's local time
 */
function convertToUserTime(isoString: string, timezone: string): Date {
  const date = new Date(isoString);
  
  // Create a formatter for the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });
  
  // Create a new date in the user's timezone
  return new Date(
    parseInt(values.year),
    parseInt(values.month) - 1,
    parseInt(values.day),
    parseInt(values.hour),
    parseInt(values.minute),
    parseInt(values.second)
  );
}
