/**
 * habitRecommendationService Tests
 *
 * Tests rules-based recommendation generation.
 */

import { describe, it, expect } from 'vitest';
import { generateRecommendations, filterDismissedRecommendations } from '../habitRecommendationService.js';
import type { PerHabitInsights } from '@timeflow/shared';

describe('habitRecommendationService', () => {
  describe('generateRecommendations', () => {
    it('should return empty array for no insights', () => {
      const recommendations = generateRecommendations([]);
      expect(recommendations).toEqual([]);
    });

    it('should recommend rescue block for streak at risk', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Morning Exercise',
          adherenceRate: 0.8,
          scheduled: 10,
          completed: 8,
          skipped: 0,
          minutesScheduled: 300,
          minutesCompleted: 240,
          streak: {
            current: 5,
            best: 7,
            lastCompleted: new Date().toISOString(),
            atRisk: true, // Streak at risk
          },
          bestWindow: {
            dayOfWeek: 'Monday',
            timeSlot: '9:00-10:00',
            completionRate: 0.9,
            sampleSize: 5,
          },
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('streak_at_risk');
      expect(recommendations[0].habitId).toBe('habit-1');
      expect(recommendations[0].action.type).toBe('schedule_rescue_block');
      expect(recommendations[0].priority).toBe(1); // Highest priority
      expect(recommendations[0].insight).toContain('streak will break');
    });

    it('should recommend adjusting window for low adherence with best window', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Morning Exercise',
          adherenceRate: 0.4, // Low adherence (<50%)
          scheduled: 10,
          completed: 4,
          skipped: 2,
          minutesScheduled: 300,
          minutesCompleted: 120,
          streak: {
            current: 0,
            best: 2,
            lastCompleted: null,
            atRisk: false,
          },
          bestWindow: {
            dayOfWeek: 'Monday',
            timeSlot: '9:00-10:00',
            completionRate: 0.85,
            sampleSize: 5,
          },
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeGreaterThan(0);
      const lowAdherenceRec = recommendations.find((r) => r.type === 'low_adherence');
      expect(lowAdherenceRec).toBeDefined();
      expect(lowAdherenceRec?.action.type).toBe('move_to_best_window');
      expect(lowAdherenceRec?.action.label).toContain('Monday');
      expect(lowAdherenceRec?.priority).toBe(2);
    });

    it('should recommend reducing duration for low adherence without best window', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Morning Exercise',
          adherenceRate: 0.3, // Low adherence
          scheduled: 10,
          completed: 3,
          skipped: 2,
          minutesScheduled: 450, // 45 min per instance
          minutesCompleted: 135,
          streak: {
            current: 0,
            best: 1,
            lastCompleted: null,
            atRisk: false,
          },
          bestWindow: null, // No best window data
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeGreaterThan(0);
      const lowAdherenceRec = recommendations.find((r) => r.type === 'low_adherence');
      expect(lowAdherenceRec).toBeDefined();
      expect(lowAdherenceRec?.action.type).toBe('reduce_duration');
      expect(lowAdherenceRec?.action.payload.suggestedDuration).toBeLessThan(45);
    });

    it('should not recommend low adherence if insufficient data (<7 instances)', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Morning Exercise',
          adherenceRate: 0.2, // Very low adherence
          scheduled: 5, // But only 5 instances
          completed: 1,
          skipped: 1,
          minutesScheduled: 150,
          minutesCompleted: 30,
          streak: {
            current: 0,
            best: 1,
            lastCompleted: null,
            atRisk: false,
          },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      const lowAdherenceRec = recommendations.find((r) => r.type === 'low_adherence');
      expect(lowAdherenceRec).toBeUndefined(); // Should not recommend due to insufficient data
    });

    it('should recommend earlier window for repeated "NO_TIME" skips', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Evening Meditation',
          adherenceRate: 0.6,
          scheduled: 10,
          completed: 6,
          skipped: 3,
          minutesScheduled: 300,
          minutesCompleted: 180,
          streak: {
            current: 1,
            best: 3,
            lastCompleted: new Date().toISOString(),
            atRisk: false,
          },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [
            { reasonCode: 'NO_TIME', count: 3 }, // Repeated skip reason
          ],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeGreaterThan(0);
      const noTimeRec = recommendations.find((r) => r.type === 'repeated_skip_no_time');
      expect(noTimeRec).toBeDefined();
      expect(noTimeRec?.action.type).toBe('adjust_window');
      expect(noTimeRec?.action.label).toContain('earlier');
      expect(noTimeRec?.metric.value).toBe(3);
    });

    it('should recommend rescue block for repeated "FORGOT" skips', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Water Plants',
          adherenceRate: 0.7,
          scheduled: 10,
          completed: 7,
          skipped: 3,
          minutesScheduled: 150,
          minutesCompleted: 105,
          streak: {
            current: 2,
            best: 4,
            lastCompleted: new Date().toISOString(),
            atRisk: false,
          },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [
            { reasonCode: 'FORGOT', count: 3 }, // Repeated forgot
          ],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeGreaterThan(0);
      const forgotRec = recommendations.find((r) => r.type === 'repeated_skip_forgot');
      expect(forgotRec).toBeDefined();
      expect(forgotRec?.action.type).toBe('schedule_rescue_block');
      expect(forgotRec?.insight).toContain('forgotten');
    });

    it('should limit to top 3 recommendations', () => {
      const insights: PerHabitInsights[] = [
        // Habit 1: Streak at risk (priority 1)
        {
          habitId: 'habit-1',
          habitTitle: 'Habit 1',
          adherenceRate: 0.8,
          scheduled: 10,
          completed: 8,
          skipped: 0,
          minutesScheduled: 300,
          minutesCompleted: 240,
          streak: { current: 5, best: 7, lastCompleted: new Date().toISOString(), atRisk: true },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
        // Habit 2: Low adherence (priority 2)
        {
          habitId: 'habit-2',
          habitTitle: 'Habit 2',
          adherenceRate: 0.3,
          scheduled: 10,
          completed: 3,
          skipped: 2,
          minutesScheduled: 300,
          minutesCompleted: 90,
          streak: { current: 0, best: 1, lastCompleted: null, atRisk: false },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
        // Habit 3: Repeated NO_TIME (priority 2)
        {
          habitId: 'habit-3',
          habitTitle: 'Habit 3',
          adherenceRate: 0.6,
          scheduled: 10,
          completed: 6,
          skipped: 3,
          minutesScheduled: 300,
          minutesCompleted: 180,
          streak: { current: 1, best: 3, lastCompleted: new Date().toISOString(), atRisk: false },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [{ reasonCode: 'NO_TIME', count: 3 }],
        },
        // Habit 4: Another low adherence (priority 2)
        {
          habitId: 'habit-4',
          habitTitle: 'Habit 4',
          adherenceRate: 0.4,
          scheduled: 10,
          completed: 4,
          skipped: 2,
          minutesScheduled: 300,
          minutesCompleted: 120,
          streak: { current: 0, best: 1, lastCompleted: null, atRisk: false },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations.length).toBeLessThanOrEqual(3); // Max 3 recommendations
    });

    it('should prioritize streak at risk over low adherence', () => {
      const insights: PerHabitInsights[] = [
        {
          habitId: 'habit-1',
          habitTitle: 'Habit 1',
          adherenceRate: 0.3, // Low adherence
          scheduled: 10,
          completed: 3,
          skipped: 2,
          minutesScheduled: 300,
          minutesCompleted: 90,
          streak: { current: 5, best: 7, lastCompleted: new Date().toISOString(), atRisk: true }, // But streak at risk
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
      ];

      const recommendations = generateRecommendations(insights);

      expect(recommendations[0].type).toBe('streak_at_risk'); // Streak should come first
      expect(recommendations[0].priority).toBe(1);
    });
  });

  describe('filterDismissedRecommendations', () => {
    it('should return all recommendations if no dismissed state', () => {
      const recommendations = [
        {
          type: 'streak_at_risk' as const,
          habitId: 'habit-1',
          habitTitle: 'Habit 1',
          metric: { label: 'Test', value: 5 },
          insight: 'Test insight',
          action: { type: 'schedule_rescue_block' as const, label: 'Test' },
          priority: 1,
        },
      ];

      const filtered = filterDismissedRecommendations(recommendations, null);
      expect(filtered).toEqual(recommendations);
    });

    it('should filter out recommendations dismissed within 7 days', () => {
      const recommendations = [
        {
          type: 'streak_at_risk' as const,
          habitId: 'habit-1',
          habitTitle: 'Habit 1',
          metric: { label: 'Test', value: 5 },
          insight: 'Test insight',
          action: { type: 'schedule_rescue_block' as const, label: 'Test' },
          priority: 1,
        },
        {
          type: 'low_adherence' as const,
          habitId: 'habit-2',
          habitTitle: 'Habit 2',
          metric: { label: 'Test', value: 40 },
          insight: 'Test insight',
          action: { type: 'adjust_window' as const, label: 'Test' },
          priority: 2,
        },
      ];

      const dismissedState = {
        dismissedSuggestions: [
          {
            type: 'streak_at_risk',
            habitId: 'habit-1',
            dismissedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          },
        ],
      };

      const filtered = filterDismissedRecommendations(recommendations, dismissedState);

      expect(filtered.length).toBe(1);
      expect(filtered[0].habitId).toBe('habit-2'); // habit-1 should be filtered out
    });

    it('should include recommendations dismissed more than 7 days ago', () => {
      const recommendations = [
        {
          type: 'streak_at_risk' as const,
          habitId: 'habit-1',
          habitTitle: 'Habit 1',
          metric: { label: 'Test', value: 5 },
          insight: 'Test insight',
          action: { type: 'schedule_rescue_block' as const, label: 'Test' },
          priority: 1,
        },
      ];

      const dismissedState = {
        dismissedSuggestions: [
          {
            type: 'streak_at_risk',
            habitId: 'habit-1',
            dismissedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          },
        ],
      };

      const filtered = filterDismissedRecommendations(recommendations, dismissedState);

      expect(filtered.length).toBe(1);
      expect(filtered[0].habitId).toBe('habit-1'); // Should be included (dismissed >7 days ago)
    });
  });
});
