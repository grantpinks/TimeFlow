/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventDetailPopover } from '../EventDetailPopover';

const formatDateTimeLocal = (date: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

describe('EventDetailPopover', () => {
  it('reschedules a habit instance from the popover controls', async () => {
    const onHabitReschedule = vi.fn().mockResolvedValue(undefined);
    const start = new Date(2026, 0, 2, 9, 0);
    const end = new Date(2026, 0, 2, 9, 30);

    render(
      <EventDetailPopover
        isOpen
        onClose={() => {}}
        position={{ x: 0, y: 0 }}
        event={{
          id: 'event-1',
          title: 'Morning Stretch',
          start,
          end,
          isTask: false,
          isHabit: true,
          scheduledHabitId: 'scheduled-habit-1',
        }}
        onHabitReschedule={onHabitReschedule}
      />
    );

    fireEvent.change(screen.getByLabelText('Reschedule start'), {
      target: { value: formatDateTimeLocal(new Date(2026, 0, 2, 11, 0)) },
    });
    fireEvent.change(screen.getByLabelText('Reschedule end'), {
      target: { value: formatDateTimeLocal(new Date(2026, 0, 2, 11, 30)) },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule habit' }));

    expect(onHabitReschedule).toHaveBeenCalledTimes(1);
    const [habitId, rescheduledStart, rescheduledEnd] = onHabitReschedule.mock.calls[0];
    expect(habitId).toBe('scheduled-habit-1');
    expect((rescheduledStart as Date).getTime()).toBe(new Date(2026, 0, 2, 11, 0).getTime());
    expect((rescheduledEnd as Date).getTime()).toBe(new Date(2026, 0, 2, 11, 30).getTime());
  });

  it('reschedules a task from the popover controls', async () => {
    const onTaskReschedule = vi.fn().mockResolvedValue(undefined);
    const start = new Date(2026, 0, 3, 10, 0);
    const end = new Date(2026, 0, 3, 10, 45);

    render(
      <EventDetailPopover
        isOpen
        onClose={() => {}}
        position={{ x: 0, y: 0 }}
        event={{
          id: 'task-1',
          title: 'Draft follow-up',
          start,
          end,
          isTask: true,
          task: {
            id: 'task-1',
            title: 'Draft follow-up',
            status: 'scheduled',
          } as any,
        }}
        onTaskReschedule={onTaskReschedule}
      />
    );

    fireEvent.change(screen.getByLabelText('Reschedule task start'), {
      target: { value: formatDateTimeLocal(new Date(2026, 0, 3, 13, 0)) },
    });
    fireEvent.change(screen.getByLabelText('Reschedule task end'), {
      target: { value: formatDateTimeLocal(new Date(2026, 0, 3, 13, 45)) },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule task' }));

    expect(onTaskReschedule).toHaveBeenCalledTimes(1);
    const [taskId, rescheduledStart, rescheduledEnd] = onTaskReschedule.mock.calls[0];
    expect(taskId).toBe('task-1');
    expect((rescheduledStart as Date).getTime()).toBe(new Date(2026, 0, 3, 13, 0).getTime());
    expect((rescheduledEnd as Date).getTime()).toBe(new Date(2026, 0, 3, 13, 45).getTime());
  });
});
