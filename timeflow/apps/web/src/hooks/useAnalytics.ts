/**
 * Analytics Hooks
 *
 * React hooks for task analytics data used in Flow Analytics Panel
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  GoalTrackingResponse,
  CompletionMetricsResponse,
  TimeInsightsResponse,
  ProductivityTrendsResponse,
  StreakResponse,
  CategoryBreakdownResponse,
} from '@timeflow/shared';
import * as api from '../lib/api';

interface AnalyticsHookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for goal tracking analytics (overdue, due today, upcoming deadlines)
 */
export function useGoalTracking(): AnalyticsHookResult<GoalTrackingResponse> {
  const [data, setData] = useState<GoalTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getGoalTracking();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal tracking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refetch every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for completion metrics (completion rate, completed tasks)
 */
export function useCompletionMetrics(
  range: 'today' | 'week' | 'month' = 'today'
): AnalyticsHookResult<CompletionMetricsResponse> {
  const [data, setData] = useState<CompletionMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCompletionMetrics(range);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch completion metrics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
    // Refetch every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for time insights (scheduled hours, average duration, time by category)
 */
export function useTimeInsights(): AnalyticsHookResult<TimeInsightsResponse> {
  const [data, setData] = useState<TimeInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getTimeInsights();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refetch every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for productivity trends (best time of day, productive days, weekly trend)
 */
export function useProductivityTrends(
  days: number = 7
): AnalyticsHookResult<ProductivityTrendsResponse> {
  const [data, setData] = useState<ProductivityTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProductivityTrends(days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch productivity trends');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
    // Refetch every 5 minutes (less frequent since it's historical data)
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for task completion streak
 */
export function useStreak(): AnalyticsHookResult<StreakResponse> {
  const [data, setData] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getStreak();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch streak');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refetch every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for category breakdown (task distribution by category)
 */
export function useCategoryBreakdown(): AnalyticsHookResult<CategoryBreakdownResponse> {
  const [data, setData] = useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCategoryBreakdown();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch category breakdown');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refetch every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
