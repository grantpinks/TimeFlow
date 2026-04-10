import type { Identity } from '@timeflow/shared';

/**
 * Theme buckets: if the identity name matches a fragment, these extra keywords
 * boost scoring when they appear in the email (from + subject + snippet).
 */
const THEME_BUCKETS: { fragments: string[]; keywords: string[] }[] = [
  {
    fragments: ['professional', 'career', 'work'],
    keywords: [
      'meeting',
      'deadline',
      'client',
      'project',
      'quarterly',
      'performance',
      'resume',
      'linkedin',
      'interview',
      'offer',
      'salary',
      'manager',
      'stakeholder',
      'deliverable',
      'sprint',
      'standup',
    ],
  },
  {
    fragments: ['personal growth', 'growth'],
    keywords: ['habit', 'goal', 'reflection', 'journal', 'coach', 'therapy', 'improve'],
  },
  {
    fragments: ['health', 'fitness', 'athlete'],
    keywords: [
      'workout',
      'gym',
      'doctor',
      'appointment',
      'run',
      'nutrition',
      'sleep',
      'steps',
      'training',
      'marathon',
      'yoga',
      'medical',
      'prescription',
    ],
  },
  {
    fragments: ['creative', 'writer', 'artist'],
    keywords: ['draft', 'portfolio', 'design', 'album', 'publish', 'blog', 'story', 'script'],
  },
  {
    fragments: ['financial', 'money', 'wealth'],
    keywords: [
      'invoice',
      'payment',
      'stripe',
      'paypal',
      'subscription',
      'receipt',
      'tax',
      '401k',
      'investment',
      'bank',
      'mortgage',
      'budget',
      'refund',
      'billing',
    ],
  },
  {
    fragments: ['relationship', 'social', 'family'],
    keywords: ['wedding', 'birthday', 'party', 'dinner', 'mom', 'dad', 'kids', 'friend'],
  },
  {
    fragments: ['learning', 'knowledge', 'student'],
    keywords: ['course', 'class', 'homework', 'exam', 'textbook', 'lecture', 'certification'],
  },
  {
    fragments: ['mindfulness', 'spiritual', 'meditation'],
    keywords: ['meditation', 'retreat', 'mindful', 'breath', 'yoga', 'zen'],
  },
  {
    fragments: ['home', 'environment'],
    keywords: ['lease', 'rent', 'mortgage', 'contractor', 'repair', 'furniture', 'move'],
  },
  {
    fragments: ['adventure', 'travel'],
    keywords: ['flight', 'hotel', 'itinerary', 'booking', 'trip', 'vacation', 'airline'],
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s/\\[\]()@,.:;'"!?<>+=&|]+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ''))
    .filter((w) => w.length >= 3);
}

/**
 * MVP: score identities by keyword overlap on sender + subject + snippet,
 * plus themed keyword buckets matched to identity name fragments.
 */
export function suggestIdentityFromEmail(params: {
  identities: Identity[];
  from: string;
  subject: string;
  snippet?: string;
}): { identityId: string | null; hint: string | null } {
  const { identities, from, subject, snippet = '' } = params;
  const active = identities.filter((i) => i.isActive !== false);
  if (active.length === 0) {
    return { identityId: null, hint: null };
  }

  const corpus = `${from} ${subject} ${snippet}`.toLowerCase();

  let best: { id: string; score: number; hint: string } | null = null;

  for (const identity of active) {
    const name = identity.name.toLowerCase();
    let score = 0;
    const hints: string[] = [];

    for (const word of tokenize(identity.name)) {
      if (word.length >= 3 && corpus.includes(word)) {
        score += 3;
        hints.push(word);
      }
    }

    for (const word of tokenize(identity.description || '')) {
      if (word.length >= 4 && corpus.includes(word)) {
        score += 1;
      }
    }

    for (const bucket of THEME_BUCKETS) {
      if (!bucket.fragments.some((f) => name.includes(f))) continue;
      for (const kw of bucket.keywords) {
        if (corpus.includes(kw)) {
          score += 2;
          if (hints.length < 4 && !hints.includes(kw)) hints.push(kw);
        }
      }
    }

    if (!best || score > best.score) {
      best = {
        id: identity.id,
        score,
        hint: hints.length ? `Matched: ${hints.slice(0, 3).join(', ')}` : '',
      };
    }
  }

  // Avoid weak matches (e.g. one generic keyword like "meeting" = 2 pts).
  if (!best || best.score < 4) {
    return { identityId: null, hint: null };
  }

  return {
    identityId: best.id,
    hint: best.hint || 'Suggested from sender and subject',
  };
}
