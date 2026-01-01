import { describe, expect, it } from 'vitest';
import { __test__ } from '../assistantService';
import type { ChatMessage, SchedulePreview } from '@timeflow/shared';

const {
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
  parseResponse,
  sanitizeSchedulePreview,
  sanitizeAssistantContent,
  applyHabitFrequencyConflicts,
  fillMissingHabitBlocks,
  detectSkippedHabits,
} = __test__;

describe('assistantService helpers', () => {
  describe('detectMode', () => {
    it('detects availability requests', () => {
      const mode = detectMode('When am I free this week?', false);
      expect(mode).toBe('availability');
    });

    it('detects scheduling requests', () => {
      const mode = detectMode('Schedule my tasks for tomorrow.', false);
      expect(mode).toBe('scheduling');
    });

    it('prefers scheduling when both availability and scheduling cues exist', () => {
      const mode = detectMode('When can I schedule my tasks?', false);
      expect(mode).toBe('scheduling');
    });

    it('treats "plan my day" as conversation (planning intent)', () => {
      const mode = detectMode('Plan my day today.', true);
      expect(mode).toBe('conversation');
    });
  });

  describe('detectPlanAdjustment', () => {
    it('returns true when adjusting a schedule with prior preview', () => {
      const preview: SchedulePreview = {
        blocks: [],
        summary: 'Draft schedule.',
        conflicts: [],
        confidence: 'high',
      };
      const history: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Here is your schedule.',
          timestamp: new Date().toISOString(),
          metadata: { schedulePreview: preview },
        },
      ];

      const result = detectPlanAdjustment('Actually, move it to 2 PM.', history);
      expect(result).toBe(true);
    });

    it('returns false when there was no prior schedule preview', () => {
      const history: ChatMessage[] = [
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hello!',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = detectPlanAdjustment('Actually, move it to 2 PM.', history);
      expect(result).toBe(false);
    });

    it('returns false without adjustment keywords', () => {
      const preview: SchedulePreview = {
        blocks: [],
        summary: 'Draft schedule.',
        conflicts: [],
        confidence: 'high',
      };
      const history: ChatMessage[] = [
        {
          id: 'msg-3',
          role: 'assistant',
          content: 'Here is your schedule.',
          timestamp: new Date().toISOString(),
          metadata: { schedulePreview: preview },
        },
      ];

      const result = detectPlanAdjustment('Looks good, thanks.', history);
      expect(result).toBe(false);
    });
  });

  describe('detectRescheduleIntent', () => {
    it('detects reschedule language', () => {
      expect(detectRescheduleIntent('Please reschedule my task.')).toBe(true);
      expect(detectRescheduleIntent('Move my task to 3pm.')).toBe(true);
      expect(detectRescheduleIntent('Move Reply to emails to 8 PM today.')).toBe(true);
    });

    it('returns false for non-reschedule language', () => {
      expect(detectRescheduleIntent('What tasks do I have?')).toBe(false);
    });
  });

  describe('detectDailyPlanIntent', () => {
    it('detects daily plan language', () => {
      expect(detectDailyPlanIntent('Plan my day')).toBe(true);
      expect(detectDailyPlanIntent('What should I do today?')).toBe(true);
    });

    it('returns false for unrelated language', () => {
      expect(detectDailyPlanIntent('Schedule my tasks')).toBe(false);
    });
  });

  describe('detectPlanningIntent', () => {
    it('detects planning language', () => {
      expect(detectPlanningIntent('My day feels chaotic—can you help me plan today?')).toBe(true);
      expect(detectPlanningIntent('I need to prioritize my tasks.')).toBe(true);
    });

    it('returns false for unrelated language', () => {
      expect(detectPlanningIntent('What is the weather?')).toBe(false);
    });
  });

  describe('getPlanningState', () => {
    it('marks missing time and priority for ambiguous requests', () => {
      const state = getPlanningState({
        message: 'Help me plan.',
        tasks: [
          { priority: 3, dueDate: null },
          { priority: 3, dueDate: null },
        ],
      });

      expect(state.missingTime).toBe(true);
      expect(state.missingPriority).toBe(true);
      expect(state.missingInfo).toBe(true);
    });

    it('clears missing info when time and priority are provided', () => {
      const state = getPlanningState({
        message: 'Plan my day today and focus on the most important tasks.',
        tasks: [{ priority: 2, dueDate: null }],
      });

      expect(state.missingTime).toBe(false);
      expect(state.missingPriority).toBe(false);
      expect(state.missingInfo).toBe(false);
    });
  });

  describe('shouldAskPlanningQuestion', () => {
    it('asks when missing info and within question budget', () => {
      expect(
        shouldAskPlanningQuestion({
          missingInfo: true,
          missingTime: true,
          missingPriority: true,
          questionRound: 0,
          allowSecondRound: true,
          assumptions: [],
        })
      ).toBe(true);
    });

    it('does not ask after two rounds', () => {
      expect(
        shouldAskPlanningQuestion({
          missingInfo: true,
          missingTime: true,
          missingPriority: true,
          questionRound: 2,
          allowSecondRound: false,
          assumptions: [],
        })
      ).toBe(false);
    });
  });

  describe('resolvePlanningMode', () => {
    it('routes conversation planning intent to planning mode', () => {
      const mode = resolvePlanningMode('conversation', 'Can you help me plan today?');
      expect(mode).toBe('planning');
    });

    it('does not override non-conversation modes', () => {
      const mode = resolvePlanningMode('scheduling', 'Can you help me plan today?');
      expect(mode).toBe('scheduling');
    });
  });

  describe('getNextPlanningState', () => {
    it('increments question round when asking for missing info', () => {
      const result = getNextPlanningState({
        message: 'Help me plan.',
        tasks: [{ priority: 3, dueDate: null }],
      });

      expect(result.willAsk).toBe(true);
      expect(result.state.questionRound).toBe(1);
    });

    it('keeps question round when info is complete', () => {
      const result = getNextPlanningState({
        message: 'Plan my day today and focus on the most important tasks.',
        tasks: [{ priority: 1, dueDate: null }],
      });

      expect(result.willAsk).toBe(false);
      expect(result.state.questionRound).toBe(0);
    });
  });

  describe('getLatestPlanningState', () => {
    it('returns the most recent planning state from history', () => {
      const history: ChatMessage[] = [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Question 1',
          timestamp: new Date().toISOString(),
          metadata: {
            planningState: {
              missingInfo: true,
              missingTime: true,
              missingPriority: true,
              questionRound: 1,
              allowSecondRound: true,
              assumptions: [],
            },
          },
        },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Question 2',
          timestamp: new Date().toISOString(),
          metadata: {
            planningState: {
              missingInfo: true,
              missingTime: false,
              missingPriority: true,
              questionRound: 2,
              allowSecondRound: false,
              assumptions: [],
            },
          },
        },
      ];

      const state = getLatestPlanningState(history);
      expect(state?.questionRound).toBe(2);
    });

    it('returns null when no planning state exists', () => {
      const state = getLatestPlanningState([]);
      expect(state).toBeNull();
    });
  });

  describe('formatPlanningStateBlock', () => {
    it('renders a planning state JSON block', () => {
      const block = formatPlanningStateBlock({
        missingInfo: true,
        missingTime: true,
        missingPriority: false,
        questionRound: 1,
        allowSecondRound: true,
        assumptions: ['Assumed priorities from metadata.'],
      });

      expect(block).toContain('**Planning State**');
      expect(block).toContain('"missingInfo": true');
      expect(block).toContain('"questionRound": 1');
    });
  });

  describe('buildPlanningClarifyingQuestion', () => {
    it('asks combined time + priority when both are missing', () => {
      const question = buildPlanningClarifyingQuestion({
        missingInfo: true,
        missingTime: true,
        missingPriority: true,
        questionRound: 0,
        allowSecondRound: true,
        assumptions: [],
      });

      expect(question).toContain('?');
      expect(question.toLowerCase()).toContain('time');
      expect(question.toLowerCase()).toContain('priority');
    });

    it('asks only missing time when priority is known', () => {
      const question = buildPlanningClarifyingQuestion({
        missingInfo: true,
        missingTime: true,
        missingPriority: false,
        questionRound: 0,
        allowSecondRound: true,
        assumptions: [],
      });

      expect(question.toLowerCase()).toContain('time');
      expect(question.toLowerCase()).not.toContain('priority');
    });

    it('asks only missing priority when time is known', () => {
      const question = buildPlanningClarifyingQuestion({
        missingInfo: true,
        missingTime: false,
        missingPriority: true,
        questionRound: 0,
        allowSecondRound: true,
        assumptions: [],
      });

      expect(question.toLowerCase()).toContain('priority');
      expect(question.toLowerCase()).not.toContain('time');
    });
  });

  describe('getPlanningQuestionIfNeeded', () => {
    it('returns a clarifying question when info is missing', () => {
      const question = getPlanningQuestionIfNeeded({
        missingInfo: true,
        missingTime: true,
        missingPriority: true,
        questionRound: 0,
        allowSecondRound: true,
        assumptions: [],
      });

      expect(question).toContain('?');
    });

    it('returns null when info is complete', () => {
      const question = getPlanningQuestionIfNeeded({
        missingInfo: false,
        missingTime: false,
        missingPriority: false,
        questionRound: 0,
        allowSecondRound: true,
        assumptions: [],
      });

      expect(question).toBeNull();
    });
  });

  describe('sanitizePlanningResponse', () => {
    it('falls back when response includes explicit times', () => {
      const sanitized = sanitizePlanningResponse('Plan: 9:00 AM - 10:00 AM work block.');
      expect(sanitized.toLowerCase()).toContain('draft plan');
      expect(sanitized.toLowerCase()).not.toContain('9:00');
    });

    it('passes through when response avoids scheduling language', () => {
      const sanitized = sanitizePlanningResponse('## Draft Plan\\n\\n• Morning: Focus on top priorities.');
      expect(sanitized).toContain('Draft Plan');
    });
  });

  describe('ensurePlanningCta', () => {
    it('appends CTA when missing', () => {
      const content = '## Draft Plan\\n\\n• Morning: Focus on top priorities.';
      const withCta = ensurePlanningCta(content);
      expect(withCta.trim().toLowerCase()).toContain('want me to schedule this?');
    });

    it('does not duplicate CTA when present', () => {
      const content = '## Draft Plan\\n\\nWant me to schedule this?';
      const withCta = ensurePlanningCta(content);
      const matches = withCta.match(/want me to schedule this\\?/gi) || [];
      expect(matches.length).toBe(1);
    });
  });

  describe('parseResponse', () => {
    it('parses structured output with code fence', () => {
      const response = [
        '## Plan',
        '',
        'Here is your schedule.',
        '',
        '[STRUCTURED_OUTPUT]',
        '```json',
        '{',
        '  "blocks": [',
        '    { "taskId": "t1", "start": "2025-01-01T08:00:00.000Z", "end": "2025-01-01T09:00:00.000Z" }',
        '  ],',
        '  "summary": "Scheduled the first task early.",',
        '  "conflicts": [],',
        '  "confidence": "high"',
        '}',
        '```',
      ].join('\n');

      const parsed = parseResponse(response);
      expect(parsed.naturalLanguage).toContain('Here is your schedule.');
      expect(parsed.schedulePreview?.blocks).toHaveLength(1);
      expect(parsed.schedulePreview?.summary).toBe('Scheduled the first task early.');
    });

    it('parses structured output without a code fence', () => {
      const response = [
        'Quick plan.',
        '[STRUCTURED_OUTPUT]',
        '{',
        '  "blocks": [],',
        '  "summary": "No blocks available.",',
        '  "conflicts": ["No tasks"],',
        '  "confidence": "low"',
        '}',
      ].join('\n');

      const parsed = parseResponse(response);
      expect(parsed.schedulePreview?.summary).toBe('No blocks available.');
      expect(parsed.schedulePreview?.conflicts).toHaveLength(1);
    });

    it('falls back to reasoning when summary is missing', () => {
      const response = [
        'Plan details.',
        '[STRUCTURED_OUTPUT]',
        '```json',
        '{',
        '  "blocks": [],',
        '  "reasoning": "Not enough time today.",',
        '  "conflicts": [],',
        '  "confidence": "medium"',
        '}',
        '```',
      ].join('\n');

      const parsed = parseResponse(response);
      expect(parsed.schedulePreview?.summary).toBe('Not enough time today.');
    });
  });

  describe('sanitizeAssistantContent', () => {
    it('removes structured output markers, JSON, and IDs', () => {
      const content = [
        '## Your Schedule',
        '',
        '- Task A (ID: task_123)',
        '[STRUCTURED_OUTPUT]',
        '```json',
        '{',
        '  "blocks": [],',
        '  "summary": "Example"',
        '}',
        '```',
      ].join('\n');

      const sanitized = sanitizeAssistantContent(content, 'scheduling', true);
      expect(sanitized).toContain('## Your Schedule');
      expect(sanitized).toContain('- Task A');
      expect(sanitized).not.toContain('STRUCTURED_OUTPUT');
      expect(sanitized).not.toContain('task_123');
      expect(sanitized).not.toContain('"blocks"');
    });

    it('strips internal tags and keeps readable text', () => {
      const content = 'Your [TimeFlow] Workout is movable. [FIXED: class] CS 101 Lecture.';
      const sanitized = sanitizeAssistantContent(content, 'conversation', false);
      expect(sanitized).toBe('Your Workout is movable. CS 101 Lecture.');
    });

    it('falls back to a safe message when output is only technical data', () => {
      const content = [
        '[STRUCTURED_OUTPUT]',
        '```json',
        '{ "blocks": [] }',
        '```',
      ].join('\n');

      const sanitized = sanitizeAssistantContent(content, 'scheduling', true);
      expect(sanitized).toBe(
        "I've prepared a schedule. Review it below and click Apply to add it to your calendar."
      );
    });
  });

  describe('sanitizeSchedulePreview', () => {
    it('drops blocks with unknown taskId and records conflicts', () => {
      const preview: SchedulePreview = {
        blocks: [
          { taskId: 'task-valid', start: '2025-01-01T08:00:00.000Z', end: '2025-01-01T09:00:00.000Z' },
          { taskId: 'task-unknown', start: '2025-01-01T10:00:00.000Z', end: '2025-01-01T11:00:00.000Z' },
        ],
        summary: 'Test',
        conflicts: [],
        confidence: 'high',
      };

      const sanitized = sanitizeSchedulePreview(preview, ['task-valid'], []);
      expect(sanitized.blocks).toHaveLength(1);
      expect(sanitized.blocks[0].taskId).toBe('task-valid');
      expect(sanitized.conflicts.some((msg) => msg.includes('unknown taskId'))).toBe(true);
    });

    it('returns empty blocks with a warning when all blocks are invalid', () => {
      const preview: SchedulePreview = {
        blocks: [
          { taskId: 'task-unknown', start: '2025-01-01T10:00:00.000Z', end: '2025-01-01T11:00:00.000Z' },
        ],
        summary: 'Test',
        conflicts: [],
        confidence: 'high',
      };

      const sanitized = sanitizeSchedulePreview(preview, [], []);
      expect(sanitized.blocks).toHaveLength(0);
      expect(sanitized.conflicts.some((msg) => msg.includes('No valid blocks'))).toBe(true);
    });

    it('keeps habit blocks with valid habitId', () => {
      const preview: SchedulePreview = {
        blocks: [
          { habitId: 'habit-1', start: '2025-02-01T10:00:00.000Z', end: '2025-02-01T10:30:00.000Z' },
        ],
        summary: 'Habits only',
        conflicts: [],
        confidence: 'high',
      };

      const sanitized = sanitizeSchedulePreview(preview, [], ['habit-1']);
      expect(sanitized.blocks).toHaveLength(1);
      expect((sanitized.blocks[0] as any).habitId).toBe('habit-1');
      expect(sanitized.conflicts).toHaveLength(0);
    });

    it('converts habit IDs incorrectly placed in taskId into habit blocks', () => {
      const preview: SchedulePreview = {
        blocks: [
          { taskId: 'habit-xyz', start: '2025-02-02T08:00:00.000Z', end: '2025-02-02T08:20:00.000Z' },
        ],
        summary: 'Normalize habit ids',
        conflicts: [],
        confidence: 'medium',
      };

      const sanitized = sanitizeSchedulePreview(preview, [], ['habit-xyz']);
      expect(sanitized.blocks).toHaveLength(1);
      const normalized = sanitized.blocks[0] as any;
      expect('taskId' in normalized).toBe(false);
      expect(normalized.habitId).toBe('habit-xyz');
    });

    it('prefers habitId when both fields are present but taskId is unknown', () => {
      const preview: SchedulePreview = {
        blocks: [
          { taskId: 'task-mismatch', habitId: 'habit-abc', start: '2025-02-03T09:00:00.000Z', end: '2025-02-03T09:30:00.000Z' },
        ],
        summary: 'Habit with stray taskId',
        conflicts: [],
        confidence: 'high',
      };

      const sanitized = sanitizeSchedulePreview(preview, [], ['habit-abc']);
      expect(sanitized.blocks).toHaveLength(1);
      const normalized = sanitized.blocks[0] as any;
      expect('taskId' in normalized).toBe(false);
      expect(normalized.habitId).toBe('habit-abc');
    });
  });

  describe('applyHabitFrequencyConflicts', () => {
    const habits = [
      { id: 'h1', title: 'Daily Habit', frequency: 'daily', daysOfWeek: [], durationMinutes: 30, preferredTimeOfDay: null },
      { id: 'h2', title: 'Weekly Tue', frequency: 'weekly', daysOfWeek: ['tue'], durationMinutes: 20, preferredTimeOfDay: null },
    ];

    it('adds conflicts when daily habits are missing days', () => {
      const preview: SchedulePreview = {
        blocks: [
          { habitId: 'h1', start: new Date().toISOString(), end: new Date(Date.now() + 30 * 60000).toISOString() },
        ],
        summary: '',
        conflicts: [],
        confidence: 'high',
      };

      const validated = applyHabitFrequencyConflicts(preview, habits, 'UTC');
      expect(validated.conflicts.some((c) => c.includes('Daily Habit'))).toBe(true);
      expect(validated.confidence).toBe('medium');
    });

    it('adds conflicts when weekly habits are missing specified weekdays', () => {
      const preview: SchedulePreview = {
        blocks: [],
        summary: '',
        conflicts: [],
        confidence: 'medium',
      };

      const validated = applyHabitFrequencyConflicts(preview, habits, 'UTC');
      expect(validated.conflicts.some((c) => c.includes('Weekly Tue'))).toBe(true);
    });
  });

  describe('fillMissingHabitBlocks', () => {
    const habits = [
      { id: 'h1', title: 'Daily', frequency: 'daily', daysOfWeek: [], durationMinutes: 30, preferredTimeOfDay: 'morning' },
      { id: 'h2', title: 'Weekly Tue', frequency: 'weekly', daysOfWeek: ['tue'], durationMinutes: 20, preferredTimeOfDay: null },
    ];
    const userPrefs = {
      wakeTime: '08:00',
      sleepTime: '23:00',
      timeZone: 'UTC',
    } as const;

    it('adds missing daily blocks using preferred time when empty', () => {
      const preview: SchedulePreview = {
        blocks: [],
        summary: '',
        conflicts: [],
        confidence: 'high',
      };

      const filled = fillMissingHabitBlocks(preview, habits, [], userPrefs);
      const h1Blocks = filled.blocks.filter((b) => (b as any).habitId === 'h1');
      expect(h1Blocks.length).toBe(7);
    });

    it('keeps existing block time when cloning to other days', () => {
      const today = new Date().toISOString();
      const preview: SchedulePreview = {
        blocks: [
          { habitId: 'h1', start: today, end: new Date(Date.now() + 30 * 60000).toISOString() },
        ],
        summary: '',
        conflicts: [],
        confidence: 'high',
      };

      const filled = fillMissingHabitBlocks(preview, habits, [], userPrefs);
      const h1Blocks = filled.blocks.filter((b) => (b as any).habitId === 'h1');
      expect(h1Blocks.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('detectSkippedHabits', () => {
    const habits = [
      { id: 'h1', title: 'Guitar Practice' },
      { id: 'h2', title: 'Read' },
    ];

    it('detects explicit skip keyword', () => {
      const skipped = detectSkippedHabits(habits as any, 'Plan my habits minus guitar practice');
      expect(skipped.has('h1')).toBe(true);
      expect(skipped.has('h2')).toBe(false);
    });

    it('ignores when no skip keyword is present', () => {
      const skipped = detectSkippedHabits(habits as any, 'Plan my habits');
      expect(skipped.size).toBe(0);
    });
  });
});
