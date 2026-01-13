import { describe, expect, it } from 'vitest';
import { buildTimeflowEventDetails } from '../timeflowEventPrefix';

describe('buildTimeflowEventDetails', () => {
  it('uses default prefix for tasks when enabled', () => {
    const result = buildTimeflowEventDetails({
      title: 'Deep Work',
      kind: 'task',
      prefixEnabled: true,
      prefix: undefined,
      description: null,
    });

    expect(result.summary).toBe('TF| Deep Work');
    expect(result.description).toBe('TimeFlow Event');
  });

  it('falls back to TF| when the configured prefix is blank or whitespace', () => {
    const result = buildTimeflowEventDetails({
      title: 'Stretch',
      kind: 'task',
      prefixEnabled: true,
      prefix: '   ',
      description: 'Morning habit',
    });

    expect(result.summary).toBe('TF| Stretch');
    expect(result.description).toBe('Morning habit\n\nTimeFlow Event');
  });

  it('includes habit label when enabled', () => {
    const result = buildTimeflowEventDetails({
      title: 'Stretch',
      kind: 'habit',
      prefixEnabled: true,
      prefix: 'TF|',
      description: 'Scheduled habit from TimeFlow',
    });

    expect(result.summary).toBe('TF| Habit: Stretch');
    expect(result.description).toBe('Scheduled habit from TimeFlow');
  });

  it('sanitizes legacy habit prefixes', () => {
    const result = buildTimeflowEventDetails({
      title: '[TimeFlow Habit] Deep Work',
      kind: 'habit',
      prefixEnabled: true,
      prefix: undefined,
      description: null,
    });

    expect(result.summary).toBe('TF| Habit: Deep Work');
  });

  it('supports custom prefixes', () => {
    const result = buildTimeflowEventDetails({
      title: 'Read',
      kind: 'task',
      prefixEnabled: true,
      prefix: 'MY|',
      description: null,
    });

    expect(result.summary).toBe('MY| Read');
  });

  it('drops prefix when disabled', () => {
    const result = buildTimeflowEventDetails({
      title: 'Deep Work',
      kind: 'habit',
      prefixEnabled: false,
      prefix: 'TF|',
      description: null,
    });

    expect(result.summary).toBe('Habit: Deep Work');
  });

  it('appends marker when description lacks timeflow', () => {
    const result = buildTimeflowEventDetails({
      title: 'Deep Work',
      kind: 'task',
      prefixEnabled: true,
      prefix: 'TF|',
      description: 'Focus session',
    });

    expect(result.description).toBe('Focus session\n\nTimeFlow Event');
  });

  it('does not append marker twice when description already mentions TimeFlow', () => {
    const result = buildTimeflowEventDetails({
      title: 'Stretch',
      kind: 'task',
      prefixEnabled: true,
      prefix: 'TF|',
      description: 'Already includes TimeFlow Event marker',
    });

    expect(result.description).toBe('Already includes TimeFlow Event marker');
  });
});
