/**
 * Flow Scheduling Banner
 *
 * Context-aware bulk habit scheduling component
 */

'use client';

import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { FlowMascot } from '../FlowMascot';
import { SchedulePreview, HabitBlock } from './SchedulePreview';
import { SchedulingProgressModal } from './SchedulingProgressModal';

interface SchedulingContext {
  unscheduledHabitsCount: number;
  nextRelevantDay: string;
  urgentHabits: number;
  calendarDensity: 'light' | 'moderate' | 'busy';
}

interface BlockProgress {
  habitId: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  eventId?: string;
  error?: string;
}

export function FlowSchedulingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [context, setContext] = useState<SchedulingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<HabitBlock[] | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [commitProgress, setCommitProgress] = useState<BlockProgress[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);

  useEffect(() => {
    fetchContext();
  }, []);

  const fetchContext = async () => {
    try {
      const response = await fetch('/api/habits/scheduling-context', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setContext(data);
    } catch (error) {
      console.error('Failed to fetch scheduling context:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContextMessage = (): string => {
    if (!context) return 'Flow can schedule your habits for you';

    // Priority 1: Streak at risk
    if (context.urgentHabits > 0) {
      return `${context.urgentHabits} habit${context.urgentHabits > 1 ? 's' : ''} at risk of breaking streaks - schedule them now?`;
    }

    // Priority 2: Tomorrow focus
    if (context.nextRelevantDay === 'tomorrow' && context.unscheduledHabitsCount > 0) {
      return `You have ${context.unscheduledHabitsCount} unscheduled habits for tomorrow`;
    }

    // Priority 3: Week planning
    if (context.nextRelevantDay === 'next week' && context.unscheduledHabitsCount > 0) {
      return `Ready to plan next week? ${context.unscheduledHabitsCount} habits waiting`;
    }

    // Priority 4: Opportunity nudge
    if (context.calendarDensity === 'light' && context.unscheduledHabitsCount > 0) {
      return 'Your calendar looks light - want to schedule some habits?';
    }

    // Default
    return 'Flow can schedule your habits for you';
  };

  const handleQuickAction = async (range: 'tomorrow' | 'next-3-days' | 'this-week' | 'next-2-weeks') => {
    setSelectedRange(range);
    setGeneratingSchedule(true);

    const now = DateTime.now();
    let dateRangeStart: string;
    let dateRangeEnd: string;

    switch (range) {
      case 'tomorrow':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ days: 1 }).toISODate()!;
        break;
      case 'next-3-days':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ days: 3 }).toISODate()!;
        break;
      case 'this-week':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.endOf('week').toISODate()!;
        break;
      case 'next-2-weeks':
        dateRangeStart = now.plus({ days: 1 }).toISODate()!;
        dateRangeEnd = now.plus({ weeks: 2 }).toISODate()!;
        break;
    }

    try {
      const response = await fetch('/api/habits/bulk-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ dateRangeStart, dateRangeEnd }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);

    } catch (error) {
      console.error('Failed to generate schedule:', error);
      // TODO: Show error toast
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleAcceptAll = async (blocks: HabitBlock[]) => {
    setTotalBlocks(blocks.length);
    setShowProgressModal(true);

    // Initialize progress for all blocks
    const initialProgress: BlockProgress[] = blocks.map((block) => ({
      habitId: block.habitId,
      status: 'pending' as const,
    }));
    setCommitProgress(initialProgress);

    try {
      const response = await fetch('/api/habits/commit-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          acceptedBlocks: blocks.map((b) => ({
            habitId: b.habitId,
            startDateTime: b.startDateTime,
            endDateTime: b.endDateTime,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to commit schedule');
      }

      const data = await response.json();
      setCommitProgress(data.progress);

      // Clear suggestions on success
      if (data.progress.every((p: BlockProgress) => p.status === 'created')) {
        setSuggestions(null);
      }
    } catch (error) {
      console.error('Failed to commit schedule:', error);
      // Mark all as failed
      setCommitProgress(
        initialProgress.map((p) => ({
          ...p,
          status: 'failed' as const,
          error: 'Failed to create calendar events',
        }))
      );
    }
  };

  const handleCancel = () => {
    setSuggestions(null);
    // Keep expanded so user can try again
  };

  const handleProgressComplete = () => {
    setShowProgressModal(false);
    setCommitProgress([]);
    setTotalBlocks(0);
    setIsExpanded(false);
    // Refresh context to show updated counts
    fetchContext();
  };

  const handleViewCalendar = () => {
    setShowProgressModal(false);
    // Navigate to calendar page
    window.location.href = '/calendar';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-primary-200 rounded-full w-12 h-12" />
          <div className="animate-pulse bg-primary-200 rounded h-5 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl mb-6 transition-all duration-300">
      {/* Collapsed State */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-primary-100/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <FlowMascot size="md" expression="encouraging" />
          <p className="text-slate-800 font-medium">{getContextMessage()}</p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded State */}
      {isExpanded && (
        <div className="p-6 pt-4 border-t border-primary-200">
          {suggestions ? (
            // Preview State
            <SchedulePreview
              suggestions={suggestions}
              onAcceptAll={handleAcceptAll}
              onCancel={handleCancel}
            />
          ) : generatingSchedule ? (
            // Loading State
            <div className="flex flex-col items-center justify-center py-8">
              <FlowMascot size="lg" expression="thinking" className="mb-4" />
              <p className="text-slate-700 font-medium mb-2">Flow is finding the best times...</p>
              <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            // Prompt State
            <>
              <p className="text-slate-700 font-medium mb-4">When should Flow schedule your habits?</p>

              {/* Quick Action Chips */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => handleQuickAction('tomorrow')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => handleQuickAction('next-3-days')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Next 3 Days
                </button>
                <button
                  onClick={() => handleQuickAction('this-week')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickAction('next-2-weeks')}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors"
                >
                  Next 2 Weeks
                </button>
              </div>

              {/* Optional Custom Prompt */}
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Or tell Flow:</p>
                <input
                  type="text"
                  placeholder="Skip Monday, I'm traveling"
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-primary-400 focus:outline-none"
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Custom prompts coming soon</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress Modal */}
      <SchedulingProgressModal
        isOpen={showProgressModal}
        progress={commitProgress}
        totalBlocks={totalBlocks}
        onComplete={handleProgressComplete}
        onViewCalendar={handleViewCalendar}
      />
    </div>
  );
}
