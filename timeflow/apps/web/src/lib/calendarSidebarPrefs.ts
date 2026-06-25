const MEETINGS_DISMISSED_KEY = 'timeflow.calendar.sidebar.meetingsDismissed';
const CONNECT_BANNER_DISMISSED_KEY = 'timeflow.calendar.connectBanner.dismissed';
const HABIT_RECOMMENDATIONS_KEY = 'timeflow.calendar.habitRecommendations.enabled';

export function isMeetingsSectionDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MEETINGS_DISMISSED_KEY) === '1';
}

export function setMeetingsSectionDismissed(dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  if (dismissed) {
    window.localStorage.setItem(MEETINGS_DISMISSED_KEY, '1');
  } else {
    window.localStorage.removeItem(MEETINGS_DISMISSED_KEY);
  }
}

export function isConnectBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONNECT_BANNER_DISMISSED_KEY) === '1';
}

export function setConnectBannerDismissed(dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  if (dismissed) {
    window.localStorage.setItem(CONNECT_BANNER_DISMISSED_KEY, '1');
  } else {
    window.localStorage.removeItem(CONNECT_BANNER_DISMISSED_KEY);
  }
}

export function areHabitRecommendationsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(HABIT_RECOMMENDATIONS_KEY) !== '0';
}

export function setHabitRecommendationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.removeItem(HABIT_RECOMMENDATIONS_KEY);
  } else {
    window.localStorage.setItem(HABIT_RECOMMENDATIONS_KEY, '0');
  }
}
