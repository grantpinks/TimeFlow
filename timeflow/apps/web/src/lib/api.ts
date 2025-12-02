/**
 * API Client
 *
 * Wrapper for making requests to the TimeFlow backend API.
 */

import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  UserProfile,
  UserPreferencesUpdate,
  CalendarEvent,
  Calendar,
  ScheduleRequest,
  ScheduleResponse,
} from '@timeflow/shared';

const API_BASE = '/api';

/**
 * Get auth token from localStorage.
 * TODO: Replace with proper session management.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('timeflow_token');
}

/**
 * Set auth token in localStorage.
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('timeflow_token', token);
}

/**
 * Clear auth token.
 */
export function clearAuthToken(): void {
  localStorage.removeItem('timeflow_token');
}

/**
 * Make an authenticated API request.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

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

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ===== Auth =====

/**
 * Get the URL to start Google OAuth.
 */
export function getGoogleAuthUrl(): string {
  return `${API_BASE}/auth/google/start`;
}

// ===== User =====

/**
 * Get current user profile.
 */
export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/user/me');
}

/**
 * Update user preferences.
 */
export async function updatePreferences(
  prefs: UserPreferencesUpdate
): Promise<UserProfile> {
  return request<UserProfile>('/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}

// ===== Tasks =====

/**
 * Get all tasks, optionally filtered by status.
 */
export async function getTasks(status?: string): Promise<Task[]> {
  const query = status ? `?status=${status}` : '';
  return request<Task[]>(`/tasks${query}`);
}

/**
 * Create a new task.
 */
export async function createTask(data: CreateTaskRequest): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a task.
 */
export async function updateTask(
  id: string,
  data: UpdateTaskRequest
): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a task.
 */
export async function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Mark a task as complete.
 */
export async function completeTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}/complete`, {
    method: 'POST',
  });
}

// ===== Calendar =====

/**
 * Get calendar events in a date range.
 */
export async function getCalendarEvents(
  from: string,
  to: string
): Promise<CalendarEvent[]> {
  return request<CalendarEvent[]>(
    `/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

/**
 * List user's calendars.
 */
export async function listCalendars(): Promise<Calendar[]> {
  return request<Calendar[]>('/calendar/list');
}

// ===== Scheduling =====

/**
 * Run smart scheduling.
 */
export async function runSchedule(data: ScheduleRequest): Promise<ScheduleResponse> {
  return request<ScheduleResponse>('/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Reschedule a task manually.
 */
export async function rescheduleTask(
  taskId: string,
  startDateTime: string,
  endDateTime: string
): Promise<void> {
  return request<void>(`/schedule/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ startDateTime, endDateTime }),
  });
}

