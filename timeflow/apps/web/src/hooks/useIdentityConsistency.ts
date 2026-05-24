'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { HabitConsistencyResponse } from '@timeflow/shared';

export function useIdentityConsistency(identityId: string | null, sessionReady: boolean) {
  const [data, setData] = useState<HabitConsistencyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!identityId || !sessionReady) { setData(null); return; }
    setLoading(true);
    try {
      const res = await api.getHabitConsistency(identityId, 7);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [identityId, sessionReady]);

  useEffect(() => { void fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
