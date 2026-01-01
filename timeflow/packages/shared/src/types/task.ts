/**
 * Task-related DTOs
 *
 * These types represent task data as exposed via the API.
 */

import type { Category } from './category.js';

/**
 * Task status values.
 */
export type TaskStatus = 'unscheduled' | 'scheduled' | 'completed';

/**
 * Task priority levels (1 = high, 2 = medium, 3 = low).
 */
export type TaskPriority = 1 | 2 | 3;

/**
 * Task as returned by the API.
 */
export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  categoryId?: string | null;
  category?: Category | null;
  dueDate?: string | null;
  sourceEmailId?: string | null;
  sourceThreadId?: string | null;
  sourceEmailProvider?: string | null;
  sourceEmailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledTask?: ScheduledTaskInfo | null;
}

/**
 * Scheduled task information attached to a task.
 */
export interface ScheduledTaskInfo {
  id: string;
  provider: 'google' | 'apple';
  calendarId: string;
  eventId: string;
  startDateTime: string;
  endDateTime: string;
  overflowedDeadline: boolean;
  lastSyncedAt: string;
}

/**
 * Request body for creating a task.
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  durationMinutes?: number;
  priority?: TaskPriority;
  categoryId?: string;
  dueDate?: string;
  sourceEmailId?: string;
  sourceThreadId?: string;
  sourceEmailProvider?: string;
  sourceEmailUrl?: string;
}

/**
 * Request body for updating a task.
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  durationMinutes?: number;
  priority?: TaskPriority;
  categoryId?: string;
  dueDate?: string;
  status?: TaskStatus;
  sourceEmailId?: string;
  sourceThreadId?: string;
  sourceEmailProvider?: string;
  sourceEmailUrl?: string;
}
