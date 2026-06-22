import { describe, it, expect } from 'vitest';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
  buildClearCookieOptions,
} from '../sessionCookies.js';

describe('sessionCookies', () => {
  it('uses stable cookie names', () => {
    expect(ACCESS_COOKIE_NAME).toBe('tf_access');
    expect(REFRESH_COOKIE_NAME).toBe('tf_refresh');
  });

  it('sets httpOnly and sameSite lax in production', () => {
    const opts = buildAccessCookieOptions('production');
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.secure).toBe(true);
    expect(opts.domain).toBe('.time-flow.app');
  });

  it('omits domain and secure in development', () => {
    const opts = buildAccessCookieOptions('development');
    expect(opts.secure).toBe(false);
    expect(opts.domain).toBeUndefined();
  });

  it('clear options expire cookies', () => {
    const clear = buildClearCookieOptions('production');
    expect(clear.maxAge).toBe(0);
  });

  it('refresh cookie has longer max age than access', () => {
    const access = buildAccessCookieOptions('production');
    const refresh = buildRefreshCookieOptions('production');
    expect(refresh.maxAge).toBeGreaterThan(access.maxAge!);
  });

  it('keeps the access cookie valid through normal mobile browser backgrounding', () => {
    const access = buildAccessCookieOptions('production');
    expect(access.maxAge).toBeGreaterThanOrEqual(24 * 60 * 60);
  });
});
