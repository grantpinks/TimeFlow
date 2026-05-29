/** Preset swatches for per-calendar color coding in the sidebar. */
export const CALENDAR_COLOR_PRESETS = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#14B8A6',
  '#64748B',
] as const;

export function defaultCalendarColor(index: number): string {
  return CALENDAR_COLOR_PRESETS[index % CALENDAR_COLOR_PRESETS.length]!;
}

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidCalendarColor(value: string): boolean {
  return HEX_COLOR.test(value);
}
