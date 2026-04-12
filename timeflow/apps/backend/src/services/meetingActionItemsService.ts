/**
 * AI extraction of follow-up tasks from a calendar meeting context (roadmap 18.33).
 */

import OpenAI from 'openai';
import { env } from '../config/env.js';

export interface IdentityForExtraction {
  id: string;
  name: string;
  icon: string;
}

export interface ExtractedMeetingActionItem {
  title: string;
  identityId: string | null;
}

export async function extractMeetingActionItems(params: {
  meetingTitle: string;
  meetingDescription?: string;
  startIso: string;
  endIso: string;
  attendeeEmails: string[];
  identities: IdentityForExtraction[];
}): Promise<ExtractedMeetingActionItem[]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';

  const { meetingTitle, meetingDescription, startIso, endIso, attendeeEmails, identities } =
    params;

  const identityLines =
    identities.length > 0
      ? identities.map((i) => `- id: ${i.id} | name: ${i.name} | icon: ${i.icon}`).join('\n')
      : '(User has no identities — use identityId null for every item.)';

  const userContent = `Meeting title: ${meetingTitle}
Scheduled: ${startIso} → ${endIso}
Attendees: ${attendeeEmails.length ? attendeeEmails.join(', ') : '(none listed)'}
Description / notes:
${meetingDescription?.trim() || '(none)'}

User identities (choose the best fit per item by id, or null if none apply):
${identityLines}`;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract concrete follow-up tasks from calendar meeting context.
Return JSON only: { "items": [ { "title": string, "identityId": string | null } ] }

Rules:
- 1–10 items. Short imperative titles (under 120 characters).
- identityId must be exactly one of the provided ids, or null.
- No duplicate or near-duplicate titles.
- If there is nothing actionable, return { "items": [] }.
- Do not invent tasks unrelated to the meeting title/description.`,
      },
      { role: 'user', content: userContent },
    ],
    temperature: 0.25,
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Empty AI response');
  }

  const parsed = JSON.parse(raw) as { items?: { title?: string; identityId?: string | null }[] };
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const validIds = new Set(identities.map((i) => i.id));

  return items
    .filter((i) => typeof i.title === 'string' && i.title.trim().length > 0)
    .map((i) => ({
      title: i.title!.trim().slice(0, 500),
      identityId:
        typeof i.identityId === 'string' && validIds.has(i.identityId) ? i.identityId : null,
    }));
}
