import { describe, expect, it } from 'vitest';
import { __test__ } from '../assistantService';
import type { ChatMessage, SchedulePreview } from '@timeflow/shared';

const { detectMode, detectPlanAdjustment, parseResponse } = __test__;

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
});
