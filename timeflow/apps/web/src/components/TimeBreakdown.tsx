'use client';

import { useMemo, useState } from 'react';
import type { Task } from '@timeflow/shared';

interface TimeBreakdownProps {
  tasks: Task[];
}

interface CategoryTime {
  name: string;
  color: string;
  minutes: number;
  percentage: number;
}

export function TimeBreakdown({ tasks }: TimeBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const categoryBreakdown = useMemo(() => {
    // Calculate total time per category
    const categoryMap = new Map<string, { name: string; color: string; minutes: number }>();
    let totalMinutes = 0;

    tasks.forEach((task) => {
      if (task.scheduledTask && task.category) {
        const categoryId = task.category.id;
        const existing = categoryMap.get(categoryId);
        const taskMinutes = task.durationMinutes || 0;

        if (existing) {
          existing.minutes += taskMinutes;
        } else {
          categoryMap.set(categoryId, {
            name: task.category.name,
            color: task.category.color,
            minutes: taskMinutes,
          });
        }

        totalMinutes += taskMinutes;
      }
    });

    // Convert to array with percentages
    const breakdown: CategoryTime[] = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalMinutes > 0 ? (cat.minutes / totalMinutes) * 100 : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes); // Sort by most time spent

    return { breakdown, totalMinutes };
  }, [tasks]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const { breakdown, totalMinutes } = categoryBreakdown;

  if (breakdown.length === 0) {
    return null; // Don't show if no scheduled tasks
  }

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden flex-shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-slate-800">Time Breakdown</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{formatTime(totalMinutes)}</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3">
          {/* Horizontal stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-slate-100">
            {breakdown.map((cat, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: cat.color,
                  width: `${cat.percentage}%`,
                }}
                className="transition-all duration-300"
                title={`${cat.name}: ${formatTime(cat.minutes)}`}
              />
            ))}
          </div>

          {/* Category list */}
          <div className="space-y-2">
            {breakdown.map((cat, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-500">{formatTime(cat.minutes)}</span>
                  <span className="text-slate-400 w-10 text-right">{Math.round(cat.percentage)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
