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
  isActive: boolean;
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
}

export interface UpdateHabitRequest {
  title?: string;
  description?: string;
  frequency?: HabitFrequency;
  daysOfWeek?: string[];
  preferredTimeOfDay?: TimeOfDay;
  durationMinutes?: number;
  isActive?: boolean;
}
