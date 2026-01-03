/**
 * Habit Completion Types
 * Shared types for habit completion tracking
 */

export enum HabitSkipReason {
  NO_TIME = 'NO_TIME',                    // "No time / too busy"
  LOW_ENERGY = 'LOW_ENERGY',              // "Low energy / not feeling well"
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',  // "Schedule changed unexpectedly"
  TRAVEL = 'TRAVEL',                      // "Travel / away from routine"
  FORGOT = 'FORGOT',                      // "Forgot"
  NOT_PRIORITY = 'NOT_PRIORITY',          // "Not a priority today"
  BLOCKED = 'BLOCKED',                    // "Blocked by something"
  INJURY_RECOVERY = 'INJURY_RECOVERY',    // "Injury / recovery"
  OTHER = 'OTHER',                        // "Other"
}

export interface HabitCompletionRequest {
  scheduledHabitId: string;
}

export interface HabitCompletionResponse {
  success: boolean;
  completion: {
    id: string;
    status: 'completed' | 'skipped';
    completedAt: string;
  };
}

export interface HabitSkipRequest {
  scheduledHabitId: string;
  reasonCode: HabitSkipReason;
}

export interface HabitUndoRequest {
  scheduledHabitId: string;
}
