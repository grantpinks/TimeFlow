/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Identity } from '@timeflow/shared';
import { IdentityStudioRail } from '../IdentityStudioRail';

const identities: Identity[] = [
  {
    id: 'id-1',
    userId: 'u1',
    name: 'Athlete',
    color: '#0d9488',
    icon: '🏃',
    sortOrder: 0,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

describe('IdentityStudioRail', () => {
  afterEach(() => {
    cleanup();
  });

  it('focuses identity then clears on second click', () => {
    const onFocusChange = vi.fn();
    const { rerender } = render(
      <IdentityStudioRail
        identities={identities}
        unassignedCount={0}
        habitCountByIdentityId={{ 'id-1': 2 }}
        focusedIdentityId={null}
        onFocusChange={onFocusChange}
      />
    );

    const athleteButtons = screen.getAllByRole('button', { name: /athlete/i });
    fireEvent.click(athleteButtons[0]!);
    expect(onFocusChange).toHaveBeenCalledWith('id-1');

    onFocusChange.mockClear();
    rerender(
      <IdentityStudioRail
        identities={identities}
        unassignedCount={0}
        habitCountByIdentityId={{ 'id-1': 2 }}
        focusedIdentityId="id-1"
        onFocusChange={onFocusChange}
      />
    );
    const athleteButtonsFocused = screen.getAllByRole('button', { name: /athlete/i });
    fireEvent.click(athleteButtonsFocused[0]!);
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });

  it('selects All when All is clicked', () => {
    const onFocusChange = vi.fn();
    render(
      <IdentityStudioRail
        identities={identities}
        unassignedCount={1}
        habitCountByIdentityId={{ 'id-1': 1 }}
        focusedIdentityId="id-1"
        onFocusChange={onFocusChange}
      />
    );
    const allButtons = screen.getAllByRole('button', { name: /^all$/i });
    fireEvent.click(allButtons[0]!);
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });
});
