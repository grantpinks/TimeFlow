import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanningRitualPanel, { type PlanningRitualData } from '../PlanningRitualPanel';
import type { Task, CalendarEvent } from '@timeflow/shared';

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Write report',
    description: 'Quarterly report for management',
    priority: 1,
    durationMinutes: 120,
    status: 'unscheduled',
    userId: 'user-1',
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'task-2',
    title: 'Review code',
    description: 'Code review for PR #123',
    priority: 2,
    durationMinutes: 60,
    status: 'unscheduled',
    userId: 'user-1',
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    summary: 'Team Standup Meeting',
    start: '2025-12-23T09:00:00Z',
    end: '2025-12-23T09:30:00Z',
  },
];

describe('PlanningRitualPanel', () => {
  it('renders the planning ritual panel', () => {
    const mockOnComplete = vi.fn();
    const mockOnCancel = vi.fn();

    const { container } = render(
      <PlanningRitualPanel
        tasks={mockTasks}
        events={mockEvents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(container.textContent).toContain('Daily Planning Ritual');
  });

  it('shows tasks in priorities step', () => {
    const mockOnComplete = vi.fn();
    const mockOnCancel = vi.fn();

    const { container } = render(
      <PlanningRitualPanel
        tasks={mockTasks}
        events={mockEvents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // Check that both task titles are present
    expect(container.textContent).toContain('Write report');
    expect(container.textContent).toContain('Review code');
  });

  it('can be canceled', () => {
    const mockOnComplete = vi.fn();
    const mockOnCancel = vi.fn();

    const { container } = render(
      <PlanningRitualPanel
        tasks={mockTasks}
        events={mockEvents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // Check that Skip Ritual button exists
    const skipButtons = container.querySelectorAll('button');
    const skipButton = Array.from(skipButtons).find(btn => btn.textContent === 'Skip Ritual');
    expect(skipButton).toBeTruthy();

    // Click it
    if (skipButton) {
      fireEvent.click(skipButton);
    }

    expect(mockOnCancel).toHaveBeenCalled();
  });
});