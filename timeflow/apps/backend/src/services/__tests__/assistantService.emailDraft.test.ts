import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAssistantTask } from '../assistantService.js';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assistantService email-draft mode', () => {
  it('strips the draft label from structured output', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'DRAFT:\nHi John,\n\nThanks for the note. I can meet next week.\n\nBest,\nGrant',
            },
          },
        ],
      }),
    });

    const result = await runAssistantTask('email-draft', {
      contextPrompt: 'Write a reply to this email...',
    });

    expect(result.draftText).toBe(
      'Hi John,\n\nThanks for the note. I can meet next week.\n\nBest,\nGrant'
    );
  });
});
