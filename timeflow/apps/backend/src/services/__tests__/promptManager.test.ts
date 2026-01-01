import { describe, expect, it } from 'vitest';
import { PromptManager } from '../promptManager';

describe('PromptManager', () => {
  it('loads the planning prompt', () => {
    const manager = new PromptManager();
    const prompt = (manager as any).getPrompt('planning');
    expect(prompt).toContain('PLANNING MODE');
  });

  it('exposes planning in available modes', () => {
    const manager = new PromptManager();
    const modes = manager.getAvailableModes();
    expect(modes).toContain('planning');
  });

  it('loads the meetings prompt', () => {
    const manager = new PromptManager();
    const prompt = (manager as any).getPrompt('meetings');
    expect(prompt).toContain('MEETINGS MODE');
  });

  it('exposes meetings in available modes', () => {
    const manager = new PromptManager();
    const modes = manager.getAvailableModes();
    expect(modes).toContain('meetings');
  });
});
