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
        start: '2026-01-05T08:00:00Z',
        end: '2026-01-05T08:30:00Z',
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

  it('should return empty suggestions when no habits to schedule', async () => {
    vi.mocked(habitSuggestionService.getHabitSuggestionsForUser).mockResolvedValue([]);

    const result = await generateBulkSchedule({
      userId: 'user-123',
      dateRangeStart: '2026-01-05',
      dateRangeEnd: '2026-01-11',
    });

    expect(result.suggestions).toHaveLength(0);
  });

  it('should group suggestions by date', async () => {
    const mockSuggestions = [
      {
        habitId: 'habit-1',
        start: '2026-01-05T08:00:00Z',
        end: '2026-01-05T08:30:00Z',
        habit: {
          id: 'habit-1',
          title: 'Morning Meditation',
          description: null,
          durationMinutes: 30,
        },
      },
      {
        habitId: 'habit-1',
        start: '2026-01-06T08:00:00Z',
        end: '2026-01-06T08:30:00Z',
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

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].date).toBe('2026-01-05');
    expect(result.suggestions[1].date).toBe('2026-01-06');
  });

  it('should handle multiple habits on the same day', async () => {
    const mockSuggestions = [
      {
        habitId: 'habit-1',
        start: '2026-01-05T08:00:00Z',
        end: '2026-01-05T08:30:00Z',
        habit: {
          id: 'habit-1',
          title: 'Morning Meditation',
          description: null,
          durationMinutes: 30,
        },
      },
      {
        habitId: 'habit-2',
        start: '2026-01-05T09:00:00Z',
        end: '2026-01-05T10:00:00Z',
        habit: {
          id: 'habit-2',
          title: 'Exercise',
          description: null,
          durationMinutes: 60,
        },
      },
    ];

    vi.mocked(habitSuggestionService.getHabitSuggestionsForUser).mockResolvedValue(mockSuggestions);

    const result = await generateBulkSchedule({
      userId: 'user-123',
      dateRangeStart: '2026-01-05',
      dateRangeEnd: '2026-01-11',
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions.every((s) => s.date === '2026-01-05')).toBe(true);
  });

  it('should accept custom prompt parameter', async () => {
    vi.mocked(habitSuggestionService.getHabitSuggestionsForUser).mockResolvedValue([]);

    const result = await generateBulkSchedule({
      userId: 'user-123',
      dateRangeStart: '2026-01-05',
      dateRangeEnd: '2026-01-11',
      customPrompt: 'Skip Monday, I am traveling',
    });

    expect(result.suggestions).toBeDefined();
    // Custom prompt is accepted but not used in MVP
  });
});
