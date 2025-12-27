import { describe, expect, it } from 'vitest';
import { isTokenValid } from '../meetingBookingService';

describe('meetingTokens', () => {
  it('rejects expired tokens', () => {
    const ok = isTokenValid({ expiresAt: new Date('2000-01-01'), usedAt: null });
    expect(ok).toBe(false);
  });
});
