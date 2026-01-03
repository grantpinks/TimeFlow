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
  EmailAccount,
  CalendarEvent,
  Calendar,
  ScheduleRequest,
  ScheduleResponse,
  ApplyScheduleRequest,
  ApplyScheduleResponse,
  ApplyScheduleBlock,
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
  HabitSkipReason,
  HabitCompletionResponse,
  HabitInsightsSummary,
  EmailInboxResponse,
  FullEmailMessage,
  SendEmailRequest,
  SendEmailResponse,
  EmailCategory,
  InboxView,
  SchedulingLink,
  Meeting,
  EmailDraftRequest,
  EmailDraftResponse,
  EmailPreviewRequest,
  EmailPreviewResponse,
  CreateDraftRequest,
  CreateDraftResponse,
  WritingVoiceProfile,
} from '@timeflow/shared';
import { getAiDebugEnabled } from './aiDebug';

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
  gmailSyncEnabled?: boolean;
  gmailLabelName?: string;
  gmailLabelColor?: string;
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

  // Only set Content-Type for requests with a JSON body
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !isFormData) {
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
    const rawText = await response.text().catch(() => '');
    let error: Record<string, unknown> = {};
    try {
      error = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch (_err) {
      error = rawText ? { raw: rawText } : {};
    }
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      error,
      endpoint,
    });
    const message =
      (typeof error.error === 'string' && error.error) ||
      (typeof error.message === 'string' && error.message) ||
      (typeof error.raw === 'string' && error.raw) ||
      `API error: ${response.status}`;
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
 * Get connected email accounts for the current user.
 */
export async function getEmailAccounts(): Promise<EmailAccount[]> {
  const result = await request<{ accounts: EmailAccount[] }>('/user/email-accounts');
  return result.accounts ?? [];
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

/**
 * Mark a scheduled habit instance as complete.
 */
export async function completeHabitInstance(scheduledHabitId: string): Promise<HabitCompletionResponse> {
  return request<HabitCompletionResponse>(`/habits/instances/${scheduledHabitId}/complete`, {
    method: 'POST',
  });
}

/**
 * Undo a completed or skipped habit instance.
 */
export async function undoHabitInstance(scheduledHabitId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/habits/instances/${scheduledHabitId}/undo`, {
    method: 'POST',
  });
}

/**
 * Skip a scheduled habit instance with a reason code.
 */
export async function skipHabitInstance(
  scheduledHabitId: string,
  reasonCode: HabitSkipReason
): Promise<HabitCompletionResponse> {
  return request<HabitCompletionResponse>(`/habits/instances/${scheduledHabitId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reasonCode }),
  });
}

/**
 * Get habit insights for the user.
 */
export async function getHabitInsights(days: 14 | 28 = 14): Promise<HabitInsightsSummary> {
  return request(`/habits/insights?days=${days}`);
}

/**
 * Schedule a rescue block for a habit.
 */
export async function scheduleRescueBlock(habitId: string, windowStart: string): Promise<any> {
  return request(`/habits/${habitId}/rescue-block`, {
    method: 'POST',
    body: JSON.stringify({ windowStart }),
  });
}

/**
 * Adjust habit window (preferred time of day).
 */
export async function adjustHabitWindow(habitId: string, newPreferredTime: string): Promise<Habit> {
  return request<Habit>(`/habits/${habitId}/window`, {
    method: 'PUT',
    body: JSON.stringify({ preferredTimeOfDay: newPreferredTime }),
  });
}

/**
 * Dismiss a coach suggestion.
 */
export async function dismissCoachSuggestion(suggestionId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/habits/coach/dismiss', {
    method: 'POST',
    body: JSON.stringify({ suggestionId }),
  });
}

/**
 * Snooze a coach suggestion.
 */
