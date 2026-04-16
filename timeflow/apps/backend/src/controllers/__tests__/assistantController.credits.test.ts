/**
 * Sprint 25.5b — one trackUsage per assistant chat POST (internal LLM retries do not double-charge).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/assistantService.js', () => ({
  processMessage: vi.fn(),
}));

vi.mock('../../services/usageTrackingService.js', () => ({
  hasCreditsAvailable: vi.fn(),
  trackUsage: vi.fn(),
  CREDIT_COSTS: { SIMPLE_AI_COMMAND: 1, COMPLEX_AI_COMMAND: 5 },
}));

import { chat } from '../assistantController.js';
import * as assistantService from '../../services/assistantService.js';
import * as usageTrackingService from '../../services/usageTrackingService.js';

describe('assistantController.chat — Flow Credits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usageTrackingService.hasCreditsAvailable).mockResolvedValue({
      allowed: true,
      creditsRemaining: 100,
    });
    vi.mocked(usageTrackingService.trackUsage).mockResolvedValue({
      success: true,
      creditsRemaining: 99,
    });
    vi.mocked(assistantService.processMessage).mockResolvedValue({
      message: {
        id: 'm1',
        role: 'assistant',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
    });
  });

  it('calls trackUsage exactly once per successful request (internal retries are inside processMessage)', async () => {
    const request = {
      user: { id: 'user-1' },
      body: { message: 'What is on my calendar today?' },
      headers: {},
      log: { warn: vi.fn(), error: vi.fn() },
    };
    const send = vi.fn();
    const reply = { status: vi.fn().mockReturnValue({ send }) };

    await chat(request as any, reply as any);

    expect(assistantService.processMessage).toHaveBeenCalledTimes(1);
    expect(usageTrackingService.trackUsage).toHaveBeenCalledTimes(1);
    expect(usageTrackingService.trackUsage).toHaveBeenCalledWith(
      'user-1',
      'SIMPLE_AI_COMMAND',
      expect.objectContaining({
        messageLength: request.body.message.length,
      })
    );
  });
});
