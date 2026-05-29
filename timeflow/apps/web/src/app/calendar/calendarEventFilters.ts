import type { CalendarEvent, ScheduledHabitInstance, Task } from '@timeflow/shared';

const DEFAULT_PREFIX = 'TF|';

export type FilterOptions = {
  prefixEnabled?: boolean;
  prefix?: string | null;
  scheduledHabitInstances?: ScheduledHabitInstance[];
};

function normalizePrefix(prefix?: string | null): string {
  const trimmed = (prefix ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PREFIX;
}

function isLegacyTimeflowTask(summary: string) {
  return summary.startsWith('[timeflow]');
}

function isLegacyTimeflowHabit(summary: string) {
  return summary.startsWith('[timeflow habit]') || summary.startsWith('[habit]');
}

/** Strip TimeFlow habit prefixes for title matching (Check Email vs TF| Habit: Check Email). */
export function normalizeTitleForHabitMatch(summary: string, options: FilterOptions = {}): string {
  let s = summary.trim().toLowerCase();
  const prefixEnabled = options.prefixEnabled !== false;
  const normalizedPrefix = prefixEnabled ? normalizePrefix(options.prefix).toLowerCase() : '';

  if (normalizedPrefix && s.startsWith(`${normalizedPrefix} habit:`)) {
    s = s.slice(`${normalizedPrefix} habit:`.length).trim();
  }
  if (s.startsWith('[timeflow habit]')) {
    s = s.replace(/^\[timeflow habit\]\s*/i, '').trim();
  }
  if (s.startsWith('[habit]')) {
    s = s.replace(/^\[habit\]\s*/i, '').trim();
  }
  return s;
}

export function buildTimeflowEventIds(
  tasks: Task[],
  events: CalendarEvent[],
  scheduledHabitInstances: ScheduledHabitInstance[] = []
): Set<string> {
  const ids = new Set<string>();

  for (const task of tasks) {
    if (task.scheduledTask?.eventId) {
      ids.add(task.scheduledTask.eventId);
    }
  }

  for (const instance of scheduledHabitInstances) {
    if (instance.eventId) {
      ids.add(instance.eventId);
    }
  }

  for (const event of events) {
    if (event.sourceType === 'habit' && event.id) {
      ids.add(event.id);
    }
  }

  return ids;
}

/** True when a plain calendar row mirrors a TimeFlow habit row (same slot + title). */
export function isHabitCalendarMirror(
  candidate: CalendarEvent,
  habit: CalendarEvent,
  options: FilterOptions = {}
): boolean {
  if (habit.sourceType !== 'habit') return false;
  if (candidate.sourceType === 'habit' || candidate.sourceType === 'task') return false;

  const habitTitle = normalizeTitleForHabitMatch(habit.summary ?? '', options);
  const candidateTitle = normalizeTitleForHabitMatch(candidate.summary ?? '', options);
  if (!habitTitle || habitTitle !== candidateTitle) return false;

  const habitStart = new Date(habit.start).getTime();
  const habitEnd = new Date(habit.end).getTime();
  const candidateStart = new Date(candidate.start).getTime();
  const candidateEnd = new Date(candidate.end).getTime();

  if (Math.abs(habitStart - candidateStart) <= 2 * 60 * 1000) return true;
  return candidateStart < habitEnd && candidateEnd > habitStart;
}

export function filterExternalEvents(
  events: CalendarEvent[],
  timeflowEventIds: Set<string>,
  options: FilterOptions = {}
): CalendarEvent[] {
  if (events.length === 0) return events;

  const prefixEnabled = options.prefixEnabled !== false;
  const normalizedPrefix = prefixEnabled ? normalizePrefix(options.prefix) : '';
  const normalizedPrefixLower = normalizedPrefix.toLowerCase();
  const scheduledIds = new Set(
    (options.scheduledHabitInstances ?? [])
      .map((event) => event.eventId)
      .filter((id): id is string => Boolean(id))
  );

  return events.filter((event) => {
    const summary = event.summary?.trim().toLowerCase() ?? '';
    const isPrefixedHabit =
      prefixEnabled && normalizedPrefixLower.length > 0
        ? summary.startsWith(`${normalizedPrefixLower} habit:`)
        : false;
    const isLegacyHabit = summary ? isLegacyTimeflowHabit(summary) : false;

    if (event.sourceType === 'task') {
      return false;
    }

    if (scheduledIds.has(event.id ?? '')) {
      return Boolean(event.sourceType && event.sourceType === 'habit');
    }

    if (event.sourceType === 'habit') {
      return true;
    }

    if (isPrefixedHabit || isLegacyHabit) {
      return true;
    }

    if (event.id && timeflowEventIds.has(event.id)) {
      return false;
    }

    if (!summary) {
      return true;
    }

    if (!prefixEnabled) {
      return true;
    }

    if (summary.startsWith(normalizedPrefixLower)) {
      return summary.startsWith(`${normalizedPrefixLower} habit:`);
    }

    if (isLegacyTimeflowTask(summary)) {
      return false;
    }

    return true;
  });
}

/** Filter external/task dupes and drop calendar mirrors of TimeFlow habit rows. */
export function filterEventsForDisplay(
  events: CalendarEvent[],
  timeflowEventIds: Set<string>,
  options: FilterOptions = {}
): CalendarEvent[] {
  const filtered = filterExternalEvents(events, timeflowEventIds, options);
  const habits = filtered.filter((event) => event.sourceType === 'habit');
  if (habits.length === 0) return filtered;

  return filtered.filter((event) => {
    if (event.sourceType === 'habit') return true;
    if (event.sourceType === 'task') return false;
    return !habits.some((habit) => isHabitCalendarMirror(event, habit, options));
  });
}
