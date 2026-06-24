const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_MIDNIGHT_MARKER_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/;

function startOfLocalDay(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function buildDueTaskCalendarWindow(dueDateValue: string | Date): { start: Date; end: Date } {
  const rawValue = dueDateValue instanceof Date ? undefined : dueDateValue;
  const dateOnly = rawValue ? DATE_ONLY_PATTERN.exec(rawValue) : null;
  const utcMidnightMarker = rawValue ? UTC_MIDNIGHT_MARKER_PATTERN.exec(rawValue) : null;

  let start: Date;
  if (dateOnly || utcMidnightMarker) {
    const [, year, month, day] = dateOnly ?? utcMidnightMarker!;
    start = startOfLocalDay(Number(year), Number(month), Number(day));
  } else {
    start = new Date(dueDateValue);
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
