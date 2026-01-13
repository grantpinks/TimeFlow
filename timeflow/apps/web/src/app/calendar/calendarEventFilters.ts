import type { CalendarEvent, ScheduledHabitInstance } from '@timeflow/shared';

const DEFAULT_PREFIX = 'TF|';

type FilterOptions = {
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
    const isPrefixedHabit = prefixEnabled && normalizedPrefixLower.length > 0
      ? summary.startsWith(`${normalizedPrefixLower} habit:`)
      : false;
    const isLegacyHabit = summary ? isLegacyTimeflowHabit(summary) : false;

    if (scheduledIds.has(event.id ?? '')) {
      return true;
    }

    if (event.sourceType && event.sourceType !== 'external') {
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
