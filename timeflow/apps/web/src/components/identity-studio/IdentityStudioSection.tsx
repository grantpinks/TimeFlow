'use client';

import { Children, useMemo, type ReactNode, type Ref } from 'react';
import type { Habit, Identity, IdentityEvolutionState } from '@timeflow/shared';
import { IdentityHabitGroup } from '@/components/habits/IdentityHabitGroup';
import type { IdentityStudioSectionExpansion } from './types';

export interface IdentityStudioSectionProps {
  sectionKey: string;
  identity: Identity | null;
  isUnassigned?: boolean;
  habits: Habit[];
  evolution?: IdentityEvolutionState | null;
  expansion: IdentityStudioSectionExpansion;
  previewRowCount?: number;
  onExpandMore: () => void;
  sectionRef?: Ref<HTMLElement>;
  compact?: boolean;
  onAddHabit?: () => void;
  weekProgress?: { completed: number; target: number };
  children: ReactNode;
}

export function IdentityStudioSection({
  sectionKey,
  identity,
  isUnassigned = false,
  habits,
  evolution,
  expansion,
  previewRowCount = 2,
  onExpandMore,
  sectionRef,
  compact = false,
  onAddHabit,
  weekProgress,
  children,
}: IdentityStudioSectionProps) {
  const childArray = useMemo(() => Children.toArray(children), [children]);
  const hiddenCount = Math.max(0, childArray.length - previewRowCount);

  const visibleChildren = useMemo(() => {
    if (expansion === 'full') {
      return childArray;
    }
    return childArray.slice(0, previewRowCount);
  }, [childArray, expansion, previewRowCount]);

  const habitMeta =
    weekProgress && weekProgress.target > 0
      ? `${weekProgress.completed}/${weekProgress.target} this week · ${habits.length} habit${habits.length === 1 ? '' : 's'}`
      : habits.length === 1
        ? '1 habit'
        : `${habits.length} habits`;

  return (
    <article
      ref={sectionRef}
      data-testid="identity-studio-section"
      data-section-key={sectionKey}
      data-expansion={expansion}
      className="scroll-mt-24"
    >
      <IdentityHabitGroup
        identity={identity}
        isUnassigned={isUnassigned}
        habits={habits}
        evolution={evolution}
        compact={compact}
        headerExtra={
          <span className="text-xs text-slate-500 shrink-0">{habitMeta}</span>
        }
      >
        {habits.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
            <p className="text-sm text-slate-700">
              {isUnassigned
                ? 'Habits without an identity appear here. Link them to earn progress on Today.'
                : identity
                  ? `No habits for ${identity.name} yet — add one to build this identity.`
                  : 'No habits in this group yet.'}
            </p>
            {onAddHabit && (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-primary-600 hover:underline"
                onClick={onAddHabit}
              >
                {isUnassigned ? '+ Add habit' : `+ Add habit to ${identity?.name}`}
              </button>
            )}
          </div>
        ) : (
          visibleChildren
        )}
        {habits.length > 0 && expansion === 'collapsed-preview' && hiddenCount > 0 && (
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-slate-200 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50/50 transition-colors"
            onClick={onExpandMore}
            data-testid="identity-studio-section-expand-more"
          >
            +{hiddenCount} more
          </button>
        )}
        {habits.length > 0 && expansion === 'full' && onAddHabit && !isUnassigned && identity && (
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={onAddHabit}
          >
            + Add habit to {identity.name}
          </button>
        )}
      </IdentityHabitGroup>
    </article>
  );
}
