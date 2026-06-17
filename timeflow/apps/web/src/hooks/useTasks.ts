/**
 * Tasks Hook
 *
 * React hook for managing task state.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@timeflow/shared';
import * as api from '../lib/api';
import { track } from '../lib/analytics';

export function useTasks(initialStatus?: string, includeArchived = false) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (silent = false): Promise<boolean> => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const data = await api.getTasks(initialStatus, { includeArchived });
      setTasks(data);
      return true;
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      }
      return false;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [initialStatus, includeArchived]);

  const patchTaskLocal = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t))
    );
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: CreateTaskRequest) => {
    const task = await api.createTask(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const updateTask = async (id: string, data: UpdateTaskRequest) => {
    const updated = await api.updateTask(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const completeTask = async (id: string) => {
    const updated = await api.completeTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    const tier = updated.identityEngagement?.milestoneUnlocked;
    if (tier === 25 || tier === 50 || tier === 100) {
      track('identity.milestone_unlocked', { tier });
    }
    if (updated.identityEngagement) {
      track('identity.streak_updated', {
        current_streak: updated.identityEngagement.currentStreak,
      });
    }
    return updated;
  };

  const archiveTask = async (id: string) => {
    const updated = await api.archiveTask(id);
    setTasks((prev) => {
      if (includeArchived) {
        return prev.map((t) => (t.id === id ? updated : t));
      }
      return prev.filter((t) => t.id !== id);
    });
    return updated;
  };

  const unarchiveTask = async (id: string) => {
    const updated = await api.unarchiveTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    patchTaskLocal,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    archiveTask,
    unarchiveTask,
  };
}

