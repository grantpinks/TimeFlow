/**
 * API Client for Mobile
 *
 * Wrapper for making requests to the TimeFlow backend API.
 */

import * as SecureStore from 'expo-secure-store';

// TODO: Update with your backend URL
const API_BASE = 'http://localhost:3001/api';

const TOKEN_KEY = 'timeflow_token';

/**
 * Get auth token from secure storage.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Set auth token in secure storage.
 */
export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Clear auth token.
 */
export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Make an authenticated API request.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ===== Types =====

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  priority: 1 | 2 | 3;
  status: 'unscheduled' | 'scheduled' | 'completed';
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledTask?: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    overflowedDeadline: boolean;
  } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;
}

// ===== User =====

export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/user/me');
}

// ===== Tasks =====

export async function getTasks(status?: string): Promise<Task[]> {
  const query = status ? `?status=${status}` : '';
  return request<Task[]>(`/tasks${query}`);
}

export async function createTask(data: {
  title: string;
  description?: string;
  durationMinutes?: number;
  priority?: 1 | 2 | 3;
  dueDate?: string;
}): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}/complete`, {
    method: 'POST',
  });
}

export async function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

// ===== Scheduling =====

export async function runSchedule(
  taskIds: string[],
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<{ scheduled: number }> {
  return request('/schedule', {
    method: 'POST',
    body: JSON.stringify({ taskIds, dateRangeStart, dateRangeEnd }),
  });
}

