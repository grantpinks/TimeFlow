/**
 * Enhanced Habit Card Component
 *
 * Displays a habit with live status, quick scheduling, and engaging visual design.
 */

'use client';

import { useState } from 'react';
import type { Habit } from '@timeflow/shared';

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onQuickSchedule?: (habitId: string, time: Date) => void;
}

export function HabitCard({ habit, onEdit, onDelete, onQuickSchedule }: HabitCardProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const handleQuickSchedule = (timeOption: 'morning' | 'afternoon' | 'evening' | 'now') => {
    const now = new Date();
    let scheduledTime = new Date();

    switch (timeOption) {
      case 'now':
        scheduledTime = now;
        break;
      case 'morning':
        scheduledTime.setHours(8, 0, 0, 0);
        if (scheduledTime < now) scheduledTime.setDate(scheduledTime.getDate() + 1);
        break;
      case 'afternoon':
        scheduledTime.setHours(14, 0, 0, 0);
        if (scheduledTime < now) scheduledTime.setDate(scheduledTime.getDate() + 1);
        break;
      case 'evening':
        scheduledTime.setHours(18, 0, 0, 0);
        if (scheduledTime < now) scheduledTime.setDate(scheduledTime.getDate() + 1);
        break;
    }

    onQuickSchedule?.(habit.id, scheduledTime);
    setShowTimePicker(false);
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

        {/* Description */}
        {habit.description && (
          <p className="text-sm text-slate-600 mb-3">{habit.description}</p>
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
        <div className="flex items-center gap-2">
          {/* Quick schedule dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowTimePicker(!showTimePicker)}
              disabled={!habit.isActive}
              className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                habit.isActive
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Quick Schedule
              </span>
            </button>

            {/* Time picker dropdown */}
            {showTimePicker && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 z-10 overflow-hidden">
                <button
                  onClick={() => handleQuickSchedule('now')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group"
                >
                  <span className="font-medium text-slate-700 group-hover:text-primary-700">Right now</span>
                  <span className="text-xs text-slate-500">Start immediately</span>
                </button>
                <button
                  onClick={() => handleQuickSchedule('morning')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group border-t border-slate-100"
                >
                  <span className="font-medium text-slate-700 group-hover:text-primary-700">Tomorrow morning</span>
                  <span className="text-xs text-slate-500">8:00 AM</span>
                </button>
                <button
                  onClick={() => handleQuickSchedule('afternoon')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group border-t border-slate-100"
                >
                  <span className="font-medium text-slate-700 group-hover:text-primary-700">Tomorrow afternoon</span>
                  <span className="text-xs text-slate-500">2:00 PM</span>
                </button>
                <button
                  onClick={() => handleQuickSchedule('evening')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between group border-t border-slate-100"
                >
                  <span className="font-medium text-slate-700 group-hover:text-primary-700">Tomorrow evening</span>
                  <span className="text-xs text-slate-500">6:00 PM</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => onEdit(habit)}
            className="px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
          >
            Edit
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(habit.id)}
            className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
