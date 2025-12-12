/**
 * Gmail Service
 *
 * Read-only access to the user's inbox for surfacing recent emails.
 */

import { google, gmail_v1 } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { getUserOAuth2Client } from '../config/google.js';
import { analyzeEmailImportance } from '../utils/emailImportance.js';
import { assertWithinGmailRateLimit } from '../utils/gmailRateLimiter.js';
import { categorizeEmail } from './emailCategorizationService.js';
import type { EmailInboxResponse, EmailMessage, FullEmailMessage, SendEmailRequest, SendEmailResponse, EmailAttachment } from '@timeflow/shared';

async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleAccessToken) {
    throw new Error('User not authenticated with Google');
  }

  const oauth2Client = getUserOAuth2Client(
    user.googleAccessToken,
    decrypt(user.googleRefreshToken),
    user.googleAccessTokenExpiry?.getTime()
  );

  oauth2Client.on('tokens', async (tokens) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token ?? user.googleAccessToken,
        googleRefreshToken: encrypt(tokens.refresh_token) ?? user.googleRefreshToken,
        googleAccessTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : user.googleAccessTokenExpiry,
      },
    });
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function parseHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

function mapMessage(message: gmail_v1.Schema$Message): EmailMessage | null {
  if (!message.id) return null;

  const headers = message.payload?.headers;
  const from = parseHeader(headers, 'From') || 'Unknown sender';
  const subject = parseHeader(headers, 'Subject') || '(No subject)';
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
  const labels = message.labelIds || [];
  const isUnread = labels.includes('UNREAD');

  // Use smart importance analyzer instead of simple label check
  const importance = analyzeEmailImportance({
    from,
    subject,
    snippet: message.snippet ?? undefined,
    labels,
    threadId: message.threadId ?? undefined,
    isUnread,
  });

  // Categorize email using AI-powered categorization service
  const category = categorizeEmail({
    from,
    subject,
    snippet: message.snippet ?? undefined,
    labels,
  });

  return {
    id: message.id,
    threadId: message.threadId ?? undefined,
    from,
    subject,
    snippet: message.snippet ?? undefined,
    receivedAt,
    importance,
    labels,
    isRead: !isUnread,
    isPromotional: labels.includes('CATEGORY_PROMOTIONS'),
    category,
  };
}

export async function getInboxMessages(
  userId: string,
  options: { maxResults?: number; pageToken?: string } = {}
): Promise<EmailInboxResponse> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults: options.maxResults ?? 15,
    pageToken: options.pageToken,
  });

  const messageRefs = listResponse.data.messages || [];
  if (messageRefs.length === 0) {
    return { messages: [], nextPageToken: listResponse.data.nextPageToken || undefined };
  }

  const messages: EmailMessage[] = [];

  for (const ref of messageRefs) {
    if (!ref.id) continue;
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: ref.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Importance'],
    });

    const mapped = mapMessage(full.data);
    if (mapped) {
      messages.push(mapped);
    }
  }

  return {
    messages,
    nextPageToken: listResponse.data.nextPageToken || undefined,
  };
}

/**
 * Get full email message including body content
 */
export async function getFullEmail(userId: string, emailId: string): Promise<FullEmailMessage> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full',
  });

  const message = response.data;
  if (!message.id) {
    throw new Error('Email not found');
  }

  const headers = message.payload?.headers;
  const from = parseHeader(headers, 'From') || 'Unknown sender';
  const to = parseHeader(headers, 'To');
  const cc = parseHeader(headers, 'Cc');
  const bcc = parseHeader(headers, 'Bcc');
  const replyTo = parseHeader(headers, 'Reply-To');
  const subject = parseHeader(headers, 'Subject') || '(No subject)';
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
  const labels = message.labelIds || [];
  const isUnread = labels.includes('UNREAD');

  const importance = analyzeEmailImportance({
    from,
    subject,
    snippet: message.snippet ?? undefined,
    labels,
    threadId: message.threadId ?? undefined,
    isUnread,
  });

  // Extract body
  let body = '';
  const parts = message.payload?.parts || [message.payload];

  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      break;
    } else if (part?.mimeType === 'text/html' && part.body?.data && !body) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  // If no parts, check if body is directly on payload
  if (!body && message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  // Extract attachments
  const attachments: EmailAttachment[] = [];
  for (const part of parts) {
    if (part?.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
  }

  return {
    id: message.id,
    threadId: message.threadId ?? undefined,
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    snippet: message.snippet ?? undefined,
    body,
    receivedAt,
    importance,
    labels,
    isRead: !isUnread,
    isPromotional: labels.includes('CATEGORY_PROMOTIONS'),
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Send an email or reply to an existing thread
 */
export async function sendEmail(userId: string, request: SendEmailRequest): Promise<SendEmailResponse> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  // Build the email message in RFC 2822 format
  const messageParts = [
    `To: ${request.to}`,
    `Subject: ${request.subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (request.inReplyTo) {
    messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
    messageParts.push(`References: ${request.inReplyTo}`);
  }

  messageParts.push('');
  messageParts.push(request.body);

  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sendOptions: any = {
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  };

  if (request.threadId) {
    sendOptions.requestBody.threadId = request.threadId;
  }

  const response = await gmail.users.messages.send(sendOptions);

  return {
    success: true,
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
}

/**
 * Search emails by query
 */
export async function searchEmails(
  userId: string,
  query: string,
  maxResults: number = 20
): Promise<EmailInboxResponse> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const messageRefs = listResponse.data.messages || [];
  if (messageRefs.length === 0) {
    return { messages: [], nextPageToken: listResponse.data.nextPageToken || undefined };
  }

  const messages: EmailMessage[] = [];

  for (const ref of messageRefs) {
    if (!ref.id) continue;
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: ref.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Importance'],
    });

    const mapped = mapMessage(full.data);
    if (mapped) {
      messages.push(mapped);
    }
  }

  return {
    messages,
    nextPageToken: listResponse.data.nextPageToken || undefined,
  };
}

/**
 * Mark an email as read or unread
 */
export async function markAsRead(userId: string, emailId: string, isRead: boolean = true): Promise<void> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  if (isRead) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } else {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: ['UNREAD'],
      },
    });
  }
}

/**
 * Archive an email (remove from inbox)
 */
export async function archiveEmail(userId: string, emailId: string): Promise<void> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}
