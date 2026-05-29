const MEETINGS_DISMISSED_KEY = 'timeflow.calendar.sidebar.meetingsDismissed';
const CONNECT_BANNER_DISMISSED_KEY = 'timeflow.calendar.connectBanner.dismissed';

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
