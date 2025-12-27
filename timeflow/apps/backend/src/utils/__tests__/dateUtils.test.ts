import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { normalizeDateOnlyToEndOfDay } from '../dateUtils.js';

describe('normalizeDateOnlyToEndOfDay', () => {
  it('converts UTC-midnight date-only to end-of-day in user timezone', () => {
    const tz = 'America/Chicago';
    const input = new Date('2025-12-26T00:00:00.000Z');

    const normalized = normalizeDateOnlyToEndOfDay(input, tz);
    const local = DateTime.fromJSDate(normalized, { zone: tz });

    expect(local.toISODate()).toBe('2025-12-26');
    expect(local.hour).toBe(23);
    expect(local.minute).toBe(59);
    expect(local.second).toBe(59);
  });

  it('keeps non-midnight timestamps unchanged', () => {
    const tz = 'America/Chicago';
    const input = new Date('2025-12-26T15:30:00.000Z');

    const normalized = normalizeDateOnlyToEndOfDay(input, tz);
    expect(normalized.toISOString()).toBe(input.toISOString());
  });
});
