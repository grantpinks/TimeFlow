const STORAGE_KEY = 'timeflow_ai_debug';

export function getAiDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setAiDebugEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export function canShowAiDebugToggle(): boolean {
  return process.env.NEXT_PUBLIC_AI_DEBUG_ENABLED === 'true';
}
