const DEFAULT_EVENT_PREFIX = 'TF|';
const TIMEFLOW_EVENT_MARKER = 'TimeFlow Event';

type TimeflowEventKind = 'task' | 'habit';

type TimeflowEventConfig = {
  title: string;
  kind: TimeflowEventKind;
  prefixEnabled?: boolean | null;
  prefix?: string | null;
  description?: string | null;
};

function normalizePrefix(prefix: string | null | undefined): string {
  const trimmed = (prefix ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_EVENT_PREFIX;
}

function stripLegacyMarker(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  let cleaned = trimmed;
  cleaned = cleaned.replace(/^\s*TF\|\s*/i, '');
  cleaned = cleaned.replace(/^\s*\[TimeFlow\s+(?:Habit|Event)\]\s*/i, '');
  cleaned = cleaned.replace(/\[TimeFlow\s+(?:Habit|Event)\]/gi, '');
  cleaned = cleaned.replace(/\[Habit\]/gi, '');
  cleaned = cleaned.replace(/^\s*TimeFlow\s+Habit\s*/i, '');
  cleaned = cleaned.replace(/^\s*TimeFlow\s+Event\s*/i, '');
  return cleaned.trim();
}

function sanitizeTitle(title: string): string {
  return stripLegacyMarker(title);
}

function buildSummary(prefix: string, enabled: boolean, kind: TimeflowEventKind, title: string): string {
  const sanitizedTitle = sanitizeTitle(title) || title.trim();
  const label = kind === 'habit' ? `Habit: ${sanitizedTitle}` : sanitizedTitle;
  if (!enabled) {
    return label;
  }
  const prefixWithSpace = prefix ? `${prefix} ` : '';
  return `${prefixWithSpace}${label}`.trim();
}

function appendMarker(description: string | null | undefined): string {
  const base = (description ?? '').trim();
  if (!base) {
    return TIMEFLOW_EVENT_MARKER;
  }
  if (base.toLowerCase().includes('timeflow')) {
    return base;
  }
  return `${base}\n\n${TIMEFLOW_EVENT_MARKER}`;
}

export function buildTimeflowEventDetails(config: TimeflowEventConfig): {
  summary: string;
  description: string;
} {
  const prefixEnabled = config.prefixEnabled !== false;
  const prefix = prefixEnabled ? normalizePrefix(config.prefix) : '';
  const summary = buildSummary(prefix, prefixEnabled, config.kind, config.title);
  const description = appendMarker(config.description);
  return { summary, description };
}

export function isTimeflowEvent(event: { summary?: string | null; description?: string | null }): boolean {
  const summary = (event.summary ?? '').trim().toLowerCase();
  const description = (event.description ?? '').trim().toLowerCase();

  if (summary.startsWith(DEFAULT_EVENT_PREFIX.toLowerCase())) {
    return true;
  }

  if (summary.startsWith('[timeflow')) {
    return true;
  }

  if (summary.startsWith('[habit]')) {
    return true;
  }

  return description.includes('timeflow');
}

export const __test__ = {
  normalizePrefix,
  buildSummary,
  appendMarker,
  DEFAULT_EVENT_PREFIX,
  TIMEFLOW_EVENT_MARKER,
};
