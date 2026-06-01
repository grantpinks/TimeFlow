export type QuickActionChip = {
  id: string;
  icon: string;
  label: string;
  prompt: string;
};

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

function resolveTimeOfDay(now: Date, timeZone?: string): TimeOfDay {
  const hour = timeZone
    ? Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone,
        }).format(now)
      )
    : now.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function getAssistantQuickActionPrompts(now: Date = new Date(), timeZone?: string): string[] {
  const period = resolveTimeOfDay(now, timeZone);

  if (period === 'morning') {
    return [
      'What does my day look like?',
      'Set my priorities for today',
      'What habits do I have today?',
      'Schedule my high priority tasks',
      "What's due today?",
      'Walk me through my day',
    ];
  }

  if (period === 'afternoon') {
    return [
      'How am I tracking today?',
      'What should I focus on next?',
      'Schedule my remaining tasks',
      'Do I have time for a 2-hour block this afternoon?',
      'Am I behind on anything?',
      "What's my busiest day this week?",
    ];
  }

  return [
    "Plan tomorrow's schedule",
    "What did I not finish today?",
    'Reschedule what I missed today',
    "What's due tomorrow?",
    'When am I free tomorrow?',
    'Optimize my week',
  ];
}

export function getAssistantQuickActionChips(now: Date = new Date(), timeZone?: string): QuickActionChip[] {
  const period = resolveTimeOfDay(now, timeZone);

  if (period === 'morning') {
    return [
      { id: 'daily-brief', icon: '🌅', label: "What's my day look like?", prompt: 'What does my day look like?' },
      { id: 'priorities', icon: '🎯', label: 'Set priorities', prompt: 'What should I prioritize today?' },
      { id: 'schedule', icon: '📅', label: 'Schedule tasks', prompt: 'Schedule my high priority tasks.' },
      { id: 'habits', icon: '🔁', label: 'Habits today', prompt: 'What habits do I have today?' },
    ];
  }

  if (period === 'afternoon') {
    return [
      { id: 'tracking', icon: '📊', label: 'How am I tracking?', prompt: 'How am I tracking today against my plan?' },
      { id: 'next-focus', icon: '⚡', label: 'What next?', prompt: 'What should I focus on next?' },
      { id: 'remaining', icon: '📅', label: 'Schedule remaining', prompt: 'Schedule my remaining unscheduled tasks.' },
      { id: 'behind', icon: '⚠️', label: 'Am I behind?', prompt: 'Am I behind on anything today?' },
    ];
  }

  return [
    { id: 'plan-tomorrow', icon: '📅', label: 'Plan tomorrow', prompt: "Plan tomorrow's schedule." },
    { id: 'missed', icon: '🔄', label: 'What did I miss?', prompt: "What tasks did I not finish today?" },
    { id: 'due-tomorrow', icon: '🎯', label: 'Due tomorrow', prompt: "What's due tomorrow?" },
    { id: 'week', icon: '📊', label: 'Optimize week', prompt: 'Help me optimize my week.' },
  ];
}
