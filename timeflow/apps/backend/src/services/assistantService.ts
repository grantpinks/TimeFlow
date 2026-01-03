import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';
import type {
  ChatMessage,
  AssistantChatResponse,
  SchedulePreview,
  DailyScheduleConfig,
  PlanningState,
  MeetingWorkflowState,
} from '@timeflow/shared';
import { env } from '../config/env.js';
import { getPromptManager } from './promptManager.js';
import { convertToChatMessages } from './conversationService.js';
import * as schedulingLinkService from './schedulingLinkService.js';
import {
  separateFixedAndMovable,
  buildFixedEventsContext,
  buildMovableEventsContext,
} from '../utils/eventClassifier.js';
import {
  validateSchedulePreview,
  applyValidationToPreview,
  hasTimeOverlap,
  isWithinWakeHours,
  type UserPreferences,
} from '../utils/scheduleValidator.js';
import { buildAvailabilitySummary } from '../utils/availability.js';
import { normalizeDateOnlyToEndOfDay } from '../utils/dateUtils.js';
import { DateTime } from 'luxon';

/**
 * Get the PromptManager singleton instance
 * Sprint 13.6: File-based prompt system with multiple modes
 */
const promptManager = getPromptManager();
const MAX_HISTORY_MESSAGES = 8; // Legacy fallback limit
const MAX_HISTORY_TOKENS = 3000; // Task 13.18: Token-based limit for context window
const ALWAYS_KEEP_RECENT = 10; // Task 13.18: Always preserve last 10 messages
const DEBUG_LOGS = env.NODE_ENV !== 'production';

function logDebug(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
}

/**
 * Detect which mascot state to display based on response content
 */
function detectMascotState(response: string, schedulePreview?: SchedulePreview): string {
  // Celebrating: When schedule is successfully created with high confidence
  if (schedulePreview && schedulePreview.blocks.length > 0 && schedulePreview.confidence === 'high') {
    return 'celebrating';
  }

  // Thinking: When analyzing complex schedules or showing reasoning
  const thinkingKeywords = ['let me analyze', 'looking at', 'considering', 'examining', 'checking'];
  if (thinkingKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
    return 'thinking';
  }

  // Guiding: When providing recommendations or actionable next steps
  const guidingKeywords = ['recommend', 'suggest', 'try', 'here\'s how', 'you could', 'consider', 'i\'d suggest'];
  if (guidingKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
    return 'guiding';
  }

  // Default: General conversation or simple answers
  return 'default';
}

/**
 * Detect if user is adjusting a previous plan
 * Fix #6: Visual feedback for plan adjustments
 */
function detectPlanAdjustment(
  userMessage: string,
  conversationHistory?: ChatMessage[]
): boolean {
  if (!conversationHistory || conversationHistory.length === 0) {
    return false;
  }

  // Check if previous assistant message had a schedule preview
  const lastAssistantMessage = conversationHistory
    .slice()
    .reverse()
    .find((msg) => msg.role === 'assistant');

  const hadPreviousSchedule = lastAssistantMessage?.metadata?.schedulePreview !== undefined;

  if (!hadPreviousSchedule) {
    return false;
  }

  // Check for adjustment keywords
  const lower = userMessage.toLowerCase();
  const adjustmentKeywords = [
    'adjust',
    'change',
    'modify',
    'instead',
    'actually',
    'but',
    'rather',
    'different',
    'move it to',
    'change it to',
    'not that',
    'no,',
    'wait,',
  ];

  return adjustmentKeywords.some((kw) => lower.includes(kw));
}

/**
 * Detect if user intent is to reschedule existing tasks.
 */
function detectRescheduleIntent(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const rescheduleKeywords = [
    'reschedule',
    'reschedule my',
    'reschedule tasks',
    'reschedule task',
    'move my task',
    'move my tasks',
    'move task',
    'move tasks',
    'move it to',
    'move this to',
    'shift my',
    'shift this',
    'push back',
    'push it back',
    'change time',
    'change the time',
    'adjust the time',
  ];

  const reschedulePatterns = [
    /\bmove\s+.+\s+to\s+/,
    /\bmove\s+.+\s+at\s+/,
    /\bshift\s+.+\s+to\s+/,
    /\bpush\s+.+\s+to\s+/,
    /\bchange\s+.+\s+to\s+/,
    /\bmove\s+.+\s+tomorrow\b/,
    /\bmove\s+.+\s+today\b/,
  ];

  return (
    rescheduleKeywords.some((kw) => lower.includes(kw)) ||
    reschedulePatterns.some((pattern) => pattern.test(lower))
  );
}

/**
 * Detect if user intent is to get a daily plan summary.
 */
function detectDailyPlanIntent(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const dailyPlanKeywords = [
    'plan my day',
    'daily plan',
    'plan today',
    'plan for today',
    'my plan for today',
    'what should i do today',
    'today plan',
    'plan my day today',
  ];

  return dailyPlanKeywords.some((kw) => lower.includes(kw));
}

function detectPlanningIntent(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const planningKeywords = [
    'plan my day',
    'plan today',
    'help me plan',
    'make a plan',
    'realistic plan',
    'what should i do next',
    'best use of my time',
    'prioritize',
    'prioritise',
    'prioritize my',
    'prioritise my',
    'organize my day',
    'organise my day',
  ];

  return planningKeywords.some((kw) => lower.includes(kw));
}

type PlanningTask = {
  priority?: number | null;
  dueDate?: string | Date | null;
};

type MeetingLinkSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  durationsMinutes: number[];
};

function getPlanningState({
  message,
  tasks,
  previousState,
}: {
  message: string;
  tasks: PlanningTask[];
  previousState?: PlanningState | null;
}): PlanningState {
  const lower = message.toLowerCase();

  const timeHintRegex = /\b(today|tomorrow|this week|next week|morning|afternoon|evening|tonight|weekend|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
  const explicitTimeRegex = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/;
  const hasTimeHint = timeHintRegex.test(lower) || explicitTimeRegex.test(lower);

  const priorityHintKeywords = [
    'priority',
    'prioritize',
    'prioritise',
    'most important',
    'important',
    'urgent',
    'critical',
    'top',
    'focus on',
    'must',
    'deadline',
  ];
  const hasPriorityHint = priorityHintKeywords.some((kw) => lower.includes(kw));

  const missingTime = !hasTimeHint;
  const missingPriority = !hasPriorityHint;
  const missingInfo = missingTime || missingPriority;

  const questionRound = previousState?.questionRound ?? 0;
  const allowSecondRound = questionRound < 2;
  const assumptions: string[] = [];

  if (!missingPriority && !hasPriorityHint) {
    assumptions.push('Assumed task priorities from user intent.');
  }

  return {
    missingInfo,
    missingTime,
    missingPriority,
    questionRound,
    allowSecondRound,
    assumptions,
  };
}

function shouldAskPlanningQuestion(state: PlanningState): boolean {
  if (!state.missingInfo) {
    return false;
  }

  if (state.questionRound === 0) {
    return true;
  }

  return state.questionRound === 1 && state.allowSecondRound;
}

function resolvePlanningMode(
  baseMode: 'conversation' | 'scheduling' | 'availability',
  message: string
): 'conversation' | 'scheduling' | 'availability' | 'planning' {
  if (baseMode === 'conversation' && detectPlanningIntent(message)) {
    return 'planning';
  }
  return baseMode;
}

function getNextPlanningState({
  message,
  tasks,
  previousState,
}: {
  message: string;
  tasks: PlanningTask[];
  previousState?: PlanningState | null;
}): { state: PlanningState; willAsk: boolean } {
  const state = getPlanningState({ message, tasks, previousState });
  const willAsk = shouldAskPlanningQuestion(state);
  const nextRound = willAsk ? state.questionRound + 1 : state.questionRound;

  return {
    state: {
      ...state,
      questionRound: nextRound,
      allowSecondRound: nextRound < 2,
    },
    willAsk,
  };
}

function getLatestPlanningState(history?: ChatMessage[]): PlanningState | null {
  if (!history || history.length === 0) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const state = history[i].metadata?.planningState;
    if (state) {
      return state;
    }
  }

  return null;
}

function formatPlanningStateBlock(state: PlanningState): string {
  return `**Planning State**:\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n`;
}

function buildPlanningClarifyingQuestion(state: PlanningState): string {
  if (state.missingTime && state.missingPriority) {
    return 'What time window should I plan for, and which priority matters most?';
  }
  if (state.missingTime) {
    return 'What time window should I plan for?';
  }
  if (state.missingPriority) {
    return 'Which priority should I focus on first?';
  }
  return 'Want me to draft a plan for today?';
}

