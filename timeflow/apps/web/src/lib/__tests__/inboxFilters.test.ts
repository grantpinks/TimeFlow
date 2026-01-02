import { describe, expect, it } from 'vitest';
import type { InboxView } from '@timeflow/shared';
import { filterInboxEmails } from '../inboxFilters';

describe('filterInboxEmails', () => {
  const emails = [
    { id: '1', category: 'work', subject: 'Work', from: '', receivedAt: '', importance: 'normal', needsResponse: true },
    { id: '2', category: 'personal', subject: 'Personal', from: '', receivedAt: '', importance: 'normal' },
    { id: '3', category: 'updates', subject: 'Updates', from: '', receivedAt: '', importance: 'normal', needsResponse: true },
    { id: '4', category: 'promotion', subject: 'Promo', from: '', receivedAt: '', importance: 'normal' },
  ];

  const views: InboxView[] = [
    { id: 'all', name: 'All', labelIds: [], isBuiltin: true },
    { id: 'personal', name: 'Personal', labelIds: ['personal', 'updates'], isBuiltin: true },
  ];

  it('filters by selected view labelIds', () => {
    const result = filterInboxEmails(emails as any, {
      selectedViewId: 'personal',
      views,
      selectedCategoryId: null,
    });

    expect(result.map((email) => email.id)).toEqual(['2', '3']);
  });

  it('filters by selected category id when provided', () => {
    const result = filterInboxEmails(emails as any, {
      selectedViewId: 'personal',
      views,
      selectedCategoryId: 'promotion',
    });

    expect(result.map((email) => email.id)).toEqual(['4']);
  });

  it('filters by needsResponse when requested', () => {
    const result = filterInboxEmails(emails as any, {
      selectedViewId: 'all',
      views,
      selectedCategoryId: null,
      needsResponseOnly: true,
    });

    expect(result.map((email) => email.id)).toEqual(['1', '3']);
  });
});
