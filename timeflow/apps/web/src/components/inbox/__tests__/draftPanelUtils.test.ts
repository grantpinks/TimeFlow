import { describe, expect, it } from 'vitest';
import { buildReplyAllRecipients, shouldShowReplyAll } from '../draftPanelUtils';

describe('draftPanelUtils', () => {
  it('dedupes recipients and excludes user email', () => {
    const result = buildReplyAllRecipients({
      from: 'Sender <sender@example.com>',
      replyTo: 'reply@example.com',
      to: 'Me <me@example.com>, Other <other@example.com>',
      cc: 'cc@example.com, ME@EXAMPLE.COM',
      userEmails: ['me@example.com'],
    });

    expect(result.to).toBe('reply@example.com');
    expect(result.cc).toBe('other@example.com, cc@example.com');
  });

  it('shows reply-all toggle only when multiple recipients exist', () => {
    expect(shouldShowReplyAll({ to: 'one@example.com', cc: undefined })).toBe(false);
    expect(shouldShowReplyAll({ to: 'a@example.com, b@example.com', cc: undefined })).toBe(true);
    expect(shouldShowReplyAll({ to: 'a@example.com', cc: 'b@example.com' })).toBe(true);
  });
});
