'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '@/lib/api';
import type { ScheduledHabitInstance } from '@timeflow/shared';
import { mergeTodayHabitPlans, todayLocalRangeISO } from '@/lib/todayHabitPlan';
import { filterEventsForDisplay, buildTimeflowEventIds } from '@/app/calendar/calendarEventFilters';

export interface HabitPlanMeta {
  habitId: string;
  habitName: string;
}

export interface UseTodayHabitScheduleOptions {
  /** Habits in the current identity tab — used to match calendar titles */
  habits?: HabitPlanMeta[];
  /** When true, avoid showing plans until identity habits are loaded */
  habitsLoading?: boolean;
  prefixEnabled?: boolean;
  prefix?: string | null;
}

export interface UseTodayHabitScheduleResult {
  instances: ScheduledHabitInstance[];
  loading: boolean;
  scheduleHabit: (
    habitId: string,
    title: string,
    startISO: string,
    durationMinutes: number
  ) => Promise<void>;
  refresh: () => void;
}

export function useTodayHabitSchedule(
  sessionReady: boolean,
  options: UseTodayHabitScheduleOptions = {}
): UseTodayHabitScheduleResult {
  const { habits = [], habitsLoading = false, prefixEnabled = true, prefix = null } = options;
  const [instances, setInstances] = useState<ScheduledHabitInstance[]>([]);
  const [loading, setLoading] = useState(false);

  const habitIds = useMemo(() => new Set(habits.map((h) => h.habitId)), [habits]);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true);
    try {
      const { from, to } = todayLocalRangeISO();
      const [committed, calendarEvents, suggestionsRes] = await Promise.all([
        api.getScheduledHabitInstances(from, to),
        api.getCalendarEvents(from, to),
        api.getHabitSuggestions({ from, to }).catch(() => ({ suggestions: [] })),
      ]);

      const filteredCalendar = filterEventsForDisplay(
        calendarEvents,
        buildTimeflowEventIds([], calendarEvents, []),
        { prefixEnabled, prefix, scheduledHabitInstances: [] }
      );

      const merged = mergeTodayHabitPlans(
        committed,
        filteredCalendar,
        suggestionsRes.suggestions,
        habits,
        { prefixEnabled, prefix }
      );

      const scoped = habitsLoading
        ? []
        : habits.length > 0
          ? merged.filter((row) => habitIds.has(row.habitId))
          : merged;

      setInstances(scoped);
    } catch {
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [sessionReady, habits, habitsLoading, prefixEnabled, prefix, habitIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleHabit = useCallback(
    async (habitId: string, title: string, startISO: string, durationMinutes: number) => {
      const start = new Date(startISO);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      await api.createHabitEvents([
        {
          habitId,
          title,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      ]);
      await load();
    },
    [load]
  );

  return { instances, loading, scheduleHabit, refresh: load };
}
