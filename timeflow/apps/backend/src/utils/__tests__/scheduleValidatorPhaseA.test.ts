/**
 * Phase A — Sprint 25: Flow AI Reliability
 *
 * Tests for:
 * A1 — Invalid task/habit ID guardrails in validateSchedulePreview
 * A3 — Feasible scheduling windows that exist before a fixed event return non-empty previews
 */

import { describe, expect, it } from 'vitest';
import { validateSchedulePreview } from '../scheduleValidator.js';
import type { SchedulePreview } from '@timeflow/shared';

const BASE_PREFS = {
  wakeTime: '08:00',
  sleepTime: '23:00',
  timeZone: 'UTC',
};

// ─── A1: ID Guardrails ────────────────────────────────────────────────────────

describe('validateSchedulePreview — A1: ID guardrails', () => {
  it('rejects a block with a hallucinated taskId not in the known list', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          taskId: 'hallucinated-id-abc123',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T10:00:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(preview, [], BASE_PREFS, ['real-task-id-001']);
    expect(result.errors).toContain('Error: Invalid task ID: hallucinated-id-abc123');
  });

  it('accepts a block with a valid taskId', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          taskId: 'real-task-id-001',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T10:00:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(preview, [], BASE_PREFS, ['real-task-id-001']);
    expect(result.errors.filter(e => e.includes('Invalid task ID'))).toHaveLength(0);
  });

  it('rejects a habit block with a hallucinated habitId not in the known list', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          habitId: 'invented-habit-xyz',
          title: 'Stretch',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T09:30:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(
      preview,
      [],
      BASE_PREFS,
      [],                        // no task IDs
      ['real-habit-id-001']     // known habit IDs
    );
    expect(result.errors).toContain('Error: Invalid habit ID: invented-habit-xyz');
  });

  it('accepts a habit block with a valid habitId', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          habitId: 'real-habit-id-001',
          title: 'Morning Run',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T09:30:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(
      preview,
      [],
      BASE_PREFS,
      [],
      ['real-habit-id-001']
    );
    expect(result.errors.filter(e => e.includes('Invalid habit ID'))).toHaveLength(0);
  });

  it('rejects a block that has neither taskId nor habitId', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T10:00:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(preview, [], BASE_PREFS, []);
    expect(result.errors).toContain('Error: Block is missing both taskId and habitId');
  });

  it('does not validate habitId when no habitIds list is provided (backward compat)', () => {
    // When habitIds = [] (default), habit blocks should not trigger false positives
    const preview: SchedulePreview = {
      blocks: [
        {
          habitId: 'some-habit',
          title: 'Yoga',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T09:30:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    // habitIds omitted → defaults to []  → no habit ID validation applied
    const result = validateSchedulePreview(preview, [], BASE_PREFS, []);
    expect(result.errors.filter(e => e.includes('Invalid habit ID'))).toHaveLength(0);
  });

  it('multiple invalid blocks all appear in errors', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          taskId: 'bad-id-1',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T10:00:00.000Z',
        } as any,
        {
          taskId: 'bad-id-2',
          start: '2026-04-15T11:00:00.000Z',
          end: '2026-04-15T12:00:00.000Z',
        } as any,
      ],
      summary: 'Test',
      conflicts: [],
      confidence: 'high',
    };

    const result = validateSchedulePreview(preview, [], BASE_PREFS, ['real-task-id-001']);
    expect(result.errors).toContain('Error: Invalid task ID: bad-id-1');
    expect(result.errors).toContain('Error: Invalid task ID: bad-id-2');
  });
});

// ─── A3: Fixed event does not block the whole day ─────────────────────────────

describe('validateSchedulePreview — A3: blocks scheduled before a fixed event are valid', () => {
  // Must-pass scenario: task scheduled in the morning is VALID even though a flight
  // exists at 5:57 PM the same day.
  it('does not flag a block scheduled BEFORE a fixed event as an error', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          // "Pack for Florida" 9:00 AM – 10:00 AM UTC
          taskId: 'real-task-id-001',
          start: '2026-04-15T09:00:00.000Z',
          end: '2026-04-15T10:00:00.000Z',
        } as any,
      ],
      summary: 'Scheduled before flight',
      conflicts: [],
      confidence: 'high',
    };

    const fixedEvent = {
      id: 'ev-flight',
      summary: 'Flight to Fort Myers',
      start: '2026-04-15T17:57:00.000Z', // 5:57 PM UTC
      end: '2026-04-15T20:00:00.000Z',
      attendees: [],
      isFixed: true,
    };

    const result = validateSchedulePreview(
      preview,
      [fixedEvent] as any,
      BASE_PREFS,
      ['real-task-id-001']
    );

    // The block is at 9–10 AM; the fixed event is at 5:57 PM — no overlap
    expect(result.errors.filter(e => e.includes('Overlaps with fixed event'))).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('flags a block that DOES overlap with the fixed event', () => {
    const preview: SchedulePreview = {
      blocks: [
        {
          taskId: 'real-task-id-001',
          start: '2026-04-15T17:30:00.000Z', // overlaps the 5:57 PM flight
          end: '2026-04-15T18:30:00.000Z',
        } as any,
      ],
      summary: 'Bad: overlaps flight',
      conflicts: [],
      confidence: 'high',
    };

    const fixedEvent = {
      id: 'ev-flight',
      summary: 'Flight to Fort Myers',
      start: '2026-04-15T17:57:00.000Z',
      end: '2026-04-15T20:00:00.000Z',
      attendees: [],
      isFixed: true,
    };

    const result = validateSchedulePreview(
      preview,
      [fixedEvent] as any,
      BASE_PREFS,
      ['real-task-id-001']
    );

    expect(result.errors.some(e => e.includes('Overlaps with fixed event'))).toBe(true);
  });
});
