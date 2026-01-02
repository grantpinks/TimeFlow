import type { EmailMessage, InboxView } from '@timeflow/shared';

export function filterInboxEmails(
  emails: EmailMessage[],
  options: {
    selectedViewId?: string;
    views?: InboxView[];
    selectedCategoryId: string | null;
    needsResponseOnly?: boolean;
  }
): EmailMessage[] {
  let filtered = emails;

  if (options.selectedCategoryId) {
    filtered = filtered.filter((email) => email.category === options.selectedCategoryId);
    if (options.needsResponseOnly) {
      filtered = filtered.filter((email) => email.needsResponse);
    }
    return filtered;
  }

  if (options.needsResponseOnly) {
    filtered = filtered.filter((email) => email.needsResponse);
  }

  if (options.selectedViewId && options.views) {
    const selectedView = options.views.find((view) => view.id === options.selectedViewId);
    const allowedCategories = selectedView?.labelIds ?? [];
    if (allowedCategories.length > 0) {
      filtered = filtered.filter((email) => email.category && allowedCategories.includes(email.category));
    }
  }

  return filtered;
}
