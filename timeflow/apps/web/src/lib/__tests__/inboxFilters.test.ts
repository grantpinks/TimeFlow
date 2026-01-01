import { describe, expect, it } from 'vitest';
import { filterInboxEmails } from '../inboxFilters';

describe('filterInboxEmails', () => {
  const emails = [
    { id: '1', category: 'work', subject: 'Work', from: '', receivedAt: '', importance: 'normal' },
    { id: '2', category: 'personal', subject: 'Personal', from: '', receivedAt: '', importance: 'normal' },
    { id: '3', category: 'promotion', subject: 'Promo', from: '', receivedAt: '', importance: 'normal' },
  ];

  it('returns only work emails for the professional quick filter', () => {
    const result = filterInboxEmails(emails as any, {
      selectedFilter: 'professional',
      selectedCategoryId: null,
    });

    expect(result.map((email) => email.id)).toEqual(['1']);
  });

  it('returns only personal emails for the personal quick filter', () => {
    const result = filterInboxEmails(emails as any, {
      selectedFilter: 'personal',
      selectedCategoryId: null,
    });

    expect(result.map((email) => email.id)).toEqual(['2']);
  });

  it('filters by selected category id when provided', () => {
    const result = filterInboxEmails(emails as any, {
      selectedFilter: 'all',
      selectedCategoryId: 'promotion',
    });

    expect(result.map((email) => email.id)).toEqual(['3']);
  });
});