function getPlanningQuestionIfNeeded(state: PlanningState): string | null {
  if (!state.missingInfo) {
    return null;
  }
  if (!shouldAskPlanningQuestion(state)) {
    return null;
  }
  return buildPlanningClarifyingQuestion(state);
}

function sanitizePlanningResponse(content: string): string {
  const timePattern = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i;
  const schedulingKeywords = [
    'schedule',
    'scheduling',
    'calendar',
    'time block',
    'time-block',
    'blocks',
    'apply',
    'add to calendar',
  ];
  const stripped = content.replace(/want me to schedule this\?/gi, '');
  const hasTime = timePattern.test(stripped);
  const hasSchedulingLanguage = schedulingKeywords.some((kw) =>
    stripped.toLowerCase().includes(kw)
  );

  if (hasTime || hasSchedulingLanguage) {
    return [
      '## Draft Plan',
      '',
      'Here’s a draft plan with broad focus windows:',
      '',
      '• **Morning**: Start with your top priorities',
      '• **Afternoon**: Tackle remaining tasks and follow-ups',
      '• **Wrap-up**: Review progress and prep for tomorrow',
    ].join('\n');
  }

  return content;
}

function ensurePlanningCta(content: string): string {
  const cta = 'Want me to schedule this?';
  if (content.toLowerCase().includes(cta.toLowerCase())) {
    return content;
  }
  return `${content.trim()}\n\n${cta}`;
}

function detectMeetingIntent(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const meetingKeywords = [
    'schedule a meeting',
    'meeting request',
    'send a meeting',
    'send meeting',
    'meeting link',
    'scheduling link',
    'book time',
    'book a meeting',
    'book a call',
    'set up a meeting',
    'set up a call',
    'create a meeting',
    'create meeting',
  ];

  return meetingKeywords.some((kw) => lower.includes(kw));
}

function parseDurationMinutes(message: string): number | null {
  const lower = message.toLowerCase();
  const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)\b/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }
  const hoursMatch = lower.match(/(\d+)\s*(hour|hours|hr|hrs)\b/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return hours * 60;
  }
  return null;
}

