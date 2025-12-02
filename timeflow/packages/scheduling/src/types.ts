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
 * User preferences that affect scheduling.
 */
export interface UserPreferences {
  /** IANA timezone string (e.g., "America/Chicago") */
  timeZone: string;
  /** Wake time in "HH:mm" format (24-hour) */
  wakeTime: string;
  /** Sleep time in "HH:mm" format (24-hour) */
  sleepTime: string;
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

