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
import {
  detectNeedsResponseWithFallback,
  normalizeEmailCategoryId,
  scoreEmailCategoryWithFallback,
} from './emailCategorizationService.js';
import { applyCategoryOverride } from './emailOverrideService.js';
import type { EmailInboxResponse, EmailMessage, FullEmailMessage, SendEmailRequest, SendEmailResponse, EmailAttachment } from '@timeflow/shared';

function decodeGmailBody(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function extractMessageBody(
  payload?: gmail_v1.Schema$MessagePart
): { body: string; mimeType?: string } {
  let htmlBody: string | undefined;
  let textBody: string | undefined;

  const visit = (part?: gmail_v1.Schema$MessagePart) => {
    if (!part) return;

    const mimeType = part.mimeType?.toLowerCase();
    const data = part.body?.data;

    if (mimeType === 'text/html' && data && htmlBody === undefined) {
      htmlBody = decodeGmailBody(data);
    } else if (mimeType === 'text/plain' && data && textBody === undefined) {
      textBody = decodeGmailBody(data);
    }

    if (part.parts?.length) {
      for (const child of part.parts) {
        visit(child);
      }
    }
  };

  visit(payload);

  if (htmlBody) {
    return { body: htmlBody, mimeType: 'text/html' };
  }

  if (textBody) {
    return { body: textBody, mimeType: 'text/plain' };
  }

  return { body: '', mimeType: payload?.mimeType };
}

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

async function mapMessage(userId: string, message: gmail_v1.Schema$Message): Promise<EmailMessage | null> {
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
  const senderEmail = from.match(/<(.+)>/)?.[1] ?? from;
  const overrideCategory = await applyCategoryOverride(userId, senderEmail, message.threadId ?? undefined);
  const normalizedOverride = normalizeEmailCategoryId(overrideCategory);
  const category = normalizedOverride
    ? normalizedOverride
    : (
        await scoreEmailCategoryWithFallback({
          from,
          subject,
          snippet: message.snippet ?? undefined,
          labels,
        })
      ).category;

  const needsResponseResult = await detectNeedsResponseWithFallback({
    from,
    subject,
    snippet: message.snippet ?? undefined,
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
    needsResponse: needsResponseResult.needsResponse,
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
    // Show all mail (excluding spam and trash)
    q: '-in:spam -in:trash',
    maxResults: options.maxResults ?? 15,
    pageToken: options.pageToken,
  });

  const messageRefs = listResponse.data.messages || [];
  if (messageRefs.length === 0) {
    return { messages: [], nextPageToken: listResponse.data.nextPageToken || undefined };
  }

  const messages: EmailMessage[] = [];
  const batchSize = 10;

  for (let i = 0; i < messageRefs.length; i += batchSize) {
    const batch = messageRefs.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map(async (ref) => {
        if (!ref.id) return null;
        try {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: ref.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Importance'],
          });

          return await mapMessage(userId, full.data);
        } catch (error) {
          console.error('Failed to fetch Gmail message', {
            userId,
            messageId: ref.id,
            error,
          });
          return null;
        }
      })
    );

    for (const mapped of fetched) {
      if (mapped) {
        messages.push(mapped);
      }
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

  const senderEmail = from.match(/<(.+)>/)?.[1] ?? from;
  const overrideCategory = await applyCategoryOverride(userId, senderEmail, message.threadId ?? undefined);
  const normalizedOverride = normalizeEmailCategoryId(overrideCategory);
  const category = normalizedOverride
    ? normalizedOverride
    : (
        await scoreEmailCategoryWithFallback({
          from,
          subject,
          snippet: message.snippet ?? undefined,
          labels,
        })
      ).category;

  const needsResponseResult = await detectNeedsResponseWithFallback({
    from,
    subject,
    snippet: message.snippet ?? undefined,
  });

  const { body } = extractMessageBody(message.payload);
  const parts = message.payload?.parts || [message.payload];

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
    category,
    needsResponse: needsResponseResult.needsResponse,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Send an email or reply to an existing thread
 */
export async function sendEmail(userId: string, request: SendEmailRequest): Promise<SendEmailResponse> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  // Determine if multipart or single-part email
  const hasMultipart = request.html && request.text;
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let message: string;

  if (hasMultipart) {
    // Build multipart/alternative email
    const messageParts = [
      `To: ${request.to}`,
      `Subject: ${request.subject}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      'MIME-Version: 1.0',
    ];

    if (request.inReplyTo) {
      messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
      messageParts.push(`References: ${request.inReplyTo}`);
    }

    messageParts.push('');
    messageParts.push(`--${boundary}`);
    messageParts.push('Content-Type: text/plain; charset=utf-8');
    messageParts.push('');
    messageParts.push(request.text!);
    messageParts.push('');
    messageParts.push(`--${boundary}`);
    messageParts.push('Content-Type: text/html; charset=utf-8');
    messageParts.push('');
    messageParts.push(request.html!);
    messageParts.push('');
    messageParts.push(`--${boundary}--`);

    message = messageParts.join('\r\n');
  } else {
    // Single-part email (backwards compatible)
    const htmlBody = request.html || request.body || '';
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
    messageParts.push(htmlBody);

    message = messageParts.join('\r\n');
  }

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

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

/**
 * Create a Gmail draft
 * Sprint 16 Phase B+: AI Email Draft Workflow
 */
export async function createGmailDraft(
  userId: string,
  request: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    cc?: string;
    inReplyTo?: string;
    threadId?: string;
  }
): Promise<{ draftId: string; gmailUrl: string }> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  // Build RFC 2822 multipart/alternative message
  const boundary = `boundary_draft_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const messageParts = [
    `To: ${request.to}`,
    `Subject: ${request.subject}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    'MIME-Version: 1.0',
  ];

  if (request.cc) {
    messageParts.push(`Cc: ${request.cc}`);
  }

  if (request.inReplyTo) {
    messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
    messageParts.push(`References: ${request.inReplyTo}`);
  }

  messageParts.push('');
  messageParts.push(`--${boundary}`);
  messageParts.push('Content-Type: text/plain; charset=utf-8');
  messageParts.push('');
  messageParts.push(request.textBody);
  messageParts.push('');
  messageParts.push(`--${boundary}`);
  messageParts.push('Content-Type: text/html; charset=utf-8');
  messageParts.push('');
  messageParts.push(request.htmlBody);
  messageParts.push('');
  messageParts.push(`--${boundary}--`);

  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const draftOptions: any = {
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedMessage,
      },
    },
  };

  if (request.threadId) {
    draftOptions.requestBody.message.threadId = request.threadId;
  }

  const response = await gmail.users.drafts.create(draftOptions);

  const draftId = response.data.id!;
  const gmailUrl = `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;

  return { draftId, gmailUrl };
}