function parseLinkName(message: string): string | null {
  const quoted = message.match(/\"([^\"]+)\"/);
  if (quoted) {
    return quoted[1].trim();
  }

  const called = message.match(/called\s+([a-z0-9\s-]+)/i);
  if (called) {
    return called[1].trim();
  }

  const named = message.match(/named\s+([a-z0-9\s-]+)/i);
  if (named) {
    return named[1].trim();
  }

  const forMatch = message.match(/link\s+for\s+([a-z0-9\s-]+)/i);
  if (forMatch) {
    return forMatch[1].trim();
  }

  return null;
}

function parseRecipientEmail(message: string): string | null {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function selectLinkFromMessage(message: string, links: MeetingLinkSummary[]): MeetingLinkSummary | null {
  const lower = message.toLowerCase();
  for (const link of links) {
    if (lower.includes(link.name.toLowerCase()) || lower.includes(link.slug.toLowerCase())) {
      return link;
    }
  }
  return null;
}

function getMeetingContext({
  message,
  links,
  previousState,
}: {
  message: string;
  links: MeetingLinkSummary[];
  previousState?: MeetingWorkflowState | null;
}) {
  const lower = message.toLowerCase();
  const creationRequested = lower.includes('create') || lower.includes('new link');
  const sendRequested = lower.includes('send') || Boolean(parseRecipientEmail(message));

  const durationMinutes = parseDurationMinutes(message);
  const linkName = parseLinkName(message);
  const recipientEmail = parseRecipientEmail(message);
  const selectedLink = selectLinkFromMessage(message, links);

  const missingLinkSelection = !creationRequested && !selectedLink;
  const missingLinkName = creationRequested && !linkName;
  const missingLinkDuration = creationRequested && !durationMinutes;
  const missingRecipient = sendRequested && !recipientEmail;

  const state: MeetingWorkflowState = {
    missingLinkSelection,
    missingLinkName,
    missingLinkDuration,
    missingRecipient,
    creationRequested,
    sendRequested,
    questionRound: previousState?.questionRound ?? 0,
    assumptions: [],
  };

  return {
    state,
    selectedLink,
    durationMinutes,
    linkName,
    recipientEmail,
  };
}

function getMeetingState({
  message,
  links,
  previousState,
}: {
  message: string;
  links: MeetingLinkSummary[];
  previousState?: MeetingWorkflowState | null;
}): MeetingWorkflowState {
  return getMeetingContext({ message, links, previousState }).state;
}

function buildMeetingClarifyingQuestion(state: MeetingWorkflowState): string {
  if (state.missingLinkSelection) {
    return 'Which scheduling link should I use, or would you like me to create one?';
  }
  if (state.missingLinkName && state.missingLinkDuration) {
    return 'What should I call the link (name), and what duration should it be?';
  }
  if (state.missingLinkName) {
    return 'What should I call the link?';
  }
  if (state.missingLinkDuration) {
    return 'How long should the meeting be?';
  }
  if (state.missingRecipient) {
    return 'Who should I send the meeting request to?';
  }
  return 'Want me to draft the invite?';
}

function shouldAskMeetingQuestion(state: MeetingWorkflowState): boolean {
  if (!state.missingLinkSelection && !state.missingLinkName && !state.missingLinkDuration && !state.missingRecipient) {
    return false;
  }
  return state.questionRound < 2;
}

function getLatestMeetingState(history?: ChatMessage[]): MeetingWorkflowState | null {
  if (!history || history.length === 0) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const state = history[i].metadata?.meetingState;
    if (state) {
      return state;
    }
  }

  return null;
}

function formatMeetingStateBlock(state: MeetingWorkflowState): string {
  return `**Meeting State**:\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n`;
}

function formatDebugError(error: unknown, enabled: boolean): string | null {
  if (!enabled) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Task 13.18: Intelligent conversation memory selection
 *
 * Preserves important context across long conversations by:
 * 1. Estimating token usage to stay within limits
 * 2. Always keeping first message (sets conversation intent/context)
 * 3. Always keeping messages with important metadata (schedules, plans)
 * 4. Always keeping recent messages (last N exchanges)
 * 5. Selectively trimming middle messages
 *
 * @param history - Full conversation history
 * @param maxTokens - Maximum tokens to preserve (default 3000)
 * @returns Intelligently selected subset of conversation history
 */
function selectConversationContext(
  history: ChatMessage[] | undefined,
  maxTokens: number = MAX_HISTORY_TOKENS
): ChatMessage[] {
  if (!history || history.length === 0) {
    return [];
  }

  // Simple token estimator: ~4 chars per token (OpenAI approximation)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  // If history is short, keep it all
  if (history.length <= ALWAYS_KEEP_RECENT) {
    return history;
  }

  // Categorize messages by importance
  interface MessageWithPriority {
    message: ChatMessage;
    index: number;
    priority: 'critical' | 'important' | 'normal';
    tokens: number;
  }

  const categorized: MessageWithPriority[] = history.map((msg, idx) => {
    const tokens = estimateTokens(msg.content);
    let priority: 'critical' | 'important' | 'normal' = 'normal';

    // Critical: First message (sets context), messages with schedules
    if (idx === 0) {
      priority = 'critical';
    } else if (msg.metadata?.schedulePreview) {
      priority = 'critical';
    }
    // Important: Recent messages, messages mentioning constraints/planning
    else if (idx >= history.length - ALWAYS_KEEP_RECENT) {
      priority = 'important';
    } else {
      const lower = msg.content.toLowerCase();
      const importantKeywords = [
        'wake time', 'sleep time', 'bedtime', 'constraint', 'fixed event',
        'cannot move', 'appointment', 'meeting', 'deadline', 'priority',
        'schedule these', 'plan my', 'tasks for'
      ];
      if (importantKeywords.some(kw => lower.includes(kw))) {
        priority = 'important';
      }
    }

    return { message: msg, index: idx, priority, tokens };
  });

  // Start with all critical and important messages
  const selected: MessageWithPriority[] = categorized.filter(
    m => m.priority === 'critical' || m.priority === 'important'
  );

  let totalTokens = selected.reduce((sum, m) => sum + m.tokens, 0);

  // Add normal priority messages from most recent backwards if we have token budget
  const normalMessages = categorized
    .filter(m => m.priority === 'normal')
    .reverse(); // Start from most recent

  for (const msg of normalMessages) {
    if (totalTokens + msg.tokens <= maxTokens) {
      selected.push(msg);
      totalTokens += msg.tokens;
    }
  }

  // Sort back to chronological order and extract messages
  const result = selected
    .sort((a, b) => a.index - b.index)
    .map(m => m.message);

  logDebug('[AssistantService][Task 13.18] Context selection:', {
    originalCount: history.length,
    selectedCount: result.length,
    estimatedTokens: totalTokens,
    maxTokens,
    keptFirst: result.length > 0 && result[0] === history[0],
    keptRecent: result.length >= Math.min(ALWAYS_KEEP_RECENT, history.length),
  });

  return result;
}

/**
 * Detect which AI assistant mode to use based on user intent
 *
 * Sprint 13.6: Separate conversation mode vs action/scheduling mode
 *
 * Modes:
 * - 'conversation': Q&A, information requests, general chat (no scheduling actions)
 * - 'scheduling': Generate schedule blocks, apply tasks to calendar
 * - 'availability': "When am I free?" queries, show time gaps
 *
 * @param userMessage - The user's message/query
 * @param hasUnscheduledTasks - Whether user has tasks awaiting scheduling (diagnostic context)
 * @returns The detected assistant mode
 */
function detectMode(
  userMessage: string,
  hasUnscheduledTasks: boolean
): 'conversation' | 'scheduling' | 'availability' {
  const lower = userMessage.toLowerCase();

  const planningDayPhrases = [
    'plan my day',
    'plan my day today',
    'plan my day tomorrow',
    'plan today',
    'plan for today',
    'plan for tomorrow',
  ];
  if (planningDayPhrases.some((phrase) => lower.includes(phrase))) {
    return 'conversation';
  }

  // Availability mode: "When am I free?" type queries
  // Task 13.9: Enhanced availability question templates
  const availabilityKeywords = [
    'when am i free',
    'when are you free',
    'when am i available',
    'what time',
    'available',
    'free time',
    'open slots',
    'when can i',
    'do i have time',
    'do i have any free',
    'am i free',
    'what does my schedule look like',
    'what does my day look like',
    'what does tomorrow look like',
    'show me my schedule',
    'show me my availability',
    'busiest day',
    'most packed day',
    'next big block',
    'free mornings',
    'free afternoons',
    'free evenings',
  ];
  const isAvailabilityRequest = availabilityKeywords.some((kw) => lower.includes(kw));

  // Scheduling mode: Explicit scheduling requests
  // Fix #3: Expanded keyword list to catch more natural language variations
  const schedulingKeywords = [
    'schedule my',
    'schedule these',
    'schedule them',
    'schedule it',
    'schedule this',
    'schedule tasks',
    'schedule task',
    'schedule everything',
    'plan my tasks',
    'plan these',
    'plan it',
    'block time',
    'time block',
    'time-block',
    'organize',
    'fit in',
    'put on my calendar',
    'add to calendar',
    'add my tasks to my calendar',
    'add tasks to my calendar',
    'add my tasks to the calendar',
    'add tasks to the calendar',
    'add my tasks to calendar',
    'add tasks to calendar',
    'create a schedule',
    'set up a schedule',
    'make a schedule',
    'help me schedule',
    'can we schedule',
    "let's schedule",
    "i'd like to schedule",
    'i would like to schedule',
    'want to schedule',
    'need to schedule',
    'going to schedule',
    'gonna schedule',
    'should schedule',
    'could you schedule',
    'can you schedule',
    'please schedule',
    'schedule for',
    'schedule on',
    'schedule at',
    'schedule during',
    'schedule in',
    'schedule between',
    'schedule from',
    'arrange my',
    'arrange these',
    'set up my tasks',
    'put these on',
    'add these to',
    'reschedule',
    'reschedule my',
    'reschedule tasks',
    'reschedule task',
    'move my task',
    'move my tasks',
    'move task',
    'move tasks',
    'move it to',
    'move this to',
    'shift my',
    'shift this',
    'change time',
  ];

  const isSchedulingRequest = schedulingKeywords.some((kw) => lower.includes(kw));

  if (isAvailabilityRequest && !isSchedulingRequest) {
    return 'availability';
  }

  if (isSchedulingRequest) {
    return 'scheduling';
  }

  // Default: Conversation mode (Q&A, information, general chat)
  void hasUnscheduledTasks;
  return 'conversation';
}

/**
 * Process a user message and generate an AI response
 *
 * Sprint 13.6 & 13.7: Integrated mode detection, event classification, and validation
 */
export async function processMessage(
  userId: string,
  message: string,
  conversationHistory?: ChatMessage[],
  conversationId?: string,
  options?: { debugEnabled?: boolean }
): Promise<AssistantChatResponse> {
  const debugEnabled = options?.debugEnabled ?? env.AI_DEBUG_ERRORS === 'true';
  try {
    // Fetch user to get preferences (needed for mode detection and validation)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch unscheduled tasks count for mode detection
    const unscheduledTasksCount = await prisma.task.count({
      where: {
        userId,
        status: 'unscheduled',
      },
    });

    logDebug(`[AssistantService][Debug] unscheduledTasksCount=${unscheduledTasksCount}`);
    logDebug('[AssistantService][Debug] detectMode input:', {
      hasUnscheduledTasks: unscheduledTasksCount > 0,
    });

    // Detect assistant mode based on user intent
    let mode = detectMode(message, unscheduledTasksCount > 0);

    // Fix #4: History retention - fallback only if history omitted and conversationId provided
    // Task 13.18: Fetch more messages from DB (intelligent selection will trim later)
    let resolvedHistory = conversationHistory;
    let usedHistoryFallback = false;
    if (resolvedHistory === undefined && conversationId) {
      logDebug('[AssistantService][Debug] No history provided, attempting DB fallback...');
      const fallbackConversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50, // Task 13.18: Fetch more messages, let intelligent selection decide what to keep
          },
        },
      });

      if (fallbackConversation?.messages?.length) {
        resolvedHistory = convertToChatMessages(fallbackConversation.messages);
        usedHistoryFallback = true;
        logDebug(
          `[AssistantService][Debug] Loaded ${resolvedHistory.length} messages from conversation ${fallbackConversation.id}`
        );
      }
    }

    logDebug('[AssistantService][Debug] conversationHistory:', {
      count: resolvedHistory?.length || 0,
      fallback: usedHistoryFallback,
    });

    // Fix #6: Detect plan adjustments for better context awareness
    const isPlanAdjustment = detectPlanAdjustment(message, resolvedHistory);
    if (isPlanAdjustment) {
      logDebug('[AssistantService][Debug] Plan adjustment detected');
    }
    const wantsReschedule = detectRescheduleIntent(message);
    const wantsDailyPlan = detectDailyPlanIntent(message);

    if (wantsReschedule && mode !== 'scheduling') {
      logDebug('[AssistantService][Debug] Reschedule intent detected; switching to scheduling mode.');
      mode = 'scheduling';
    }

    if (mode === 'scheduling' && wantsDailyPlan && unscheduledTasksCount === 0) {
      logDebug('[AssistantService][Debug] Daily plan request with no unscheduled tasks; using conversation mode.');
      mode = 'conversation';
    }

    let effectiveMode = resolvePlanningMode(mode, message);
    const previousPlanningState = getLatestPlanningState(resolvedHistory);
    const previousMeetingState = getLatestMeetingState(resolvedHistory);
    if (effectiveMode === 'conversation' && detectMeetingIntent(message)) {
      effectiveMode = 'meetings';
    }

    let meetingLinksOverride: MeetingLinkSummary[] | undefined;
    let meetingContextOverride: ReturnType<typeof getMeetingContext> | undefined;
    if (effectiveMode === 'meetings') {
      meetingLinksOverride = await schedulingLinkService.getSchedulingLinks(user.id);
      meetingContextOverride = getMeetingContext({
        message,
        links: meetingLinksOverride,
        previousState: previousMeetingState,
      });

      if (
        meetingContextOverride.state.creationRequested &&
        !meetingContextOverride.state.missingLinkName &&
        !meetingContextOverride.state.missingLinkDuration
      ) {
        if (!user.defaultCalendarId) {
          return {
            message: {
              id: generateMessageId(),
              role: 'assistant',
              content:
                "I can create a scheduling link once you connect a calendar. Open Settings → Calendar to finish setup.",
              timestamp: new Date().toISOString(),
              metadata: {
                mascotState: 'guiding',
                meetingState: meetingContextOverride.state,
              },
            },
          };
        }

        const createdLink = await schedulingLinkService.createSchedulingLink(user.id, {
          name: meetingContextOverride.linkName || 'Meeting link',
          durationsMinutes: [meetingContextOverride.durationMinutes || user.defaultTaskDurationMinutes],
          calendarProvider: 'google',
          calendarId: user.defaultCalendarId,
        });

        meetingLinksOverride = [createdLink, ...meetingLinksOverride];
        meetingContextOverride = {
          ...getMeetingContext({
            message,
            links: meetingLinksOverride,
            previousState: previousMeetingState,
          }),
          selectedLink: createdLink,
        };
      }
    }

    // Get mode-specific system prompt
    const systemPrompt = promptManager.getPrompt(effectiveMode);

    // Build the context prompt with user data and classified events
    const {
      contextPrompt,
      calendarEvents,
      taskIds,
      habitIds,
      habits: contextHabits,
      planningState,
      planningWillAsk,
      meetingState,
      meetingWillAsk,
      meetingContext,
    } = await buildContextPrompt(
      userId,
      message,
      effectiveMode,
      isPlanAdjustment,
      wantsReschedule,
      wantsDailyPlan,
      previousPlanningState,
      previousMeetingState,
      meetingLinksOverride,
      meetingContextOverride
    );

    const userPrefs: UserPreferences = {
      wakeTime: user.wakeTime,
      sleepTime: user.sleepTime,
      timeZone: user.timeZone,
      dailySchedule: user.dailySchedule as DailyScheduleConfig | null,
      dailyScheduleConstraints: user.dailyScheduleConstraints as DailyScheduleConfig | null,
    };

    if (effectiveMode === 'availability') {
      const availabilitySummary = buildAvailabilitySummary({
        message,
        calendarEvents,
        userPrefs,
      });
      const cleanedResponse = sanitizeAssistantContent(availabilitySummary, effectiveMode, false);
      const mascotState = detectMascotState(cleanedResponse);

      return {
        message: {
          id: generateMessageId(),
          role: 'assistant',
          content: cleanedResponse,
          timestamp: new Date().toISOString(),
          metadata: { mascotState },
        },
      };
    }

    if (effectiveMode === 'planning' && planningState && planningWillAsk) {
      const question = buildPlanningClarifyingQuestion(planningState);
      const cleanedResponse = sanitizeAssistantContent(question, effectiveMode, false);
      const mascotState = detectMascotState(cleanedResponse);

      return {
        message: {
          id: generateMessageId(),
          role: 'assistant',
          content: cleanedResponse,
          timestamp: new Date().toISOString(),
          metadata: {
            mascotState,
            planningState,
          },
        },
      };
    }

    if (effectiveMode === 'meetings' && meetingState && meetingWillAsk) {
      const question = buildMeetingClarifyingQuestion(meetingState);
      const cleanedResponse = sanitizeAssistantContent(question, effectiveMode, false);
      const mascotState = detectMascotState(cleanedResponse);

      return {
        message: {
          id: generateMessageId(),
          role: 'assistant',
          content: cleanedResponse,
          timestamp: new Date().toISOString(),
          metadata: {
            mascotState,
            meetingState,
          },
        },
      };
    }

    // Call the LLM API with mode-specific system prompt
    let llmResponse: string;
    try {
      llmResponse = await callLocalLLM(contextPrompt, resolvedHistory, systemPrompt, effectiveMode);
    } catch (error) {
      console.error('LLM call failed', error);
      const fallbackContent =
        "I couldn't reach the scheduling model just now, so I didn't make changes. Please try again in a moment or refresh the assistant.";
      return {
        message: {
          id: generateMessageId(),
          role: 'assistant',
          content: fallbackContent,
          timestamp: new Date().toISOString(),
          metadata: { mascotState: 'guiding' },
        },
      };
    }

    // Parse the response to extract structured data
    let { naturalLanguage, schedulePreview } = parseResponse(llmResponse);

    if (effectiveMode === 'scheduling' && !schedulePreview && debugEnabled) {
      console.warn('[AssistantService][Debug] Missing structured output in scheduling response.');
    }

    if (effectiveMode === 'scheduling' && !schedulePreview) {
      const retryPrompt = `${contextPrompt}\n\nIMPORTANT: The previous response omitted the required [STRUCTURED_OUTPUT]. Reformat your response to include BOTH the natural language summary and the [STRUCTURED_OUTPUT] JSON. End with the JSON code block and add no text after it.`;
      const retryResponse = await callLocalLLM(retryPrompt, resolvedHistory, systemPrompt, effectiveMode);
      const retryParsed = parseResponse(retryResponse);
      if (retryParsed.schedulePreview) {
        naturalLanguage = retryParsed.naturalLanguage;
        schedulePreview = retryParsed.schedulePreview;
      } else if (debugEnabled) {
        console.warn('[AssistantService][Debug] Retry still missing structured output.');
      }
    }

    if (effectiveMode === 'scheduling' && schedulePreview) {
      schedulePreview = sanitizeSchedulePreview(schedulePreview, taskIds, habitIds);
    }

    // Validate schedule preview if in scheduling mode (Sprint 13.7)
    if (effectiveMode === 'scheduling' && schedulePreview) {
      const validation = validateSchedulePreview(
        schedulePreview,
        calendarEvents,
        userPrefs,
        taskIds
      );

      // Apply validation results to preview (adds errors/warnings, adjusts confidence)
      schedulePreview = applyValidationToPreview(schedulePreview, validation);

      logDebug(
        `[AssistantService][Debug] Validation: ${validation.valid ? 'PASSED' : 'FAILED'} (errors=${validation.errors.length}, warnings=${validation.warnings.length})`
      );

      // Auto-fill missing habit days when possible to reduce friction
      schedulePreview = fillMissingHabitBlocks(
        schedulePreview,
        contextHabits,
        calendarEvents,
        userPrefs
      );

      schedulePreview = applyHabitFrequencyConflicts(
        schedulePreview,
        contextHabits,
        user.timeZone
      );
    }

    // Detect appropriate mascot state
    let cleanedResponse = sanitizeAssistantContent(
      naturalLanguage,
      effectiveMode,
      Boolean(schedulePreview)
    );
    if (effectiveMode === 'planning' && planningState) {
      cleanedResponse = sanitizePlanningResponse(cleanedResponse);
      if (!planningState.missingInfo) {
        cleanedResponse = ensurePlanningCta(cleanedResponse);
      }
    }
    const mascotState = detectMascotState(cleanedResponse, schedulePreview);

    // Create the assistant message
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
        content: cleanedResponse,
      timestamp: new Date().toISOString(),
      metadata: {
        ...(schedulePreview ? { schedulePreview } : {}),
        mascotState,
        ...(planningState ? { planningState } : {}),
        ...(meetingState ? { meetingState } : {}),
      },
    };

    logDebug(`[AssistantService][Debug] Mode: ${effectiveMode}, Mascot: ${mascotState}, Preview: ${schedulePreview ? 'YES' : 'NO'}`);

    return {
      message: assistantMessage,
      suggestions: schedulePreview,
    };
  } catch (error) {
    console.error('Error processing message:', error);

    // Return fallback error message
    // Provide more helpful error messages
    let errorMessage = "I'm having trouble right now. Please try again in a moment.";

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = "The request took too long. This might mean the AI service is busy. Please try again with a simpler question.";
      } else if (error.message.includes('LLM API error') || error.message.includes('fetch')) {
        errorMessage = "I can't connect to the AI service right now. Please check that the local LLM server is running (see LOCAL_LLM_SETUP.md).";
      }
    }

    const debugMessage = formatDebugError(error, debugEnabled);
    const responseMessage = debugMessage ? `${errorMessage}\n\n[debug] ${debugMessage}` : errorMessage;

    return {
      message: {
        id: generateMessageId(),
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date().toISOString(),
        ...(debugMessage ? { metadata: { debugError: debugMessage } } : {}),
      },
    };
  }
}

