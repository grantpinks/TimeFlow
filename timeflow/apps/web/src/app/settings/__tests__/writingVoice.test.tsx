/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import WritingVoiceSettingsPage from '../writing-voice/page';
import * as api from '@/lib/api';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/api', () => ({
  getWritingVoice: vi.fn(),
  updateWritingVoice: vi.fn(),
}));

describe('WritingVoiceSettingsPage', () => {
  it('shows a toast on successful save', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    (api.getWritingVoice as any).mockResolvedValue({
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    });
    (api.updateWritingVoice as any).mockResolvedValue({
      success: true,
      profile: {
        formality: 5,
        length: 5,
        tone: 5,
        voiceSamples: null,
        aiDraftsGenerated: 0,
      },
    });

    render(<WritingVoiceSettingsPage />);
    await screen.findByText('Writing & Voice');
    fireEvent.click(screen.getByText('Save Preferences'));

    const toast = await screen.findByText('Writing voice preferences saved successfully!');
    expect(toast.closest('[role="status"]')).not.toBeNull();
  });
});
