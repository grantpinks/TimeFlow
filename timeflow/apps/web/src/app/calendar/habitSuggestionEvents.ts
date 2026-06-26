import type { EnrichedHabitSuggestion } from '@timeflow/shared';

export interface CalendarHabitSuggestionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  displayEnd: Date;
  habitId: string;
  suggestion: EnrichedHabitSuggestion;
}

const MIN_SUGGESTION_DISPLAY_MINUTES = 30;

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
        displayEnd: new Date(
          Math.max(end.getTime(), start.getTime() + MIN_SUGGESTION_DISPLAY_MINUTES * 60 * 1000)
        ),
        habitId: suggestion.habitId,
        suggestion,
      };
    })
    .filter((event): event is CalendarHabitSuggestionEvent => Boolean(event));
}