/**
 * Build a context-rich prompt with user data, tasks, and calendar events
 *
 * Sprint 13.6 & 13.7: Includes event classification and mode-specific context
 *
 * @param userId - User ID
 * @param userMessage - User's message
 * @param mode - Assistant mode (conversation, scheduling, availability)
 * @param isPlanAdjustment - Whether user is adjusting a previous plan (Fix #6)
 * @param includeScheduledTaskIds - Whether scheduled tasks should include IDs for rescheduling
 * @param dailyPlanRequest - Whether the user asked for a daily plan summary
 * @returns Context prompt, calendar events, and task IDs (for validation)
 */
async function buildContextPrompt(
  userId: string,
  userMessage: string,
  mode: 'conversation' | 'scheduling' | 'availability' | 'planning' | 'meetings',
  isPlanAdjustment: boolean = false,
  includeScheduledTaskIds: boolean = false,
  dailyPlanRequest: boolean = false,
  previousPlanningState: PlanningState | null = null,
  previousMeetingState: MeetingWorkflowState | null = null,
  meetingLinksOverride?: MeetingLinkSummary[],
  meetingContextOverride?: ReturnType<typeof getMeetingContext>
): Promise<{
  contextPrompt: string;
  calendarEvents: any[];
  taskIds: string[];
  habitIds: string[];
  planningState?: PlanningState;
  planningWillAsk?: boolean;
  meetingState?: MeetingWorkflowState;
  meetingWillAsk?: boolean;
  meetingContext?: ReturnType<typeof getMeetingContext>;
  habits: {
    id: string;
    title: string;
    frequency: string;
    daysOfWeek: string[];
    durationMinutes: number;
    preferredTimeOfDay: string | null;
  }[];
  skippedHabitIds: Set<string>;
}> {
  // Fetch user with preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch unscheduled tasks
  const unscheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'unscheduled',
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'asc' },
    ],
  });

  // Fetch scheduled tasks (to avoid suggesting changes to them)
  const scheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'scheduled',
    },
    include: {
      scheduledTask: true,
    },
  });

  // Fetch active habits
  const habits = await prisma.habit.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      title: true,
      frequency: true,
      daysOfWeek: true,
      durationMinutes: true,
      preferredTimeOfDay: true,
    },
  });

  const skippedHabitIds = detectSkippedHabits(habits, userMessage);
  const activeHabits = habits.filter((habit) => !skippedHabitIds.has(habit.id));

  // Fetch Google Calendar events for the next 7 days
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let calendarEvents: any[] = [];
  try {
    calendarEvents = await calendarService.getEvents(
      userId,
      user.defaultCalendarId || 'primary',
      now.toISOString(),
      sevenDaysLater.toISOString()
    );
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    // Continue without calendar events
  }

  // Build the prompt
  const currentDateTime = now.toLocaleString('en-US', {
    timeZone: user.timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const shouldIncludeScheduledIds = mode === 'scheduling' && includeScheduledTaskIds;

  const wakeLabel = formatUserTime(user.wakeTime);
  const sleepLabel = formatUserTime(user.sleepTime);
  const dailyScheduleLines = formatDailyScheduleConstraints(
    (user.dailyScheduleConstraints as any) || (user.dailySchedule as any),
    user.wakeTime,
    user.sleepTime
  );

  let prompt = `**User Profile**:
- Timezone: ${user.timeZone}
- Working hours (default): ${wakeLabel} - ${sleepLabel}
- Default task duration: ${user.defaultTaskDurationMinutes} minutes

**Current Date/Time**: ${currentDateTime}

`;

  if (dailyScheduleLines.length > 0) {
    prompt += `**Per-Day Working Hours (Local Time)**:\n`;
    dailyScheduleLines.forEach((line) => {
      prompt += `- ${line}\n`;
    });
    prompt += `\n`;
  }

  if (mode === 'scheduling' || mode === 'availability' || mode === 'planning') {
    // Fix #5: Make wake/sleep constraints extremely prominent and clear
    prompt += `\n**CRITICAL SCHEDULING CONSTRAINTS**\n`;
    prompt += `================================\n`;
    prompt += `User Wake Time: ${wakeLabel} (${user.timeZone})\n`;
    prompt += `User Sleep Time: ${sleepLabel} (${user.timeZone})\n`;
    prompt += `Valid Scheduling Window: ${wakeLabel} - ${sleepLabel}\n`;
    if (dailyScheduleLines.length > 0) {
      prompt += `Per-Day Overrides:\n`;
      dailyScheduleLines.forEach((line) => {
        prompt += `- ${line}\n`;
      });
    }
    prompt += `================================\n`;
    prompt += `RULES:\n`;
    prompt += `- NEVER schedule tasks before ${wakeLabel}\n`;
    prompt += `- NEVER schedule tasks after ${sleepLabel}\n`;
    prompt += `- Tasks must END before ${sleepLabel} (not just start)\n`;
    prompt += `- All scheduled blocks MUST be within ${wakeLabel} - ${sleepLabel}\n\n`;
  }

  // Add unscheduled tasks
  if (unscheduledTasks.length > 0) {
    prompt += `**Unscheduled Tasks** (${unscheduledTasks.length} tasks):\n`;
    unscheduledTasks.forEach((task, index) => {
      const priorityLabel =
        task.priority === 1 ? 'HIGH' : task.priority === 2 ? 'MEDIUM' : 'LOW';
      const effectiveDueDate = task.dueDate
        ? normalizeDateOnlyToEndOfDay(task.dueDate, user.timeZone)
        : null;
      const dueInfo = effectiveDueDate
        ? `due: ${effectiveDueDate.toLocaleString('en-US', {
            timeZone: user.timeZone,
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'no due date';

      const urgent = effectiveDueDate && effectiveDueDate.getTime() < now.getTime() + 24 * 60 * 60 * 1000
        ? ' URGENT'
        : '';

      prompt += `${index + 1}. [${priorityLabel}] ${task.title} (${task.durationMinutes} min, ${dueInfo})${urgent} - ID: ${task.id}\n`;
    });
    prompt += '\n';
  } else {
    prompt += "**Unscheduled Tasks**: None! You're all caught up.\n\n";
    if (mode === 'scheduling') {
      if (habits.length > 0) {
        prompt += "**Scheduling Status**: No unscheduled tasks are available, but the user has active habits listed below. Focus on scheduling those habits using their habitId values and DO NOT invent new tasks.\n\n";
      } else if (includeScheduledTaskIds) {
        prompt += "**Rescheduling Status**: No unscheduled tasks available. Focus on moving tasks listed under \"Already Scheduled Tasks\" only.\n\n";
      } else {
        prompt += "**Scheduling Status**: No unscheduled tasks are available to schedule. If the user asked to schedule, explain that they need to add tasks first.\n\n";
      }
    }
  }

  // Add scheduled tasks
  if (scheduledTasks.length > 0) {
    prompt += `**Already Scheduled Tasks**:\n`;
    scheduledTasks.forEach((task) => {
      if (task.scheduledTask) {
        const start = new Date(task.scheduledTask.startDateTime).toLocaleString('en-US', {
          timeZone: user.timeZone,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const end = new Date(task.scheduledTask.endDateTime).toLocaleString('en-US', {
          timeZone: user.timeZone,
          hour: '2-digit',
          minute: '2-digit',
        });
        const idSuffix = shouldIncludeScheduledIds ? ` - ID: ${task.id}` : '';
        prompt += `- ${start} - ${end}: ${task.title}${idSuffix}\n`;
      }
    });
    prompt += '\n';
    if (shouldIncludeScheduledIds) {
      prompt +=
        '**Rescheduling Guidance**: Only move tasks listed under "Already Scheduled Tasks" when the user explicitly asks to reschedule them.\n\n';
    }
  }

  // Add active habits
  if (activeHabits.length > 0) {
    prompt += `**Active Habits** (${activeHabits.length} habits):\n`;
    activeHabits.forEach((habit, index) => {
      const frequencyText =
        habit.frequency === 'daily' ? 'Daily' :
        habit.frequency === 'weekly' ? `Weekly (${habit.daysOfWeek.join(', ')})` :
        'Custom schedule';

      const timeOfDayText = habit.preferredTimeOfDay
        ? ` - Preferred: ${habit.preferredTimeOfDay}`
        : '';

      prompt += `${index + 1}. ${habit.title} (${habit.durationMinutes} min, ${frequencyText}${timeOfDayText}) - ID: ${habit.id}\n`;

      if (habit.description) {
        prompt += `   Note: ${habit.description}\n`;
      }
    });
    prompt += '\n';
    prompt += `**Habit Scheduling Rules**:\n`;
    prompt += `- Use "habitId" for habit blocks (do NOT put habit IDs in "taskId").\n`;
    prompt += `- Schedule within the next 7 days, honoring frequency/daysOfWeek and preferred time of day when provided.\n`;
    prompt += `- Set start/end using the habit durationMinutes; one block per day for daily habits, and one per listed day for weekly habits.\n`;
    prompt += `- If there are no unscheduled tasks, it is OK to return only habit blocks.\n\n`;
  } else {
    prompt += "**Active Habits**: None set up yet.\n\n";
  }

  if (skippedHabitIds.size > 0) {
    const skipped = habits.filter((h) => skippedHabitIds.has(h.id)).map((h) => h.title).join(', ');
    prompt += `**Skip These Habits (per user request)**: ${skipped}\n\n`;
  }

  // Classify calendar events into fixed vs movable (Sprint 13.7)
  const { fixed: fixedEvents, movable: movableEvents } = separateFixedAndMovable(calendarEvents);

  // Add calendar events based on mode
  if (mode === 'scheduling' || mode === 'availability' || mode === 'planning') {
    // In scheduling/availability modes, distinguish between fixed and movable events
    if (fixedEvents.length > 0 || movableEvents.length > 0) {
      prompt += buildFixedEventsContext(fixedEvents, user.timeZone);
      prompt += '\n';
      prompt += buildMovableEventsContext(movableEvents, user.timeZone);
      prompt += '\n';
    } else {
      prompt += '**Calendar Events**: No events in the next 7 days.\n\n';
    }
  } else {
    // In conversation mode, show all events without classification
    if (calendarEvents.length > 0) {
      prompt += `**Google Calendar Events (Next 7 Days)**:\n`;
      calendarEvents.forEach((event) => {
        const start = new Date(event.start).toLocaleString('en-US', {
          timeZone: user.timeZone,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const end = new Date(event.end).toLocaleString('en-US', {
          timeZone: user.timeZone,
          hour: '2-digit',
          minute: '2-digit',
        });
        prompt += `- ${start} - ${end}: ${event.summary}\n`;
      });
      prompt += '\n';
    }
  }

  // Fix #6: Add plan adjustment context for better acknowledgment
  if (isPlanAdjustment) {
    prompt += `**Important Context**: The user is ADJUSTING or MODIFYING a previous schedule suggestion. Acknowledge their changes and create a NEW schedule based on their adjustments.\n\n`;
  }

  if (dailyPlanRequest) {
    prompt += `**Daily Plan Request**: Provide a concise plan for today based on scheduled tasks and calendar events. Highlight open slots if available.\n\n`;
  }
  if (shouldIncludeScheduledIds) {
    prompt += '**Reschedule Request**: The user is asking to move existing scheduled tasks. Only output blocks for tasks listed under "Already Scheduled Tasks".\n\n';
  }

  let planningState: PlanningState | undefined;
  let planningWillAsk: boolean | undefined;
  if (mode === 'planning') {
    const nextPlanning = getNextPlanningState({
      message: userMessage,
      tasks: unscheduledTasks,
      previousState: previousPlanningState,
    });
    planningState = nextPlanning.state;
    planningWillAsk = nextPlanning.willAsk;
    prompt += formatPlanningStateBlock(planningState);
  }

  let meetingState: MeetingWorkflowState | undefined;
  let meetingWillAsk: boolean | undefined;
  let meetingContext: ReturnType<typeof getMeetingContext> | undefined;
  if (mode === 'meetings') {
    const links = meetingLinksOverride ?? (await schedulingLinkService.getSchedulingLinks(userId));
    meetingContext = meetingContextOverride ?? getMeetingContext({
      message: userMessage,
      links,
      previousState: previousMeetingState,
    });
    const willAsk = shouldAskMeetingQuestion(meetingContext.state);
    meetingState = {
      ...meetingContext.state,
      questionRound: willAsk ? meetingContext.state.questionRound + 1 : meetingContext.state.questionRound,
    };
    meetingWillAsk = willAsk;

    const baseUrl = env.APP_BASE_URL || '';
    if (links.length > 0) {
      prompt += '**Scheduling Links**:\n';
      links.forEach((link) => {
        const durationLabel = link.durationsMinutes?.length
          ? `${link.durationsMinutes.join(', ')} min`
          : 'default duration';
        const bookingUrl = baseUrl ? `${baseUrl}/book/${link.slug}` : `/book/${link.slug}`;
        prompt += `- ${link.name} (${durationLabel})${link.isActive ? '' : ' [INACTIVE]'}: ${bookingUrl}\n`;
      });
      prompt += '\n';
    } else {
      prompt += '**Scheduling Links**: None available.\n\n';
    }

    if (user.meetingStartTime && user.meetingEndTime) {
      prompt += `**Meeting Hours**: ${formatUserTime(user.meetingStartTime)} - ${formatUserTime(user.meetingEndTime)} (${user.timeZone})\n\n`;
    }

    prompt += formatMeetingStateBlock(meetingState);
  }

  // Add user's message
  prompt += `**User's Question**: "${userMessage}"\n\n`;

  if (mode === 'scheduling') {
    prompt += `Based on this information, provide a scheduling response in TWO parts: (1) natural language summary, and (2) [STRUCTURED_OUTPUT] JSON. The JSON is mandatory even if no tasks can be scheduled.\n\n`;
    prompt += `OUTPUT FORMAT (MANDATORY):\n`;
    prompt += `[STRUCTURED_OUTPUT]\n`;
    prompt += `\`\`\`json\n`;
    prompt += `{\n`;
    prompt += `  "blocks": [],\n`;
    prompt += `  "summary": "",\n`;
    prompt += `  "conflicts": [],\n`;
    prompt += `  "confidence": "high"\n`;
    prompt += `}\n`;
    prompt += `\`\`\`\n`;
    prompt += `Do not add any text after the closing backticks.\n`;
  } else if (mode === 'availability') {
    prompt += `Based on this information, provide a clear availability summary and highlight open slots.`;
  } else if (mode === 'planning') {
    prompt += `Based on this information and the Planning State, ask a short clarifying question or draft a plan.`;
  } else if (mode === 'meetings') {
    prompt += `Based on this information and the Meeting State, ask a short clarifying question or draft the next step.`;
  } else {
    prompt += `Based on this information, provide a helpful, conversational response.`;
  }

  // Collect task IDs for validation
  const taskIds = shouldIncludeScheduledIds
    ? [...unscheduledTasks, ...scheduledTasks].map((task) => task.id)
    : unscheduledTasks.map((task) => task.id);
  const habitIds = habits.map((habit) => habit.id);

  return {
    contextPrompt: prompt,
    calendarEvents,
    taskIds,
    habitIds: activeHabits.map((habit) => habit.id),
    planningState,
    planningWillAsk,
    meetingState,
    meetingWillAsk,
    meetingContext,
    habits: activeHabits,
    skippedHabitIds,
  };
}

/**
 * Call local LLM API (OpenAI-compatible endpoint like Ollama)
 * Works with: Ollama, LM Studio, LocalAI, vLLM, etc.
 *
 * Sprint 13.6: Accepts system prompt parameter for mode-specific prompts
 */
async function callLocalLLM(
  contextPrompt: string,
  conversationHistory: ChatMessage[] | undefined,
  systemPrompt: string,
  mode: 'conversation' | 'scheduling' | 'availability' | 'planning' | 'meetings'
): Promise<string> {
  const provider = (env.LLM_PROVIDER || 'local').toLowerCase();
  const isOpenAI = provider === 'openai';
  const endpoint = isOpenAI
    ? env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
    : env.LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions';
  const model = isOpenAI
    ? env.OPENAI_MODEL || env.LLM_MODEL || 'gpt-4o'
    : env.LLM_MODEL || 'llama3.2';

  // Build messages array in OpenAI format
  const messages: Array<{ role: string; content: string }> = [];

  // Add system prompt
  messages.push({
    role: 'system',
    content: systemPrompt,
  });

  // Task 13.18: Add intelligently selected conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    const selectedHistory = selectConversationContext(conversationHistory, MAX_HISTORY_TOKENS);
    selectedHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });
  }

  // Add current context prompt as user message
  messages.push({
    role: 'user',
    content: contextPrompt,
  });

  // Call local LLM API (OpenAI-compatible format) with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  const temperature = mode === 'scheduling' ? 0.2 : mode === 'availability' ? 0.4 : 0.7;
  const parsedMaxTokens = parseInt(env.LLM_MAX_TOKENS || '4000', 10);
  const maxTokens = Number.isNaN(parsedMaxTokens) ? 4000 : parsedMaxTokens;

  logDebug('[AssistantService][Debug] LLM request:', {
    mode,
    provider,
    endpoint,
    model,
    messages: messages.length,
    contextChars: contextPrompt.length,
    temperature,
    maxTokens,
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isOpenAI) {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER is openai.');
      }
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract message content from OpenAI-compatible response
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    const llmResponse = data.choices[0].message.content;
    logDebug(`[AssistantService][Debug] LLM response length: ${llmResponse.length} chars`);

    return llmResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LLM request timed out after 30 seconds');
    }
    throw error;
  }
}

