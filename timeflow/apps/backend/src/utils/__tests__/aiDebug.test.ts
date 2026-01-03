import { describe, expect, it } from 'vitest';
import { resolveAiDebugFlag } from '../aiDebug.js';

describe('resolveAiDebugFlag', () => {
  it('requires env flag and a truthy header', () => {
    expect(resolveAiDebugFlag(false, 'true')).toBe(false);
    expect(resolveAiDebugFlag(true, 'true')).toBe(true);
    expect(resolveAiDebugFlag(true, '1')).toBe(true);
    expect(resolveAiDebugFlag(true, 'false')).toBe(false);
  });

  it('handles array headers', () => {
    expect(resolveAiDebugFlag(true, ['true'])).toBe(true);
  });
});
