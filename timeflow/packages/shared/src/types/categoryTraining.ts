/**
 * Category training types for event categorization
 */

export interface CategoryTrainingExampleSnapshot {
  eventId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendeeDomains?: string[];
  calendarId?: string;
  provider?: string;
}

export interface CategoryTrainingProfile {
  id: string;
  userId: string;
  categoryId: string;
  description?: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  exampleEventIds: string[];
  exampleEventsSnapshot: CategoryTrainingExampleSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCategoryTrainingRequest {
  description?: string;
  includeKeywords: string[];
  excludeKeywords?: string[];
  exampleEventIds?: string[];
  exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
}
