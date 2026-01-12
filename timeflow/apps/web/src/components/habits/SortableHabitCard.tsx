/**
 * Sortable Habit Card
 *
 * Wraps HabitCard with drag-and-drop functionality using @dnd-kit
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HabitCard } from './HabitCard';
import type { Habit } from '@timeflow/shared';
import { useState } from 'react';

interface SortableHabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onQuickSchedule: (habitId: string, time: Date) => void;
  isDisabled?: boolean;
}

export function SortableHabitCard({
  habit,
  onEdit,
  onDelete,
  onQuickSchedule,
  isDisabled = false,
}: SortableHabitCardProps) {
  const [isInteracting, setIsInteracting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: habit.id,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isInteracting || isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative overflow-visible"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
    >
      {/* Drag handle indicator */}
      {!isDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-slate-100 rounded"
        >
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}
      <div className={!isDisabled ? 'pl-10' : ''}>
        <HabitCard
          habit={habit}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickSchedule={onQuickSchedule}
        />
      </div>
    </div>
  );
}
