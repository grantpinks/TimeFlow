import OpenAI from 'openai';
import type { CalendarEvent } from '@timeflow/shared';
import { env } from '../config/env.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategorizationResult {
  categoryId: string;
  confidence: number;
  reasoning: string;
}

/**
 * Categorize a single event using AI
 */
export async function categorizeEventWithAI(
  event: CalendarEvent,
  userCategories: Category[]
): Promise<CategorizationResult> {
  // Build category options string
  const categoryOptions = userCategories
    .map((cat) => `- ${cat.name} (ID: ${cat.id})`)
    .join('\n');

  // Extract attendee domains
  const attendeeDomains = event.attendees
    ? event.attendees
        .map((att) => {
          const match = att.email?.match(/@(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
        .join(', ')
    : 'None';

  // Parse event timing
  const startDate = new Date(event.start);
  const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
  const time = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const isWeekday = startDate.getDay() >= 1 && startDate.getDay() <= 5;
  const isWorkHours =
    isWeekday && startDate.getHours() >= 9 && startDate.getHours() < 17;

  // Build prompt
  const prompt = `Analyze this calendar event and categorize it into one of the user's categories.

Event Details:
- Title: ${event.summary || 'Untitled'}
- Description: ${event.description || 'None'}
- Attendees: ${event.attendees?.length || 0} people
- Email domains: ${attendeeDomains}
- When: ${dayOfWeek} at ${time}
- Is it during work hours? ${isWorkHours ? 'Yes' : 'No'}
- Is it recurring? ${event.recurring ? 'Yes' : 'No'}

Available Categories:
${categoryOptions}

Instructions:
1. Analyze the event title, description, and context
2. Consider email domains (e.g., @company.com suggests professional)
3. Consider timing (weekday 9-5 often means professional)
4. **PRIORITY: Identify time-sensitive events that require timely appearance**
   - Flights, travel, airport pickups/dropoffs → "Event" category
   - Coffee chats, 1-on-1 meetings, networking → "Event" category
   - Appointments (doctor, dentist, salon, etc.) → "Event" category
   - Interviews, important meetings with specific time requirements → "Event" category
   - Any event where being late would cause significant problems → "Event" category
5. Choose the BEST matching category
6. Assign a confidence score (0.0 to 1.0)
   - 1.0 = Very confident (clear keywords, work emails, etc.)
   - 0.7-0.9 = Confident (good signals)
   - 0.5-0.6 = Moderate (some ambiguity)
   - Below 0.5 = Low confidence (very ambiguous)

Respond in JSON format ONLY:
{
  "categoryId": "category_id_here",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this category fits"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent categorization
      messages: [
        {
          role: 'system',
          content: 'You are a calendar event categorization assistant. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content.trim()) as CategorizationResult;

    // Validate result
    const categoryExists = userCategories.some(
      (cat) => cat.id === result.categoryId
    );
    if (!categoryExists) {
      throw new Error('AI returned invalid category ID');
    }

    // Ensure confidence is in valid range
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    return result;
  } catch (error) {
    console.error('AI categorization failed:', error);

    // Fallback: return first category with low confidence
    return {
      categoryId: userCategories[0]?.id || '',
      confidence: 0.1,
      reasoning: 'Failed to categorize with AI, using fallback',
    };
  }
}

/**
 * Batch categorize multiple events
 * Processes events one at a time to avoid rate limits
 */
export async function batchCategorizeEvents(
  events: CalendarEvent[],
  userCategories: Category[]
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  for (const event of events) {
    try {
      const result = await categorizeEventWithAI(event, userCategories);
      results.set(event.id, result);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to categorize event ${event.id}:`, error);
      // Continue with other events even if one fails
    }
  }

  return results;
}

/**
 * Smart batch categorization with progress callback
 * Useful for UI progress indicators
 */
export async function batchCategorizeEventsWithProgress(
  events: CalendarEvent[],
  userCategories: Category[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();
  const total = events.length;
  let completed = 0;

  for (const event of events) {
    try {
      const result = await categorizeEventWithAI(event, userCategories);
      results.set(event.id, result);

      completed++;
      onProgress?.(completed, total);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to categorize event ${event.id}:`, error);
      completed++;
      onProgress?.(completed, total);
    }
  }

  return results;
}

/**
 * Get confidence interpretation
 */
export function interpretConfidence(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.5) return 'Moderate';
  if (confidence >= 0.3) return 'Low';
  return 'Very Low';
}

/**
 * Determine if an event should be flagged for user review
 * based on low confidence
 */
export function shouldFlagForReview(confidence: number): boolean {
  return confidence < 0.5;
}
