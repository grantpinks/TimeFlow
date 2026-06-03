/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Habit, Identity } from '@timeflow/shared';
import { IdentityStudioSection } from '../IdentityStudioSection';

const identity: Identity = {
  id: 'id-1',
  userId: 'u1',
  name: 'Athlete',
  color: '#0d9488',
  icon: '🏃',
  sortOrder: 0,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const habits: Habit[] = [
  {
    id: 'h1',
    userId: 'u1',
    title: 'Run',
    frequency: 'daily',
    daysOfWeek: [],
    durationMinutes: 20,
    isActive: true,
    identityId: 'id-1',
    createdAt: '',
    updatedAt: '',
  },
];

describe('IdentityStudioSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows only preview rows and expand control when collapsed', () => {
    const onExpandMore = vi.fn();
    render(
      <IdentityStudioSection
        sectionKey="id-1"
        identity={identity}
        habits={habits}
        expansion="collapsed-preview"
        previewRowCount={2}
        onExpandMore={onExpandMore}
        compact
      >
        <div data-testid="row-1">row 1</div>
        <div data-testid="row-2">row 2</div>
        <div data-testid="row-3">row 3</div>
      </IdentityStudioSection>
    );

    expect(screen.getByTestId('row-1')).toBeTruthy();
    expect(screen.getByTestId('row-2')).toBeTruthy();
    expect(screen.queryByTestId('row-3')).toBeNull();
    expect(screen.getByTestId('identity-studio-section-expand-more').textContent).toContain(
      '+1 more'
    );

    fireEvent.click(screen.getByTestId('identity-studio-section-expand-more'));
    expect(onExpandMore).toHaveBeenCalled();
  });

  it('shows all children when expansion is full', () => {
    render(
      <IdentityStudioSection
        sectionKey="id-1"
        identity={identity}
        habits={habits}
        expansion="full"
        compact
      >
        <div data-testid="row-1">row 1</div>
        <div data-testid="row-2">row 2</div>
        <div data-testid="row-3">row 3</div>
      </IdentityStudioSection>
    );

    expect(screen.getByTestId('row-3')).toBeTruthy();
    expect(screen.queryByTestId('identity-studio-section-expand-more')).toBeNull();
  });
});
