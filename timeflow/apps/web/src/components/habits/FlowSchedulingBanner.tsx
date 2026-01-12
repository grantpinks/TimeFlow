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
import type { Habit } from '@timeflow/shared';

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
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());

  const getAuthHeaders = () => {
    const token = localStorage.getItem('timeflow_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchContext();
    fetchHabits();
  }, []);

  const fetchContext = async () => {
    try {
      const response = await fetch('/api/habits/scheduling-context', {
        headers: {
          ...getAuthHeaders(),
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

  const fetchHabits = async () => {
    try {
      const response = await fetch('/api/habits', {
        headers: {
          ...getAuthHeaders(),
        },
      });
      const data = await response.json();
      // Don't filter by isActive - show all habits that are visible on the page
      setHabits(data);
      // Select all habits by default
      setSelectedHabitIds(new Set(data.map((h: Habit) => h.id)));
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    }
  };

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabitIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedHabitIds.size === habits.length) {
      setSelectedHabitIds(new Set());
    } else {
      setSelectedHabitIds(new Set(habits.map((h) => h.id)));
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
    // Validate selection
    if (habits.length === 0) {
      setError('You need to create some habits first before scheduling them');
      return;
    }

    if (selectedHabitIds.size === 0) {
      setError('Please select at least one habit to schedule');
      return;
    }

    setSelectedRange(range);
    setGeneratingSchedule(true);
    setError(null);

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
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          dateRangeStart,
          dateRangeEnd,
          habitIds: Array.from(selectedHabitIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate schedule');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);

    } catch (error) {
      console.error('Failed to generate schedule:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate schedule. Please try again.');
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
          ...getAuthHeaders(),
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
          {error ? (
            // Error State
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Couldn't generate schedule
              </h3>
              <p className="text-sm text-slate-600 text-center mb-4 max-w-sm">
                {error}
              </p>
              <button
                onClick={() => selectedRange && handleQuickAction(selectedRange as any)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : suggestions && suggestions.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-8">
              <FlowMascot size="lg" expression="thinking" className="mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No available time slots
              </h3>
              <p className="text-sm text-slate-600 text-center mb-4 max-w-sm">
                Flow couldn't find open slots for your habits. Try a longer time range or adjust your calendar.
              </p>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
              >
                Try Different Range
              </button>
            </div>
          ) : suggestions && suggestions.length > 0 ? (
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
              {/* Habit Selection */}
              {habits.length > 0 ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-700 font-medium">Select habits to schedule:</p>
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {selectedHabitIds.size === habits.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid gap-2 max-h-60 overflow-y-auto p-1">
                    {habits.map((habit) => (
                      <label
                        key={habit.id}
                        className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedHabitIds.has(habit.id)}
                          onChange={() => toggleHabitSelection(habit.id)}
                          className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{habit.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {habit.frequency === 'daily' ? 'Daily' : habit.frequency === 'weekly' ? `Weekly (${habit.daysOfWeek.join(', ')})` : 'Custom'}
                            </span>
                            <span>•</span>
                            <span>{habit.durationMinutes} min</span>
                            {habit.preferredTimeOfDay && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{habit.preferredTimeOfDay}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedHabitIds.size} of {habits.length} habit{habits.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        No habits found
                      </p>
                      <p className="text-sm text-amber-700">
                        Create some habits first, then come back here to schedule them with Flow.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-slate-700 font-medium mb-4">When should Flow schedule your habits?</p>

              {/* Quick Action Chips */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => handleQuickAction('tomorrow')}
                  disabled={habits.length === 0}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => handleQuickAction('next-3-days')}
                  disabled={habits.length === 0}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Next 3 Days
                </button>
                <button
                  onClick={() => handleQuickAction('this-week')}
                  disabled={habits.length === 0}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickAction('next-2-weeks')}
                  disabled={habits.length === 0}
                  className="px-4 py-2 bg-white border-2 border-primary-300 rounded-lg text-primary-700 font-medium hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
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
