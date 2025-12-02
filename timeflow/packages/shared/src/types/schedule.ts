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
  taskId: string;
  start: string;
  end: string;
  overflowedDeadline?: boolean;
}

/**
 * Response from the schedule endpoint.
 */
export interface ScheduleResponse {
  scheduled: number;
  blocks: ScheduledBlock[];
}

/**
 * Request body for manually rescheduling a task.
 */
export interface RescheduleRequest {
  startDateTime: string;
  endDateTime: string;
}