/**
 * Parse the LLM response to extract natural language and structured data
 */
function parseResponse(llmResponse: string): {
  naturalLanguage: string;
  schedulePreview?: SchedulePreview;
} {
  const marker = '[STRUCTURED_OUTPUT]';
  const markerIndex = llmResponse.indexOf(marker);

  const tryParseJson = (raw: string): any | null => {
    try {
      return JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  };

  const extractJsonPayload = (text: string): string | null => {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && fencedMatch[1]) {
      return fencedMatch[1];
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1);
    }
    return null;
  };

  let naturalLanguage = llmResponse.trim();
  let jsonPayload: string | null = null;

  if (markerIndex !== -1) {
    naturalLanguage = llmResponse.substring(0, markerIndex);
    const afterMarker = llmResponse.slice(markerIndex + marker.length);
    jsonPayload = extractJsonPayload(afterMarker);
  } else {
    const fencedMatch = llmResponse.match(/```(?:json)?\s*[\s\S]*?\s*```/i);
    if (fencedMatch && fencedMatch[0]) {
      jsonPayload = extractJsonPayload(fencedMatch[0]);
      naturalLanguage = llmResponse.replace(fencedMatch[0], '').trim();
    } else {
      jsonPayload = extractJsonPayload(llmResponse);
      if (jsonPayload) {
        const firstBrace = llmResponse.indexOf('{');
        if (firstBrace > 0) {
          naturalLanguage = llmResponse.slice(0, firstBrace).trim();
        }
      }
    }
  }

  // Remove trailing separators (---, ***, etc.)
  naturalLanguage = naturalLanguage
    .replace(/[-*=]{3,}\s*$/g, '')
    .replace(/\[STRUCTURED_OUTPUT\]/g, '')
    .trim();

  if (!jsonPayload) {
    logDebug('[AssistantService][Debug] No structured JSON payload found in response.');
    return { naturalLanguage };
  }

  // Parse structured output
  try {
    const structuredData = tryParseJson(jsonPayload);
    if (!structuredData) {
      logDebug('[AssistantService][Debug] Structured output JSON parsing failed.');
      return { naturalLanguage };
    }
    const summary = structuredData.summary || structuredData.reasoning || '';

    const schedulePreview: SchedulePreview = {
      blocks: Array.isArray(structuredData.blocks) ? structuredData.blocks : [],
      summary,
      conflicts: Array.isArray(structuredData.conflicts) ? structuredData.conflicts : [],
      confidence: structuredData.confidence || 'medium',
    };

    return {
      naturalLanguage,
      schedulePreview,
    };
  } catch (error) {
    console.error('Failed to parse structured output:', error);
    // Return without structured data if parsing fails
    return {
      naturalLanguage,
    };
  }
}

