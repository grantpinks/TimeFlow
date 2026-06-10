'use client';

import { useEffect, useState } from 'react';
import { getHabitInsights } from '@/lib/api';
import type { PerHabitInsights } from '@timeflow/shared';

export function useHabitInsightsSeries(enabled: boolean): Map<string, PerHabitInsights['adherenceSeries']> {
  const [byHabitId, setByHabitId] = useState<Map<string, PerHabitInsights['adherenceSeries']>>(
    () => new Map()
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void getHabitInsights(28)
      .then((data) => {
        if (cancelled) return;
        setByHabitId(new Map(data.habits.map((h) => [h.habitId, h.adherenceSeries])));
      })
      .catch(() => {
        if (!cancelled) setByHabitId(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return byHabitId;
}
