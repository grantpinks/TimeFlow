'use client';

import { useState, useEffect } from 'react';
import type { Insight } from '@/components/insights/InsightBanner';
import { api } from '@/lib/api';

export function useInsights(surfaceKey: 'today' | 'calendar' | 'inbox', date?: Date) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        let data: { insights: Insight[] };

        switch (surfaceKey) {
          case 'today':
            data = await api.get<{ insights: Insight[] }>('/insights/today');
            break;
          case 'calendar':
            const dateParam = date ? `?date=${date.toISOString()}` : '';
            data = await api.get<{ insights: Insight[] }>(`/insights/calendar${dateParam}`);
            break;
          case 'inbox':
            data = await api.get<{ insights: Insight[] }>('/insights/inbox');
            break;
          default:
            throw new Error(`Unknown surface key: ${surfaceKey}`);
        }

        if (isMounted) {
          setInsights(data.insights || []);
        }
      } catch (err) {
        console.error('[useInsights] Error fetching insights:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch insights');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInsights();

    return () => {
      isMounted = false;
    };
  }, [surfaceKey, date]);

  const handleDismiss = (insightId: string) => {
    setInsights((prev) => prev.filter((insight) => insight.id !== insightId));
  };

  return { insights, loading, error, handleDismiss };
}
