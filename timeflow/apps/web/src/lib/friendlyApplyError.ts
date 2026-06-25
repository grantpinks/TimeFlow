/** Map raw schedule-apply failures into user-facing copy. */
export function friendlyApplyError(raw: string): string {
  if (!raw) return 'Something went wrong applying your schedule. Please try again.';

  const lower = raw.toLowerCase();

  if (
    lower.includes('google calendar') ||
    lower.includes('not authenticated with google') ||
    lower.includes('connect it to apply schedule')
  ) {
    return 'Google Calendar needs to be reconnected before Flow can apply this schedule.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('session expired')) {
    return 'Your session expired. Please refresh the page and try again.';
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (lower.includes('invalid') && lower.includes('id')) {
    return "Some task IDs in this schedule are no longer valid. Ask Flow to regenerate your schedule, then try again.";
  }
  if (lower.includes('conflict') || lower.includes('overlap')) {
    return 'Some blocks overlap existing calendar events. Ask Flow to regenerate around your calendar, then try again.';
  }
  if (lower.includes('500') || lower.includes('internal server')) {
    return 'A server error occurred. Please try again in a moment.';
  }

  if (raw.length > 120) return 'Failed to apply schedule. Please try again.';
  return raw;
}
