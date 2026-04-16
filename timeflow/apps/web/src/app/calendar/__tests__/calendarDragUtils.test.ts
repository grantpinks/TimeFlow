/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  buildDropWindow,
  snapDateToTimeBlock,
  snapResizeDuration,
} from '../calendarDragUtils';

describe('calendar drag utilities', () => {
  it('snaps dates to the nearest 15 minute time block', () => {
    expect(snapDateToTimeBlock(new Date('2026-04-15T10:07:00')).getMinutes()).toBe(0);
    expect(snapDateToTimeBlock(new Date('2026-04-15T10:08:00')).getMinutes()).toBe(15);
  });

  it('builds a snapped drop window that preserves the dragged duration', () => {
    const window = buildDropWindow(new Date('2026-04-15T10:08:00'), 45);

    expect(window.start.toISOString()).toBe(new Date('2026-04-15T10:15:00').toISOString());
    expect(window.end.toISOString()).toBe(new Date('2026-04-15T11:00:00').toISOString());
  });

  it('snaps resize movement by time blocks instead of raw pixels', () => {
    expect(
      snapResizeDuration({
        originalDurationMinutes: 60,
        deltaY: 18,
        pixelsPerMinute: 2,
      })
    ).toBe(75);
  });

  it('never resizes below one time block', () => {
    expect(
      snapResizeDuration({
        originalDurationMinutes: 30,
        deltaY: -80,
        pixelsPerMinute: 2,
      })
    ).toBe(15);
  });
});
