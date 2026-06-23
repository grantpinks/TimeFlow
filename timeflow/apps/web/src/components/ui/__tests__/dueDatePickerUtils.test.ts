import { describe, expect, it } from 'vitest';
import { formatLocalDateTimeInput } from '../dueDatePickerUtils';

describe('formatLocalDateTimeInput', () => {
  it('preserves the selected local day for evening times', () => {
    const date = new Date(2026, 5, 24, 21, 0, 0, 0);

    expect(formatLocalDateTimeInput(date)).toBe('2026-06-24T21:00');
  });

  it('does not include seconds or UTC timezone markers', () => {
    const date = new Date(2026, 5, 24, 9, 5, 30, 999);

    expect(formatLocalDateTimeInput(date)).toBe('2026-06-24T09:05');
  });

  it('does not rely on UTC serialization', () => {
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = () => {
      throw new Error('UTC serialization should not be used for local input formatting');
    };

    try {
      expect(formatLocalDateTimeInput(new Date(2026, 5, 24, 21, 0, 0, 0))).toBe('2026-06-24T21:00');
    } finally {
      Date.prototype.toISOString = originalToISOString;
    }
  });
});
