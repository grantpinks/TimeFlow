/**
 * Habits Insights Component
 *
 * Displays adherence metrics, streaks, and analytics for user's habits.
 */

'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui';
import { getHabitInsights } from '@/lib/api';
import { CoachCard } from './CoachCard';
import { Recommendations } from './Recommendations';
import { StreakReminderBanner } from './StreakReminderBanner';
import { MetricsTooltip } from './MetricsTooltip';
import type { HabitInsightsSummary, PerHabitInsights, HabitRecommendation } from '@timeflow/shared';

export function HabitsInsights() {
  const [insights, setInsights] = useState<HabitInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<14 | 28>(14);

  useEffect(() => {
    loadInsights();
  }, [selectedPeriod]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHabitInsights(selectedPeriod);
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationAction = (recommendation: HabitRecommendation) => {
    // TODO: Implement action handlers in Task 5 (Coach Card + Next Actions)
    // For now, just log the action
    console.log('Recommendation action clicked:', recommendation);
    alert(`Action "${recommendation.action.label}" will be implemented in Task 5`);
  };

  if (loading) {
    return (
      <Panel>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadInsights}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  if (!insights || insights.activeHabits === 0) {
    return (
      <Panel>
        <div className="text-center py-8">
          <p className="text-slate-600 mb-2">No insights available yet</p>
          <p className="text-sm text-slate-500">
            {insights?.totalHabits === 0
              ? 'Create a habit to start tracking your progress'
              : 'Schedule your habits to see insights'}
          </p>
        </div>
      </Panel>
    );
  }

  // Get habits with streaks at risk
  const atRiskHabits = insights.habits.filter(h => h.streak.atRisk && h.streak.current > 0);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Insights</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod(14)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedPeriod === 14
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            14 days
          </button>
          <button
            onClick={() => setSelectedPeriod(28)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedPeriod === 28
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            28 days
          </button>
        </div>
      </div>

      {/* Streak Reminder Banner */}
      {atRiskHabits.length > 0 && (
        <StreakReminderBanner
          atRiskHabits={atRiskHabits}
          onScheduleRescue={(habitId) => {
            // TODO: Implement schedule rescue block
            console.log('Schedule rescue for habit:', habitId);
            alert('Schedule rescue block feature coming soon!');
          }}
          onCompleteNow={(habitId) => {
            // TODO: Navigate to calendar/today page or open quick complete modal
            console.log('Complete now for habit:', habitId);
            alert('Quick complete feature coming soon!');
          }}
        />
      )}

      {/* Coach Card - Primary Suggestion */}
      <CoachCard
        primary={insights.coachSuggestions.primary}
        onActionClick={handleRecommendationAction}
        onDismiss={loadInsights} // Reload insights after dismissing
      />

      {/* Secondary Recommendations */}
      {insights.coachSuggestions.secondary && insights.coachSuggestions.secondary.length > 0 && (
        <Recommendations
          recommendations={insights.coachSuggestions.secondary}
          onActionClick={handleRecommendationAction}
        />
      )}

      {/* Overall Metrics */}
      <Panel>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-sm text-slate-600">Overall Adherence</p>
              <MetricsTooltip type="adherence" />
            </div>
            <p className="text-3xl font-bold text-primary-600">
              {Math.round(insights.overallAdherence * 100)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Active Habits</p>
            <p className="text-3xl font-bold text-slate-800">
              {insights.activeHabits}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Minutes Completed</p>
            <p className="text-3xl font-bold text-slate-800">
              {insights.totalMinutesCompleted}
              <span className="text-sm text-slate-500 font-normal ml-1">
                / {insights.totalMinutesScheduled}
              </span>
            </p>
          </div>
        </div>
      </Panel>

      {/* Per-Habit Insights */}
      <div className="space-y-3">
        {insights.habits.map((habit) => (
          <HabitInsightCard key={habit.habitId} habit={habit} />
        ))}
      </div>
    </div>
  );
}

interface HabitInsightCardProps {
  habit: PerHabitInsights;
}

function HabitInsightCard({ habit }: HabitInsightCardProps) {
  const adherencePercent = Math.round(habit.adherenceRate * 100);

  return (
    <Panel>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">{habit.habitTitle}</h3>
            <div className="flex gap-4 mt-1 text-sm text-slate-600">
              <span>
                {habit.completed}/{habit.scheduled} completed
              </span>
              <span>{habit.minutesCompleted} min</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">
              {adherencePercent}%
            </div>
            <div className="flex items-center gap-1 justify-end">
              <div className="text-xs text-slate-500">adherence</div>
              <MetricsTooltip type="adherence" />
            </div>
          </div>
        </div>

        {/* Streak Info */}
        {habit.streak.current > 0 && (
          <div className="flex items-center gap-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <div className="flex items-center gap-1">
                <div className="text-sm text-amber-800 font-medium">
                  {habit.streak.current} day streak
                </div>
                <MetricsTooltip type="streak" />
              </div>
              <div className="text-xs text-amber-600">
                Best: {habit.streak.best} days
              </div>
            </div>
            {habit.streak.atRisk && (
              <div className="ml-auto">
                <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded">
                  At Risk
                </span>
              </div>
            )}
          </div>
        )}

        {/* Best Window */}
        {habit.bestWindow && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-1 text-sm text-green-800">
              <span className="font-medium">Best window: </span>
              <span>{habit.bestWindow.dayOfWeek} {habit.bestWindow.timeSlot}</span>
              <MetricsTooltip type="best-window" />
            </div>
            <div className="text-xs text-green-600 mt-1">
              {Math.round(habit.bestWindow.completionRate * 100)}% completion rate
              ({habit.bestWindow.sampleSize} instances)
            </div>
          </div>
        )}

        {/* Skip Reasons */}
        {habit.skipReasons.length > 0 && (
          <div className="border-t border-slate-200 pt-3">
            <div className="text-xs font-medium text-slate-600 mb-2">
              Skip reasons:
            </div>
            <div className="flex flex-wrap gap-2">
              {habit.skipReasons.map((reason) => (
                <span
                  key={reason.reasonCode}
                  className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                >
                  {formatReasonCode(reason.reasonCode)}: {reason.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mini Chart (simplified for MVP) */}
        <div className="border-t border-slate-200 pt-3">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Last {habit.adherenceSeries.length} days
          </div>
          <div className="flex gap-1">
            {habit.adherenceSeries.slice(-14).map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${day.date}: ${day.completed}/${day.scheduled}`}
              >
                <div
                  className={`w-full h-8 rounded ${
                    day.scheduled === 0
                      ? 'bg-slate-100'
                      : day.completed === day.scheduled
                      ? 'bg-green-500'
                      : day.completed > 0
                      ? 'bg-amber-400'
                      : 'bg-red-300'
                  }`}
                ></div>
                <div className="text-xs text-slate-400">
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function formatReasonCode(code: string): string {
  return code
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
