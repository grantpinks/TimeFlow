import { describe, expect, it } from 'vitest';
import { friendlyApplyError } from '../friendlyApplyError';

describe('friendlyApplyError', () => {
  it('turns auth failures into sign-in guidance', () => {
    expect(friendlyApplyError('401 Unauthorized')).toBe(
      'Your session expired. Please refresh the page and try again.'
    );
  });

  it('turns Google Calendar auth failures into reconnect guidance', () => {
    expect(friendlyApplyError('User not authenticated with Google')).toBe(
      'Google Calendar needs to be reconnected before Flow can apply this schedule.'
    );
  });

  it('turns validation overlap failures into rescheduling guidance', () => {
    expect(friendlyApplyError('Schedule validation failed: block overlaps fixed event')).toBe(
      'Some blocks overlap existing calendar events. Ask Flow to regenerate around your calendar, then try again.'
    );
  });

  it('standardizes Google Calendar connection guidance', () => {
    expect(friendlyApplyError('Google Calendar is not connected. Connect it to apply schedule.')).toBe(
      'Google Calendar needs to be reconnected before Flow can apply this schedule.'
    );
  });

  it('hides long internal messages', () => {
    expect(friendlyApplyError('x'.repeat(140))).toBe('Failed to apply schedule. Please try again.');
  });
});
