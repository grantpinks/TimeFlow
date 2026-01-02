import type { EmailMessage, InboxView } from '@timeflow/shared';

export function filterInboxEmails(
  emails: EmailMessage[],
  options: {
    selectedViewId: string;
    views: InboxView[];
    selectedCategoryId: string | null;
  }
): EmailMessage[] {
  let filtered = emails;

  if (options.selectedCategoryId) {
    return filtered.filter((email) => email.category === options.selectedCategoryId);
  }

  const selectedView = options.views.find((view) => view.id === options.selectedViewId);
  const allowedCategories = selectedView?.labelIds ?? [];
  if (allowedCategories.length > 0) {
    filtered = filtered.filter((email) => email.category && allowedCategories.includes(email.category));
  }

  return filtered;
}
