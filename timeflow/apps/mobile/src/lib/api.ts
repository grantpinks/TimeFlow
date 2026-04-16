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
    const error = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      creditsRemaining?: number;
    };
    const msg = error.error || `API error: ${response.status}`;
    const err = new Error(msg) as Error & { code?: string; status?: number; creditsRemaining?: number };
    err.code = error.code;
    err.status = response.status;
    err.creditsRemaining = error.creditsRemaining;
    throw err;
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

// ===== Assistant & schedule preview (parity with web) =====

export interface ScheduledBlock {
  taskId?: string;
  habitId?: string;
  start: string;
  end: string;
  title?: string;
  overflowedDeadline?: boolean;
}

export interface SchedulePreview {
  blocks: ScheduledBlock[];
  summary: string;
  conflicts: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ApplyScheduleBlock =
  | { taskId: string; start: string; end: string }
  | { habitId: string; start: string; end: string; title?: string };

export interface AssistantChatResponse {
  message: ChatMessage;
  suggestions?: SchedulePreview;
  credits?: { used: number; remaining: number };
}

/** Mirrors web `Conversation` — persisted assistant threads. */
export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: { messages: number };
}

export async function createConversation(data: {
  title?: string;
  messages?: ChatMessage[];
}): Promise<Conversation> {
  return request<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addMessagesToConversation(
  id: string,
  messages: ChatMessage[]
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export async function sendChatMessage(
  message: string,
  conversationHistory?: ChatMessage[],
  conversationId?: string
): Promise<AssistantChatResponse> {
  return request<AssistantChatResponse>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationHistory, conversationId }),
  });
}

/**
 * GET /api/assistant/history (requires Bearer — same as all `request()` calls).
 */
export async function getAssistantHistory(
  conversationId?: string | null
): Promise<{ messages: ChatMessage[]; conversationId: string | null }> {
  const q =
    conversationId && conversationId.trim()
      ? `?conversationId=${encodeURIComponent(conversationId.trim())}`
      : '';
  return request(`/assistant/history${q}`);
}

export async function applySchedule(blocks: ApplyScheduleBlock[]): Promise<{
  tasksScheduled: number;
  habitsScheduled: number;
}> {
  return request('/schedule/apply', {
    method: 'POST',
    body: JSON.stringify({ blocks }),
  });
}

export interface Habit {
  id: string;
  title: string;
  durationMinutes?: number;
  description?: string | null;
}

export async function getHabits(): Promise<Habit[]> {
  return request<Habit[]>('/habits');
}

export interface CalendarEvent {
  id?: string;
  summary?: string;
  start: string;
  end: string;
  source?: string;
}

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const q = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return request<CalendarEvent[]>(`/calendar/events${q}`);
}

