/**
 * Shared "What's Now" resolution for Today: widget + context panel stay in sync.
 * Task priority: 1 = high, 3 = low (see shared Task type).
 */

import type { CalendarEvent, Task } from '@timeflow/shared';

export type WhatsNowPhase =
  | {
      kind: 'current';
      event: CalendarEvent;
      progress: number;
      minutesRemaining: number;
    }
  | {
      kind: 'upcoming';
      event: CalendarEvent;
      minutesUntil: number;
    }
  | { kind: 'suggested-task'; task: Task }
  | { kind: 'free' };

export function computeWhatsNowPhase(
  events: CalendarEvent[],
  tasks: Task[],
  now: Date = new Date()
): WhatsNowPhase {
  const nowTime = now.getTime();

  const currentEvent = events.find((event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return nowTime >= start && nowTime < end;
  });

  if (currentEvent) {
    const start = new Date(currentEvent.start).getTime();
    const end = new Date(currentEvent.end).getTime();
    const progress = ((nowTime - start) / (end - start)) * 100;
    const minutesRemaining = Math.round((end - nowTime) / 1000 / 60);
    return {
      kind: 'current',
      event: currentEvent,
      progress,
      minutesRemaining,
    };
  }

  const upcomingEvents = events
    .filter((event) => {
      const start = new Date(event.start).getTime();
      return start > nowTime && start < nowTime + 2 * 60 * 60 * 1000;
    })
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    const minutesUntil = Math.round(
      (new Date(nextEvent.start).getTime() - nowTime) / 1000 / 60
    );
    return { kind: 'upcoming', event: nextEvent, minutesUntil };
  }

  const unscheduledImportant = tasks
    .filter((task) => task.status === 'unscheduled' && task.priority <= 2)
    .sort((a, b) => a.priority - b.priority);

  if (unscheduledImportant.length > 0) {
    return { kind: 'suggested-task', task: unscheduledImportant[0] };
  }

  return { kind: 'free' };
}
