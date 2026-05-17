'use client';

/**
 * Shared evolution read for Today / Habits: always fetch when authenticated so UI can stay
 * visible in active (live states), preview (403 / empty success), or degraded (retry).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IdentityEvolutionState } from '@timeflow/shared';
import * as api from '@/lib/api';
import { ApiRequestError, hasStoredAuthSession } from '@/lib/api';

export type EvolutionSurfaceMode = 'active' | 'preview' | 'degraded';

export interface UseEvolutionSurfaceResult {
  mode: EvolutionSurfaceMode;
  states: IdentityEvolutionState[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useEvolutionSurface(isAuthenticated: boolean): UseEvolutionSurfaceResult {
  const [states, setStates] = useState<IdentityEvolutionState[]>([]);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const fetchStates = useCallback(async () => {
    if (!isAuthenticated || !hasStoredAuthSession()) {
      setStates([]);
      setLoadStatus('idle');
      return;
    }
    setLoadStatus('loading');
    try {
      const data = await api.getEvolutionState();
      setStates(Array.isArray(data) ? data : []);
      setLoadStatus('ok');
    } catch (e) {
      // 403 = evolution feature off for account → preview UI (not a login failure).
      if (e instanceof ApiRequestError && e.status === 403) {
        setStates([]);
        setLoadStatus('ok');
      } else {
        setStates([]);
        setLoadStatus('error');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchStates();
  }, [fetchStates]);

  const mode = useMemo((): EvolutionSurfaceMode => {
    if (!isAuthenticated) return 'preview';
    if (loadStatus === 'error') return 'degraded';
    if (loadStatus === 'loading' || loadStatus === 'idle') return 'preview';
    return states.length > 0 ? 'active' : 'preview';
  }, [isAuthenticated, loadStatus, states.length]);

  const loading = loadStatus === 'loading';

  return {
    mode,
    states,
    loading,
    refresh: fetchStates,
  };
}
