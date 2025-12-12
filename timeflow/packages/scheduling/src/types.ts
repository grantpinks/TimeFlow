/**
 * Scheduling Engine Types
 *
 * These types define the inputs and outputs for the scheduling algorithm.
 * They are designed to be framework-agnostic and can be used by any consumer.
 */

/**
 * Task priority levels.
 * 1 = High (most urgent)
 * 2 = Medium
 * 3 = Low (least urgent)
 */
export type Priority = 1 | 2 | 3;

/**
 * Input representation of a task to be scheduled.
 */
export interface TaskInput {
  /** Unique identifier for the task */
  id: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Priority level (1=high, 2=medium, 3=low) */
  priority: Priority;
  /** Optional due date in ISO format (date-only or datetime) */
  dueDate?: string;
}

/**
 * Representation of an existing calendar event (busy time).
 */
export interface CalendarEvent {
  /** Optional event ID from the calendar provider */
  id?: string;
  /** Start time in ISO datetime format */
  start: string;
  /** End time in ISO datetime format */
  end: string;
}

/**
 * Per-day wake/sleep time configuration
 */
export interface DaySchedule {
  wakeTime: string; // "HH:mm"
  sleepTime: string; // "HH:mm"
}

/**
 * Daily schedule with per-day wake/sleep times
 */
export interface DailyScheduleConfig {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

/**
 * User preferences that affect scheduling.
 */
export interface UserPreferences {
  /** IANA timezone string (e.g., "America/Chicago") */
  timeZone: string;
  /** Wake time in "HH:mm" format (24-hour) - Default for all days */
  wakeTime: string;
  /** Sleep time in "HH:mm" format (24-hour) - Default for all days */
  sleepTime: string;
  /** Optional per-day wake/sleep times - overrides default if present */
  dailySchedule?: DailyScheduleConfig | null;
}

/**
 * Output representation of a scheduled task block.
 */
export interface ScheduledBlock {
  /** Task ID this block corresponds to */
  taskId: string;
  /** Scheduled start time in ISO datetime format */
  start: string;
  /** Scheduled end time in ISO datetime format */
  end: string;
  /** True if the task was scheduled after its due date */
  overflowedDeadline?: boolean;
}

/**
 * Internal representation of a time interval for the algorithm.
 */
export interface TimeInterval {
  start: number; // Unix timestamp in milliseconds
  end: number;   // Unix timestamp in milliseconds
}

/**
 * Habit frequency types.
 */
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

/**
 * User's time-of-day preference for a habit.
 */
export type TimeOfDayPreference = 'morning' | 'afternoon' | 'evening';

/**
 * Input representation of a habit to generate scheduling suggestions.
 */
export interface HabitInput {
  id: string;
  durationMinutes: number;
  frequency: HabitFrequency;
  daysOfWeek?: string[];
  preferredTimeOfDay?: TimeOfDayPreference | null;
}

/**
 * Suggested time block for a habit (non-committed).
 */
export interface HabitSuggestionBlock {
  habitId: string;
  start: string;
  end: string;
  status: 'proposed' | 'accepted' | 'rejected';
  reason?: string;
}

