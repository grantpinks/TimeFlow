/**
 * User-related DTOs
 *
 * These types represent user data as exposed via the API,
 * decoupled from the database ORM models.
 */

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
 * User profile as returned by the API.
 */
export interface UserProfile {
  id: string;
  email: string;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  dailySchedule?: DailyScheduleConfig | null;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;
}

/**
 * User preferences that can be updated.
 */
export interface UserPreferencesUpdate {
  wakeTime?: string;
  sleepTime?: string;
  dailySchedule?: DailyScheduleConfig | null;
  timeZone?: string;
  defaultTaskDurationMinutes?: number;
  defaultCalendarId?: string;
}

/**
 * Auth session payload (minimal for MVP).
 */
export interface AuthSession {
  userId: string;
  email: string;
}

