import { DateTime } from 'luxon';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const EXPLICIT_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

function assertValidDateTime(dateTime: DateTime, input: string): DateTime {
  if (!dateTime.isValid) {
    throw new Error(`Invalid task due date: ${input}`);
  }
  return dateTime;
}

export function parseTaskDueDateInput(input: string, timeZone: string): Date {
  const dateOnly = DATE_ONLY_PATTERN.exec(input);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0));
  }

  const parsed = EXPLICIT_ZONE_PATTERN.test(input)
    ? DateTime.fromISO(input, { setZone: true })
    : DateTime.fromISO(input, { zone: timeZone || 'UTC' });

  return assertValidDateTime(parsed, input).toUTC().toJSDate();
}
