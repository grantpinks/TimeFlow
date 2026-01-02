/**
 * Email inbox types (Gmail-focused for now).
 */

export type EmailImportance = 'high' | 'normal' | 'low';

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
