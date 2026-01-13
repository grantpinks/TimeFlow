/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Task } from '@timeflow/shared';
import CalendarPage from '../page';
import * as api from '@/lib/api';

const { taskFixture, refreshTasks } = vi.hoisted(() => ({
  taskFixture: {
    id: 'task-1',
    title: 'Do Rush Committee Form',
    description: null,
    durationMinutes: 45,
    priority: 2,
    dueDate: null,
    status: 'scheduled',
    categoryId: null,
    category: null,
    scheduledTask: {
      id: 'sched-1',
      taskId: 'task-1',
      provider: 'google',
      calendarId: 'primary',
      eventId: 'event-1',
      startDateTime: '2026-01-03T18:00:00.000Z',
      endDateTime: '2026-01-03T18:45:00.000Z',
      overflowedDeadline: false,
    },
  } as Task,
  refreshTasks: vi.fn(),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [taskFixture],
    loading: false,
    refresh: refreshTasks,
  }),
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ user: null }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/CalendarView', () => ({
  CalendarView: ({ onEditTask }: { onEditTask?: (taskId: string) => void }) => (
    <button type="button" onClick={() => onEditTask?.('task-1')}>
      Trigger Edit
    </button>
  ),
}));

vi.mock('@/components/FloatingAssistantButton', () => ({
  FloatingAssistantButton: () => null,
}));
vi.mock('@/components/MiniCalendar', () => ({
  MiniCalendar: () => null,
}));
vi.mock('@/components/TimeBreakdown', () => ({
  TimeBreakdown: () => null,
}));
vi.mock('@/components/UpcomingEventsPanel', () => ({
  UpcomingEventsPanel: () => null,
}));
vi.mock('@/components/UnscheduledTasksPanel', () => ({
  UnscheduledTasksPanel: () => null,
}));
vi.mock('@/components/MeetingManagementPanel', () => ({
  MeetingManagementPanel: () => null,
}));
vi.mock('@/components/TaskSchedulePreview', () => ({
  TaskSchedulePreview: () => null,
}));
vi.mock('@/components/CalendarFiltersPopover', () => ({
  CalendarFiltersPopover: () => null,
}));

vi.spyOn(api, 'getCategories').mockResolvedValue([]);
vi.spyOn(api, 'getCalendarEvents').mockResolvedValue([]);
vi.spyOn(api, 'updateTask').mockResolvedValue(taskFixture);

describe('CalendarPage edit modal', () => {
  it('does not log React jsx attribute warnings', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('opens the task edit modal when edit is triggered', async () => {
    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);

    expect(screen.getByText(/edit task/i)).toBeTruthy();
    expect(screen.getByDisplayValue('Do Rush Committee Form')).toBeTruthy();
  });
});
