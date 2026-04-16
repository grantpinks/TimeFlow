/**
 * Flow Analytics Panel
 *
 * AI-powered analytics header for the Tasks page with Flow mascot
 */

'use client';

import { useMemo } from 'react';
import { AnimatedFlowMascot } from '../AnimatedFlowMascot';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  useGoalTracking,
  useCompletionMetrics,
  useTimeInsights,
  useStreak,
} from '@/hooks/useAnalytics';

interface FlowAnalyticsPanelProps {
  onOpenAI?: () => void;
}

export function FlowAnalyticsPanel({ onOpenAI }: FlowAnalyticsPanelProps) {
  const { data: goalTracking, loading: goalLoading } = useGoalTracking();
  const { data: completion, loading: completionLoading } = useCompletionMetrics('today');
  const { data: timeInsights, loading: timeLoading } = useTimeInsights();
  const { data: streak, loading: streakLoading } = useStreak();

  // Determine mascot expression based on analytics
  const mascotExpression = useMemo(() => {
    if (!completion || !goalTracking) return 'happy';

    if (completion.completionRate >= 80) return 'celebrating';
    if (goalTracking.overdueCount > 0) return 'encouraging';
    if (completion.completionRate < 40) return 'thinking';
    return 'happy';
  }, [completion, goalTracking]);

  // Generate personalized message
  const message = useMemo(() => {
    if (!completion || !goalTracking) return 'Loading your analytics...';

    if (completion.completionRate >= 80) {
      return '🎉 Amazing progress today!';
    }
    if (goalTracking.overdueCount > 0) {
      return `💪 You've got ${goalTracking.overdueCount} overdue ${goalTracking.overdueCount === 1 ? 'task' : 'tasks'}. Let's tackle them!`;
    }
    if (completion.completionRate < 40) {
      return '🤔 Let me help you optimize your schedule.';
    }
    return '👋 Great work today!';
  }, [completion, goalTracking]);

  const isLoading = goalLoading || completionLoading || timeLoading || streakLoading;

  if (isLoading) {
    return (
      <div className="analytics-panel">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" label="Loading analytics" />
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-panel">
      <div className="flex items-start gap-6">
        {/* Flow Mascot */}
        <div className="flex-shrink-0">
          <AnimatedFlowMascot
            size="lg"
            expression={mascotExpression}
            animation="bounce"
          />
        </div>

        {/* Analytics Content */}
        <div className="flex-1 space-y-4">
          {/* Message */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {message}
            </h3>
            {completion && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                You've completed {completion.completedToday} of {completion.completedToday + completion.totalActiveTasks} tasks today ({completion.completionRate}%)
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Overdue */}
            {goalTracking && (
              <div className="metric-card">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {goalTracking.overdueCount}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Overdue
                </div>
              </div>
            )}

            {/* Scheduled Hours */}
            {timeInsights && (
              <div className="metric-card">
                <div className="text-2xl mb-1">⏰</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {timeInsights.totalScheduledHours}hrs
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Scheduled
                </div>
              </div>
            )}

            {/* Active Tasks */}
            {completion && (
              <div className="metric-card">
                <div className="text-2xl mb-1">📊</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {completion.totalActiveTasks}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Active
                </div>
              </div>
            )}

            {/* Streak */}
            {streak && (
              <div className="metric-card">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {streak.currentStreak}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Day Streak
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Button */}
          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>Ask Flow AI about your tasks...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
