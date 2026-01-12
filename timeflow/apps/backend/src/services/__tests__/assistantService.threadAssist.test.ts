import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runThreadAssistTask } from '../assistantService.js';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assistantService thread assist modes', () => {
  it('parses summary JSON output', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"summary":"Short summary."}',
            },
          },
        ],
      }),
    });

    const result = await runThreadAssistTask('email-summary', {
      contextPrompt: 'Summarize this thread',
    });

    expect(result).toEqual({ summary: 'Short summary.' });
  });

  it('parses tasks JSON output', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"tasks":[{"title":"Reply","details":"Confirm next steps"}]}',
            },
          },
        ],
      }),
    });

    const result = await runThreadAssistTask('email-tasks', {
      contextPrompt: 'Extract tasks',
    });

    expect(result).toEqual({
      tasks: [{ title: 'Reply', details: 'Confirm next steps' }],
    });
  });
});
