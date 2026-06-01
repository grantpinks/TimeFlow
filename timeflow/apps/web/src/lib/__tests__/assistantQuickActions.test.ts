import { describe, expect, it } from 'vitest';
import { getAssistantQuickActionChips, getAssistantQuickActionPrompts } from '../assistantQuickActions';

describe('assistantQuickActions', () => {
  it('returns morning prompts before noon in user timezone', () => {
    const morning = new Date('2026-06-01T14:00:00.000Z'); // 9 AM Central
    const prompts = getAssistantQuickActionPrompts(morning, 'America/Chicago');
    expect(prompts[0]).toBe('What does my day look like?');
    expect(prompts).toContain('Walk me through my day');
  });

  it('returns afternoon prompts midday in user timezone', () => {
    const afternoon = new Date('2026-06-01T19:00:00.000Z'); // 2 PM Central
    const prompts = getAssistantQuickActionPrompts(afternoon, 'America/Chicago');
    expect(prompts[0]).toBe('How am I tracking today?');
  });

  it('returns evening chips after 5 PM in user timezone', () => {
    const evening = new Date('2026-06-02T00:30:00.000Z'); // 7:30 PM Central
    const chips = getAssistantQuickActionChips(evening, 'America/Chicago');
    expect(chips[0].label).toBe('Plan tomorrow');
  });
});
