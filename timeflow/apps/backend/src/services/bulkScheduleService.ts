/**
 * Bulk Schedule Service
 *
 * Generates habit schedule suggestions for a date range
 */

import { DateTime } from 'luxon';
import { getHabitSuggestionsForUser } from './habitSuggestionService.js';
import type { EnrichedHabitSuggestion } from './habitSuggestionService.js';

export interface BulkScheduleRequest {
  userId: string;
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;   // ISO date
  customPrompt?: string;
  habitIds?: string[]; // Optional: filter to specific habits
}

export interface BulkScheduleSuggestion {
  id: string; // temp ID for frontend tracking
  habitId: string;
  habitTitle: string;
  startDateTime: string;
  endDateTime: string;
  date: string;
  dayOfWeek: string;
}

export interface BulkScheduleResponse {
  suggestions: BulkScheduleSuggestion[];
  conflictWarnings?: Array<{
    suggestionId: string;
    reason: string;
  }>;
}

export async function generateBulkSchedule(
  request: BulkScheduleRequest
): Promise<BulkScheduleResponse> {
  const { userId, dateRangeStart, dateRangeEnd, customPrompt, habitIds } = request;

  // Validate date range
  const start = DateTime.fromISO(dateRangeStart);
  const end = DateTime.fromISO(dateRangeEnd);
  const daysDiff = end.diff(start, 'days').days;

  if (daysDiff > 14) {
    throw new Error('Date range cannot exceed 14 days');
  }

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }

  // TODO: Parse customPrompt for constraints (v1: skip for now)

  // Use existing habit suggestion service
  const rawSuggestions = await getHabitSuggestionsForUser(
    userId,
    start.toISO()!,
    end.toISO()!,
    habitIds
  );

  // Transform to bulk schedule format
  const suggestions: BulkScheduleSuggestion[] = rawSuggestions.map((suggestion, index) => {
    const startValue = suggestion.start ?? (suggestion as { startDateTime?: string }).startDateTime;
    const endValue = suggestion.end ?? (suggestion as { endDateTime?: string }).endDateTime;
    if (!startValue || !endValue) {
      throw new Error('Missing start or end time for habit suggestion');
    }
    const startDT = DateTime.fromISO(startValue);
    return {
      id: `suggestion-${index}`,
      habitId: suggestion.habitId,
      habitTitle: suggestion.habit.title,
      startDateTime: startValue,
      endDateTime: endValue,
      date: startDT.toISODate()!,
      dayOfWeek: startDT.toFormat('EEEE'), // "Monday", "Tuesday", etc.
    };
  });

  return { suggestions };
}
