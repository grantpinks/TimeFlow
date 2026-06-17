import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';

const CONFLICT_FETCH_DEBOUNCE_MS = 500;

export function useScheduleConflicts(enabled = true, refreshToken = 0) {
  const [conflicts, setConflicts] = useState<api.ScheduleConflictsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchConflicts = useCallback(async () => {
    if (!enabled) return;
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);
      const result = await api.getScheduleConflicts(now.toISOString(), end.toISOString());
      if (fetchId === fetchIdRef.current) {
        setConflicts(result);
      }
    } catch {
      if (fetchId === fetchIdRef.current) {
        setConflicts(null);
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      void fetchConflicts();
    }, CONFLICT_FETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchConflicts, refreshToken, enabled]);

  return { conflicts, loading, refetch: fetchConflicts };
}