function sanitizeSchedulePreview(
  preview: SchedulePreview,
  validTaskIds: string[],
  validHabitIds: string[]
): SchedulePreview {
  const conflicts = [...preview.conflicts];
  const blocks = preview.blocks.reduce<SchedulePreview['blocks']>((acc, block) => {
    const isValidTask = Boolean(block.taskId && validTaskIds.includes(block.taskId));
    const isValidHabit = Boolean(block.habitId && validHabitIds.includes(block.habitId));
    const habitFromTaskId =
      !block.habitId && block.taskId && validHabitIds.includes(block.taskId);

    // Prefer a clean task block when the taskId is valid
    if (isValidTask && !isValidHabit) {
      const cleaned = { ...block };
      delete (cleaned as any).habitId;
      acc.push(cleaned);
      return acc;
    }

    // Normalize to a habit block when habitId is valid (even if taskId was also present)
    if (isValidHabit) {
      const cleaned = { ...block, habitId: block.habitId };
      delete (cleaned as any).taskId;
      acc.push(cleaned);
      return acc;
    }

    // Allow LLMs that incorrectly put the habit ID into taskId
    if (habitFromTaskId) {
      const cleaned = { ...block, habitId: block.taskId };
      delete (cleaned as any).taskId;
      acc.push(cleaned);
      return acc;
    }

    if (block.taskId) {
      conflicts.push(`Dropped block with unknown taskId: ${block.taskId}`);
      return acc;
    }
    if (block.habitId) {
      conflicts.push(`Dropped block with unknown habitId: ${block.habitId}`);
      return acc;
    }
    conflicts.push('Dropped block missing taskId/habitId');
    return acc;
  }, []);

  if (preview.blocks.length > 0 && blocks.length === 0) {
    conflicts.push('No valid blocks remain after sanitization.');
  }

  return {
    ...preview,
    blocks,
    conflicts,
    confidence: conflicts.length > 0 && preview.confidence === 'high' ? 'medium' : preview.confidence,
  };
}

