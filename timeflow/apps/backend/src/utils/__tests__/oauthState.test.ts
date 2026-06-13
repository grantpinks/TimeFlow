import { describe, expect, it } from 'vitest';
import { decodeOAuthState, encodeOAuthState } from '../oauthState.js';

describe('oauthState', () => {
  it('encodes plain return paths for sign-in', () => {
    expect(encodeOAuthState({ returnTo: '/tasks' })).toBe('/tasks');
  });

  it('decodes legacy plain return paths', () => {
    expect(decodeOAuthState('/inbox')).toEqual({ returnTo: '/inbox', flow: 'signin' });
  });

  it('round-trips gmail connect payloads with HMAC signature and nonce', () => {
    const encoded = encodeOAuthState({
      returnTo: '/settings',
      linkUserId: 'user_123',
      flow: 'gmail',
    });
    expect(encoded).not.toBe('/settings');
    expect(encoded).toContain('.');
    const decoded = decodeOAuthState(encoded);
    expect(decoded).toMatchObject({
      returnTo: '/settings',
      linkUserId: 'user_123',
      flow: 'gmail',
    });
    expect(decoded.nonce).toBeTruthy();
  });

  it('rejects tampered signed state', () => {
    const encoded = encodeOAuthState({
      returnTo: '/settings',
      linkUserId: 'user_a',
      flow: 'gmail',
    });
    const tampered = `${encoded.slice(0, -4)}XXXX`;
    expect(() => decodeOAuthState(tampered)).toThrow('Invalid OAuth state');
  });

  it('rejects open-redirect style returnTo in signed payloads', () => {
    const encoded = encodeOAuthState({
      returnTo: '//evil.example.com',
      linkUserId: 'user_123',
      flow: 'gmail',
    });
    expect(decodeOAuthState(encoded).returnTo).toBe('/tasks');
  });
});
