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
 * Meeting availability for a specific day
 */
export interface MeetingDayConfig {
  isAvailable: boolean;           // Whether meetings are allowed on this day
  startTime?: string;              // HH:mm - earliest meeting time (if different from wakeTime)
  endTime?: string;                // HH:mm - latest meeting time (if different from sleepTime)
  maxMeetings?: number;            // Max meetings allowed on this day
}

/**
 * Per-day meeting availability configuration
 */
export interface DailyMeetingConfig {
  monday?: MeetingDayConfig;
  tuesday?: MeetingDayConfig;
  wednesday?: MeetingDayConfig;
  thursday?: MeetingDayConfig;
  friday?: MeetingDayConfig;
  saturday?: MeetingDayConfig;
  sunday?: MeetingDayConfig;
}

/**
 * User profile as returned by the API.
 */
export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;
  eventPrefixEnabled?: boolean;
  eventPrefix?: string;
  sidebarNavOrder?: string[];

  // Meeting-specific preferences
  meetingStartTime?: string | null;        // Default earliest meeting time
  meetingEndTime?: string | null;          // Default latest meeting time
  blockedDaysOfWeek?: string[];            // Days where NO meetings allowed (e.g., ["saturday", "sunday"])
  dailyMeetingSchedule?: DailyMeetingConfig | null;  // Per-day meeting config

  // Habit notification preferences (opt-in)
  notifyStreakAtRisk?: boolean;            // Notify when streak will break if not completed today
  notifyMissedHighPriority?: boolean;      // Notify when high-priority habit is missed
}

/**
 * User preferences that can be updated.
 */
export interface UserPreferencesUpdate {
  wakeTime?: string;
  sleepTime?: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
  timeZone?: string;
  defaultTaskDurationMinutes?: number;
  defaultCalendarId?: string;
  eventPrefixEnabled?: boolean;
  eventPrefix?: string;
  sidebarNavOrder?: string[];

  // Meeting-specific preferences
  meetingStartTime?: string | null;
  meetingEndTime?: string | null;
  blockedDaysOfWeek?: string[];
  dailyMeetingSchedule?: DailyMeetingConfig | null;

  // Habit notification preferences
  notifyStreakAtRisk?: boolean;
  notifyMissedHighPriority?: boolean;
}

export type EmailAccountProvider = 'google';

export interface EmailAccount {
  id: string;
  provider: EmailAccountProvider;
  email: string;
  name?: string | null;
  connected: boolean;
  primary: boolean;
}

/**
 * Auth session payload (minimal for MVP).
 */
export interface AuthSession {
  userId: string;
  email: string;
}
