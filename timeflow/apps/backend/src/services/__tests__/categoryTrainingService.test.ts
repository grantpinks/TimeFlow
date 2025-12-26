import { describe, it, expect } from 'vitest';
import { normalizeKeywords, upsertTrainingProfile } from '../categoryTrainingService';

describe('categoryTrainingService', () => {
  it('exports upsertTrainingProfile', () => {
    expect(typeof upsertTrainingProfile).toBe('function');
  });

  it('normalizes keywords to lowercase and trims', () => {
    expect(normalizeKeywords(['  Work ', 'Meeting'])).toEqual(['work', 'meeting']);
  });
});
