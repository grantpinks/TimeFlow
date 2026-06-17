import type { Task } from '@timeflow/shared';

export type CompletedGroupMode = 'date' | 'category' | 'identity';

export const EARLIER_SECTION_PAGE_SIZE = 5;
export const EARLIER_SECTION_LOAD_MORE = 10;

export type TaskListSection = {
  id: string;
  title: string;
  tasks: Task[];
  description?: string;
  defaultCollapsed?: boolean;
  pageSize?: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCompletionTimestamp(task: Task): Date {
  return new Date(task.completedAt ?? task.updatedAt);
}

function groupByDueDate(tasks: Task[], now = new Date()): TaskListSection[] {
  const startOfToday = startOfDay(now);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(startOfToday.getDate() + (6 - startOfToday.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const buckets = {
    overdue: [] as Task[],
    today: [] as Task[],
    thisWeek: [] as Task[],
    later: [] as Task[],
    noDueDate: [] as Task[],
  };

  tasks.forEach((task) => {
    if (!task.dueDate) {
      buckets.noDueDate.push(task);
      return;
    }

    const dueDate = new Date(task.dueDate);
    if (dueDate < startOfToday) {
      buckets.overdue.push(task);
      return;
    }
    if (dueDate >= startOfToday && dueDate <= endOfToday) {
      buckets.today.push(task);
      return;
    }

    if (dueDate <= endOfWeek) {
      buckets.thisWeek.push(task);
      return;
    }

    buckets.later.push(task);
  });

  return [
    { id: 'overdue', title: 'Overdue', tasks: buckets.overdue },
    { id: 'today', title: 'Today', tasks: buckets.today },
    { id: 'this-week', title: 'This Week', tasks: buckets.thisWeek },
    { id: 'later', title: 'Later', tasks: buckets.later },
    { id: 'no-due-date', title: 'No Due Date', tasks: buckets.noDueDate },
  ].filter((section) => section.tasks.length > 0);
}

function groupByScheduledTime(tasks: Task[], now = new Date()): TaskListSection[] {
  const startOfToday = startOfDay(now);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(startOfToday.getDate() + (6 - startOfToday.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const buckets = {
    today: [] as Task[],
    tomorrow: [] as Task[],
    thisWeek: [] as Task[],
    later: [] as Task[],
    unscheduled: [] as Task[],
  };

  tasks.forEach((task) => {
    if (!task.scheduledTask?.startDateTime) {
      buckets.unscheduled.push(task);
      return;
    }

    const scheduledAt = new Date(task.scheduledTask.startDateTime);
    if (scheduledAt >= startOfToday && scheduledAt <= endOfToday) {
      buckets.today.push(task);
      return;
    }

    if (scheduledAt >= startOfTomorrow && scheduledAt <= endOfTomorrow) {
      buckets.tomorrow.push(task);
      return;
    }

    if (scheduledAt <= endOfWeek) {
      buckets.thisWeek.push(task);
      return;
    }

    buckets.later.push(task);
  });

  return [
    { id: 'today', title: 'Today', tasks: buckets.today },
    { id: 'tomorrow', title: 'Tomorrow', tasks: buckets.tomorrow },
    { id: 'this-week', title: 'This Week', tasks: buckets.thisWeek },
    { id: 'later', title: 'Later', tasks: buckets.later },
    { id: 'no-schedule', title: 'No Scheduled Time', tasks: buckets.unscheduled },
  ].filter((section) => section.tasks.length > 0);
}

function groupByCompletionDate(tasks: Task[], now = new Date()): TaskListSection[] {
  const startOfToday = startOfDay(now);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const buckets = {
    today: [] as Task[],
    yesterday: [] as Task[],
    thisWeek: [] as Task[],
    earlier: [] as Task[],
  };

  tasks.forEach((task) => {
    const completedAt = getCompletionTimestamp(task);

    if (isSameDay(completedAt, startOfToday)) {
      buckets.today.push(task);
      return;
    }

    if (isSameDay(completedAt, startOfYesterday)) {
      buckets.yesterday.push(task);
      return;
    }

    if (completedAt >= startOfWeek) {
      buckets.thisWeek.push(task);
      return;
    }

    buckets.earlier.push(task);
  });

  // Sort earlier bucket newest-first
  buckets.earlier.sort(
    (a, b) => getCompletionTimestamp(b).getTime() - getCompletionTimestamp(a).getTime()
  );

  return [
    { id: 'completed-today', title: 'Today', tasks: buckets.today },
    { id: 'completed-yesterday', title: 'Yesterday', tasks: buckets.yesterday },
    { id: 'completed-this-week', title: 'Past 7 Days', tasks: buckets.thisWeek },
    {
      id: 'completed-earlier',
      title: 'Earlier',
      tasks: buckets.earlier,
      defaultCollapsed: buckets.earlier.length > EARLIER_SECTION_PAGE_SIZE,
      pageSize:
        buckets.earlier.length > EARLIER_SECTION_PAGE_SIZE
          ? EARLIER_SECTION_PAGE_SIZE
          : undefined,
    },
  ].filter((section) => section.tasks.length > 0);
}

function groupByCategory(tasks: Task[]): TaskListSection[] {
  const byCategory = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const key = task.category?.id ?? 'uncategorized';
    const existing = byCategory.get(key);
    if (existing) {
      existing.push(task);
    } else {
      byCategory.set(key, [task]);
    }
  });

  const sections = Array.from(byCategory.entries()).map(([id, sectionTasks]) => ({
    id: `category-${id}`,
    title: sectionTasks[0]?.category?.name ?? 'Uncategorized',
    tasks: sectionTasks,
  }));

  sections.sort((a, b) => b.tasks.length - a.tasks.length);
  return sections;
}

function groupByIdentity(tasks: Task[]): TaskListSection[] {
  const byIdentity = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const key = task.identity?.id ?? 'no-identity';
    const existing = byIdentity.get(key);
    if (existing) {
      existing.push(task);
    } else {
      byIdentity.set(key, [task]);
    }
  });

  const sections = Array.from(byIdentity.entries()).map(([id, sectionTasks]) => ({
    id: `identity-${id}`,
    title: sectionTasks[0]?.identity?.name ?? 'No Identity',
    tasks: sectionTasks,
  }));

  sections.sort((a, b) => b.tasks.length - a.tasks.length);
  return sections;
}

export function buildTaskListSections(
  tasks: Task[],
  tab: 'unscheduled' | 'scheduled' | 'completed',
  completedGroupMode: CompletedGroupMode = 'date',
  now = new Date()
): TaskListSection[] {
  if (tab === 'scheduled') {
    return groupByScheduledTime(tasks, now);
  }

  if (tab === 'completed') {
    if (completedGroupMode === 'category') {
      return groupByCategory(tasks);
    }
    if (completedGroupMode === 'identity') {
      return groupByIdentity(tasks);
    }
    return groupByCompletionDate(tasks, now);
  }

  return groupByDueDate(tasks, now);
}
