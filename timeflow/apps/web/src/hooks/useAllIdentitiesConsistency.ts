'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '@/lib/api';
import type { HabitConsistencyEntry } from '@timeflow/shared';

export interface IdentityConsistencySection {
  identityId: string;
  habits: HabitConsistencyEntry[];
}

export function useAllIdentitiesConsistency(
  identityIds: string[],
  sessionReady: boolean
) {
  const [sections, setSections] = useState<IdentityConsistencySection[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!sessionReady || identityIds.length === 0) {
      setSections([]);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        identityIds.map(async (identityId) => {
          try {
            const res = await api.getHabitConsistency(identityId, 7);
            return { identityId, habits: res.habits };
          } catch {
            return { identityId, habits: [] as HabitConsistencyEntry[] };
          }
        })
      );
      setSections(results);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [identityIds, sessionReady]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Must be memoized — bare flatMap returns a new reference every render, which
  // propagates into useTodayHabitSchedule's useCallback deps and triggers 3 API
  // fetches (calendar + scheduled instances + suggestions) on every paint cycle.
  const allHabits = useMemo(
    () => sections.flatMap((s) =>
      s.habits.map((h) => ({ habitId: h.habitId, habitName: h.habitName }))
    ),
    [sections]
  );

  return { sections, loading, allHabits, refresh: fetchAll };
}
