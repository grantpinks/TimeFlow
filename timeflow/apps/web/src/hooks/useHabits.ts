/**
 * useHabits Hook
 *
 * Manages habit state and provides CRUD operations.
 */

'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { Habit, CreateHabitRequest, UpdateHabitRequest } from '@timeflow/shared';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const data = await api.getHabits();
      setHabits(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const createHabit = async (data: CreateHabitRequest) => {
    const habit = await api.createHabit(data);
    setHabits((prev) => [...prev, habit]);
    return habit;
  };

  const updateHabit = async (id: string, data: UpdateHabitRequest) => {
    const updated = await api.updateHabit(id, data);
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
    return updated;
  };

  const deleteHabit = async (id: string) => {
    await api.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return {
    habits,
    loading,
    error,
    refetch: fetchHabits,
    createHabit,
    updateHabit,
    deleteHabit,
  };
}
