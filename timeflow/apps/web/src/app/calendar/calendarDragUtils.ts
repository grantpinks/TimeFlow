export const CALENDAR_SNAP_MINUTES = 15;

export interface CalendarDropPreview {
  start: Date;
  end: Date;
  title: string;
  kind: 'task' | 'habit';
  color?: string;
}

export function snapDateToTimeBlock(
  date: Date,
  snapMinutes = CALENDAR_SNAP_MINUTES
): Date {
  const snapMs = snapMinutes * 60 * 1000;
  return new Date(Math.round(date.getTime() / snapMs) * snapMs);
}

export function buildDropWindow(
  rawStart: Date,
  durationMinutes: number,
  snapMinutes = CALENDAR_SNAP_MINUTES
): { start: Date; end: Date } {
  const start = snapDateToTimeBlock(rawStart, snapMinutes);
  const duration = Math.max(snapMinutes, Math.round(durationMinutes / snapMinutes) * snapMinutes);
  return {
    start,
    end: new Date(start.getTime() + duration * 60 * 1000),
  };
}

export function snapResizeDuration({
  originalDurationMinutes,
  deltaY,
  pixelsPerMinute,
  snapMinutes = CALENDAR_SNAP_MINUTES,
}: {
  originalDurationMinutes: number;
  deltaY: number;
  pixelsPerMinute: number;
  snapMinutes?: number;
}): number {
  const safePixelsPerMinute = Math.max(0.1, pixelsPerMinute);
  const rawDeltaMinutes = deltaY / safePixelsPerMinute;
  const snappedDeltaMinutes = Math.round(rawDeltaMinutes / snapMinutes) * snapMinutes;
  const snappedDuration = originalDurationMinutes + snappedDeltaMinutes;
  return Math.max(snapMinutes, snappedDuration);
}

export function formatDropPreviewTime(start: Date, end: Date): string {
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return `${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString(
    'en-US',
    timeOptions
  )}`;
}
