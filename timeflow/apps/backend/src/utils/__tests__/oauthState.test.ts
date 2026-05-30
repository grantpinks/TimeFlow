import { describe, expect, it } from 'vitest';
import { decodeOAuthState, encodeOAuthState } from '../oauthState.js';

describe('oauthState', () => {
  it('encodes plain return paths for sign-in', () => {
    expect(encodeOAuthState({ returnTo: '/tasks' })).toBe('/tasks');
  });

  it('decodes legacy plain return paths', () => {
    expect(decodeOAuthState('/inbox')).toEqual({ returnTo: '/inbox', flow: 'signin' });
  });

  it('round-trips gmail connect payloads', () => {
    const encoded = encodeOAuthState({
      returnTo: '/settings',
      linkUserId: 'user_123',
      flow: 'gmail',
    });
    expect(encoded).not.toBe('/settings');
    expect(decodeOAuthState(encoded)).toEqual({
      returnTo: '/settings',
      linkUserId: 'user_123',
      flow: 'gmail',
    });
  });
});
