/**
 * Tasks Hook for Mobile
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type { Task } from '../lib/api';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: {
    title: string;
    description?: string;
    durationMinutes?: number;
    priority?: 1 | 2 | 3;
    dueDate?: string;
  }) => {
    const task = await api.createTask(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const completeTask = async (id: string) => {
    const updated = await api.completeTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    createTask,
    completeTask,
    deleteTask,
  };
}

