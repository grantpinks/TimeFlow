/**
 * Email Draft Controller
 * Handles AI-powered email draft generation, preview, and sending
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { getFullEmail } from '../services/gmailService.js';
import { createGmailDraft } from '../services/gmailService.js';
import { sendEmail } from '../services/gmailService.js';
import { processMessage } from '../services/assistantService.js';
import crypto from 'crypto';
import type {
  EmailDraftRequest,
  EmailDraftResponse,
  EmailPreviewRequest,
  EmailPreviewResponse,
  CreateDraftRequest,
  CreateDraftResponse,
  WritingVoiceProfile as WritingVoiceProfileType,
} from '@timeflow/shared';

/**
 * Generate determinism token (SHA-256 hash of preview payload)
 */
function generateDeterminismToken(preview: {
  htmlPreview: string;
  textPreview: string;
  to: string;
  subject: string;
  cc?: string;
}): string {
  const payload = JSON.stringify({
    html: preview.htmlPreview,
    text: preview.textPreview,
    to: preview.to,
    subject: preview.subject,
    cc: preview.cc || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Validate email address format
 */
function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get or create writing voice profile with defaults
 */
async function getOrCreateVoiceProfile(userId: string) {
  let profile = await prisma.writingVoiceProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.writingVoiceProfile.create({
      data: {
        userId,
        formality: 5,
        length: 5,
        tone: 5,
        aiDraftsGenerated: 0,
      },
    });
  }

  return profile;
}

/**
 * Convert plain text to simple HTML email
 */
function convertTextToHtml(text: string): string {
  // Simple conversion: preserve line breaks, escape HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const withBreaks = escaped.replace(/\n/g, '<br>');

  return `<html><body><div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${withBreaks}</div></body></html>`;
}

/**
 * POST /email/draft/ai - Generate AI email draft
 */
export async function generateEmailDraft(
  request: FastifyRequest<{ Body: EmailDraftRequest }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { emailId, voicePreferences, additionalContext } = request.body;

  if (!emailId) {
    return reply.status(400).send({ error: 'emailId is required' });
  }

  try {
    // Check Gmail connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.googleAccessToken) {
      return reply.status(403).send({
        error: 'Gmail account not connected. Please connect in Settings.',
        code: 'GMAIL_NOT_CONNECTED',
      });
    }

    // Fetch original email
    const originalEmail = await getFullEmail(userId, emailId);
    if (!originalEmail) {
      return reply.status(404).send({ error: 'Original email not found' });
    }

    // Get or create voice profile
    const profile = await getOrCreateVoiceProfile(userId);

    // Apply voice overrides if provided
    const effectivePreferences = {
      formality: voicePreferences?.formality ?? profile.formality,
      length: voicePreferences?.length ?? profile.length,
      tone: voicePreferences?.tone ?? profile.tone,
      voiceSamples: profile.voiceSamples,
    };

    // Build context message for AI assistant
    const contextMessage = buildEmailDraftContextMessage(
      originalEmail,
      effectivePreferences,
      additionalContext
    );

    // Call assistant service with 'email-draft' mode
    // For now, we'll use a simplified approach and expand assistant service later
    // TODO: Implement proper assistant integration

    // Simplified draft generation for MVP
    const draftText = await generateDraftWithLLM(
      originalEmail,
      effectivePreferences,
      additionalContext
    );

    // Validate draft
    if (!draftText || draftText.trim().length < 10) {
      throw new Error('Generated draft was too short. Please try again.');
    }

    // Increment usage counter
    await prisma.writingVoiceProfile.update({
      where: { userId },
      data: {
        aiDraftsGenerated: { increment: 1 },
      },
    });

    // Extract recipient
    const recipientMatch = originalEmail.from.match(/<(.+?)>/);
    const to = recipientMatch ? recipientMatch[1] : originalEmail.from;

    // Build subject
    const subject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    const response: EmailDraftResponse = {
      draftText,
      to,
      subject,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: process.env.LLM_MODEL || 'gpt-4o',
      },
    };

    // Safe logging (no email content)
    console.log('[EmailDraft] Draft generated', {
      userId,
      emailId,
      draftLength: draftText.length,
    });

    return reply.send(response);
  } catch (error) {
    console.error('[EmailDraft] Generation failed', {
      userId,
      emailId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message.includes('timeout')) {
      return reply.status(500).send({
        error: 'AI service is taking too long. Please try again.',
      });
    }

    return reply.status(500).send({
      error: 'Failed to generate draft. Please try again.',
    });
  }
}

/**
 * POST /email/draft/preview - Generate deterministic preview
 */
export async function generateEmailPreview(
  request: FastifyRequest<{ Body: EmailPreviewRequest }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { draftText, to, subject, cc, inReplyTo, threadId } = request.body;

  // Validate inputs
  if (!draftText || !to || !subject) {
    return reply.status(400).send({
      error: 'draftText, to, and subject are required',
    });
  }

  if (!validateEmailAddress(to)) {
    return reply.status(400).send({ error: 'Invalid recipient email address' });
  }

  if (cc && !validateEmailAddress(cc)) {
    return reply.status(400).send({ error: 'Invalid CC email address' });
  }

  try {
    // Convert plain text to HTML
    const htmlPreview = convertTextToHtml(draftText);
    const textPreview = draftText;

    // Generate determinism token
    const determinismToken = generateDeterminismToken({
      htmlPreview,
      textPreview,
      to,
      subject,
      cc,
    });

    const response: EmailPreviewResponse = {
      htmlPreview,
      textPreview,
      determinismToken,
      previewedAt: new Date().toISOString(),
    };

    console.log('[EmailDraft] Preview generated', {
      userId,
      tokenPrefix: determinismToken.substring(0, 8),
    });

    return reply.send(response);
  } catch (error) {
    console.error('[EmailDraft] Preview generation failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return reply.status(500).send({
      error: 'Failed to generate preview. Please try again.',
    });
  }
}

