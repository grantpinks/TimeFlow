import { describe, expect, it } from 'vitest';
import { parsePrompts, evaluateExpectation, shouldFailRun } from '../../scripts/aiRegressionUtils.js';

describe('ai regression utils', () => {
  it('parses single prompts with expectations', () => {
    const raw = `Do something
EXPECT: status=200 preview=false question=true cta=false no_schedule_language=true draft=true confirm_cta=true no_auto_apply_language=true
ENDPOINT: inbox-task-draft`;
    const parsed = parsePrompts(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      type: 'single',
      endpoint: 'inbox-task-draft',
      prompt: 'Do something',
      expect: {
        status: 200,
        preview: false,
        question: true,
        cta: false,
        noScheduleLanguage: true,
        draft: true,
        confirmCta: true,
        noAutoApplyLanguage: true,
      },
    });
  });

  it('parses flow prompts with per-turn expectations', () => {
    const raw = `FLOW: Conversation -> Scheduling
EXPECT-TURN-1: status=200 preview=false
EXPECT-TURN-2: status=200 preview=true
USER: What tasks do I have?
USER: Schedule my tasks for tomorrow.`;
    const parsed = parsePrompts(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      type: 'flow',
      name: 'Conversation -> Scheduling',
      prompts: ['What tasks do I have?', 'Schedule my tasks for tomorrow.'],
      turnExpectations: {
        1: { status: 200, preview: false },
        2: { status: 200, preview: true },
      },
    });
  });

  it('evaluates expectations against prompt results', () => {
    const result = evaluateExpectation(
      { status: 200, preview: false, blocksCount: 0, ok: true },
      { status: 200, preview: false, minBlocks: 0, question: true },
      'Can you share your time window?'
    );

    expect(result.ok).toBe(true);
  });

  it('flags mismatched expectations', () => {
    const result = evaluateExpectation(
      { status: 400, preview: false, blocksCount: 0, ok: false },
      { status: 200, preview: false, cta: true },
      'Here is your plan.'
    );

    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('allows the scheduling CTA even when no schedule language is expected', () => {
    const result = evaluateExpectation(
      { status: 200, preview: false, blocksCount: 0, ok: true, draft: false, confirmCta: null },
      { status: 200, preview: false, cta: true, noScheduleLanguage: true, noAutoApplyLanguage: true },
      '## Plan\n\nHere is a draft plan.\n\nWant me to schedule this?'
    );

    expect(result.ok).toBe(true);
  });

  it('ignores CTA when checking for clarifying questions', () => {
    const result = evaluateExpectation(
      { status: 200, preview: false, blocksCount: 0, ok: true, draft: false, confirmCta: null },
      { status: 200, preview: false, question: false, cta: true, noAutoApplyLanguage: true },
      'Want me to schedule this?'
    );

    expect(result.ok).toBe(true);
  });

  it('flags auto-apply language when disallowed', () => {
    const result = evaluateExpectation(
      { status: 200, preview: false, blocksCount: 0, ok: true, draft: true, confirmCta: 'Want me to apply this label?' },
      { status: 200, preview: false, draft: true, confirmCta: true, noAutoApplyLanguage: true },
      "I've applied the label for you."
    );

    expect(result.ok).toBe(false);
  });

  it('fails run when failures exist', () => {
    expect(shouldFailRun({ failed: 1, expectationFailures: 0 })).toBe(true);
    expect(shouldFailRun({ failed: 0, expectationFailures: 2 })).toBe(true);
    expect(shouldFailRun({ failed: 0, expectationFailures: 0 })).toBe(false);
  });
});
