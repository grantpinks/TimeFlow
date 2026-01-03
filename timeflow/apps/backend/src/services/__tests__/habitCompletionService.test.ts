import { describe, it, expect } from 'vitest';
import {
  markScheduledHabitComplete,
  undoScheduledHabitComplete,
  skipScheduledHabit,
} from '../habitCompletionService';

describe('habitCompletionService', () => {
  describe('markScheduledHabitComplete', () => {
    it('exports markScheduledHabitComplete function', () => {
      expect(typeof markScheduledHabitComplete).toBe('function');
    });

    // TODO: Add integration test with real DB
    // - creates user + habit + scheduledHabit
    // - marks complete
    // - asserts HabitCompletion record exists
  });

  describe('undoScheduledHabitComplete', () => {
    it('exports undoScheduledHabitComplete function', () => {
      expect(typeof undoScheduledHabitComplete).toBe('function');
    });

    // TODO: Add integration test
    // - creates completion
    // - undoes it
    // - asserts completion deleted
  });

  describe('skipScheduledHabit', () => {
    it('exports skipScheduledHabit function', () => {
      expect(typeof skipScheduledHabit).toBe('function');
    });

    // TODO: Add integration test
    // - skips with reason code
    // - asserts reasonCode stored
  });
});
