/**
 * Coach Card Component
 *
 * Displays Flow's primary coaching suggestion prominently at the top of the habits page.
 * Includes actions: schedule rescue block, adjust window, dismiss, and snooze.
 */

'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui';
import { dismissCoachSuggestion } from '@/lib/api';
import type { HabitRecommendation } from '@timeflow/shared';

interface CoachCardProps {
  primary: HabitRecommendation | null;
  onActionClick?: (recommendation: HabitRecommendation) => void;
  onDismiss?: () => void;
}

export function CoachCard({ primary, onActionClick, onDismiss }: CoachCardProps) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (!primary) {
    // No primary suggestion - show encouragement
    return (
      <Panel className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-2xl">✨</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-900 text-lg mb-1">
              You're doing great!
            </h3>
            <p className="text-green-800 text-sm leading-relaxed">
              <span className="font-medium">Flow says:</span> Keep up the excellent work on your habits. I'll let you know if I notice any patterns that could help you improve.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  const { type, habitTitle, metric, insight, action } = primary;

  const handleDismiss = async (snoozedUntil?: string) => {
    try {
      setDismissing(true);
      await dismissCoachSuggestion({
        type,
        habitId: primary.habitId,
        snoozedUntil,
      });
      onDismiss?.();
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
      alert('Failed to dismiss suggestion. Please try again.');
    } finally {
      setDismissing(false);
      setShowSnoozeOptions(false);
    }
  };

  const getSnoozeOptions = () => {
    const now = new Date();
    return [
      {
        label: '1 hour',
        value: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      },
      {
        label: '3 hours',
        value: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        label: 'Tomorrow',
        value: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  };

  return (
    <Panel className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Flow Avatar */}
        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
          <span className="text-white text-2xl font-bold">F</span>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-amber-900 text-lg">
                Flow's Priority Recommendation
              </h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                Action Needed
              </span>
            </div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              {habitTitle}
            </div>
          </div>

          {/* Metric */}
          <div>
            <div className="text-lg font-bold text-amber-900">
              {metric.label}
            </div>
            {metric.context && (
              <div className="text-sm text-amber-700 mt-0.5">{metric.context}</div>
            )}
          </div>

          {/* Insight */}
          <div className="text-sm leading-relaxed text-amber-900 bg-white/50 p-3 rounded-lg">
            <span className="font-semibold">Flow says:</span> {insight}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary CTA */}
            <button
              onClick={() => onActionClick?.(primary)}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-bold text-sm transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              {action.label}
            </button>

            {/* Dismiss / Snooze */}
            <div className="relative">
              <button
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                disabled={dismissing}
                className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg font-medium text-sm transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                {dismissing ? 'Dismissing...' : showSnoozeOptions ? 'Cancel' : 'Dismiss'}
              </button>

              {/* Snooze Options Dropdown */}
              {showSnoozeOptions && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-10 min-w-[160px]">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => handleDismiss()}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      Dismiss forever
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">
                      Snooze for
                    </div>
                    {getSnoozeOptions().map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleDismiss(option.value)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
