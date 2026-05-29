import { ConnectedAccountProvider } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import * as googleCalendarService from './googleCalendarService.js';
import * as appleCalendarService from './appleCalendarService.js';

type MergedExternalEvent = {
  id?: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  attendees?: { email: string }[];
  transparency?: 'opaque' | 'transparent';
  sourceType: 'external';
  provider?: 'google' | 'apple';
  connectedAccountId?: string;
  connectedCalendarId?: string;
  calendarColor?: string;
};

export type MergedEventsPurpose = 'display' | 'availability';

export async function getMergedExternalEvents(
  userId: string,
  from: string,
  to: string,
  purpose: MergedEventsPurpose = 'display'
): Promise<MergedExternalEvent[]> {
  const calendarWhere =
    purpose === 'availability'
      ? { useForAvailability: true, account: { userId } }
      : { visible: true, account: { userId } };

  const connectedCalendars = await prisma.connectedCalendar.findMany({
    where: calendarWhere,
    include: { account: true },
  });

  if (connectedCalendars.length === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleAccessToken) return [];
    const fallbackCalendarId = user.defaultCalendarId || 'primary';
    try {
      const fallbackEvents = await googleCalendarService.getEvents(
        userId,
        fallbackCalendarId,
        from,
        to
      );
      return fallbackEvents.map((event) => ({
        ...event,
        sourceType: 'external' as const,
        provider: 'google' as const,
      }));
    } catch (error) {
      console.error('[MergedCalendar] Legacy Google fallback failed:', error);
      return [];
    }
  }

  const results = await Promise.allSettled(
    connectedCalendars.map(async (calendar) => {
      const provider = calendar.account.provider;
      if (provider === ConnectedAccountProvider.google) {
        const events = await googleCalendarService.getEvents(
          userId,
          calendar.externalCalendarId,
          from,
          to
        );
        return events.map((event) => ({
          ...event,
          sourceType: 'external' as const,
          provider: 'google' as const,
          connectedAccountId: calendar.connectedAccountId,
          connectedCalendarId: calendar.id,
          calendarColor: calendar.color ?? undefined,
        }));
      }

      if (provider === ConnectedAccountProvider.apple_caldav) {
        const events = await appleCalendarService.getEvents(
          userId,
          calendar.externalCalendarId,
          from,
          to
        );
        return events.map((event) => ({
          ...event,
          id:
            event.id ??
            `apple:${calendar.id}:${event.start}:${event.summary ?? 'event'}`,
          sourceType: 'external' as const,
          provider: 'apple' as const,
          connectedAccountId: calendar.connectedAccountId,
          connectedCalendarId: calendar.id,
          calendarColor: calendar.color ?? undefined,
        }));
      }

      return [];
    })
  );

  const events: MergedExternalEvent[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const calendar = connectedCalendars[i];
    if (result.status === 'fulfilled') {
      events.push(...result.value);
      continue;
    }

    const message =
      result.reason instanceof Error ? result.reason.message : 'Failed to fetch calendar events';
    console.error(
      `[MergedCalendar] Failed to fetch ${calendar.account.provider} calendar ${calendar.externalCalendarId}:`,
      result.reason
    );
    await prisma.connectedAccount
      .update({
        where: { id: calendar.connectedAccountId },
        data: {
          lastErrorAt: new Date(),
          lastErrorMessage: message.slice(0, 500),
        },
      })
      .catch((err) => console.error('[MergedCalendar] Failed to record account error:', err));
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
