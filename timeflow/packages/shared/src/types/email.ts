/**
 * Email inbox types (Gmail-focused for now).
 */

export type EmailImportance = 'high' | 'normal' | 'low';
export type EmailActionState = 'needs_reply' | 'read_later';

/**
 * Email category types for automatic categorization
 */
export type EmailCategory =
  | 'personal'
  | 'work'
  | 'promotion'
  | 'shopping'
  | 'social'
  | 'finance'
  | 'travel'
  | 'newsletter'
  | 'updates'
  | 'other';

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  snippet?: string;
  receivedAt: string; // ISO datetime
  importance: EmailImportance;
  labels?: string[];
  isRead?: boolean;
  isPromotional?: boolean;
  category?: EmailCategory; // Auto-assigned category
  needsResponse?: boolean;
  actionState?: EmailActionState | null;
}

export interface EmailInboxResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
}

export interface InboxView {
  id: string;
  name: string;
  labelIds: string[];
  isBuiltin?: boolean;
}

export const DEFAULT_INBOX_VIEWS: InboxView[] = [
  { id: 'all', name: 'All', labelIds: [], isBuiltin: true },
  { id: 'professional', name: 'Professional', labelIds: ['work'], isBuiltin: true },
  { id: 'personal', name: 'Personal', labelIds: ['personal'], isBuiltin: true },
];

/**
 * Full email message with body content
 */
export interface FullEmailMessage extends EmailMessage {
  body: string; // Plain text or HTML body
  to?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface EmailThreadMessageInput {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  body: string;
}

export interface EmailThreadSummaryRequest {
  threadId: string;
  messages: EmailThreadMessageInput[];
}

export interface EmailThreadSummaryResponse {
  threadId: string;
  summary: string;
}

export interface EmailThreadTaskItem {
  title: string;
  details?: string;
}

export interface EmailThreadTasksRequest {
  threadId: string;
  messages: EmailThreadMessageInput[];
}

export interface EmailThreadTasksResponse {
  threadId: string;
  tasks: EmailThreadTaskItem[];
}

/**
 * Request to send an email
 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  body?: string;           // HTML body (backwards compatible)
  html?: string;           // Explicit HTML body
  text?: string;           // Plain text body
  inReplyTo?: string; // Message ID to reply to
  threadId?: string; // Thread ID to reply to
}

/**
 * Response after sending an email
 */
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
}

/**
 * Writing voice preferences (1-10 scale)
 * Used for AI email draft generation
 */
export interface WritingVoicePreferences {
  formality?: number;  // 1=casual, 10=professional
  length?: number;     // 1=concise, 10=detailed
  tone?: number;       // 1=friendly, 10=formal
}

/**
 * Request to generate AI email draft
 */
export interface EmailDraftRequest {
  emailId: string;                          // Original email to reply to
  voicePreferences?: WritingVoicePreferences;  // Optional overrides
  additionalContext?: string;                // User instructions
}

/**
 * Response from AI email draft generation
 */
export interface EmailDraftResponse {
  draftText: string;                        // Plain text draft
  to: string;                               // Recipient email
  subject: string;                          // Re: [original subject]
  cc?: string;                              // If reply-all
  metadata: {
    generatedAt: string;                    // ISO timestamp
    modelUsed: string;                      // "gpt-4o" or "llama3.2"
  };
}

/**
 * Request to generate email preview
 */
export interface EmailPreviewRequest {
  draftText: string;                        // User's edited draft
  to: string;
  subject: string;
  cc?: string;
  inReplyTo?: string;                       // Original email ID
  threadId?: string;                        // Gmail thread ID
}

/**
 * Response from email preview generation
 */
export interface EmailPreviewResponse {
  htmlPreview: string;                      // Formatted HTML email
  textPreview: string;                      // Plain text version
  determinismToken: string;                 // SHA-256 hash for validation
  previewedAt: string;                      // ISO timestamp
}

/**
 * Request to create draft or send email
 */
export interface CreateDraftRequest {
  action: 'send' | 'create_draft';
  htmlPreview: string;                      // From preview response
  textPreview: string;                      // From preview response
  determinismToken: string;                 // Must match preview token
  to: string;
  subject: string;
  cc?: string;
  inReplyTo?: string;
  threadId?: string;
  confirmed: boolean;                       // MUST be true (checkbox)
}

/**
 * Response from creating draft or sending email
 */
export interface CreateDraftResponse {
  success: boolean;
  messageId?: string;                       // Gmail message ID (for send)
  threadId?: string;                        // Gmail thread ID (for send)
  draftId?: string;                         // Gmail draft ID (for create_draft)
  gmailUrl?: string;                        // Gmail URL (for create_draft)
}

/**
 * Writing voice profile data
 */
export interface WritingVoiceProfile {
  formality: number;                        // 1-10
  length: number;                           // 1-10
  tone: number;                             // 1-10
  voiceSamples: string | null;              // Writing examples
  aiDraftsGenerated: number;                // Usage counter
}
