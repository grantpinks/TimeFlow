import posthog from 'posthog-js';

// Initialize PostHog (only in browser)
export function initAnalytics() {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics] PostHog loaded');
          }
        },
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] PostHog API key not found. Analytics disabled.');
    }
  }
}

// Type-safe event tracking
export type AnalyticsEvent =
  // Homepage events
  | { name: 'homepage_cta_clicked'; properties: { cta_text: string; location: string } }
  | { name: 'homepage_demo_clicked'; properties: { section: string } }
  | { name: 'homepage_feature_viewed'; properties: { feature_name: string } }
  | { name: 'homepage_pricing_viewed'; properties: {} }
  | { name: 'homepage_navigation_clicked'; properties: { destination: string } }
  // Auth events
  | { name: 'sign_in_initiated'; properties: { provider: 'google' } }
  | { name: 'sign_in_completed'; properties: { provider: 'google' } }
  | { name: 'sign_out'; properties: {} }
  // Task events
  | { name: 'task_created'; properties: { priority: number; has_due_date: boolean; duration_minutes: number } }
  | { name: 'task_edited'; properties: { task_id: string } }
  | { name: 'task_deleted'; properties: { task_id: string } }
  | { name: 'task_completed'; properties: { task_id: string } }
  | { name: 'task_scheduled'; properties: { task_id: string; scheduled_by: 'manual' | 'ai' } }
  | { name: 'task_drag_dropped'; properties: { from_section: string; to_section: string } }
  // AI Assistant events
  | { name: 'ai_assistant_opened'; properties: {} }
  | { name: 'ai_message_sent'; properties: { message_length: number; has_tasks: boolean } }
  | { name: 'ai_suggestion_applied'; properties: { suggestion_type: string } }
  | { name: 'ai_suggestion_rejected'; properties: { suggestion_type: string } }
  | { name: 'ai_quick_action_clicked'; properties: { action: string } }
  // Email events
  | { name: 'email_category_selected'; properties: { category: string; email_count: number } }
  | { name: 'email_opened'; properties: { category: string; importance: string } }
  | { name: 'email_converted_to_task'; properties: { email_id: string } }
  | { name: 'email_focus_mode_toggled'; properties: { enabled: boolean } }
  // Calendar events
  | { name: 'calendar_view_changed'; properties: { view: 'day' | 'week' | 'month' } }
  | { name: 'calendar_event_clicked'; properties: { event_type: string } }
  | { name: 'calendar_synced'; properties: { provider: 'google' } }
  // Navigation events
  | { name: 'command_palette_opened'; properties: { trigger: 'keyboard' | 'click' } }
  | { name: 'command_palette_command_selected'; properties: { command_id: string } }
  | { name: 'page_viewed'; properties: { page: string } }
  // Habit events
  | { name: 'habit_created'; properties: { frequency: string; duration_minutes: number } }
  | { name: 'habit_completed'; properties: { habit_id: string } }
  | { name: 'habit_suggestion_viewed'; properties: {} }
  // Category events
  | { name: 'category_created'; properties: { category_name: string } }
  | { name: 'category_edited'; properties: { category_id: string } }
  // Settings events
  | { name: 'settings_updated'; properties: { setting_key: string } }
  | { name: 'calendar_connected'; properties: { provider: 'google' } };

// Track event
export function track<T extends AnalyticsEvent>(event: T['name'], properties?: T['properties']) {
  if (typeof window === 'undefined') return;

  try {
    posthog.capture(event, properties);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, properties);
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

// Identify user
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    posthog.identify(userId, properties);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] User identified:', userId, properties);
    }
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
}

// Reset user (on logout)
export function resetUser() {
  if (typeof window === 'undefined') return;

  try {
    posthog.reset();

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] User reset');
    }
  } catch (error) {
    console.error('[Analytics] Error resetting user:', error);
  }
}

// Page view tracking
export function trackPageView(pageName: string) {
  track('page_viewed', { page: pageName });
}

// Export posthog instance for advanced usage
export { posthog };
