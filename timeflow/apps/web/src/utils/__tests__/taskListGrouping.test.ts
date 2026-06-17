import { describe, expect, it } from 'vitest';
import type { Task } from '@timeflow/shared';
import { buildTaskListSections } from '../taskListGrouping';

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  userId: 'user-1',
  title: 'Test task',
  description: null,
  durationMinutes: 30,
  priority: 2,
  status: 'unscheduled',
  dueDate: null,
  categoryId: null,
  identityId: null,
  sourceEmailId: null,
  sourceEmailUrl: null,
  sourceThreadId: null,
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z',
  category: null,
  identity: null,
  scheduledTask: null,
  ...overrides,
});

describe('buildTaskListSections', () => {
  const now = new Date('2026-06-16T15:00:00.000Z');

  it('groups unscheduled tasks by due date with overdue bucket', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'overdue',
          dueDate: '2026-06-10T12:00:00.000Z',
        }),
        baseTask({
          id: 'this-week',
          dueDate: '2026-06-18T12:00:00.000Z',
        }),
        baseTask({
          id: 'no-date',
          dueDate: null,
        }),
      ],
      'unscheduled',
      'date',
      now
    );

    expect(sections.map((section) => section.id)).toEqual([
      'overdue',
      'this-week',
      'no-due-date',
    ]);
  });

  it('groups scheduled tasks by scheduled time', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'today',
          status: 'scheduled',
          scheduledTask: {
            id: 'st-1',
            provider: 'google',
            calendarId: 'cal',
            eventId: 'evt-1',
            startDateTime: '2026-06-16T18:00:00.000Z',
            endDateTime: '2026-06-16T18:30:00.000Z',
            overflowedDeadline: false,
            lastSyncedAt: '2026-06-16T12:00:00.000Z',
          } as Task['scheduledTask'],
        }),
        baseTask({
          id: 'tomorrow',
          status: 'scheduled',
          scheduledTask: {
            id: 'st-2',
            provider: 'google',
            calendarId: 'cal',
            eventId: 'evt-2',
            startDateTime: '2026-06-17T18:00:00.000Z',
            endDateTime: '2026-06-17T18:30:00.000Z',
            overflowedDeadline: false,
            lastSyncedAt: '2026-06-16T12:00:00.000Z',
          } as Task['scheduledTask'],
        }),
      ],
      'scheduled',
      'date',
      now
    );

    expect(sections.map((section) => section.id)).toEqual(['today', 'tomorrow']);
  });

  it('groups completed tasks by completion date', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'done-today',
          status: 'completed',
          completedAt: '2026-06-16T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        }),
        baseTask({
          id: 'done-yesterday',
          status: 'completed',
          completedAt: '2026-06-15T10:00:00.000Z',
        }),
      ],
      'completed',
      'date',
      now
    );

    expect(sections.map((section) => section.id)).toEqual([
      'completed-today',
      'completed-yesterday',
    ]);
  });

  it('prefers completedAt over updatedAt for date grouping', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'done-today',
          status: 'completed',
          completedAt: '2026-06-16T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        }),
      ],
      'completed',
      'date',
      now
    );

    expect(sections[0]?.id).toBe('completed-today');
  });

  it('paginates the earlier completed section', () => {
    const earlierTasks = Array.from({ length: 8 }, (_, index) =>
      baseTask({
        id: `earlier-${index}`,
        status: 'completed',
        completedAt: `2026-05-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
      })
    );

    const sections = buildTaskListSections(earlierTasks, 'completed', 'date', now);

    const earlier = sections.find((section) => section.id === 'completed-earlier');
    expect(earlier?.pageSize).toBe(5);
    expect(earlier?.tasks).toHaveLength(8);
  });

  it('groups completed tasks by category', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'personal',
          status: 'completed',
          category: {
            id: 'cat-1',
            name: 'Personal',
            color: '#22c55e',
            userId: 'user-1',
            isDefault: false,
            order: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
        baseTask({
          id: 'work',
          status: 'completed',
          category: {
            id: 'cat-2',
            name: 'Professional',
            color: '#3b82f6',
            userId: 'user-1',
            isDefault: false,
            order: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      ],
      'completed',
      'category',
      now
    );

    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.title).sort()).toEqual(['Personal', 'Professional']);
  });

  it('groups completed tasks by identity', () => {
    const sections = buildTaskListSections(
      [
        baseTask({
          id: 'runner',
          status: 'completed',
          identity: {
            id: 'id-1',
            name: 'Runner',
            color: '#22c55e',
            icon: '🏃',
          },
        }),
        baseTask({
          id: 'writer',
          status: 'completed',
          identity: {
            id: 'id-2',
            name: 'Writer',
            color: '#3b82f6',
            icon: '✍️',
          },
        }),
      ],
      'completed',
      'identity',
      now
    );

    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.title).sort()).toEqual(['Runner', 'Writer']);
  });
});
