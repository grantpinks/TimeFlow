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
  ChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Habit,
  CreateHabitRequest,
  UpdateHabitRequest,
  HabitSuggestionsResponse,
  EmailInboxResponse,
  FullEmailMessage,
  SendEmailRequest,
  SendEmailResponse,
  EmailCategory,
} from '@timeflow/shared';

/**
 * Email category configuration type (matches backend)
 */
export interface EmailCategoryConfig {
  id: EmailCategory;
  name: string;
  color: string;
  icon: string;
  keywords: string[];
  domains: string[];
  gmailLabels?: string[];
  enabled?: boolean;
  description?: string;
  emoji?: string;
}

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
 * Get refresh token from localStorage.
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('timeflow_refresh_token');
}

/**
 * Set refresh token in localStorage.
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem('timeflow_refresh_token', token);
}

/**
 * Clear auth token.
 */
export function clearAuthToken(): void {
  localStorage.removeItem('timeflow_token');
  localStorage.removeItem('timeflow_refresh_token');
}

/**
 * Make an authenticated API request.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  allowRefresh = true
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type for requests with a body
  if (options.method !== 'GET' && options.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && allowRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(endpoint, options, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = typeof error.error === 'string' ? error.error : `API error: ${response.status}`;
    throw new Error(message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Try to refresh the access token using the stored refresh token.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuthToken();
      return null;
    }

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data.accessToken ?? null;
  } catch (_err) {
    clearAuthToken();
    return null;
  }
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

// ===== Categories =====

/**
 * Get all categories for the current user.
 */
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

/**
 * Create a new category.
 */
export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a category.
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryRequest
): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a category.
 */
export async function deleteCategory(id: string): Promise<void> {
  return request<void>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ===== Habits =====

/**
 * Get all habits for the current user.
 */
export async function getHabits(): Promise<Habit[]> {
  return request<Habit[]>('/habits');
}

/**
 * Create a new habit.
 */
export async function createHabit(data: CreateHabitRequest): Promise<Habit> {
  return request<Habit>('/habits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a habit.
 */
export async function updateHabit(
  id: string,
  data: UpdateHabitRequest
): Promise<Habit> {
  return request<Habit>(`/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a habit.
 */
export async function deleteHabit(id: string): Promise<void> {
  return request<void>(`/habits/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get proposed scheduling suggestions for habits.
 */
export async function getHabitSuggestions(params?: { from?: string; to?: string }): Promise<HabitSuggestionsResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<HabitSuggestionsResponse>(`/habits/suggestions${suffix}`);
}

/**
 * Accept a habit suggestion and create calendar event.
 */
export async function acceptHabitSuggestion(data: { habitId: string; start: string; end: string }): Promise<any> {
  return request('/habits/suggestions/accept', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Reject a habit suggestion.
 */
export async function rejectHabitSuggestion(data: { habitId: string; start: string }): Promise<{ success: boolean }> {
  return request('/habits/suggestions/reject', {
    method: 'POST',
    body: JSON.stringify(data),
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

/**
 * Create habit events in Google Calendar.
 */
export async function createHabitEvents(events: Array<{ habitId: string; title: string; start: string; end: string }>): Promise<{ success: boolean; created: number }> {
  return request<{ success: boolean; created: number }>('/calendar/create-habit-events', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
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

// ===== AI Assistant =====

/**
 * Send a chat message to the AI assistant.
 */
export async function sendChatMessage(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<AssistantChatResponse> {
  const body: AssistantChatRequest = {
    message,
    conversationHistory,
  };

  return request<AssistantChatResponse>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get conversation history (returns empty for MVP).
 */
export async function getChatHistory(): Promise<{ messages: ChatMessage[] }> {
  return request<{ messages: ChatMessage[] }>('/assistant/history');
}

// ===== Email (Gmail) =====

/**
 * Get recent inbox emails (Gmail, read-only).
 */
export async function getInboxEmails(params?: { maxResults?: number; pageToken?: string }): Promise<EmailInboxResponse> {
  const query = new URLSearchParams();
  if (params?.maxResults) query.set('maxResults', String(params.maxResults));
  if (params?.pageToken) query.set('pageToken', params.pageToken);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<EmailInboxResponse>(`/email/inbox${suffix}`);
}

/**
 * Get full email content including body.
 */
export async function getFullEmail(emailId: string): Promise<FullEmailMessage> {
  return request<FullEmailMessage>(`/email/${emailId}`);
}

/**
 * Send a new email or reply to an existing thread.
 */
export async function sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
  return request<SendEmailResponse>('/email/send', {
    method: 'POST',
    body: JSON.stringify(emailData),
  });
}

/**
 * Search emails by query.
 */
export async function searchEmails(query: string, maxResults?: number): Promise<EmailInboxResponse> {
  const params = new URLSearchParams({ q: query });
  if (maxResults) params.set('maxResults', String(maxResults));
  return request<EmailInboxResponse>(`/email/search?${params.toString()}`);
}

/**
 * Mark an email as read or unread.
 */
export async function markEmailAsRead(emailId: string, isRead: boolean): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/email/${emailId}/read`, {
    method: 'POST',
    body: JSON.stringify({ isRead }),
  });
}

/**
 * Archive an email (remove from inbox).
 */
export async function archiveEmail(emailId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/email/${emailId}/archive`, {
    method: 'POST',
  });
}

/**
 * Get email category configurations.
 */
export async function getEmailCategories(): Promise<{ categories: EmailCategoryConfig[] }> {
  return request<{ categories: EmailCategoryConfig[] }>('/email/categories');
}

/**
 * Update an email category configuration.
 */
export async function updateEmailCategory(
  categoryId: string,
  updates: Partial<EmailCategoryConfig>
): Promise<{ category: EmailCategoryConfig }> {
  return request<{ category: EmailCategoryConfig }>(`/email/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ===== Conversations (Saved Chats) =====

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

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  title?: string;
  messages?: ChatMessage[];
}): Promise<Conversation> {
  return request<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>('/conversations');
}

/**
 * Get a specific conversation with all messages
 */
export async function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`);
}

/**
 * Update a conversation (title or pinned status)
 */
export async function updateConversation(
  id: string,
  data: { title?: string; isPinned?: boolean }
): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Add messages to a conversation
 */
export async function addMessagesToConversation(
  id: string,
  messages: ChatMessage[]
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}
