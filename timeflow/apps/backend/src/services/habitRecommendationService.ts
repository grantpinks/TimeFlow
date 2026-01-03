/**
 * Habit Recommendation Service
 *
 * Rules-based recommendation engine for habit improvements.
 * Analyzes insights and generates actionable recommendations.
 */

import type {
  PerHabitInsights,
  HabitRecommendation,
  RecommendationType,
  RecommendationAction,
} from '@timeflow/shared';

/**
 * Generate recommendations based on habit insights
 */
export function generateRecommendations(
  habitInsights: PerHabitInsights[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];

  for (const habit of habitInsights) {
    // Rule 1: Streak at risk → schedule rescue block
    if (habit.streak.atRisk && habit.streak.current > 0) {
      recommendations.push({
        type: 'streak_at_risk',
        habitId: habit.habitId,
        habitTitle: habit.habitTitle,
        metric: {
          label: `${habit.streak.current}-day streak at risk`,
          value: habit.streak.current,
          context: 'Not completed today',
        },
        insight: `Your ${habit.streak.current}-day streak will break if you skip today. Don't lose your progress!`,
        action: {
          type: 'schedule_rescue_block',
          label: 'Schedule rescue block',
          payload: {
            habitId: habit.habitId,
            suggestedWindow: habit.bestWindow || null,
          },
        },
        priority: 1, // Highest priority
      });
    }

    // Rule 2: Low adherence (<50%) → recommend adjusting window or reducing duration
    if (habit.adherenceRate < 0.5 && habit.scheduled >= 7) {
      // Only if we have enough data (7+ instances)
      const adherencePercent = Math.round(habit.adherenceRate * 100);

      if (habit.bestWindow) {
        // We have a best window - recommend moving to it
        recommendations.push({
          type: 'low_adherence',
          habitId: habit.habitId,
          habitTitle: habit.habitTitle,
          metric: {
            label: `${adherencePercent}% adherence`,
            value: adherencePercent,
            context: `${habit.completed}/${habit.scheduled} completed`,
          },
          insight: `Your completion rate is low. Try scheduling during your best window when you're ${Math.round(habit.bestWindow.completionRate * 100)}% more likely to complete.`,
          action: {
            type: 'move_to_best_window',
            label: `Move to ${habit.bestWindow.dayOfWeek} ${habit.bestWindow.timeSlot}`,
            payload: {
              habitId: habit.habitId,
              bestWindow: habit.bestWindow,
            },
          },
          priority: 2,
        });
      } else {
        // No best window data - recommend reducing duration
        recommendations.push({
          type: 'low_adherence',
          habitId: habit.habitId,
          habitTitle: habit.habitTitle,
          metric: {
            label: `${adherencePercent}% adherence`,
            value: adherencePercent,
            context: `${habit.completed}/${habit.scheduled} completed`,
          },
          insight: `Your completion rate is low. Try shortening the duration to build consistency.`,
          action: {
            type: 'reduce_duration',
            label: 'Reduce duration',
            payload: {
              habitId: habit.habitId,
              currentDuration: habit.minutesScheduled / habit.scheduled, // Average duration
              suggestedDuration: Math.floor((habit.minutesScheduled / habit.scheduled) * 0.6), // 60% of current
            },
          },
          priority: 2,
        });
      }
    }

    // Rule 3: Repeated skip reasons "NO_TIME" → recommend rescue block + earlier window
    const noTimeSkips = habit.skipReasons.find((r) => r.reasonCode === 'NO_TIME');
    if (noTimeSkips && noTimeSkips.count >= 2) {
      // Only if 2+ skips in period
      recommendations.push({
        type: 'repeated_skip_no_time',
        habitId: habit.habitId,
        habitTitle: habit.habitTitle,
        metric: {
          label: 'Frequently skipped due to time',
          value: noTimeSkips.count,
          context: `${noTimeSkips.count} times: "No time"`,
        },
        insight: `You've skipped ${noTimeSkips.count} times because you ran out of time. Try scheduling earlier in the day.`,
        action: {
          type: 'adjust_window',
          label: 'Move to earlier time',
          payload: {
            habitId: habit.habitId,
            suggestion: 'morning', // Default to morning
          },
        },
        priority: 2,
      });
    }

    // Rule 4: Repeated skip reasons "FORGOT" → recommend rescue block + reminders
    const forgotSkips = habit.skipReasons.find((r) => r.reasonCode === 'FORGOT');
    if (forgotSkips && forgotSkips.count >= 2) {
      recommendations.push({
        type: 'repeated_skip_forgot',
        habitId: habit.habitId,
        habitTitle: habit.habitTitle,
        metric: {
          label: 'Frequently forgotten',
          value: forgotSkips.count,
          context: `${forgotSkips.count} times: "Forgot"`,
        },
        insight: `You've forgotten ${forgotSkips.count} times. Schedule a rescue block and consider enabling reminders.`,
        action: {
          type: 'schedule_rescue_block',
          label: 'Schedule rescue block',
          payload: {
            habitId: habit.habitId,
            suggestedWindow: habit.bestWindow || null,
          },
        },
        priority: 2,
      });
    }
  }

  // Sort by priority (1 = highest) and return top 3
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

/**
 * Filter out dismissed recommendations
 * @param recommendations - All generated recommendations
 * @param dismissedState - User's habitsCoachState JSON
 * @returns Filtered recommendations
 */
export function filterDismissedRecommendations(
  recommendations: HabitRecommendation[],
  dismissedState: any
): HabitRecommendation[] {
  if (!dismissedState || !dismissedState.dismissedSuggestions) {
    return recommendations;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter out recently dismissed (within 7 days)
  return recommendations.filter((rec) => {
    const dismissed = dismissedState.dismissedSuggestions.find(
      (d: any) =>
        d.type === rec.type &&
        d.habitId === rec.habitId &&
        new Date(d.dismissedAt) > sevenDaysAgo
    );
    return !dismissed;
  });
}
