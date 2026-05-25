'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { ScheduledHabitInstance } from '@timeflow/shared';

/** Returns local YYYY-MM-DDT00:00:00 and T23:59:59 for today */
function todayRange(): { from: string; to: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${day}T00:00:00`,
    to: `${y}-${m}-${day}T23:59:59`,
  };
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

export function useTodayHabitSchedule(sessionReady: boolean): UseTodayHabitScheduleResult {
  const [instances, setInstances] = useState<ScheduledHabitInstance[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true);
    try {
      const { from, to } = todayRange();
      const data = await api.getScheduledHabitInstances(from, to);
      setInstances(data);
    } catch {
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [sessionReady]);

  useEffect(() => { void load(); }, [load]);

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
