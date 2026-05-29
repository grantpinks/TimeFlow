import type { CalendarEvent, ScheduledHabitInstance } from '@timeflow/shared';
import type { EnrichedHabitSuggestion } from '@timeflow/shared';
import {
  normalizeTitleForHabitMatch,
  type FilterOptions,
} from '@/app/calendar/calendarEventFilters';

export function todayLocalRangeISO(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function isSameLocalDay(iso: string, dayStr: string): boolean {
  return new Date(iso).toLocaleDateString('en-CA') === dayStr;
}

type HabitMeta = { habitId: string; habitName: string };

/**
 * Merge committed instances, calendar habit events, and proposed suggestions
 * into one plan per habit for today's identity bar.
 */
export function mergeTodayHabitPlans(
  instances: ScheduledHabitInstance[],
  calendarEvents: CalendarEvent[],
  suggestions: EnrichedHabitSuggestion[],
  habits: HabitMeta[],
  prefixOptions: FilterOptions = {}
): ScheduledHabitInstance[] {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const byHabitId = new Map<string, ScheduledHabitInstance>();

  const upsert = (entry: ScheduledHabitInstance) => {
    if (!isSameLocalDay(entry.startDateTime, todayStr)) return;
    const existing = byHabitId.get(entry.habitId);
    if (!existing) {
      byHabitId.set(entry.habitId, entry);
      return;
    }
    if (new Date(entry.startDateTime) < new Date(existing.startDateTime)) {
      byHabitId.set(entry.habitId, entry);
    }
  };

  for (const inst of instances) {
    upsert(inst);
  }

  for (const event of calendarEvents) {
    if (!isSameLocalDay(event.start, todayStr)) continue;

    if (event.sourceType === 'habit' && event.habitId) {
      upsert({
        scheduledHabitId: event.sourceId ?? `calendar-${event.id ?? event.habitId}`,
        habitId: event.habitId,
        title: event.summary,
        startDateTime: event.start,
        endDateTime: event.end,
        eventId: event.id ?? null,
      });
      continue;
    }

    if (event.sourceType === 'task') continue;

    for (const habit of habits) {
      if (byHabitId.has(habit.habitId)) continue;
      const eventTitle = normalizeTitleForHabitMatch(event.summary ?? '', prefixOptions);
      const habitTitle = normalizeTitleForHabitMatch(habit.habitName, prefixOptions);
      if (!eventTitle || eventTitle !== habitTitle) continue;

      upsert({
        scheduledHabitId: event.sourceId ?? `calendar-${event.id ?? habit.habitId}`,
        habitId: habit.habitId,
        title: habit.habitName,
        startDateTime: event.start,
        endDateTime: event.end,
        eventId: event.id ?? null,
      });
      break;
    }
  }

  for (const suggestion of suggestions) {
    if (suggestion.status === 'rejected') continue;
    if (!isSameLocalDay(suggestion.start, todayStr)) continue;
    if (byHabitId.has(suggestion.habitId)) continue;

    upsert({
      scheduledHabitId: `suggestion-${suggestion.habitId}`,
      habitId: suggestion.habitId,
      title: suggestion.habit.title,
      startDateTime: suggestion.start,
      endDateTime: suggestion.end,
      eventId: null,
    });
  }

  return Array.from(byHabitId.values()).sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );
}
