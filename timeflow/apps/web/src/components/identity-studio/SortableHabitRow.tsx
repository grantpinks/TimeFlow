'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit, Identity, StudioHabitRowStatus } from '@timeflow/shared';
import type { AdherenceDay } from '@/components/habits/HabitAdherenceMiniChart';
import { HabitRow } from './HabitRow';

export interface SortableHabitRowProps {
  habit: Habit;
  rowStatus?: StudioHabitRowStatus | null;
  adherenceSeries?: AdherenceDay[];
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  isDisabled?: boolean;
  variant?: 'default' | 'compact';
  identities?: Identity[];
  onMoveToIdentity?: (habitId: string, identityId: string | null) => void;
}

export function SortableHabitRow({
  habit,
  rowStatus,
  adherenceSeries,
  onEdit,
  onDelete,
  isDisabled = false,
  variant = 'default',
  identities,
  onMoveToIdentity,
}: SortableHabitRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: habit.id,
      disabled: isDisabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-stretch gap-1">
      {!isDisabled && (
        <button
          type="button"
          className="mt-3 shrink-0 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <HabitRow
          habit={habit}
          variant={variant}
          rowStatus={rowStatus}
          adherenceSeries={adherenceSeries}
          onEdit={onEdit}
          onDelete={onDelete}
          identities={identities}
          onMoveToIdentity={onMoveToIdentity}
        />
      </div>
    </div>
  );
}
