/**
 * Habit types for habit tracking and scheduling
 */

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  daysOfWeek: string[]; // e.g., ["mon", "tue", "wed"]
  preferredTimeOfDay?: TimeOfDay | null;
  durationMinutes: number;
  priorityRank?: number | null;
  isActive: boolean;
  
  // Identity-based habit tracking
  identity?: string | null; // "Writer", "Athlete", "Leader" - who you're becoming
  longTermGoal?: string | null; // "Publish a book by 2027" - the bigger picture
  whyStatement?: string | null; // Personal motivation - why this matters
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateHabitRequest {
  title: string;
  description?: string;
  frequency: HabitFrequency;
  daysOfWeek?: string[];
  preferredTimeOfDay?: TimeOfDay;
  durationMinutes?: number;
  
  // Identity-based fields
  identity?: string;
  longTermGoal?: string;
  whyStatement?: string;
}

export interface UpdateHabitRequest {
  title?: string;
  description?: string;
  frequency?: HabitFrequency;
  daysOfWeek?: string[];
  preferredTimeOfDay?: TimeOfDay;
  durationMinutes?: number;
  isActive?: boolean;
  
  // Identity-based fields
  identity?: string;
  longTermGoal?: string;
  whyStatement?: string;
}

export interface ScheduledHabitInstance {
  scheduledHabitId: string;
  habitId: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  eventId?: string | null;
}
