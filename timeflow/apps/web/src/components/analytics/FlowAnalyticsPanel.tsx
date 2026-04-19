/**
 * Flow Analytics Panel
 *
 * AI-powered analytics header for the Tasks page with Flow mascot
 * Professional futuristic design with functional analytics
 */

'use client';

import { useMemo, useState } from 'react';
import { FlowMascot } from '../FlowMascot';
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

  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

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

  const toggleMetric = (metricId: string) => {
    setExpandedMetric(expandedMetric === metricId ? null : metricId);
  };

  if (isLoading && !goalTracking && !completion) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" label="Loading analytics" />
        </div>
      </div>
    );
  }

  // Handle error state properly
  if (hasError && !goalTracking && !completion) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            Failed to load analytics. Please try again.
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-primary-50/30 to-cyan-50/30 dark:from-slate-900/50 dark:via-slate-800/50 dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-lg">
      {/* Subtle glow effects */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8 p-4 sm:p-6">
        {/* Circular Flow Mascot Section with Pulsing Ring */}
        <div className="flex-shrink-0">
          <div className="relative group">
            {/* Pulsing cyan circle animation */}
            <div className="absolute inset-0 rounded-full">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 dark:bg-cyan-400/20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/30 to-cyan-500/30 dark:from-primary-400/30 dark:to-cyan-400/30 blur-md animate-pulse" />
            </div>

            {/* Main circular container */}
            <div className="relative w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/30 dark:to-cyan-900/30 p-[2px] shadow-xl">
              {/* Inner circle */}
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-inner border-2 border-primary-200/50 dark:border-primary-700/50">
                <FlowMascot
                  size="lg"
                  expression="guiding-up"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Message Section */}
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {message}
            </h3>
            {completion && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
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
                onClick={() => toggleMetric('overdue')}
                className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 hover:border-red-300 dark:hover:border-red-700 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="relative space-y-1">
                  <div className="text-3xl">🎯</div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {goalTracking.overdueCount}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Overdue
                  </div>
                  {expandedMetric === 'overdue' && goalTracking.overdueCount > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded-lg shadow-xl z-10 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">Critical Tasks:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {goalTracking.overdueCount} {goalTracking.overdueCount === 1 ? 'task needs' : 'tasks need'} immediate attention
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Click "Ask Flow AI" for scheduling help
                      </p>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Scheduled Hours Metric */}
            {timeInsights && (
              <button
                onClick={() => toggleMetric('scheduled')}
                className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="relative space-y-1">
                  <div className="text-3xl">⏰</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {timeInsights.totalScheduledHours}hrs
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Scheduled
                  </div>
                  {expandedMetric === 'scheduled' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-xl z-10 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">Schedule Breakdown:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {timeInsights.totalScheduledHours} hours of focused work planned
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Avg: {Math.round(timeInsights.totalScheduledHours / Math.max(1, completion?.totalActiveTasks || 1) * 10) / 10}hrs per task
                      </p>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Active Tasks Metric */}
            {completion && (
              <button
                onClick={() => toggleMetric('active')}
                className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="relative space-y-1">
                  <div className="text-3xl">📊</div>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {completion.totalActiveTasks}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Active
                  </div>
                  {expandedMetric === 'active' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-700 rounded-lg shadow-xl z-10 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">Task Status:</p>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          ✓ Completed: {completion.completedToday}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          ◯ Remaining: {completion.totalActiveTasks}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                          {completion.completionRate}% completion rate
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Streak Metric */}
            {streak && (
              <button
                onClick={() => toggleMetric('streak')}
                className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="relative space-y-1">
                  <div className="text-3xl">🔥</div>
                  <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {streak.currentStreak}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Day Streak
                  </div>
                  {expandedMetric === 'streak' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 rounded-lg shadow-xl z-10 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">Consistency:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        Current: {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                        {streak.currentStreak >= 7 ? "🎉 Amazing consistency!" : "Keep it up!"}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* AI Assistant Button */}
          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-500/90 via-cyan-500/90 to-blue-500/90 hover:from-primary-500 hover:via-cyan-500 hover:to-blue-500 p-[1px] transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/20"
            >
              <div className="relative flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-primary-600 via-cyan-600 to-blue-600 px-6 py-3 text-white transition-all duration-300">
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Some analytics could not be loaded. Displaying partial data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
