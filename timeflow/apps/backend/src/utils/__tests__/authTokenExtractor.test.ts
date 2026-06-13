import { describe, it, expect } from 'vitest';
import { extractAccessToken, extractRefreshToken } from '../authTokenExtractor.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../sessionCookies.js';

describe('extractAccessToken', () => {
  it('prefers Authorization Bearer header', () => {
    const token = extractAccessToken({
      authorization: 'Bearer header-token',
      cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' },
    });
    expect(token).toBe('header-token');
  });

  it('falls back to access cookie', () => {
    const token = extractAccessToken({
      cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' },
    });
    expect(token).toBe('cookie-token');
  });

  it('returns null when missing', () => {
    expect(extractAccessToken({})).toBeNull();
  });
});

describe('extractRefreshToken', () => {
  it('reads refresh token from cookie', () => {
    const token = extractRefreshToken({
      cookies: { [REFRESH_COOKIE_NAME]: 'refresh-token' },
    });
    expect(token).toBe('refresh-token');
  });

  it('returns null when missing', () => {
    expect(extractRefreshToken({})).toBeNull();
  });
});
