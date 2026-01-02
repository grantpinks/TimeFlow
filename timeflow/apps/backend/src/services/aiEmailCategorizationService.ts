import OpenAI from 'openai';
import type { EmailCategory } from '@timeflow/shared';
import { env } from '../config/env.js';
import { EMAIL_CATEGORIES } from './emailCategorizationService.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

type EmailInput = {
  from: string;
  subject: string;
  snippet?: string;
};

type AiCategoryResult = {
  categoryId: EmailCategory;
  confidence: number;
  reasoning: string;
};

type AiNeedsResponseResult = {
  needsResponse: boolean;
  confidence: number;
  reasoning: string;
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildCategoryOptions(): string {
  return Object.values(EMAIL_CATEGORIES)
    .map((category) => `- ${category.name} (ID: ${category.id})`)
    .join('\n');
}

export async function categorizeEmailWithAI(input: EmailInput): Promise<AiCategoryResult> {
  const categoryOptions = buildCategoryOptions();
  const prompt = `Analyze this email and choose the best category.\n\nEmail:\n- From: ${input.from}\n- Subject: ${input.subject}\n- Snippet: ${input.snippet || 'None'}\n\nAvailable Categories:\n${categoryOptions}\n\nRespond in JSON ONLY:\n{\n  \"categoryId\": \"category_id_here\",\n  \"confidence\": 0.8,\n  \"reasoning\": \"brief reason\"\n}`;

  try {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      max_tokens: 300,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are an email categorization assistant. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content.trim()) as AiCategoryResult;
    const categoryExists = Object.values(EMAIL_CATEGORIES).some(
      (category) => category.id === parsed.categoryId
    );

    if (!categoryExists) {
      throw new Error('AI returned invalid category ID');
    }

    return {
      categoryId: parsed.categoryId,
      confidence: clampConfidence(parsed.confidence),
      reasoning: parsed.reasoning || 'AI categorization',
    };
  } catch (error) {
    return {
      categoryId: 'other',
      confidence: 0.1,
      reasoning: 'AI categorization failed',
    };
  }
}

export async function detectNeedsResponseWithAI(input: EmailInput): Promise<AiNeedsResponseResult> {
  const prompt = `Analyze this email and decide if it needs a reply.\n\nEmail:\n- From: ${input.from}\n- Subject: ${input.subject}\n- Snippet: ${input.snippet || 'None'}\n\nRespond in JSON ONLY:\n{\n  \"needsResponse\": true,\n  \"confidence\": 0.8,\n  \"reasoning\": \"brief reason\"\n}`;

  try {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      max_tokens: 250,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are an email assistant. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content.trim()) as AiNeedsResponseResult;
    return {
      needsResponse: Boolean(parsed.needsResponse),
      confidence: clampConfidence(parsed.confidence),
      reasoning: parsed.reasoning || 'AI response check',
    };
  } catch (error) {
    return {
      needsResponse: false,
      confidence: 0.1,
      reasoning: 'AI response check failed',
    };
  }
}
