/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraftPanel } from '../DraftPanel';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getWritingVoice: vi.fn(),
  generateEmailDraft: vi.fn(),
  generateEmailPreview: vi.fn(),
  createOrSendDraft: vi.fn(),
}));

const baseEmail = {
  id: 'email-1',
  threadId: 'thread-1',
  from: 'Sender <sender@example.com>',
  subject: 'Hello',
  receivedAt: new Date().toISOString(),
  importance: 'normal',
  body: 'Test',
  to: 'Me <me@example.com>',
  cc: 'Other <other@example.com>',
};

describe('DraftPanel', () => {
  it('renders generate state and calls generate on click', async () => {
    (api.getWritingVoice as any).mockResolvedValue({
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    });
    (api.generateEmailDraft as any).mockResolvedValue({
      draftText: 'Hi',
      to: 'sender@example.com',
      subject: 'Re: Hello',
      metadata: { generatedAt: '', modelUsed: '' },
    });

    render(<DraftPanel isOpen email={baseEmail as any} onClose={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Draft' })[0]);

    await waitFor(() => expect(api.generateEmailDraft).toHaveBeenCalled());
  });

  it('requires preview confirmation before sending', async () => {
    (api.getWritingVoice as any).mockResolvedValue({
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    });
    (api.generateEmailDraft as any).mockResolvedValue({
      draftText: 'Hi',
      to: 'sender@example.com',
      subject: 'Re: Hello',
      metadata: { generatedAt: '', modelUsed: '' },
    });
    (api.generateEmailPreview as any).mockResolvedValue({
      htmlPreview: '<p>Hi</p>',
      textPreview: 'Hi',
      determinismToken: 'token',
      previewedAt: '',
    });

    render(<DraftPanel isOpen email={baseEmail as any} onClose={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Draft' })[0]);

    await screen.findByText('Preview Draft');
    fireEvent.click(screen.getByText('Preview Draft'));

    const sendButton = await screen.findByRole('button', { name: 'Send from TimeFlow' });
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('includes cc when reply-all toggle is enabled', async () => {
    (api.getWritingVoice as any).mockResolvedValue({
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    });
    (api.generateEmailDraft as any).mockResolvedValue({
      draftText: 'Hi',
      to: 'sender@example.com',
      subject: 'Re: Hello',
      metadata: { generatedAt: '', modelUsed: '' },
    });
    (api.generateEmailPreview as any).mockResolvedValue({
      htmlPreview: '<p>Hi</p>',
      textPreview: 'Hi',
      determinismToken: 'token',
      previewedAt: '',
    });

    render(
      <DraftPanel
        isOpen
        email={baseEmail as any}
        onClose={() => {}}
        userEmails={['me@example.com']}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Draft' })[0]);
    await screen.findByText('Preview Draft');
    fireEvent.click(screen.getByText('Preview Draft'));
    await screen.findAllByLabelText('Reply all');
    fireEvent.click(screen.getAllByLabelText('Reply all')[0]);

    await waitFor(() => {
      expect(api.generateEmailPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({ cc: expect.stringContaining('other@example.com') })
      );
    });
  });
});
