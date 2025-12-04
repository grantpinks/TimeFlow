import type { ScheduledBlock } from './schedule';
import type { CreateTaskRequest } from './task';

// Chat message sent from frontend or returned by API
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO datetime
  metadata?: {
    schedulePreview?: SchedulePreview;
    action?: AssistantAction;
  };
}

// Schedule preview returned by AI
export interface SchedulePreview {
  blocks: ScheduledBlock[];
  summary: string; // Natural language summary
  conflicts: string[]; // List of warnings/conflicts
  confidence: 'high' | 'medium' | 'low';
}

// Actions the AI can suggest
export type AssistantAction =
  | { type: 'apply_schedule'; payload: { blocks: ScheduledBlock[] } }
  | { type: 'show_calendar'; payload: { date: string } }
  | { type: 'create_task'; payload: CreateTaskRequest };

// Request body for POST /api/assistant/chat
export interface AssistantChatRequest {
  message: string;
  conversationHistory?: ChatMessage[]; // Optional: for context
}

// Response from POST /api/assistant/chat
export interface AssistantChatResponse {
  message: ChatMessage; // AI's response
  suggestions?: SchedulePreview; // If AI generated schedule suggestions
}
