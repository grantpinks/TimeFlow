import { DateTime } from 'luxon';

export function normalizeDateOnlyToEndOfDay(date: Date, timeZone: string): Date {
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (!isUtcMidnight) {
    return date;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const endOfDay = DateTime.fromObject(
    { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    { zone: timeZone }
  ).toUTC();

  return endOfDay.toJSDate();
}