/**
 * POST /email/drafts - Create Gmail draft or send email
 */
export async function createOrSendDraft(
  request: FastifyRequest<{ Body: CreateDraftRequest }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const {
    action,
    htmlPreview,
    textPreview,
    determinismToken,
    to,
    subject,
    cc,
    inReplyTo,
    threadId,
    confirmed,
  } = request.body;

  // Validate required fields
  if (!action || !htmlPreview || !textPreview || !determinismToken || !to || !subject) {
    return reply.status(400).send({
      error: 'Missing required fields',
    });
  }

  // CRITICAL: Verify confirmation checkbox
  if (confirmed !== true) {
    return reply.status(400).send({
      error: 'Confirmation required before sending',
    });
  }

  // CRITICAL: Validate determinism token
  const expectedToken = generateDeterminismToken({
    htmlPreview,
    textPreview,
    to,
    subject,
    cc,
  });

  if (determinismToken !== expectedToken) {
    console.warn('[EmailDraft] Determinism token mismatch', {
      userId,
      expected: expectedToken.substring(0, 8),
      received: determinismToken.substring(0, 8),
    });

    return reply.status(400).send({
      error: 'Preview validation failed. Please regenerate preview.',
    });
  }

  try {
    if (action === 'send') {
      // Send email via Gmail
      const sendResult = await sendEmail(userId, {
        to,
        subject,
        html: htmlPreview,
        text: textPreview,
        inReplyTo,
        threadId,
      });

      const response: CreateDraftResponse = {
        success: true,
        messageId: sendResult.messageId,
        threadId: sendResult.threadId,
      };

      console.log('[EmailDraft] Email sent', {
        userId,
        messageId: sendResult.messageId,
      });

      return reply.send(response);
    } else if (action === 'create_draft') {
      // Create Gmail draft
      const { draftId, gmailUrl } = await createGmailDraft(userId, {
        to,
        subject,
        htmlBody: htmlPreview,
        textBody: textPreview,
        cc,
        inReplyTo,
        threadId,
      });

      const response: CreateDraftResponse = {
        success: true,
        draftId,
        gmailUrl,
      };

      console.log('[EmailDraft] Draft created', {
        userId,
        draftId,
      });

      return reply.send(response);
    } else {
      return reply.status(400).send({
        error: 'Invalid action. Must be "send" or "create_draft"',
      });
    }
  } catch (error) {
    console.error('[EmailDraft] Send/create draft failed', {
      userId,
      action,
      error: error instanceof Error ? error.message : String(error),
    });

    return reply.status(500).send({
      error: 'Failed to process request. Please try again.',
    });
  }
}

/**
 * GET /user/writing-voice - Get writing voice profile
 */
