'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StudioSummaryResponse } from '@timeflow/shared';
import * as api from '@/lib/api';

export function useStudioSummary(enabled = true) {
  const [summary, setSummary] = useState<StudioSummaryResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const data = await api.getStudioSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studio summary');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rowByHabitId = summary
    ? new Map(summary.rows.map((r) => [r.habitId, r]))
    : null;

  return { summary, loading, error, refresh, rowByHabitId };
}
