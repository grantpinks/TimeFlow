import { describe, expect, it } from 'vitest';
import { buildDueTaskCalendarWindow } from '../calendarDueTaskEvents';

describe('buildDueTaskCalendarWindow', () => {
  it('keeps date-only due tasks inside the local due day', () => {
    const window = buildDueTaskCalendarWindow('2026-06-24');

    expect(window.start.getFullYear()).toBe(2026);
    expect(window.start.getMonth()).toBe(5);
    expect(window.start.getDate()).toBe(24);
    expect(window.start.getHours()).toBe(0);
    expect(window.start.getMinutes()).toBe(0);
    expect(window.end.getFullYear()).toBe(2026);
    expect(window.end.getMonth()).toBe(5);
    expect(window.end.getDate()).toBe(25);
    expect(window.end.getHours()).toBe(0);
    expect(window.end.getMinutes()).toBe(0);
  });

  it('uses the due-date calendar day instead of the equivalent UTC day', () => {
    const window = buildDueTaskCalendarWindow('2026-06-24T23:00:00-05:00');

    expect(window.start.getFullYear()).toBe(2026);
    expect(window.start.getMonth()).toBe(5);
    expect(window.start.getDate()).toBe(24);
    expect(window.end.getFullYear()).toBe(2026);
    expect(window.end.getMonth()).toBe(5);
    expect(window.end.getDate()).toBe(25);
  });
});
