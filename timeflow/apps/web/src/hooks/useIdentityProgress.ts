'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { IdentityProgressResponse } from '@timeflow/shared';

export function useIdentityProgress(
  date?: string,
  /** Wait until useUser has validated the session (avoids racing getMe on stale tokens). */
  sessionReady = false
) {
  const [progress, setProgress] = useState<IdentityProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const fetchProgress = useCallback(async () => {
    if (!sessionReady) {
      setProgress(null);
      setError(null);
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      const data = await api.getIdentityProgress(targetDate);
      setProgress(data);
      setError(null);
      return data;
    } catch (err) {
      setError('Failed to load identity progress');
      return null;
    } finally {
      setLoading(false);
    }
  }, [targetDate, sessionReady]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, error, refresh: fetchProgress };
}
