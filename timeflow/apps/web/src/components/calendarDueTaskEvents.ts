const DATE_PART_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function buildDueTaskCalendarWindow(dueDateValue: string | Date): { start: Date; end: Date } {
  const rawValue = dueDateValue instanceof Date ? dueDateValue.toISOString() : dueDateValue;
  const datePart = DATE_PART_PATTERN.exec(rawValue);

  let start: Date;
  if (datePart) {
    const [, year, month, day] = datePart;
    start = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  } else {
    start = new Date(dueDateValue);
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
