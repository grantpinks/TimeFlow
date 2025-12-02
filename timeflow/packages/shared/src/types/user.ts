/**
 * User-related DTOs
 *
 * These types represent user data as exposed via the API,
 * decoupled from the database ORM models.
 */

/**
 * User profile as returned by the API.
 */
export interface UserProfile {
  id: string;
  email: string;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;
}

/**
 * User preferences that can be updated.
 */
export interface UserPreferencesUpdate {
  wakeTime?: string;
  sleepTime?: string;
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

