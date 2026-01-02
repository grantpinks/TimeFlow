import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectNeedsResponseWithFallback,
  scoreEmailCategoryWithFallback,
} from '../emailCategorizationService';

const categorizeEmailWithAI = vi.fn();
const detectNeedsResponseWithAI = vi.fn();

vi.mock('../aiEmailCategorizationService', () => ({
  categorizeEmailWithAI,
  detectNeedsResponseWithAI,
}));

describe('email categorization fallback', () => {
  beforeEach(() => {
    categorizeEmailWithAI.mockReset();
    detectNeedsResponseWithAI.mockReset();
  });

  it('uses rules when confidence is high', async () => {
    const result = await scoreEmailCategoryWithFallback({
      from: 'newsletter@morningbrew.com',
      subject: "Today\'s edition",
      snippet: 'View in browser · Unsubscribe',
      labels: [],
    });

    expect(result.category).toBe('newsletter');
    expect(result.usedAi).toBe(false);
    expect(categorizeEmailWithAI).not.toHaveBeenCalled();
  });

  it('uses AI when rule confidence is low and AI is confident', async () => {
    categorizeEmailWithAI.mockResolvedValue({
      categoryId: 'newsletter',
      confidence: 0.82,
      reasoning: 'AI decision',
    });

    const result = await scoreEmailCategoryWithFallback({
      from: 'unknown@unknown.com',
      subject: 'Hello there',
      snippet: 'Just sharing an update for you',
      labels: [],
    });

    expect(result.category).toBe('newsletter');
    expect(result.usedAi).toBe(true);
    expect(categorizeEmailWithAI).toHaveBeenCalledTimes(1);
  });

  it('uses AI for needs-response when rule confidence is low', async () => {
    detectNeedsResponseWithAI.mockResolvedValue({
      needsResponse: true,
      confidence: 0.78,
      reasoning: 'AI decision',
    });

    const result = await detectNeedsResponseWithFallback({
      from: 'info@unknown.com',
      subject: 'Checking in',
      snippet: 'Wanted to get your feedback on this',
    });

    expect(result.needsResponse).toBe(true);
    expect(result.usedAi).toBe(true);
    expect(detectNeedsResponseWithAI).toHaveBeenCalledTimes(1);
  });
});
