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
    expect(window.end.getDate()).toBe(24);
    expect(window.end.getHours()).toBe(23);
    expect(window.end.getMinutes()).toBe(59);
  });

  it('uses the due-date calendar day instead of the equivalent UTC day', () => {
    const dueDate = new Date('2026-06-24T23:00:00-05:00');
    const window = buildDueTaskCalendarWindow('2026-06-24T23:00:00-05:00');

    expect(window.start.getFullYear()).toBe(dueDate.getFullYear());
    expect(window.start.getMonth()).toBe(dueDate.getMonth());
    expect(window.start.getDate()).toBe(dueDate.getDate());
    expect(window.end.getFullYear()).toBe(dueDate.getFullYear());
    expect(window.end.getMonth()).toBe(dueDate.getMonth());
    expect(window.end.getDate()).toBe(dueDate.getDate());
  });

  it('treats persisted UTC midnight as a date-only marker', () => {
    const window = buildDueTaskCalendarWindow('2026-06-24T00:00:00.000Z');

    expect(window.start.getFullYear()).toBe(2026);
    expect(window.start.getMonth()).toBe(5);
    expect(window.start.getDate()).toBe(24);
  });
});
