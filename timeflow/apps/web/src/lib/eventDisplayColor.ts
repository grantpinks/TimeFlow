import type { CalendarEvent } from '@timeflow/shared';
import type { ConnectedAccount, EventCategorization } from '@/lib/api';

/**
 * Display color priority:
 * 1. Manual category pick (isManual) → category color
 * 2. Calendar swatch from connected calendar
 * 3. AI-suggested category color
 */
export function resolveEventDisplayColor(
  event: Pick<CalendarEvent, 'calendarColor'>,
  categorization?: EventCategorization | null
): string | undefined {
  if (categorization?.isManual && categorization.categoryColor) {
    return categorization.categoryColor;
  }
  return event.calendarColor ?? categorization?.categoryColor;
}

export function enrichEventsWithCalendarColors(
  events: CalendarEvent[],
  accounts: ConnectedAccount[]
): CalendarEvent[] {
  const colorByConnectedCalendarId = new Map<string, string>();
  for (const account of accounts) {
    for (const cal of account.calendars) {
      if (cal.color) {
        colorByConnectedCalendarId.set(cal.id, cal.color);
      }
    }
  }

  return events.map((event) => ({
    ...event,
    calendarColor:
      event.calendarColor ??
      (event.connectedCalendarId
        ? colorByConnectedCalendarId.get(event.connectedCalendarId)
        : undefined),
  }));
}
