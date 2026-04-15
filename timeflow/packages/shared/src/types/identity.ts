/**
 * Identity-related DTOs
 *
 * These types represent identity data as exposed via the API.
 * Identities link tasks and habits to long-term personal goals.
 */

/**
 * An Identity record as returned by the API.
 */
export interface Identity {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string; // Hex color from curated palette
  icon: string; // Single emoji character
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating an identity.
 */
export interface CreateIdentityRequest {
  name: string;
  description?: string;
  color: string;
  icon: string;
}

/**
 * Request body for updating an identity.
 */
export interface UpdateIdentityRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

/**
 * Request body for reordering identities.
 */
export interface ReorderIdentitiesRequest {
  identityIds: string[];
}

/**
 * Identity progress for a single identity on a given day.
 */
export interface IdentityDayProgress {
  identityId: string;
  name: string;
  color: string;
  icon: string;
  completedCount: number; // Tasks + habits completed today linked to this identity
  totalMinutes: number; // Sum of durations for completed items
  inProgressCount: number; // Scheduled for today, not yet complete
  /** Lifetime qualifying completions (tasks + habit instances) */
  completionCountTotal: number;
  /** Highest milestone tier achieved: 0, 25, 50, or 100 */
  milestoneTier: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Full daily identity progress response.
 */
export interface IdentityProgressResponse {
  date: string; // ISO date YYYY-MM-DD
  identities: IdentityDayProgress[];
}

/**
 * Returned when completing a task or habit instance that advances identity stats.
 */
export interface IdentityCompletionEngagement {
  milestoneUnlocked: number | null;
  currentStreak: number;
  completionCountTotal: number;
}

export interface UserRestDay {
  id: string;
  userId: string;
  localDate: string;
  reason: string;
  createdAt: string;
}

export interface UserRestDaysResponse {
  restDays: UserRestDay[];
  restDaysUsedInRolling30: number;
  restDaysLimit: number;
}
