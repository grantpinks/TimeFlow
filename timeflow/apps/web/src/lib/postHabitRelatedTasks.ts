/**
 * Suggest open tasks that share the completed habit’s identity (roadmap 18.32).
 */

import type { Habit, IdentityProgressResponse, Task } from '@timeflow/shared';

export interface PostHabitFollowUp {
  habitTitle: string;
  identityName: string | null;
  identityColor: string | null;
  identityIcon: string | null;
  tasks: Task[];
}

export function buildPostHabitFollowUp(params: {
  habitId: string | undefined;
  habits: Habit[];
  tasks: Task[];
  identityProgress: IdentityProgressResponse | null;
  maxTasks?: number;
}): PostHabitFollowUp | null {
  const { habitId, habits, tasks, identityProgress, maxTasks = 5 } = params;
  if (!habitId) return null;
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return null;
  const identityId = habit.identityId;
  if (!identityId) return null;

  const open = tasks.filter((t) => t.identityId === identityId && t.status !== 'completed');
  if (open.length === 0) return null;

  const sorted = [...open].sort((a, b) => {
    const unA = a.status === 'unscheduled' ? 0 : 1;
    const unB = b.status === 'unscheduled' ? 0 : 1;
    if (unA !== unB) return unA - unB;
    const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (dueA !== dueB) return dueA - dueB;
    return a.priority - b.priority;
  });

  const row = identityProgress?.identities.find((i) => i.identityId === identityId);
  const fromTask = sorted.find((t) => t.identity?.name);

  return {
    habitTitle: habit.title,
    identityName: row?.name ?? fromTask?.identity?.name ?? habit.identity ?? null,
    identityColor: row?.color ?? fromTask?.identity?.color ?? null,
    identityIcon: row?.icon ?? fromTask?.identity?.icon ?? null,
    tasks: sorted.slice(0, maxTasks),
  };
}
