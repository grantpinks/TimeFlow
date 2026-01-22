import type { PerHabitInsights } from '@timeflow/shared';

const DEFAULT_RESCUE_HOUR = 18; // 6pm
const MIN_LEAD_HOURS = 2;

export function parseTimeSlotStartHour(timeSlot: string): number | null {
  const ampmMatch = timeSlot.match(/(\d{1,2})(am|pm)/i);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const meridiem = ampmMatch[2].toLowerCase();
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return hour;
  }

  const twentyFourHourMatch = timeSlot.match(/^(\d{1,2})(?::\d{2})?/);
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      return hour;
    }
  }

  return null;
}

export function buildRescueBlockForAtRisk(
  habitInsight: PerHabitInsights,
  now: Date = new Date()
) {
  const duration =
    habitInsight.minutesScheduled / Math.max(habitInsight.scheduled, 1);

  let start: Date;

  if (habitInsight.bestWindow) {
    const hour =
      parseTimeSlotStartHour(habitInsight.bestWindow.timeSlot) ??
      DEFAULT_RESCUE_HOUR;
    const currentHour = now.getHours();

    if (hour > currentHour) {
      start = new Date(now);
      start.setHours(hour, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() + 1);
      start.setHours(hour, 0, 0, 0);
    }
  } else {
    const currentHour = now.getHours();
    const rescueHour = Math.max(currentHour + MIN_LEAD_HOURS, DEFAULT_RESCUE_HOUR);
    start = new Date(now);
    if (rescueHour >= 24) {
      start.setDate(start.getDate() + 1);
      start.setHours(DEFAULT_RESCUE_HOUR, 0, 0, 0);
    } else {
      start.setHours(rescueHour, 0, 0, 0);
    }
  }

  const end = new Date(start.getTime() + duration * 60000);

  return { start, end, durationMinutes: duration };
}