export async function snoozeCoachSuggestion(suggestionId: string, snoozedUntil: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/habits/coach/snooze', {
    method: 'POST',
    body: JSON.stringify({ suggestionId, snoozedUntil }),
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
 * Apply an AI-generated schedule preview.
 */
export async function applySchedule(blocks: ApplyScheduleBlock[]): Promise<ApplyScheduleResponse> {
  const body: ApplyScheduleRequest = { blocks };
  return request<ApplyScheduleResponse>('/schedule/apply', {
    method: 'POST',
    body: JSON.stringify(body),
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
  conversationHistory?: ChatMessage[],
  conversationId?: string
): Promise<AssistantChatResponse> {
  const body: AssistantChatRequest = {
    message,
    conversationHistory,
    conversationId,
  };

  const headers: Record<string, string> = {};
  if (getAiDebugEnabled()) {
    headers['x-ai-debug'] = 'true';
  }

  return request<AssistantChatResponse>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
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
export async function markEmailAsRead(emailId: string, isRead: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/email/${emailId}/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ isRead }),
  });

  if (!response.ok) {
    const error: any = new Error('Failed to mark as read');
    error.response = { status: response.status, data: await response.json().catch(() => ({})) };
    throw error;
  }
}

/**
 * Archive an email (remove from inbox).
 */
export async function archiveEmail(emailId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/email/${emailId}/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    const error: any = new Error('Failed to archive email');
    error.response = { status: response.status, data: await response.json().catch(() => ({})) };
    throw error;
  }
}

/**
 * Get email category configurations.
 */
export async function getEmailCategories(): Promise<{ categories: EmailCategoryConfig[] }> {
  return request<{ categories: EmailCategoryConfig[] }>('/email/categories');
}

/**
 * Get inbox view configurations.
 */
export async function getInboxViews(): Promise<{ views: InboxView[] }> {
  return request<{ views: InboxView[] }>('/inbox/views');
}

/**
 * Update inbox view configurations.
 */
export async function updateInboxViews(views: InboxView[]): Promise<{ views: InboxView[] }> {
  return request<{ views: InboxView[] }>('/inbox/views', {
    method: 'PUT',
    body: JSON.stringify({ views }),
  });
}

/**
 * Delete a custom inbox view.
 */
