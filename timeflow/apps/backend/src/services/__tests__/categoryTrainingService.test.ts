import { describe, it, expect } from 'vitest';
import { upsertTrainingProfile } from '../categoryTrainingService';

describe('categoryTrainingService', () => {
  it('exports upsertTrainingProfile', () => {
    expect(typeof upsertTrainingProfile).toBe('function');
  });
});
