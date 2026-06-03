import { describe, expect, it } from 'vitest';
import { resolveSectionExpansion } from '../utils';

describe('resolveSectionExpansion', () => {
  it('returns full when no identity is focused', () => {
    expect(resolveSectionExpansion('id-1', null, new Set())).toBe('full');
  });

  it('returns full for the focused section', () => {
    expect(resolveSectionExpansion('id-1', 'id-1', new Set())).toBe('full');
  });

  it('returns full when section was expanded via +N more', () => {
    expect(resolveSectionExpansion('id-2', 'id-1', new Set(['id-2']))).toBe('full');
  });

  it('returns collapsed-preview for non-focused sections', () => {
    expect(resolveSectionExpansion('id-2', 'id-1', new Set())).toBe('collapsed-preview');
  });
});
