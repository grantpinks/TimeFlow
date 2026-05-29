import { describe, expect, it } from 'vitest';
import { resolveEventDisplayColor } from '../eventDisplayColor';

describe('resolveEventDisplayColor', () => {
  it('prefers calendar color over AI category by default', () => {
    expect(
      resolveEventDisplayColor(
        { calendarColor: '#EC4899' },
        {
          categoryId: 'c1',
          categoryName: 'Work',
          categoryColor: '#64748B',
          confidence: 0.8,
          isManual: false,
        }
      )
    ).toBe('#EC4899');
  });

  it('uses manual category color when user overrides', () => {
    expect(
      resolveEventDisplayColor(
        { calendarColor: '#EC4899' },
        {
          categoryId: 'c1',
          categoryName: 'Work',
          categoryColor: '#3B82F6',
          confidence: 1,
          isManual: true,
        }
      )
    ).toBe('#3B82F6');
  });
});
