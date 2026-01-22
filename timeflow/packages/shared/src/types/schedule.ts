/**
 * Scheduling-related DTOs
 *
 * These types represent scheduling requests and responses via the API.
 */

/**
 * Request body for running smart scheduling.
 */
export interface ScheduleRequest {
  taskIds: string[];
  dateRangeStart: string; // ISO datetime
  dateRangeEnd: string;   // ISO datetime
}

/**
 * A scheduled block in the response.
 */
export interface ScheduledBlock {
  taskId?: string;
  start: string;
  end: string;
  overflowedDeadline?: boolean;
  habitId?: string;
  title?: string;
}

/**
 * Response from the schedule endpoint.
 */
export interface ScheduleResponse {
  scheduled: number;
  blocks: ScheduledBlock[];
}

/**
 * Request body for applying an AI-generated schedule.
 */
export type ApplyScheduleBlock =
  | { taskId: string; start: string; end: string }
  | { habitId: string; start: string; end: string; title?: string };

export interface ApplyScheduleRequest {
  blocks: ApplyScheduleBlock[];
}

export interface ApplyScheduleResponse {
  tasksScheduled: number;
  habitsScheduled: number;
  undoToken?: string; // Token to undo this schedule application
}

/**
 * Request body for manually rescheduling a task.
 */
export interface RescheduleRequest {
  startDateTime: string;
  endDateTime: string;
}

/**
 * Suggested block for a habit (non-committed).
 */
export interface HabitSuggestionBlock {
  habitId: string;
  start: string;
  end: string;
  status: 'proposed' | 'accepted' | 'rejected';
  reason?: string;
}

/**
 * Enriched habit suggestion with habit details.
 */
export interface EnrichedHabitSuggestion extends HabitSuggestionBlock {
  habit: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
  };
}

/**
 * Response payload for habit scheduling suggestions.
 */
export interface HabitSuggestionsResponse {
  suggestions: EnrichedHabitSuggestion[];
}

