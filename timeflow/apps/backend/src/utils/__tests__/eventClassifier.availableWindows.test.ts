import { describe, expect, it } from 'vitest';
import { buildAvailableWindowsContext } from '../eventClassifier';
import type { CalendarEvent } from '@timeflow/shared';

const TZ = 'America/New_York';

/** First line that lists FREE windows for a day (today is first). */
function firstFreeWindowsLine(context: string): string | undefined {
  return context.split('\n').find((l) => l.includes('FREE windows →'));
}

describe('buildAvailableWindowsContext', () => {
  it('does not advertise morning hours as free on today when local time is after wake (5 PM → window starts at 5 PM, not 8 AM)', () => {
    // 2026-04-15 17:00 Eastern (EDT, UTC-4) → 21:00 UTC
    const windowStart = '2026-04-15T21:00:00.000Z';
    const windowEnd = '2026-04-16T21:00:00.000Z';

    const ctx = buildAvailableWindowsContext(
      [] as CalendarEvent[],
      '08:00',
      '22:00',
      TZ,
      windowStart,
      windowEnd
    );

    const first = firstFreeWindowsLine(ctx);
    expect(first).toBeDefined();
    expect(first!).toContain('5:00 PM');
    expect(first!).not.toContain('8:00 AM');
  });

  it('starts today at wake when local time is before wake', () => {
    // 2026-04-15 07:00 Eastern → 11:00 UTC
    const windowStart = '2026-04-15T11:00:00.000Z';
    const windowEnd = '2026-04-16T11:00:00.000Z';

    const ctx = buildAvailableWindowsContext(
      [] as CalendarEvent[],
      '08:00',
      '22:00',
      TZ,
      windowStart,
      windowEnd
    );

    const first = firstFreeWindowsLine(ctx);
    expect(first).toBeDefined();
    expect(first!).toContain('8:00 AM');
    expect(first!).not.toContain('7:00 AM');
  });
});
