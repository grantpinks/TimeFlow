/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmailCategoriesSettingsPage from '../email-categories/page';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/api', () => ({
  getEmailCategories: vi.fn().mockResolvedValue({ categories: [] }),
  getGmailSyncStatus: vi.fn().mockResolvedValue({
    lastSyncedAt: null,
    lastSyncThreadCount: 0,
    lastSyncError: null,
    backfillDays: 7,
    backfillMaxThreads: 100,
  }),
}));

describe('EmailCategoriesSettingsPage', () => {
  it('shows background sync controls', async () => {
    render(<EmailCategoriesSettingsPage />);
    const labels = await screen.findAllByText(/background sync/i);
    expect(labels.length).toBeGreaterThan(0);
  });
});
