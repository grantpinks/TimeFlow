/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
vi.spyOn(api, 'getConnectedAccounts').mockResolvedValue([]);
vi.spyOn(api, 'updateTask').mockResolvedValue(taskFixture);

function formatLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

describe('CalendarPage edit modal', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    taskFixture.dueDate = null;
    taskFixture.scheduledTask!.startDateTime = '2026-01-03T18:00:00.000Z';
    taskFixture.scheduledTask!.endDateTime = '2026-01-03T18:45:00.000Z';
    vi.mocked(api.updateTask).mockClear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });
  });

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

  it('preserves an existing due date time when editing from the calendar', async () => {
    const dueDate = '2026-01-03T23:15:00.000Z';
    taskFixture.dueDate = dueDate;

    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);

    expect(screen.getByDisplayValue(formatLocalDateTimeInput(dueDate))).toBeTruthy();
  });

  it('keeps UTC-midnight due dates on their stored calendar day when editing', async () => {
    taskFixture.dueDate = '2026-06-24T00:00:00.000Z';

    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);

    expect(screen.getByDisplayValue('2026-06-24T00:00')).toBeTruthy();
  });

  it('preserves date-only semantics when saving an unchanged UTC-midnight due date', async () => {
    taskFixture.dueDate = '2026-06-24T00:00:00.000Z';

    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(api.updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        dueDate: '2026-06-24',
      })
    );
  });

  it('formats scheduled midnight UTC blocks as real local instants, not date-only markers', async () => {
    const scheduledStart = '2026-06-24T00:00:00.000Z';
    taskFixture.scheduledTask!.startDateTime = scheduledStart;
    taskFixture.scheduledTask!.endDateTime = '2026-06-24T00:45:00.000Z';

    render(<CalendarPage />);

    const trigger = await screen.findByRole('button', { name: /trigger edit/i });
    await userEvent.click(trigger);

    expect(screen.getByDisplayValue(formatLocalDateTimeInput(scheduledStart))).toBeTruthy();
  });
});
