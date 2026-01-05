import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateBulkSchedule } from '../bulkScheduleService.js';
import * as habitSuggestionService from '../habitSuggestionService.js';

vi.mock('../habitSuggestionService.js');

describe('bulkScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate schedule suggestions for date range', async () => {
    const mockSuggestions = [
      {
        habitId: 'habit-1',
        startDateTime: '2026-01-05T08:00:00Z',
        endDateTime: '2026-01-05T08:30:00Z',
        habit: {
          id: 'habit-1',
          title: 'Morning Meditation',
          description: null,
          durationMinutes: 30,
        },
      },
    ];

    vi.mocked(habitSuggestionService.getHabitSuggestionsForUser).mockResolvedValue(mockSuggestions);

    const result = await generateBulkSchedule({
      userId: 'user-123',
      dateRangeStart: '2026-01-05',
      dateRangeEnd: '2026-01-11',
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].habitTitle).toBe('Morning Meditation');
    expect(result.suggestions[0].date).toBe('2026-01-05');
  });

  it('should reject date ranges exceeding 14 days', async () => {
    await expect(
      generateBulkSchedule({
        userId: 'user-123',
        dateRangeStart: '2026-01-05',
        dateRangeEnd: '2026-01-20', // 15 days
      })
    ).rejects.toThrow('Date range cannot exceed 14 days');
  });
});
