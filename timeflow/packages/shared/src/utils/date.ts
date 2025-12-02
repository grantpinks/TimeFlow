/**
 * Date Utilities
 *
 * Shared date/time helper functions.
 */

/**
 * Format a date as YYYY-MM-DD.
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse an ISO date string to a Date object.
 * Returns null if parsing fails.
 */
export function parseISODate(isoString: string): Date | null {
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get the start of day for a given date in a specific timezone.
 * For MVP, this uses simple string manipulation.
 */
export function getStartOfDay(dateString: string): string {
  const date = dateString.split('T')[0];
  return `${date}T00:00:00`;
}

/**
 * Get the end of day for a given date.
 */
export function getEndOfDay(dateString: string): string {
  const date = dateString.split('T')[0];
  return `${date}T23:59:59`;
}

/**
 * Add days to a date string.
 */
export function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Check if a date string is today.
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a date string is in the past.
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

