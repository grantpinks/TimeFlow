import OpenAI from 'openai';
import type { FullEmailMessage, EmailCategory } from '@timeflow/shared';
import { env } from '../config/env.js';
import { getPromptManager } from './promptManager.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const promptManager = getPromptManager();

type TaskDraft = {
  title: string;
  description: string;
  priority: 1 | 2 | 3;
  dueDate: string | null;
  reason?: string;
};

type LabelDraft = {
  categoryId: EmailCategory;
  reason: string;
};

type LabelExplanationDraft = {
  explanation: string;
};

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizePriority(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  return 2;
}

function normalizeDueDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return value;
}

function ensureTitle(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function ensureDescription(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

async function callInboxLlm(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: 400,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  return response.choices[0]?.message?.content ?? null;
}

export async function draftTaskFromEmail(email: FullEmailMessage): Promise<{
  draft: TaskDraft;
  confirmCta: string;
}> {
  const systemPrompt = promptManager.getAuxPrompt('inbox-task');
  const userPrompt = [
    'EMAIL:',
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Snippet: ${email.snippet || 'None'}`,
  ].join('\n');

  try {
    const content = await callInboxLlm(systemPrompt, userPrompt);
    const parsed = content ? safeJsonParse<TaskDraft>(content) : null;
    const fallbackTitle = email.subject || 'Email follow-up';
    const fallbackDescription = email.snippet || 'Follow up on this email.';

    const draft: TaskDraft = {
      title: ensureTitle(parsed?.title, fallbackTitle),
      description: ensureDescription(parsed?.description, fallbackDescription),
      priority: normalizePriority(parsed?.priority),
      dueDate: normalizeDueDate(parsed?.dueDate),
      reason: typeof parsed?.reason === 'string' ? parsed.reason : undefined,
    };

    return {
      draft,
      confirmCta: 'Want me to create this task?',
    };
  } catch (error) {
    return {
      draft: {
        title: email.subject || 'Email follow-up',
        description: email.snippet || 'Follow up on this email.',
        priority: 2,
        dueDate: null,
      },
      confirmCta: 'Want me to create this task?',
    };
  }
}

export async function draftLabelSync(
  email: FullEmailMessage,
  categories: { id: EmailCategory; name: string }[]
): Promise<{ draft: LabelDraft; confirmCta: string }> {
  const systemPrompt = promptManager.getAuxPrompt('inbox-label-sync');
  const categoryList = categories.map((cat) => `- ${cat.name} (ID: ${cat.id})`).join('\n');
  const userPrompt = [
    'EMAIL:',
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Snippet: ${email.snippet || 'None'}`,
    '',
    'CATEGORIES:',
    categoryList,
  ].join('\n');

  const fallbackCategory = categories.find((cat) => cat.id === email.category) || categories[0];

  try {
    const content = await callInboxLlm(systemPrompt, userPrompt);
    const parsed = content ? safeJsonParse<LabelDraft>(content) : null;
    const validCategory = categories.find((cat) => cat.id === parsed?.categoryId);
    const draft: LabelDraft = {
      categoryId: validCategory?.id || fallbackCategory?.id || 'other',
      reason: typeof parsed?.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim()
        : 'Matches the email content and sender context.',
    };

    return {
      draft,
      confirmCta: 'Want me to apply this label?',
    };
  } catch (error) {
    return {
      draft: {
        categoryId: fallbackCategory?.id || 'other',
        reason: 'Matches the email content and sender context.',
      },
      confirmCta: 'Want me to apply this label?',
    };
  }
}

export async function draftLabelExplanation(
  email: FullEmailMessage,
  categoryName: string
): Promise<{ draft: LabelExplanationDraft; confirmCta: string }> {
  const systemPrompt = promptManager.getAuxPrompt('inbox-label-why');
  const userPrompt = [
    `Category: ${categoryName}`,
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Snippet: ${email.snippet || 'None'}`,
  ].join('\n');

  try {
    const content = await callInboxLlm(systemPrompt, userPrompt);
    const parsed = content ? safeJsonParse<LabelExplanationDraft>(content) : null;
    const explanation =
      typeof parsed?.explanation === 'string' && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : `Labeled as ${categoryName} based on the sender and content.`;

    return {
      draft: { explanation },
      confirmCta: 'Want me to save this explanation?',
    };
  } catch (error) {
    return {
      draft: {
        explanation: `Labeled as ${categoryName} based on the sender and content.`,
      },
      confirmCta: 'Want me to save this explanation?',
    };
  }
}