/**
 * Add conflicts when a habit's frequency/days are not fully covered.
 */
function applyHabitFrequencyConflicts(
  preview: SchedulePreview,
  habits: {
    id: string;
    title: string;
    frequency: string;
    daysOfWeek: string[];
    durationMinutes: number;
    preferredTimeOfDay: string | null;
  }[],
  timeZone: string
): SchedulePreview {
  if (!habits || habits.length === 0) {
    return preview;
  }

  const conflicts = [...preview.conflicts];

  // Helper to format a date key in the user's timezone
  const toDateKey = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA', { timeZone });

  // Next 7 days starting today (local to user)
  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() + i);
    dayKeys.push(cursor.toLocaleDateString('en-CA', { timeZone }));
  }

  const weekdayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  habits.forEach((habit) => {
    const blocks = preview.blocks.filter((b) => b.habitId === habit.id);
    const blockDays = new Set(blocks.map((b) => toDateKey(b.start)));

    let expectedDays: string[] = [];
    if (habit.frequency === 'daily') {
      expectedDays = dayKeys;
    } else if (habit.frequency === 'weekly' && habit.daysOfWeek?.length) {
      expectedDays = dayKeys.filter((dateKey) => {
        const day = new Date(dateKey).getDay();
        const abbrev = weekdayMap[day];
        return habit.daysOfWeek.includes(abbrev);
      });
    }

    if (expectedDays.length === 0) {
      return;
    }

    const missing = expectedDays.filter((d) => !blockDays.has(d));
    if (missing.length > 0) {
      const formattedMissing = missing
        .map((d) => new Date(d).toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }))
        .join(', ');
      const freqLabel = habit.frequency === 'daily' ? 'daily' : 'weekly';
      conflicts.push(`Habit "${habit.title}" is missing ${freqLabel} blocks for: ${formattedMissing}`);
    }
  });

  if (conflicts.length === preview.conflicts.length) {
    return preview;
  }

  return {
    ...preview,
    conflicts,
    confidence: preview.confidence === 'high' ? 'medium' : preview.confidence,
  };
}

/**
 * Detect habit IDs the user asked to skip (e.g., "skip guitar practice", "minus read").
 */
function detectSkippedHabits(
  habits: {
    id: string;
    title: string;
  }[],
  userMessage: string
): Set<string> {
  const skipped = new Set<string>();
  if (!habits.length || !userMessage) return skipped;

  const lower = userMessage.toLowerCase();
  const skipKeywords = ['skip', 'minus', 'except', 'without', 'omit', "don't include", 'exclude'];

  habits.forEach((habit) => {
    const titleLower = habit.title.toLowerCase();
    const hasTitle = lower.includes(titleLower);
    const hasSkipKeyword = skipKeywords.some((kw) => lower.includes(kw));
    if (hasTitle && hasSkipKeyword) {
      skipped.add(habit.id);
    }
  });

  return skipped;
}

/**
 * Attempt to auto-fill missing habit days using simple heuristics.
 * - Uses first provided block time or preferredTimeOfDay as base time
 * - Tries to avoid fixed events and overlaps within wake/sleep
 */