export async function deleteInboxView(id: string): Promise<void> {
  return request<void>(`/inbox/views/${id}`, { method: 'DELETE' });
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

// ===== Gmail Sync (Sprint 16 Phase A) =====

export interface GmailSyncStatus {
  lastSyncedAt: string | null;
  lastSyncThreadCount: number;
  lastSyncError: string | null;
  backfillDays: number;
  backfillMaxThreads: number;
  watchEnabled?: boolean;
  watchExpiration?: string | null;
}

export interface GmailSyncResult {
  message: string;
  status?: 'in_progress';
  syncedCategories: number;
  syncedThreads?: number;
  removedCategories?: number;
  errors?: string[];
}

/**
 * Get Gmail sync status for current user.
 */
export async function getGmailSyncStatus(): Promise<GmailSyncStatus> {
  return request<GmailSyncStatus>('/gmail-sync/status');
}

/**
 * Trigger manual Gmail label sync.
 */
export async function triggerGmailSync(): Promise<GmailSyncResult> {
  return request<GmailSyncResult>('/gmail-sync/sync', {
    method: 'POST',
  });
}

/**
 * Remove all TimeFlow labels from Gmail.
 */
export async function removeAllGmailLabels(): Promise<GmailSyncResult> {
  return request<GmailSyncResult>('/gmail-sync/labels', {
    method: 'DELETE',
  });
}

/**
 * Update Gmail sync settings.
 */
export async function updateGmailSyncSettings(settings: {
  backfillDays?: number;
  backfillMaxThreads?: number;
}): Promise<GmailSyncStatus> {
  return request<GmailSyncStatus>('/gmail-sync/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

/**
 * Enable Gmail background sync (Pub/Sub watch).
 */
export async function enableGmailWatch(): Promise<GmailSyncStatus> {
  return request<GmailSyncStatus>('/gmail-sync/watch/enable', {
    method: 'POST',
  });
}

/**
 * Disable Gmail background sync (Pub/Sub watch).
 */
export async function disableGmailWatch(): Promise<GmailSyncStatus> {
  return request<GmailSyncStatus>('/gmail-sync/watch/disable', {
    method: 'POST',
  });
}

/**
 * Update email category with Gmail sync enabled flag.
 */
export async function updateCategoryGmailSync(
  categoryId: string,
  gmailSyncEnabled: boolean
): Promise<{ category: EmailCategoryConfig }> {
  return request<{ category: EmailCategoryConfig }>(`/email/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ gmailSyncEnabled }),
  });
}

/**
 * Email categorization explanation interface.
 */
export interface EmailCategoryExplanation {
  category: string;
  source: 'override' | 'domain' | 'keywords' | 'gmailLabel' | 'default';
  reason: string;
  details: {
    matchedValue?: string;
    overrideType?: 'sender' | 'domain' | 'threadId';
    matchedKeywords?: string[];
    gmailLabel?: string;
  };
}

export interface InboxTaskDraftResponse {
  draft: {
    title: string;
    description: string;
    priority: number;
    dueDate: string | null;
    reason?: string;
  };
  confirmCta: string;
}

export interface InboxLabelDraftResponse {
  draft: {
    categoryId: string;
    reason: string;
  };
  confirmCta: string;
}

export interface InboxLabelExplanationResponse {
  draft: {
    explanation: string;
  };
  confirmCta: string;
}

/**
 * Get explanation for email categorization.
 */
export async function getEmailExplanation(emailId: string): Promise<{ explanation: EmailCategoryExplanation }> {
  return request(`/email/${emailId}/explanation`);
}

export async function draftTaskFromEmailAi(emailId: string): Promise<InboxTaskDraftResponse> {
  return request<InboxTaskDraftResponse>('/email/ai/task-draft', {
    method: 'POST',
    body: JSON.stringify({ emailId }),
  });
}

export async function draftLabelSyncAi(emailId: string): Promise<InboxLabelDraftResponse> {
  return request<InboxLabelDraftResponse>('/email/ai/label-sync', {
    method: 'POST',
    body: JSON.stringify({ emailId }),
  });
}

export async function draftLabelExplanationAi(emailId: string): Promise<InboxLabelExplanationResponse> {
  return request<InboxLabelExplanationResponse>('/email/ai/label-explain', {
    method: 'POST',
    body: JSON.stringify({ emailId }),
  });
}

// ===== AI Email Draft (Sprint 16 Phase B+) =====

/**
 * Generate AI email draft
 */
export async function generateEmailDraft(data: EmailDraftRequest): Promise<EmailDraftResponse> {
  return request<EmailDraftResponse>('/email/draft/ai', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Generate email preview with determinism token
 */
export async function generateEmailPreview(data: EmailPreviewRequest): Promise<EmailPreviewResponse> {
  return request<EmailPreviewResponse>('/email/draft/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create Gmail draft or send email (requires preview confirmation)
 */
export async function createOrSendDraft(data: CreateDraftRequest): Promise<CreateDraftResponse> {
  return request<CreateDraftResponse>('/email/drafts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get writing voice profile
 */
export async function getWritingVoice(): Promise<WritingVoiceProfile> {
  return request<WritingVoiceProfile>('/user/writing-voice');
}

/**
 * Update writing voice profile
 */
export async function updateWritingVoice(data: {
  formality?: number;
  length?: number;
  tone?: number;
  voiceSamples?: string;
}): Promise<{ success: boolean; profile: WritingVoiceProfile }> {
  return request<{ success: boolean; profile: WritingVoiceProfile }>('/user/writing-voice', {
    method: 'PUT',
    body: JSON.stringify(data),
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

// ========================================
// Event Categorization
// ========================================

export interface CategoryTrainingExampleSnapshot {
  eventId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendeeDomains?: string[];
  calendarId?: string;
  provider?: string;
}

export interface UpdateCategoryTrainingRequest {
  description?: string;
  includeKeywords: string[];
  excludeKeywords?: string[];
  exampleEventIds?: string[];
  exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
}

export interface CategoryTrainingProfile {
  description?: string | null;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
}

export interface EventCategorization {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  confidence: number;
  isManual: boolean;
}

/**
 * Get categorizations for multiple events
 */
export async function getEventCategorizations(
  eventIds: string[],
  provider: string = 'google'
): Promise<Record<string, EventCategorization>> {
  return request<Record<string, EventCategorization>>('/events/categorizations', {
    method: 'POST',
    body: JSON.stringify({ eventIds, provider }),
  });
}

export async function getCategoryTraining(categoryId: string): Promise<CategoryTrainingProfile | null> {
  return request<CategoryTrainingProfile | null>(`/categories/${categoryId}/training`);
}

export async function upsertCategoryTraining(
  categoryId: string,
  data: UpdateCategoryTrainingRequest
) {
  return request(`/categories/${categoryId}/training`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Categorize all uncategorized events using AI
 */
export async function categorizeAllEvents(): Promise<{
  categorized: number;
  total: number;
  message: string;
}> {
  return request<{
    categorized: number;
    total: number;
    message: string;
  }>('/events/categorize-all', {
    method: 'POST',
  });
}

/**
 * Update event categorization (manual override)
 */
export async function updateEventCategorization(
  eventId: string,
  categoryId: string,
  provider: string = 'google',
  training?: { useForTraining: boolean; example?: CategoryTrainingExampleSnapshot }
): Promise<void> {
  return request<void>(`/events/${eventId}/categorization?provider=${provider}`, {
    method: 'PUT',
    body: JSON.stringify({
      categoryId,
      train: training?.useForTraining,
      example: training?.example,
    }),
  });
}

/**
 * Get categorization statistics
 */
export async function getCategorizationStats(): Promise<{
  total: number;
  manual: number;
  automatic: number;
  lowConfidence: number;
}> {
  return request<{
    total: number;
    manual: number;
    automatic: number;
    lowConfidence: number;
  }>('/events/categorization-stats');
}

/**
 * Get all scheduling links
 */
export async function getSchedulingLinks(): Promise<SchedulingLink[]> {
  return request<SchedulingLink[]>('/scheduling-links');
}

/**
 * Create a new scheduling link
 */
export async function createSchedulingLink(data: {
  name: string;
  durationsMinutes: number[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  maxBookingHorizonDays?: number;
  dailyCap?: number;
  calendarProvider: 'google' | 'apple';
  calendarId: string;
  googleMeetEnabled?: boolean;
}): Promise<SchedulingLink> {
  return request<SchedulingLink>('/scheduling-links', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a scheduling link
 */
export async function updateSchedulingLink(
  id: string,
  data: Partial<{
    name: string;
    durationsMinutes: number[];
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    maxBookingHorizonDays: number;
    dailyCap: number;
    calendarProvider: 'google' | 'apple';
    calendarId: string;
    googleMeetEnabled: boolean;
  }>
): Promise<SchedulingLink> {
  return request<SchedulingLink>(`/scheduling-links/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Pause a scheduling link
 */
export async function pauseSchedulingLink(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/scheduling-links/${id}/pause`, {
    method: 'POST',
  });
}

/**
 * Resume a scheduling link
 */
export async function resumeSchedulingLink(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/scheduling-links/${id}/resume`, {
    method: 'POST',
  });
}

/**
 * Delete a scheduling link
 */
export async function deleteSchedulingLink(id: string): Promise<void> {
  return request<void>(`/scheduling-links/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get all meetings (host view)
 */
export async function getMeetings(status?: 'scheduled' | 'rescheduled' | 'cancelled'): Promise<Meeting[]> {
  const query = status ? `?status=${status}` : '';
  return request<Meeting[]>(`/meetings${query}`);
}

/**
 * Cancel a meeting (host action)
 */
export async function hostCancelMeeting(meetingId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/meetings/${meetingId}/cancel`, {
    method: 'POST',
  });
}

/**
 * Send meeting link email to recipients
 */
export async function sendMeetingLinkEmail(data: {
  recipients: string[];
  subject: string;
  message: string;
  bookingUrl: string;
}): Promise<{
  success: boolean;
  sentCount: number;
  totalRecipients: number;
  failedRecipients?: string[];
}> {
  return request(`/meetings/send-link-email`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== Public Booking APIs (no auth required) =====

/**
 * Get availability for a public scheduling link
 */
export async function getPublicAvailability(
  slug: string,
  from: string,
  to: string
): Promise<{
  link: { name: string; durationsMinutes: number[] };
  slots: Record<number, Array<{ start: string; end: string }>>;
}> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const response = await fetch(
    `${API_BASE}/api/availability/${slug}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch availability');
  }
  return response.json();
}

/**
 * Book a meeting (public, no auth)
 */
export async function bookPublicMeeting(
  slug: string,
  data: {
    inviteeName: string;
    inviteeEmail: string;
    notes?: string;
    startDateTime: string;
    durationMinutes: number;
  }
): Promise<{
  meeting: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    inviteeName: string;
    inviteeEmail: string;
  };
  rescheduleToken: string;
  cancelToken: string;
}> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const response = await fetch(`${API_BASE}/api/book/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to book meeting');
  }
  return response.json();
}

/**
 * Reschedule a meeting (public, token-based)
 */
export async function reschedulePublicMeeting(
  slug: string,
  token: string,
  data: {
    startDateTime: string;
    durationMinutes: number;
  }
): Promise<{
  meeting: {
    id: string;
    startDateTime: string;
    endDateTime: string;
  };
}> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const response = await fetch(`${API_BASE}/api/book/${slug}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...data }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reschedule meeting');
  }
  return response.json();
}

/**
 * Cancel a meeting (public, token-based)
 */
export async function cancelPublicMeeting(
  slug: string,
  token: string
): Promise<{ success: boolean }> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const response = await fetch(`${API_BASE}/api/book/${slug}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel meeting');
  }
  return response.json();
}

/**
 * Host meeting type for dashboard
 */
export interface HostMeeting {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  notes: string | null;
  googleMeetLink: string | null;
  linkName: string;
  linkSlug: string;
  createdAt: string;
}

/**
 * Get user meetings with filtering (for dashboard)
 */
export async function getUserMeetings(params?: {
  status?: string;
  upcoming?: boolean;
}): Promise<{ meetings: HostMeeting[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.upcoming !== undefined) query.append('upcoming', String(params.upcoming));

  return request<{ meetings: HostMeeting[] }>(
    `/user/meetings?${query.toString()}`
  );
}

/**
 * Email Category Override Types
 */
export interface EmailCategoryOverride {
  id: string;
  userId: string;
  overrideType: 'sender' | 'domain' | 'threadId';
  overrideValue: string;
  categoryName: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all email category overrides for the authenticated user
 */
export async function getEmailOverrides(): Promise<{ overrides: EmailCategoryOverride[] }> {
  return request<{ overrides: EmailCategoryOverride[] }>('/email/overrides');
}

/**
 * Create or update an email category override
 */
export async function createEmailOverride(data: {
  overrideType: 'sender' | 'domain' | 'threadId';
  overrideValue: string;
  categoryName: string;
  reason?: string;
}): Promise<{ override: EmailCategoryOverride }> {
  return request<{ override: EmailCategoryOverride }>('/email/overrides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Delete an email category override
 */
export async function deleteEmailOverride(overrideId: string): Promise<void> {
  return request<void>(`/email/overrides/${overrideId}`, {
    method: 'DELETE',
  });
}
