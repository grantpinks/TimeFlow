import { describe, expect, it } from 'vitest';
import { buildEmailDraftContext } from '../emailDraftController.js';

describe('buildEmailDraftContext', () => {
  it('maps voice preferences and email fields', () => {
    const ctx = buildEmailDraftContext({
      originalEmail: {
        from: 'john@example.com',
        subject: 'Hello',
        body: 'Hi there',
      },
      preferences: { formality: 7, length: 4, tone: 6, voiceSamples: 'Sample text' },
      additionalContext: 'Keep it short',
    });

    expect(ctx.voice.formality).toBe(7);
    expect(ctx.voice.length).toBe(4);
    expect(ctx.voice.tone).toBe(6);
    expect(ctx.email.subject).toBe('Hello');
    expect(ctx.email.from).toBe('john@example.com');
    expect(ctx.additionalContext).toBe('Keep it short');
  });
});
