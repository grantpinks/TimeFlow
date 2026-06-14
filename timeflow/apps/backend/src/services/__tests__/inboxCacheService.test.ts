import { describe, expect, it } from 'vitest';
import { stripInboxSnippets, type EmailInboxResponse } from '@timeflow/shared';
import {
  getInboxCacheMaxAgeMs,
  getInboxCacheTtlMs,
} from '../inboxCacheService.js';

describe('inboxCacheService constants', () => {
  it('uses 90s stale refresh and 24h hard expiry', () => {
    expect(getInboxCacheTtlMs()).toBe(90 * 1000);
    expect(getInboxCacheMaxAgeMs()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('stripInboxSnippets', () => {
  it('removes snippet from cached messages', () => {
    const inbox: EmailInboxResponse = {
      messages: [
        {
          id: 'm1',
          from: 'a@example.com',
          subject: 'Hello',
          snippet: 'secret preview text',
          receivedAt: '2026-06-13T12:00:00.000Z',
          importance: 'normal',
        },
      ],
      nextPageToken: 'token',
    };

    const sanitized = stripInboxSnippets(inbox);

    expect(sanitized.messages[0]).not.toHaveProperty('snippet');
    expect(sanitized.messages[0].subject).toBe('Hello');
    expect(sanitized.nextPageToken).toBe('token');
  });
});
