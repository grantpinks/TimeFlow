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
    mascotState?: string;
    planningState?: PlanningState;
    meetingState?: MeetingWorkflowState;
  };
}

// Schedule preview returned by AI
export interface SchedulePreview {
  blocks: ScheduledBlock[];
  summary: string; // Natural language summary
  conflicts: string[]; // List of warnings/conflicts
  confidence: 'high' | 'medium' | 'low';
}

// Actions the AI can suggest (confirm-only, no auto-apply)
export type AssistantAction =
  | { type: 'preview_schedule'; payload: { blocks: ScheduledBlock[] } }
  | { type: 'create_task_draft'; payload: CreateTaskRequest }
  | { type: 'draft_reply'; payload: { subject: string; body: string } };

// Request body for POST /api/assistant/chat
export interface AssistantChatRequest {
  message: string;
  conversationHistory?: ChatMessage[]; // Optional: for context
  conversationId?: string; // Optional: use specific conversation for history fallback
}

// Response from POST /api/assistant/chat
export interface AssistantChatResponse {
  message: ChatMessage; // AI's response
  suggestions?: SchedulePreview; // If AI generated schedule suggestions
}

export interface PlanningState {
  missingInfo: boolean;
  missingTime: boolean;
  missingPriority: boolean;
  questionRound: number;
  allowSecondRound: boolean;
  assumptions: string[];
}

export interface MeetingWorkflowState {
  missingLinkSelection: boolean;
  missingLinkName: boolean;
  missingLinkDuration: boolean;
  missingRecipient: boolean;
  creationRequested: boolean;
  sendRequested: boolean;
  questionRound: number;
  assumptions: string[];
}
