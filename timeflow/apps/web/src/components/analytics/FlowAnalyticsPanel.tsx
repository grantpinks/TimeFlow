/**
 * Flow Analytics Panel
 *
 * AI-powered analytics header for the Tasks page with Flow mascot
 * Modern futuristic design with gradients and interactive features
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
  onRefresh?: () => void;
}

export function FlowAnalyticsPanel({ onOpenAI, onRefresh }: FlowAnalyticsPanelProps) {
  const { data: goalTracking, loading: goalLoading, error: goalError, refetch: refetchGoal } = useGoalTracking();
  const { data: completion, loading: completionLoading, error: completionError, refetch: refetchCompletion } = useCompletionMetrics('today');
  const { data: timeInsights, loading: timeLoading, error: timeError, refetch: refetchTime } = useTimeInsights();
  const { data: streak, loading: streakLoading, error: streakError, refetch: refetchStreak } = useStreak();

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
  const hasError = goalError || completionError || timeError || streakError;

  // Expose refetch function to parent
  const handleRefresh = () => {
    refetchGoal();
    refetchCompletion();
    refetchTime();
    refetchStreak();
    onRefresh?.();
  };

  if (isLoading && !goalTracking && !completion) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/10 via-purple-500/10 to-pink-500/10 border border-primary-200/20 dark:border-primary-500/20 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" label="Loading analytics" />
        </div>
      </div>
    );
  }

  // Handle error state properly
  if (hasError && !goalTracking && !completion) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-200/20 dark:border-red-500/20 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            Failed to load analytics. Please try again.
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/5 via-purple-500/5 to-pink-500/5 border border-primary-200/30 dark:border-primary-500/30 backdrop-blur-sm shadow-xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-x opacity-50" />

      {/* Glow effect */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-8 p-6">
        {/* Circular Flow Mascot Section */}
        <div className="flex-shrink-0">
          <div className="relative group">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 opacity-75 blur-xl group-hover:opacity-100 transition-opacity duration-300" />

            {/* Main circular container */}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 via-purple-400 to-pink-400 p-1 shadow-2xl">
              {/* Inner circle */}
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <AnimatedFlowMascot
                  size="lg"
                  expression={mascotExpression}
                  animation="bounce"
                />
              </div>
            </div>

            {/* Pulse effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 animate-ping" />
          </div>
        </div>

        {/* Analytics Content */}
        <div className="flex-1 space-y-4">
          {/* Message Section */}
          <div className="space-y-1">
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-primary-600 to-purple-600 dark:from-white dark:via-primary-400 dark:to-purple-400 bg-clip-text text-transparent">
              {message}
            </h3>
            {completion && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You've completed <span className="font-semibold text-primary-600 dark:text-primary-400">{completion.completedToday}</span> of{' '}
                <span className="font-semibold">{completion.completedToday + completion.totalActiveTasks}</span> tasks today{' '}
                <span className="text-primary-600 dark:text-primary-400 font-bold">({completion.completionRate}%)</span>
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Overdue Metric */}
            {goalTracking && (
              <button
                onClick={onRefresh}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-200/30 dark:border-red-500/30 p-4 hover:from-red-500/20 hover:to-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-orange-500/0 group-hover:from-red-500/10 group-hover:to-orange-500/10 transition-all duration-300" />
                <div className="relative space-y-1">
                  <div className="text-3xl">🎯</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                    {goalTracking.overdueCount}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Overdue
                  </div>
                </div>
              </button>
            )}

            {/* Scheduled Hours Metric */}
            {timeInsights && (
              <button
                onClick={onRefresh}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200/30 dark:border-blue-500/30 p-4 hover:from-blue-500/20 hover:to-cyan-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all duration-300" />
                <div className="relative space-y-1">
                  <div className="text-3xl">⏰</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    {timeInsights.totalScheduledHours}hrs
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Scheduled
                  </div>
                </div>
              </button>
            )}

            {/* Active Tasks Metric */}
            {completion && (
              <button
                onClick={onRefresh}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200/30 dark:border-purple-500/30 p-4 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300" />
                <div className="relative space-y-1">
                  <div className="text-3xl">📊</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {completion.totalActiveTasks}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Active
                  </div>
                </div>
              </button>
            )}

            {/* Streak Metric */}
            {streak && (
              <button
                onClick={onRefresh}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-200/30 dark:border-orange-500/30 p-4 hover:from-orange-500/20 hover:to-yellow-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-yellow-500/0 group-hover:from-orange-500/10 group-hover:to-yellow-500/10 transition-all duration-300" />
                <div className="relative space-y-1">
                  <div className="text-3xl">🔥</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent">
                    {streak.currentStreak}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Day Streak
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* AI Assistant Button */}
          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 p-[2px] transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/50"
            >
              <div className="relative flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 px-6 py-3 text-white transition-all duration-300 group-hover:from-primary-500 group-hover:via-purple-500 group-hover:to-pink-500">
                <span className="text-xl">💬</span>
                <span className="font-semibold">Ask Flow AI about your tasks...</span>
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          )}

          {/* Partial data warning */}
          {hasError && (goalTracking || completion) && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Some analytics could not be loaded. Displaying partial data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
