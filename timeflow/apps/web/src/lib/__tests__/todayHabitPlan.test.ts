import { describe, expect, it } from 'vitest';
import { mergeTodayHabitPlans } from '../todayHabitPlan';

const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');
const d = String(today.getDate()).padStart(2, '0');
const dayStr = `${y}-${m}-${d}`;

function atLocalHour(hour: number, minute = 0): string {
  const dt = new Date(`${dayStr}T12:00:00`);
  dt.setHours(hour, minute, 0, 0);
  return dt.toISOString();
}

describe('mergeTodayHabitPlans', () => {
  it('uses calendar habit event when no committed instance exists', () => {
    const start = atLocalHour(14, 30);
    const end = atLocalHour(15);

    const merged = mergeTodayHabitPlans(
      [],
      [
        {
          summary: 'TF| Habit: Stretch',
          start,
          end,
          sourceType: 'habit',
          habitId: 'habit-stretch',
        },
      ],
      [],
      [{ habitId: 'habit-stretch', habitName: 'Stretch' }],
      { prefixEnabled: true, prefix: 'TF|' }
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].habitId).toBe('habit-stretch');
    expect(new Date(merged[0].startDateTime).getHours()).toBe(14);
    expect(new Date(merged[0].startDateTime).getMinutes()).toBe(30);
  });

  it('prefers committed instance over suggestion', () => {
    const instanceStart = atLocalHour(9);
    const instanceEnd = atLocalHour(9, 30);
    const suggestionStart = atLocalHour(15);
    const suggestionEnd = atLocalHour(16);

    const merged = mergeTodayHabitPlans(
      [
        {
          scheduledHabitId: 'sh-1',
          habitId: 'h1',
          title: 'Meditate',
          startDateTime: instanceStart,
          endDateTime: instanceEnd,
        },
      ],
      [],
      [
        {
          habitId: 'h1',
          start: suggestionStart,
          end: suggestionEnd,
          status: 'proposed',
          habit: { id: 'h1', title: 'Meditate', description: null, durationMinutes: 30 },
        },
      ],
      [{ habitId: 'h1', habitName: 'Meditate' }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].scheduledHabitId).toBe('sh-1');
    expect(new Date(merged[0].startDateTime).getHours()).toBe(9);
  });
});
