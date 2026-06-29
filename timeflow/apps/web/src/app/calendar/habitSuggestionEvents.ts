import type { EnrichedHabitSuggestion } from '@timeflow/shared';
import { DateTime } from 'luxon';

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

export interface HabitSuggestionOccupiedSlot {
  start: string | Date;
  end: string | Date;
  allDay?: boolean;
  transparency?: 'opaque' | 'transparent';
}

function overlapsOccupiedSlot(start: Date, end: Date, occupiedSlots: HabitSuggestionOccupiedSlot[]): boolean {
  return occupiedSlots.some((slot) => {
    if (slot.allDay || slot.transparency === 'transparent') return false;

    const busyStart = new Date(slot.start);
    const busyEnd = new Date(slot.end);

    if (
      Number.isNaN(busyStart.getTime()) ||
      Number.isNaN(busyEnd.getTime()) ||
      busyEnd <= busyStart
    ) {
      return false;
    }

    return start < busyEnd && end > busyStart;
  });
}

export function buildHabitSuggestionCalendarEvents(
  suggestions: EnrichedHabitSuggestion[],
  enabled: boolean,
  referenceDate = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  occupiedSlots: HabitSuggestionOccupiedSlot[] = []
): CalendarHabitSuggestionEvent[] {
  if (!enabled) return [];

  const todayStart = DateTime.fromJSDate(referenceDate).setZone(timeZone).startOf('day');

  return suggestions
    .filter((suggestion) => suggestion.status === 'proposed')
    .map((suggestion) => {
      const start = new Date(suggestion.start);
      const end = new Date(suggestion.end);
      const suggestionStart = DateTime.fromJSDate(start).setZone(timeZone);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        !suggestionStart.isValid ||
        end <= start ||
        suggestionStart < todayStart ||
        overlapsOccupiedSlot(start, end, occupiedSlots)
      ) {
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
