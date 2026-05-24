'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { UpcomingUnlocksResponse } from '@timeflow/shared';

export function useUpcomingUnlocks(identityId: string | null, sessionReady: boolean) {
  const [data, setData] = useState<UpcomingUnlocksResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!identityId || !sessionReady) { setData(null); return; }
    setLoading(true);
    try {
      const res = await api.getUpcomingUnlocks(identityId);
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
