import { describe, expect, it } from 'vitest';
import {
  GOOGLE_GMAIL_SCOPES,
} from '../../config/google.js';
import {
  hasFullGmailScopes,
  hasGmailReadScope,
  isGmailApiScopeError,
  mergeGoogleScopes,
} from '../googleScopeService.js';

describe('googleScopeService', () => {
  it('merges scope strings without duplicates', () => {
    const merged = mergeGoogleScopes(
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly'
    );
    expect(merged.split(' ')).toHaveLength(2);
    expect(merged).toContain('gmail.readonly');
  });

  it('detects gmail read scope', () => {
    expect(hasGmailReadScope('https://www.googleapis.com/auth/calendar.readonly')).toBe(false);
    expect(hasGmailReadScope('https://www.googleapis.com/auth/gmail.readonly')).toBe(true);
  });

  it('detects full gmail scope set', () => {
    expect(hasFullGmailScopes(GOOGLE_GMAIL_SCOPES.join(' '))).toBe(true);
    expect(hasFullGmailScopes('https://www.googleapis.com/auth/gmail.readonly')).toBe(false);
  });

  it('detects insufficient scope Gmail API errors', () => {
    expect(
      isGmailApiScopeError({
        code: 403,
        message: 'Request had insufficient authentication scopes.',
      })
    ).toBe(true);
    expect(isGmailApiScopeError({ code: 500, message: 'fail' })).toBe(false);
  });
});
