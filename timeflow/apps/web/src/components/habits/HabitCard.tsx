/**
 * Enhanced Habit Card Component
 *
 * Displays a habit with live status, quick scheduling, and engaging visual design.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Habit, Identity } from '@timeflow/shared';
import { TimeSlotPicker, type TimeSlot } from './TimeSlotPicker';
import { IdentitySelector } from '@/components/identity/IdentitySelector';
import { LoadingSpinner } from '@/components/ui';

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onQuickSchedule?: (habitId: string, time: Date) => void;
  /** When set, shows inline identity picker on each card */
  identities?: Identity[];
  onIdentityLink?: (habitId: string, identityId: string | null) => Promise<void>;
}

export function HabitCard({
  habit,
  onEdit,
  onDelete,
  onQuickSchedule,
  identities,
  onIdentityLink,
}: HabitCardProps) {
  const [identitySaving, setIdentitySaving] = useState(false);
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'this-week' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('timeflow_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateOptions(false);
        setSelectedDateOption(null);
      }
    };

    if (showDateOptions || selectedDateOption) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDateOptions, selectedDateOption]);

  // Mock status data (will be replaced with real data from API)
  const status = {
    completedToday: false,
    scheduledForToday: false,
    scheduledTime: null as Date | null,
    currentStreak: 0,
    streakAtRisk: false,
  };

  const formatFrequency = () => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') {
      return `Weekly (${habit.daysOfWeek.join(', ')})`;
    }
    return 'Custom';
  };

  const handleDateOptionClick = (option: 'today' | 'tomorrow' | 'this-week') => {
    setSelectedDateOption(option);
    setShowDateOptions(false);
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    setIsScheduling(true);
    try {
      // Call the commit API to schedule this specific slot
      const response = await fetch('/api/habits/commit-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          acceptedBlocks: [
            {
              habitId: habit.id,
              startDateTime: slot.startDateTime,
              endDateTime: slot.endDateTime,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule habit');
      }

      const data = await response.json();

      // Check if scheduling was successful
      if (data.progress && data.progress[0]?.status === 'created') {
        // Success! Close the picker
        setSelectedDateOption(null);

        // Optional: Call the onQuickSchedule callback if provided
        onQuickSchedule?.(habit.id, new Date(slot.startDateTime));

        // Show success notification
        alert(`${habit.title} scheduled for ${slot.displayTime} on ${slot.dayOfWeek}`);
      } else {
        throw new Error('Scheduling failed');
      }
    } catch (error) {
      console.error('Failed to schedule habit:', error);
      alert(error instanceof Error ? error.message : 'Failed to schedule habit. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelSlotPicker = () => {
    setSelectedDateOption(null);
    setShowDateOptions(false);
  };

  const handleIdentityChange = async (identityId: string | null) => {
    if (!onIdentityLink) return;
    setIdentitySaving(true);
    try {
      await onIdentityLink(habit.id, identityId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update identity link');
    } finally {
      setIdentitySaving(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 ${
        isHovered
          ? 'border-primary-400 shadow-lg -translate-y-0.5'
          : habit.isActive
          ? 'border-slate-200 shadow-md'
          : 'border-slate-100 shadow-sm opacity-60'
      } ${habit.isActive ? 'bg-white' : 'bg-slate-50'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status ribbon */}
      {status.currentStreak > 0 && (
        <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 ${
          status.streakAtRisk
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
            : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
        }`}>
          <span>🔥</span>
          <span>{status.currentStreak} day{status.currentStreak !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="p-5">
        {/* Header with title and status badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-lg">{habit.title}</h3>
              {!habit.isActive && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  Paused
                </span>
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {status.completedToday && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Done today
                </span>
              )}
              {status.scheduledForToday && !status.completedToday && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Scheduled today
                </span>
              )}
              {!status.scheduledForToday && !status.completedToday && (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Not scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inline identity — primary UX for linking habits to Today progress */}
        {onIdentityLink && (
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Identity
            </p>
            {!identities?.length ? (
              <p className="text-sm text-slate-600">
                <Link
                  href="/settings/identities"
                  className="font-semibold text-primary-600 underline-offset-2 hover:underline"
                >
                  Create an identity
                </Link>{' '}
                first, then pick it here so completions count on Today.
              </p>
            ) : (
              <>
                <IdentitySelector
                  identities={identities}
                  value={habit.identityId ?? null}
                  onChange={(id) => {
                    void handleIdentityChange(id);
                  }}
                  placeholder="Link this habit to an identity…"
                  showLinkPrompt={!habit.identityId}
                  disabled={identitySaving}
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Completing scheduled instances updates that identity on the Today page.
                </p>
              </>
            )}
          </div>
        )}

        {/* Description */}
        {habit.description && (
          <p className="text-sm text-slate-600 mb-3">{habit.description}</p>
        )}

        {/* Identity-Based Tracking Display */}
        {((!onIdentityLink && (habit.identityModel || habit.identity)) ||
          habit.longTermGoal ||
          habit.whyStatement) && (
          <div className="mb-4 p-3 bg-gradient-to-br from-primary-50/50 to-blue-50/50 border border-primary-100 rounded-lg space-y-2">
            {!onIdentityLink && (habit.identityModel || habit.identity) && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-slate-600">Identity</p>
                  <p className="text-sm font-semibold text-primary-800">
                    {habit.identityModel ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden>{habit.identityModel.icon}</span>
                        {habit.identityModel.name}
                      </span>
                    ) : (
                      habit.identity
                    )}
                  </p>
                </div>
              </div>
            )}
            {habit.longTermGoal && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-slate-600">Long-Term Goal</p>
                  <p className="text-sm text-slate-700">{habit.longTermGoal}</p>
                </div>
              </div>
            )}
            {habit.whyStatement && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-slate-600">Why This Matters</p>
                  <p className="text-sm text-slate-700 italic">{habit.whyStatement}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Habit details */}
        <div className="flex items-center gap-3 mb-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatFrequency()}
          </span>
          {habit.preferredTimeOfDay && (
            <span className="inline-flex items-center gap-1 capitalize">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {habit.preferredTimeOfDay}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {habit.durationMinutes} min
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3">
          {/* Quick schedule dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDateOptions(!showDateOptions)}
              disabled={!habit.isActive || isScheduling}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                habit.isActive && !isScheduling
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isScheduling ? (
                <>
                  <LoadingSpinner size="sm" variant="inverse" label="Scheduling" />
                  Scheduling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Quick Schedule
                </>
              )}
            </button>

            {/* Date option picker */}
            {showDateOptions && !selectedDateOption && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-primary-200 z-50 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-2 border-b border-primary-200">
                  <p className="text-xs font-semibold text-slate-700">When should we schedule this?</p>
                </div>
                <button
                  onClick={() => handleDateOptionClick('today')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="font-medium text-slate-700 group-hover:text-primary-700">Today</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDateOptionClick('tomorrow')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group border-t border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌅</span>
                    <span className="font-medium text-slate-700 group-hover:text-primary-700">Tomorrow</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDateOptionClick('this-week')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group border-t border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📆</span>
                    <span className="font-medium text-slate-700 group-hover:text-primary-700">This Week</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Time slot picker */}
            {selectedDateOption && (
              <TimeSlotPicker
                habitId={habit.id}
                habitTitle={habit.title}
                dateOption={selectedDateOption}
                onSelectSlot={handleSlotSelect}
                onCancel={handleCancelSlotPicker}
              />
            )}
          </div>

          {/* Edit and Delete buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(habit)}
              className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
            >
              Edit
            </button>

            <button
              onClick={() => onDelete(habit.id)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
