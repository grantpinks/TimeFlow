/**
 * Flow Scheduling Banner
 *
 * Context-aware bulk habit scheduling component
 */

'use client';

import { useState, useEffect } from 'react';
import { FlowMascot } from '../FlowMascot';

interface SchedulingContext {
  unscheduledHabitsCount: number;
  nextRelevantDay: string;
  urgentHabits: number;
  calendarDensity: 'light' | 'moderate' | 'busy';
}

export function FlowSchedulingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [context, setContext] = useState<SchedulingContext | null>(null);
  const [loading, setLoading] = useState(true);

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

      {/* Expanded State - Placeholder */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-primary-200">
          <p className="text-slate-600">Expanded state coming soon...</p>
        </div>
      )}
    </div>
  );
}
