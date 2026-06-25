import { describe, expect, it } from 'vitest';
import { isHabitDueOnDate } from '../habitFrequency.js';

describe('isHabitDueOnDate', () => {
  const monday = new Date('2026-06-22T15:00:00.000Z');

  it('treats daily habits as due every day', () => {
    expect(isHabitDueOnDate({ frequency: 'daily', daysOfWeek: [] }, monday, 'America/Chicago')).toBe(true);
  });

  it('matches weekly habits only on their configured days', () => {
    expect(isHabitDueOnDate({ frequency: 'weekly', daysOfWeek: ['mon', 'wed'] }, monday, 'America/Chicago')).toBe(true);
    expect(isHabitDueOnDate({ frequency: 'weekly', daysOfWeek: ['tue', 'thu'] }, monday, 'America/Chicago')).toBe(false);
  });

  it('uses configured days for custom habits instead of treating them as daily', () => {
    expect(isHabitDueOnDate({ frequency: 'custom', daysOfWeek: ['Monday'] }, monday, 'America/Chicago')).toBe(true);
    expect(isHabitDueOnDate({ frequency: 'custom', daysOfWeek: ['Friday'] }, monday, 'America/Chicago')).toBe(false);
  });

  it('falls back to every day for custom habits without selected days', () => {
    expect(isHabitDueOnDate({ frequency: 'custom', daysOfWeek: [] }, monday, 'America/Chicago')).toBe(true);
  });

  it('evaluates the day in the user timezone', () => {
    const utcSundayEvening = new Date('2026-06-22T02:00:00.000Z');

    expect(isHabitDueOnDate({ frequency: 'weekly', daysOfWeek: ['sun'] }, utcSundayEvening, 'America/Chicago')).toBe(true);
    expect(isHabitDueOnDate({ frequency: 'weekly', daysOfWeek: ['mon'] }, utcSundayEvening, 'America/Chicago')).toBe(false);
  });
});
