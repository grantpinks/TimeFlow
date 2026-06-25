import type { EnrichedHabitSuggestion } from '@timeflow/shared';

export interface CalendarHabitSuggestionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  habitId: string;
  suggestion: EnrichedHabitSuggestion;
}

export function buildHabitSuggestionCalendarEvents(
  suggestions: EnrichedHabitSuggestion[],
  enabled: boolean
): CalendarHabitSuggestionEvent[] {
  if (!enabled) return [];

  return suggestions
    .filter((suggestion) => suggestion.status === 'proposed')
    .map((suggestion) => {
      const start = new Date(suggestion.start);
      const end = new Date(suggestion.end);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return null;
      }

      return {
        id: `habit-suggestion-${suggestion.habitId}-${suggestion.start}`,
        title: `Suggested: ${suggestion.habit.title}`,
        start,
        end,
        habitId: suggestion.habitId,
        suggestion,
      };
    })
    .filter((event): event is CalendarHabitSuggestionEvent => Boolean(event));
}
