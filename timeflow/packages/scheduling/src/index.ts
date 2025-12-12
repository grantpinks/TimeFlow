/**
 * @timeflow/scheduling
 *
 * Pure TypeScript scheduling engine for TimeFlow.
 * This package has no external dependencies on databases or APIs.
 */

export { scheduleTasks } from './scheduleTasks.js';
export { suggestHabitBlocks } from './suggestHabitBlocks.js';
export type {
  Priority,
  TaskInput,
  CalendarEvent,
  UserPreferences,
  ScheduledBlock,
  TimeInterval,
  HabitFrequency,
  TimeOfDayPreference,
  HabitInput,
  HabitSuggestionBlock,
} from './types.js';

