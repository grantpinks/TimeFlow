import type { EmailCategory, EmailMessage } from '@timeflow/shared';

export type InboxQuickFilter = 'all' | 'professional' | 'personal';

const QUICK_FILTER_MAP: Record<Exclude<InboxQuickFilter, 'all'>, EmailCategory[]> = {
  professional: ['work'],
  personal: ['personal'],
};

export function filterInboxEmails(
  emails: EmailMessage[],
  options: {
    selectedFilter: InboxQuickFilter;
    selectedCategoryId: string | null;
  }
): EmailMessage[] {
  let filtered = emails;

  if (options.selectedFilter !== 'all') {
    const allowedCategories = QUICK_FILTER_MAP[options.selectedFilter] || [];
    filtered = filtered.filter((email) => email.category && allowedCategories.includes(email.category));
  }

  if (options.selectedCategoryId) {
    filtered = filtered.filter((email) => email.category === options.selectedCategoryId);
  }

  return filtered;
}
