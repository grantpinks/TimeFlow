'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import type { Habit } from '@timeflow/shared';
import { FlowMascot } from '@/components/FlowMascot';

interface CalendarHabitsPanelProps {
  habits: Habit[];
}

export function CalendarHabitsPanel({ habits }: CalendarHabitsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const activeHabits = habits.filter((h) => h.isActive);

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden flex-shrink-0">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-slate-800">Habits</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {activeHabits.length}
          </span>
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

      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {activeHabits.length === 0 ? (
            <div className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <FlowMascot size="sm" expression="encouraging" />
              </div>
              <p className="text-xs font-medium text-slate-700">No active habits</p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                Create habits to drag them onto the calendar.
              </p>
              <Link
                href="/habits"
                className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
              >
                Go to Habits →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {activeHabits.map((habit) => (
                <DraggableHabitItem key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraggableHabitItem({ habit }: { habit: Habit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `habit-${habit.id}`,
    data: { habit },
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-2 hover:bg-slate-50/50 transition-colors cursor-move relative group"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0 bg-indigo-500" />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate leading-snug">{habit.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-500">{habit.durationMinutes}m</span>
            {habit.identityModel && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded font-medium max-w-[8rem] truncate"
                style={{
                  backgroundColor: `${habit.identityModel.color}22`,
                  color: habit.identityModel.color,
                }}
              >
                {habit.identityModel.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg flex items-center justify-center">
          <p className="text-[11px] text-indigo-700 font-semibold">Drop on calendar</p>
        </div>
      )}
    </div>
  );
}
