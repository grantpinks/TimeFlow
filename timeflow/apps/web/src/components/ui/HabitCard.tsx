'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Habit } from '@timeflow/shared';

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

export function HabitCard({ habit, onEdit, onDelete }: HabitCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const formatFrequency = (habit: Habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') {
      return `Weekly (${habit.daysOfWeek.join(', ')})`;
    }
    return 'Custom schedule';
  };

  return (
    <motion.div
      className={`bg-white rounded-lg border p-4 transition-all duration-200 ${
        habit.isActive
          ? 'border-slate-200 hover:shadow-md hover:border-slate-300'
          : 'border-slate-100 opacity-60'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={habit.isActive && !prefersReducedMotion ? { scale: 1.01 } : {}}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-800">{habit.title}</h3>
          {!habit.isActive && (
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
              Inactive
            </span>
          )}
        </div>
        {habit.description && (
          <p className="text-sm text-slate-600 mb-3">{habit.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
          <span className="bg-slate-100 px-2 py-1 rounded">{formatFrequency(habit)}</span>
          {habit.preferredTimeOfDay && (
            <span className="bg-slate-100 px-2 py-1 rounded capitalize">
              {habit.preferredTimeOfDay}
            </span>
          )}
          <span className="bg-slate-100 px-2 py-1 rounded">{habit.durationMinutes} min</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(habit)}
            className="flex-1 px-3 py-1.5 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            className="flex-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}
