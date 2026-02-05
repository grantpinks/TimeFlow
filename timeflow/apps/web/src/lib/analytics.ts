import posthog from 'posthog-js';

// Initialize PostHog (only in browser)
export function initAnalytics() {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        loaded: () => {
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
  // Habit events (basic)
  | { name: 'habit_created'; properties: { frequency: string; duration_minutes: number } }
  // Habit insights and coach events (privacy-safe - no titles, hashed IDs only)
  | { name: 'page.view.habits'; properties: {} }
  | { name: 'habits.insight.viewed'; properties: { days_filter: 14 | 28 } }
  | { name: 'habit.instance.complete'; properties: { habit_id_hash: string } }
  | { name: 'habit.instance.undo'; properties: { habit_id_hash: string } }
  | { name: 'habit.instance.skip'; properties: { habit_id_hash: string; reason_code: string } }
  | { name: 'habits.recommendation.viewed'; properties: { recommendation_type: string; habit_id_hash: string } }
  | { name: 'habits.recommendation.action_taken'; properties: { recommendation_type: string; action_type: string; habit_id_hash: string } }
  | { name: 'habits.coach.action_taken'; properties: { action_type: 'rescue_block' | 'adjust_window' | 'move_to_best_window' | 'reduce_duration' | 'adjust_duration' | 'snooze_skip' } }
  | { name: 'habits.coach.dismissed'; properties: { suggestion_type: string; habit_id_hash: string } }
  | { name: 'habits.coach.undo'; properties: { action_type: string } }
  | { name: 'habits.streak.milestone_reached'; properties: { streak_length: 7 | 14 | 30 | 100 } }
  | { name: 'habits.reordered'; properties: { from: number; to: number; count: number } }
  // Category events
  | { name: 'category_created'; properties: { category_name: string } }
  | { name: 'category_edited'; properties: { category_id: string } }
  // Settings events
  | { name: 'settings_updated'; properties: { setting_key: string } }
  | { name: 'calendar_connected'; properties: { provider: 'google' } }
  // Billing events
  | { name: 'billing.checkout_started'; properties: { plan: string; billing: 'monthly' | 'yearly' } }
  | { name: 'billing.subscription_canceled'; properties: { plan: string } }
  | { name: 'billing.portal_opened'; properties: {} };

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

/**
 * Privacy-safe habit ID hashing
 * Converts habit ID to a deterministic hash for analytics
 * Ensures we NEVER log habit titles or descriptions
 */
export function hashHabitId(habitId: string): string {
  // Simple hash function for privacy (not cryptographic)
  let hash = 0;
  for (let i = 0; i < habitId.length; i++) {
    const char = habitId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

// Export posthog instance for advanced usage
export { posthog };
