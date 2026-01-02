import { beforeEach, describe, expect, it, vi } from 'vitest';
const createMock = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: createMock,
      },
    };
  },
}));

import { categorizeEmailWithAI, detectNeedsResponseWithAI } from '../aiEmailCategorizationService';

describe('aiEmailCategorizationService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('returns a category from AI output when confident', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              categoryId: 'newsletter',
              confidence: 0.82,
              reasoning: 'Newsletter language and sender',
            }),
          },
        },
      ],
    });

    const result = await categorizeEmailWithAI({
      from: 'news@unknown.com',
      subject: 'Daily brief',
      snippet: 'View in browser',
    });

    expect(result.categoryId).toBe('newsletter');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('returns needsResponse when AI is confident', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              needsResponse: true,
              confidence: 0.78,
              reasoning: 'Direct question asking for reply',
            }),
          },
        },
      ],
    });

    const result = await detectNeedsResponseWithAI({
      from: 'alice@company.com',
      subject: 'Quick question',
      snippet: 'Could you reply by EOD?',
    });

    expect(result.needsResponse).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
