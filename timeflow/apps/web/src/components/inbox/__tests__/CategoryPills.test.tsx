/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryPills } from '../CategoryPills';

describe('CategoryPills', () => {
  beforeAll(() => {
    window.scrollTo = () => {};
  });

  afterEach(() => {
    cleanup();
  });

  const categories = [
    { id: 'work', name: 'Work', color: '#0BAF9A', enabled: true },
    { id: 'personal', name: 'Personal', color: '#F59E0B', enabled: true },
  ];

  it('shows the category pills by default and toggles them with the arrow', async () => {
    const user = userEvent.setup();

    render(
      <CategoryPills
        categories={categories as any}
        selectedCategoryId={null}
        onSelectCategory={() => {}}
      />
    );

    expect(screen.queryByText('Work')).not.toBeNull();
    expect(screen.queryByText('Personal')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /hide labels/i }).getAttribute('class') || ''
    ).toContain('h-10');

    await user.click(screen.getByRole('button', { name: /hide labels/i }));

    expect(screen.getByTestId('category-pills').getAttribute('aria-hidden')).toBe('true');
    expect(
      screen.getByRole('button', { name: /show labels/i }).getAttribute('class') || ''
    ).toContain('h-10');

    await user.click(screen.getByRole('button', { name: /show labels/i }));

    expect(screen.getByTestId('category-pills').getAttribute('aria-hidden')).toBe('false');
  });

  it('forces expansion when forceExpanded is true', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CategoryPills
        categories={categories as any}
        selectedCategoryId={null}
        onSelectCategory={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /hide labels/i }));
    expect(
      screen.getByRole('button', { name: /show labels/i }).getAttribute('aria-expanded')
    ).toBe('false');

    rerender(
      <CategoryPills
        categories={categories as any}
        selectedCategoryId={null}
        onSelectCategory={() => {}}
        forceExpanded
      />
    );

    expect(
      screen.getByRole('button', { name: /hide labels/i }).getAttribute('aria-expanded')
    ).toBe('true');
  });
});