export async function getWritingVoice(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    // Auto-create profile if missing
    const profile = await getOrCreateVoiceProfile(userId);

    const response: WritingVoiceProfileType = {
      formality: profile.formality,
      length: profile.length,
      tone: profile.tone,
      voiceSamples: profile.voiceSamples,
      aiDraftsGenerated: profile.aiDraftsGenerated,
    };

    return reply.send(response);
  } catch (error) {
    console.error('[EmailDraft] Get voice profile failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return reply.status(500).send({
      error: 'Failed to retrieve voice profile',
    });
  }
}

/**
 * PUT /user/writing-voice - Update writing voice profile
 */
export async function updateWritingVoice(
  request: FastifyRequest<{
    Body: {
      formality?: number;
      length?: number;
      tone?: number;
      voiceSamples?: string;
    };
  }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { formality, length, tone, voiceSamples } = request.body;

  // Validate ranges
  if (formality !== undefined && (formality < 1 || formality > 10)) {
    return reply.status(400).send({ error: 'formality must be between 1 and 10' });
  }
  if (length !== undefined && (length < 1 || length > 10)) {
    return reply.status(400).send({ error: 'length must be between 1 and 10' });
  }
  if (tone !== undefined && (tone < 1 || tone > 10)) {
    return reply.status(400).send({ error: 'tone must be between 1 and 10' });
  }

  try {
    // Get or create profile
    await getOrCreateVoiceProfile(userId);

    // Update with provided values
    const profile = await prisma.writingVoiceProfile.update({
      where: { userId },
      data: {
        ...(formality !== undefined && { formality }),
        ...(length !== undefined && { length }),
        ...(tone !== undefined && { tone }),
        ...(voiceSamples !== undefined && { voiceSamples }),
      },
    });

    const response = {
      success: true,
      profile: {
        formality: profile.formality,
        length: profile.length,
        tone: profile.tone,
        voiceSamples: profile.voiceSamples,
        aiDraftsGenerated: profile.aiDraftsGenerated,
      },
    };

    console.log('[EmailDraft] Voice profile updated', {
      userId,
      updated: Object.keys(request.body),
    });

    return reply.send(response);
  } catch (error) {
    console.error('[EmailDraft] Update voice profile failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return reply.status(500).send({
      error: 'Failed to update voice profile',
    });
  }
}

/**
 * Helper: Build context message for AI assistant
 * TODO: Move to assistantService integration
 */
function buildEmailDraftContextMessage(
  originalEmail: any,
  preferences: any,
  additionalContext?: string
): string {
  const formalityLabel = preferences.formality <= 3 ? 'casual' :
                         preferences.formality >= 7 ? 'professional' : 'balanced';
  const lengthLabel = preferences.length <= 3 ? 'concise (2-3 sentences)' :
                      preferences.length >= 7 ? 'detailed (5-7 sentences)' : 'moderate (3-5 sentences)';
  const toneLabel = preferences.tone <= 3 ? 'friendly and warm' :
                    preferences.tone >= 7 ? 'formal and respectful' : 'professional but approachable';

  let message = `Write a reply to this email:\n\n`;
  message += `From: ${originalEmail.from}\n`;
  message += `Subject: ${originalEmail.subject}\n\n`;
  message += `${originalEmail.body}\n\n`;
  message += `---\n\n`;
  message += `Voice preferences:\n`;
  message += `- Formality: ${formalityLabel}\n`;
  message += `- Length: ${lengthLabel}\n`;
  message += `- Tone: ${toneLabel}\n`;

  if (preferences.voiceSamples) {
    message += `\nWriting style examples:\n${preferences.voiceSamples}\n`;
  }

  if (additionalContext) {
    message += `\nAdditional instructions: ${additionalContext}\n`;
  }

  return message;
}

/**
 * Helper: Generate draft with LLM
 * TODO: Integrate with assistantService properly
 */
async function generateDraftWithLLM(
  originalEmail: any,
  preferences: any,
  additionalContext?: string
): Promise<string> {
  // Placeholder implementation
  // TODO: Replace with actual assistant service integration

  const contextMessage = buildEmailDraftContextMessage(
    originalEmail,
    preferences,
    additionalContext
  );

  // For now, return a simple template
  // This will be replaced with actual LLM call
  return `Hi,

Thanks for your email. I'll review this and get back to you soon.

Best regards`;
}
