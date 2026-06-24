import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { parseTaskDueDateInput } from '../taskDueDate.js';

describe('parseTaskDueDateInput', () => {
  it('preserves date-only input as UTC midnight marker for local all-day deadlines', () => {
    const parsed = parseTaskDueDateInput('2026-06-24', 'America/Chicago');

    expect(parsed.toISOString()).toBe('2026-06-24T00:00:00.000Z');
  });

  it('interprets browser datetime-local input in the user timezone', () => {
    const parsed = parseTaskDueDateInput('2026-06-24T09:30', 'America/Chicago');
    const local = DateTime.fromJSDate(parsed, { zone: 'America/Chicago' });

    expect(local.toFormat("yyyy-LL-dd'T'HH:mm")).toBe('2026-06-24T09:30');
    expect(parsed.toISOString()).toBe('2026-06-24T14:30:00.000Z');
  });

  it('preserves explicit-offset instants', () => {
    const parsed = parseTaskDueDateInput('2026-06-24T09:30:00-05:00', 'America/New_York');

    expect(parsed.toISOString()).toBe('2026-06-24T14:30:00.000Z');
  });
});
