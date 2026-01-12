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
  CoachSuggestions,
  HabitsCoachState,
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
        insight: `You've built an amazing ${habit.streak.current}-day streak! Let's protect it. I can help you find time today to keep your momentum going.`,
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
          insight: `I've noticed you complete this habit ${Math.round(habit.bestWindow.completionRate * 100)}% of the time on ${habit.bestWindow.dayOfWeek}s at ${habit.bestWindow.timeSlot}. Let's schedule it during your peak success window!`,
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
          insight: `Let's make this easier to stick with. Starting smaller often leads to bigger success. I recommend shortening the duration to build momentum.`,
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
        insight: `I see the day gets away from you. Let's tackle this earlier when you have more energy and fewer distractions. Morning might be your secret weapon!`,
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
        insight: `Life gets busy and things slip through the cracks—it happens! Let me help you make this habit impossible to miss by getting it on your calendar now.`,
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

    // Rule 5: Planned vs actual duration mismatch → adjust duration
    if (habit.plannedVsActualDelta !== undefined && habit.completed >= 5) {
      // Only if we have enough actual duration data (5+ completions with actual duration)
      const avgPlannedDuration = habit.minutesScheduled / habit.scheduled;
      const deltaMinutes = Math.abs(habit.plannedVsActualDelta);

      // If delta is significant (>= 10 minutes or >= 30% of planned duration)
      const isSignificantDelta = deltaMinutes >= 10 || deltaMinutes >= avgPlannedDuration * 0.3;

      if (isSignificantDelta) {
        const isOverEstimate = habit.plannedVsActualDelta < 0; // Negative = under-planned
        const direction = isOverEstimate ? 'shorter' : 'longer';
        const suggestedDuration = Math.round(avgPlannedDuration + habit.plannedVsActualDelta);

        recommendations.push({
          type: 'duration_mismatch',
          habitId: habit.habitId,
          habitTitle: habit.habitTitle,
          metric: {
            label: isOverEstimate
              ? `Usually takes ${Math.round(deltaMinutes)}min less`
              : `Usually takes ${Math.round(deltaMinutes)}min more`,
            value: Math.round(deltaMinutes),
            context: `Avg: ${Math.round(avgPlannedDuration + habit.plannedVsActualDelta)}min actual vs ${Math.round(avgPlannedDuration)}min planned`,
          },
          insight: isOverEstimate
            ? `You're consistently finishing this ${Math.round(deltaMinutes)} minutes faster than planned. Let's adjust the duration to better reflect reality and free up time for other things!`
            : `This habit typically takes ${Math.round(deltaMinutes)} minutes longer than planned. Let's adjust the duration so your schedule stays realistic and achievable.`,
          action: {
            type: 'adjust_duration',
            label: `Adjust to ${suggestedDuration}min`,
            payload: {
              habitId: habit.habitId,
              currentDuration: Math.round(avgPlannedDuration),
              suggestedDuration,
            },
          },
          priority: 2,
        });
      }
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

  // Filter out recently dismissed (within 7 days) or snoozed
  return recommendations.filter((rec) => {
    const dismissed = dismissedState.dismissedSuggestions.find(
      (d: any) =>
        d.type === rec.type &&
        d.habitId === rec.habitId &&
        new Date(d.dismissedAt) > sevenDaysAgo
    );

    if (!dismissed) return true;

    // If snoozed, check if snooze period has expired
    if (dismissed.snoozedUntil) {
      return new Date(dismissed.snoozedUntil) < now;
    }

    // Otherwise it's permanently dismissed
    return false;
  });
}

/**
 * Create coach suggestions with primary/secondary split and noise control
 * @param recommendations - All filtered recommendations
 * @param coachState - User's habitsCoachState JSON
 * @returns Coach suggestions with primary + max 2 secondary
 */
export function createCoachSuggestions(
  recommendations: HabitRecommendation[],
  coachState: HabitsCoachState | null
): CoachSuggestions {
  if (recommendations.length === 0) {
    return {
      primary: null,
      secondary: [],
    };
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check if we showed a primary suggestion in the last 24 hours (noise control)
  let canShowPrimary = true;
  if (coachState?.lastPrimarySuggestion) {
    const lastPrimaryTime = new Date(coachState.lastPrimarySuggestion.timestamp);
    if (lastPrimaryTime > twentyFourHoursAgo) {
      canShowPrimary = false;
    }
  }

  // Priority 1 recommendations become primary (if noise control allows)
  const priority1 = recommendations.filter((r) => r.priority === 1);
  const priority2Plus = recommendations.filter((r) => r.priority >= 2);

  let primary: HabitRecommendation | null = null;
  let secondary: HabitRecommendation[] = [];

  if (canShowPrimary && priority1.length > 0) {
    // Show first priority 1 as primary
    primary = priority1[0];
    // Remaining priority 1s + priority 2s become secondary (max 2)
    secondary = [...priority1.slice(1), ...priority2Plus].slice(0, 2);
  } else {
    // Can't show primary due to noise control, or no priority 1 recommendations
    // Show all as secondary (max 2)
    secondary = recommendations.slice(0, 2);
  }

  return {
    primary,
    secondary,
  };
}
