'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';

export type SchedulingCalendarOption = {
  id: string;
  name: string;
  accountEmail: string;
};

export function useSchedulingLinkCalendars(enabled: boolean) {
  const [loading, setLoading] = useState(false);
  const [googleOptions, setGoogleOptions] = useState<SchedulingCalendarOption[]>([]);
  const [appleOptions, setAppleOptions] = useState<SchedulingCalendarOption[]>([]);
  const [hasAppleAccount, setHasAppleAccount] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const accounts = await api.getConnectedAccounts();
        const google: SchedulingCalendarOption[] = [];
        const apple: SchedulingCalendarOption[] = [];

        for (const account of accounts) {
          if (account.provider === 'google') {
            for (const cal of account.calendars) {
              if (!cal.visible || cal.listedInSidebar === false) continue;
              google.push({
                id: cal.externalCalendarId,
                name: cal.name,
                accountEmail: account.email,
              });
            }
          }
          if (account.provider === 'apple_caldav') {
            for (const cal of account.calendars) {
              if (!cal.visible || cal.listedInSidebar === false) continue;
              apple.push({
                id: cal.externalCalendarId,
                name: cal.name,
                accountEmail: account.email,
              });
            }
          }
        }

        if (google.length === 0) {
          try {
            const legacy = await api.listCalendars();
            for (const cal of legacy) {
              google.push({
                id: cal.id,
                name: cal.summary,
                accountEmail: 'Google',
              });
            }
          } catch {
            // ignore — user may not have Google connected
          }
        }

        if (!cancelled) {
          setGoogleOptions(google);
          setAppleOptions(apple);
          setHasAppleAccount(apple.length > 0 || accounts.some((a) => a.provider === 'apple_caldav'));
        }
      } catch (err) {
        console.error('Failed to load scheduling calendars:', err);
        if (!cancelled) {
          setGoogleOptions([]);
          setAppleOptions([]);
          setHasAppleAccount(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { loading, googleOptions, appleOptions, hasAppleAccount };
}

export function pickDefaultCalendarId(
  provider: 'google' | 'apple',
  options: SchedulingCalendarOption[],
  preferred?: string | null
): string {
  if (preferred && options.some((o) => o.id === preferred)) {
    return preferred;
  }
  if (options.length > 0) return options[0].id;
  return provider === 'google' ? 'primary' : '';
}