function fillMissingHabitBlocks(
  preview: SchedulePreview,
  habits: {
    id: string;
    title: string;
    frequency: string;
    daysOfWeek: string[];
    durationMinutes: number;
    preferredTimeOfDay: string | null;
  }[],
  calendarEvents: any[],
  userPrefs: UserPreferences
): SchedulePreview {
  if (!habits || habits.length === 0) {
    return preview;
  }

  const fixedEvents = separateFixedAndMovable(calendarEvents).fixed;
  const blocks = [...preview.blocks];
  const conflicts = [...preview.conflicts];

  const dateKey = (iso: string) =>
    DateTime.fromISO(iso, { zone: userPrefs.timeZone }).toFormat('yyyy-LL-dd');

  const dayKeys: string[] = [];
  const now = DateTime.now().setZone(userPrefs.timeZone);
  for (let i = 0; i < 7; i += 1) {
    dayKeys.push(now.plus({ days: i }).toFormat('yyyy-LL-dd'));
  }
  const weekdayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const baseTimeForHabit = (
    habitId: string,
    preferredTimeOfDay: string | null,
    durationMinutes: number
  ): { hour: number; minute: number } => {
    const existing = blocks.find((b) => b.habitId === habitId);
    if (existing) {
      const dt = DateTime.fromISO(existing.start, { zone: userPrefs.timeZone });
      return { hour: dt.hour, minute: dt.minute };
    }
    if (preferredTimeOfDay === 'morning') return { hour: 9, minute: 0 };
    if (preferredTimeOfDay === 'afternoon') return { hour: 13, minute: 0 };
    if (preferredTimeOfDay === 'evening') return { hour: 19, minute: 0 };
    const [wakeHour, wakeMinute] = (userPrefs.wakeTime || '08:00').split(':').map(Number);
    return { hour: wakeHour + 1, minute: wakeMinute || 0 };
  };

  const makeBlockISO = (day: string, hour: number, minute: number, duration: number) => {
    const startLocal = DateTime.fromISO(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, {
      zone: userPrefs.timeZone,
    });
    const endLocal = startLocal.plus({ minutes: duration });
    return {
      start: startLocal.toUTC().toISO(),
      end: endLocal.toUTC().toISO(),
    };
  };

  const overlapsBlocks = (start: string, end: string) =>
    blocks.some((b) => hasTimeOverlap(start, end, b.start, b.end));

  habits.forEach((habit) => {
    const habitBlocks = blocks.filter((b) => b.habitId === habit.id);
    const habitDayKeys = new Set(habitBlocks.map((b) => dateKey(b.start)));
    const requiredDays =
      habit.frequency === 'daily'
        ? dayKeys
        : habit.daysOfWeek && habit.daysOfWeek.length
          ? dayKeys.filter((d) => {
              const dow = weekdayMap[DateTime.fromISO(d, { zone: userPrefs.timeZone }).weekday % 7];
              return habit.daysOfWeek.includes(dow);
            })
          : [];

    if (requiredDays.length === 0) return;

    const baseTime = baseTimeForHabit(habit.id, habit.preferredTimeOfDay, habit.durationMinutes);

    requiredDays.forEach((day) => {
      if (habitDayKeys.has(day)) {
        return;
      }

      const candidateSlots: Array<{ start: string; end: string }> = [];
      for (let offset = 0; offset < 4; offset += 1) {
        const hour = baseTime.hour + offset;
        const minute = baseTime.minute;
        const { start, end } = makeBlockISO(day, hour, minute, habit.durationMinutes);
        candidateSlots.push({ start, end });
      }

      const placed = candidateSlots.find((slot) => {
        // Wake/sleep check
        const wakeCheck = isWithinWakeHours(slot.start, slot.end, userPrefs);
        if (!wakeCheck.valid) return false;

        // Fixed event overlap check
        const overlapsFixed = fixedEvents.some((event) =>
          hasTimeOverlap(slot.start, slot.end, event.start, event.end)
        );
        if (overlapsFixed) return false;

        // Other blocks overlap check
        if (overlapsBlocks(slot.start, slot.end)) return false;

        return true;
      });

      if (placed) {
        blocks.push({
          habitId: habit.id,
          start: placed.start,
          end: placed.end,
        } as any);
        habitDayKeys.add(day);
      } else {
        const label = DateTime.fromISO(day, { zone: userPrefs.timeZone }).toFormat('ccc, LLL d');
        conflicts.push(`Habit "${habit.title}" could not be placed on ${label} without conflicts.`);
      }
    });
  });

  return {
    ...preview,
    blocks,
    conflicts,
    confidence: conflicts.length > preview.conflicts.length && preview.confidence === 'high'
      ? 'medium'
      : preview.confidence,
  };
}

/**
 * Strip technical markers and IDs from the user-facing response.
 */
function sanitizeAssistantContent(
  content: string,
  mode: 'conversation' | 'scheduling' | 'availability' | 'planning' | 'meetings',
  hasSchedulePreview: boolean
): string {
  let sanitized = content;

  // Remove structured output marker and anything after it.
  sanitized = sanitized.replace(/\[STRUCTURED_OUTPUT\][\s\S]*$/gi, '');

  // Remove fenced code blocks (JSON or otherwise).
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');

  // Remove inline JSON objects that look like schedule payloads.
  sanitized = sanitized.replace(
    /\{[\s\S]*?"(taskId|habitId|blocks|conflicts|confidence|summary)"[\s\S]*?\}/gi,
    ''
  );

  // Remove internal tags and identifiers.
  sanitized = sanitized
    .replace(/\[TimeFlow\]/gi, '')
    .replace(/\[FIXED:[^\]]*\]/gi, '')
    .replace(/\[MOVABLE:[^\]]*\]/gi, '')
    .replace(/\bID:\s*[A-Za-z0-9_-]+\b/g, '')
    .replace(/\b(task|habit|event)_(?:[A-Za-z0-9_-]+)\b/gi, '');

  // Remove lines that still mention technical fields.
  sanitized = sanitized
    .split('\n')
    .filter((line) => {
      return !/(taskId|habitId|eventId|calendarId|schedulePreview|structured_output|\"blocks\"|\"conflicts\"|\"confidence\"|\"summary\")/i.test(
        line
      );
    })
    .join('\n');

  // Normalize whitespace after removals.
  sanitized = sanitized
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!sanitized) {
    if (mode === 'scheduling' && hasSchedulePreview) {
      return "I've prepared a schedule. Review it below and click Apply to add it to your calendar.";
    }
    if (mode === 'availability') {
      return 'Here are your open slots based on your current calendar.';
    }
    return 'How can I help you?';
  }

  return sanitized;
}

/**
 * Convert "HH:mm" to a 12-hour label (e.g., "08:30" -> "8:30 AM").
 */
function formatUserTime(timeValue: string): string {
  const [hour, minute] = timeValue.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return timeValue;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const minuteLabel = minute.toString().padStart(2, '0');
  return `${hour12}:${minuteLabel} ${period}`;
}

function formatDailyScheduleConstraints(
  dailySchedule: Record<string, { wakeTime?: string; sleepTime?: string }> | null | undefined,
  defaultWake: string,
  defaultSleep: string
): string[] {
  if (!dailySchedule || Object.keys(dailySchedule).length === 0) {
    return [];
  }

  const dayOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  return dayOrder
    .map((day) => {
      const schedule = dailySchedule[day];
      if (!schedule) {
        return null;
      }
      const wakeLabel = formatUserTime(schedule.wakeTime || defaultWake);
      const sleepLabel = formatUserTime(schedule.sleepTime || defaultSleep);
      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3);
      return `${dayLabel}: ${wakeLabel} - ${sleepLabel}`;
    })
    .filter((line): line is string => Boolean(line));
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const __test__ = {
  detectMode,
  detectPlanAdjustment,
  detectRescheduleIntent,
  detectDailyPlanIntent,
  detectPlanningIntent,
  getPlanningState,
  shouldAskPlanningQuestion,
  resolvePlanningMode,
  getNextPlanningState,
  getLatestPlanningState,
  formatPlanningStateBlock,
  buildPlanningClarifyingQuestion,
  getPlanningQuestionIfNeeded,
  sanitizePlanningResponse,
  ensurePlanningCta,
  detectMeetingIntent,
  getMeetingState,
  buildMeetingClarifyingQuestion,
  formatDebugError,
  parseResponse,
  sanitizeSchedulePreview,
  sanitizeAssistantContent,
  applyHabitFrequencyConflicts,
  fillMissingHabitBlocks,
  detectSkippedHabits,
};
