/** Map raw API errors to user-facing copy (parity with web assistant). */
export function friendlyApplyError(raw: string): string {
  if (!raw) return 'Something went wrong applying your schedule. Please try again.';
  const lower = raw.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('auth')) {
    return 'Your session expired. Please sign in again.';
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'Too many requests — please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (lower.includes('invalid') && lower.includes('id')) {
    return "Some task IDs in this schedule are no longer valid. Ask Flow to regenerate your schedule, then try again.";
  }
  if (lower.includes('conflict') || lower.includes('overlap')) {
    return 'Some blocks overlap existing calendar events. Review the warnings and apply again, or ask Flow to reschedule.';
  }
  if (lower.includes('500') || lower.includes('internal server')) {
    return 'A server error occurred. Please try again in a moment.';
  }
  if (raw.length > 120) return 'Failed to apply schedule. Please try again.';
  return raw;
}
