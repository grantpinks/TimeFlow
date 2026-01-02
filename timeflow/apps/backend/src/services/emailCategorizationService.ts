/**
 * Email Categorization Service
 *
 * Automatically categorizes emails into 10 categories using:
 * 1. Gmail labels (CATEGORY_* labels)
 * 2. Keyword matching in sender, subject, and snippet
 * 3. Domain pattern recognition
 */

import type { EmailCategory, EmailMessage } from '@timeflow/shared';

/**
 * Email category configuration with colors, keywords, and patterns
 */
export interface EmailCategoryConfig {
  id: EmailCategory;
  name: string;
  color: string; // Hex color code
  icon: string; // Icon identifier for UI
  keywords: string[]; // Keywords to match in subject/body
  domains: string[]; // Domain patterns to match in sender
  gmailLabels?: string[]; // Gmail labels that indicate this category
  enabled?: boolean; // Whether the category is visible/active for the user
  description?: string;
  emoji?: string;
  gmailSyncEnabled?: boolean; // Whether Gmail label sync is enabled for this category
  gmailLabelName?: string;
  gmailLabelColor?: string;
}

/**
 * Predefined email category configurations
 */
export const EMAIL_CATEGORIES: Record<EmailCategory, EmailCategoryConfig> = {
  personal: {
    id: 'personal',
    name: 'Personal',
    color: '#3B82F6', // Blue
    icon: 'user',
    enabled: true,
    keywords: ['family', 'friend', 'personal', 'birthday', 'wedding', 'party', 'dinner'],
    domains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'],
    gmailLabels: ['CATEGORY_PERSONAL'],
  },
  work: {
    id: 'work',
    name: 'Work',
    color: '#8B5CF6', // Purple
    icon: 'briefcase',
    enabled: true,
    keywords: [
      'meeting',
      'deadline',
      'project',
      'team',
      'presentation',
      'report',
      'urgent',
      'action required',
      'interview',
      'coffee chat',
      'coffee',
      'connect',
      'follow up',
      'follow-up',
      'schedule',
      'availability',
      'calendar invite',
      'invite',
      '1:1',
    ],
    domains: [],
    gmailLabels: [],
  },
  promotion: {
    id: 'promotion',
    name: 'Promotion',
    color: '#EC4899', // Pink
    icon: 'tag',
    enabled: true,
    keywords: ['sale', 'discount', 'offer', 'deal', 'promo', 'limited time', '% off', 'coupon', 'save now'],
    domains: [],
    gmailLabels: ['CATEGORY_PROMOTIONS'],
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    color: '#F59E0B', // Amber
    icon: 'shopping-cart',
    enabled: true,
    keywords: ['order', 'shipment', 'delivery', 'tracking', 'cart', 'purchase', 'receipt', 'confirmation', 'shipped'],
    domains: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com'],
    gmailLabels: [],
  },
  social: {
    id: 'social',
    name: 'Social',
    color: '#10B981', // Green
    icon: 'users',
    enabled: true,
    keywords: ['commented', 'liked', 'followed', 'mentioned', 'tagged', 'notification', 'activity'],
    domains: ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'reddit.com', 'pinterest.com'],
    gmailLabels: ['CATEGORY_SOCIAL'],
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    color: '#06B6D4', // Cyan
    icon: 'dollar-sign',
    enabled: true,
    keywords: ['payment', 'invoice', 'receipt', 'bank', 'credit card', 'transaction', 'balance', 'statement', 'billing'],
    domains: ['paypal.com', 'stripe.com', 'square.com', 'venmo.com'],
    gmailLabels: [],
  },
  travel: {
    id: 'travel',
    name: 'Travel',
    color: '#14B8A6', // Teal
    icon: 'plane',
    enabled: true,
    keywords: [
      'flight',
      'hotel',
      'booking',
      'reservation',
      'reservation number',
      'confirmation',
      'confirmation number',
      'check-in',
      'check in',
      'itinerary',
      'trip',
      'travel',
      'boarding pass',
      'gate',
      'terminal',
      'seat',
      'car rental',
    ],
    domains: [
      'airbnb.com',
      'booking.com',
      'expedia.com',
      'hotels.com',
      'kayak.com',
      'priceline.com',
      'travelocity.com',
      'delta.com',
      'united.com',
      'aa.com',
      'southwest.com',
      'marriott.com',
      'hilton.com',
      'hyatt.com',
    ],
    gmailLabels: [],
  },
  newsletter: {
    id: 'newsletter',
    name: 'Newsletter',
    color: '#6366F1', // Indigo
    icon: 'mail',
    enabled: true,
    keywords: [
      'newsletter',
      'digest',
      'weekly',
      'monthly',
      'roundup',
      'subscription',
      'unsubscribe',
      'edition',
      'issue',
      'view in browser',
      'daily brief',
    ],
    domains: ['morningbrew.com', 'substack.com', 'mailchimp.com', 'convertkit.com', 'medium.com'],
    gmailLabels: [],
  },
  updates: {
    id: 'updates',
    name: 'Updates',
    color: '#A855F7', // Purple-light
    icon: 'bell',
    enabled: true,
    keywords: [
      'update',
      'notification',
      'alert',
      'reminder',
      'security',
      'verify',
      'verification',
      'confirm',
      'activate',
      'password',
      'reset',
      'login',
      'sign-in',
      'policy',
    ],
    domains: [],
    gmailLabels: ['CATEGORY_UPDATES'],
  },
  other: {
    id: 'other',
    name: 'Other',
    color: '#64748B', // Slate
    icon: 'inbox',
    enabled: true,
    keywords: [],
    domains: [],
    gmailLabels: [],
  },
};

/**
 * Normalize a category identifier from name or id to EmailCategory.
 */
export function normalizeEmailCategoryId(value?: string | null): EmailCategory | null {
  if (!value) return null;
  const needle = value.toLowerCase();
  const entry = Object.values(EMAIL_CATEGORIES).find(
    (category) => category.id === needle || category.name.toLowerCase() === needle
  );
  return entry ? entry.id : null;
}

export function scoreEmailCategory(
  email: Pick<EmailMessage, 'from' | 'subject' | 'snippet' | 'labels'>
): { category: EmailCategory; confidence: number } {
  const fromText = email.from.toLowerCase();
  const fromAddress = extractEmailAddress(fromText);
  const subject = email.subject.toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const labels = email.labels || [];

  for (const [categoryId, config] of Object.entries(EMAIL_CATEGORIES)) {
    if (config.gmailLabels && config.gmailLabels.length > 0) {
      for (const label of config.gmailLabels) {
        if (labels.includes(label)) {
          return { category: categoryId as EmailCategory, confidence: 0.9 };
        }
      }
    }
  }

  for (const [categoryId, config] of Object.entries(EMAIL_CATEGORIES)) {
    if (config.domains && config.domains.length > 0) {
      for (const domain of config.domains) {
        if (fromAddress.includes(domain)) {
          return { category: categoryId as EmailCategory, confidence: 0.85 };
        }
      }
    }
  }

  const categoryScores: Record<EmailCategory, number> = {
    personal: 0,
    work: 0,
    promotion: 0,
    shopping: 0,
    social: 0,
    finance: 0,
    travel: 0,
    newsletter: 0,
    updates: 0,
    other: 0,
  };

  for (const [categoryId, config] of Object.entries(EMAIL_CATEGORIES)) {
    if (config.keywords && config.keywords.length > 0) {
      for (const keyword of config.keywords) {
        if (subject.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 3;
        }
        if (snippet.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 2;
        }
        if (fromText.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 1;
        }
      }
    }
  }

  let maxScore = 0;
  let bestCategory: EmailCategory = 'other';

  for (const [categoryId, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = categoryId as EmailCategory;
    }
  }

  if (maxScore >= 4) {
    return { category: bestCategory, confidence: 0.75 };
  }

  if (maxScore >= 3) {
    return { category: bestCategory, confidence: 0.65 };
  }

  if (maxScore >= 2) {
    return { category: bestCategory, confidence: 0.55 };
  }

  const corporateDomainPattern = /[a-z0-9]+@[a-z0-9-]+\.(com|io|net|org|co)$/i;
  const isGenericDomain = /(gmail|yahoo|hotmail|outlook|icloud)\.com/i.test(fromAddress);
  const placeholderDomainPattern = /@(example\.com|example\.org|example\.net|test\.com|localhost)$/i;

  if (maxScore === 0 && placeholderDomainPattern.test(fromAddress)) {
    return { category: 'other', confidence: 0.3 };
  }

  if (corporateDomainPattern.test(fromAddress) && !isGenericDomain && maxScore === 0) {
    return { category: 'work', confidence: 0.55 };
  }

  if (
    (subject.includes('edition') ||
      subject.includes('issue') ||
      subject.includes('daily brief') ||
      snippet.includes('unsubscribe') ||
      snippet.includes('view in browser') ||
      fromText.includes('newsletter') ||
      fromText.includes('noreply')) &&
    bestCategory === 'other'
  ) {
    return { category: 'newsletter', confidence: 0.6 };
  }

  if (isGenericDomain && maxScore === 0) {
    return { category: 'personal', confidence: 0.55 };
  }

  return { category: bestCategory, confidence: 0.4 };
}

export function detectNeedsResponse(input: {
  from: string;
  subject: string;
  snippet?: string;
}): { needsResponse: boolean; confidence: number } {
  const subject = input.subject.toLowerCase();
  const snippet = (input.snippet || '').toLowerCase();
  const combined = `${subject} ${snippet}`;

  let score = 0;

  const strongPhrases = [
    'please reply',
    'please respond',
    'reply needed',
    'respond by',
    'rsvp',
    'can you',
    'could you',
    'let me know',
    'schedule',
    'availability',
    'coffee chat',
    'interview',
    'quick question',
  ];

  for (const phrase of strongPhrases) {
    if (combined.includes(phrase)) {
      score += 2;
    }
  }

  if (combined.includes('?')) {
    score += 1;
  }

  const meetingSignals = ['meeting', 'call', 'chat', 'connect', 'follow up', 'follow-up'];
  if (meetingSignals.some((signal) => combined.includes(signal))) {
    score += 1;
  }

  const needsResponse = score >= 2;
  const confidence = Math.min(0.9, 0.5 + score * 0.1);

  return { needsResponse, confidence };
}

const RULE_CONFIDENCE_THRESHOLD = 0.6;
const AI_CONFIDENCE_THRESHOLD = 0.7;

export async function scoreEmailCategoryWithFallback(
  email: Pick<EmailMessage, 'from' | 'subject' | 'snippet' | 'labels'>
): Promise<{ category: EmailCategory; confidence: number; usedAi: boolean }> {
  const rulesResult = scoreEmailCategory(email);
  if (rulesResult.confidence >= RULE_CONFIDENCE_THRESHOLD) {
    return { ...rulesResult, usedAi: false };
  }

  const { categorizeEmailWithAI } = await import('./aiEmailCategorizationService.js');
  const aiResult = await categorizeEmailWithAI({
    from: email.from,
    subject: email.subject,
    snippet: email.snippet,
  });

  if (aiResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
    return { category: aiResult.categoryId, confidence: aiResult.confidence, usedAi: true };
  }

  return { ...rulesResult, usedAi: false };
}

export async function detectNeedsResponseWithFallback(input: {
  from: string;
  subject: string;
  snippet?: string;
}): Promise<{ needsResponse: boolean; confidence: number; usedAi: boolean }> {
  const rulesResult = detectNeedsResponse(input);
  if (rulesResult.confidence >= RULE_CONFIDENCE_THRESHOLD) {
    return { ...rulesResult, usedAi: false };
  }

  const { detectNeedsResponseWithAI } = await import('./aiEmailCategorizationService.js');
  const aiResult = await detectNeedsResponseWithAI(input);

  if (aiResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
    return { needsResponse: aiResult.needsResponse, confidence: aiResult.confidence, usedAi: true };
  }

  return { ...rulesResult, usedAi: false };
}

/**
 * Categorize an email based on Gmail labels, keywords, and patterns
 */
export function categorizeEmail(email: Pick<EmailMessage, 'from' | 'subject' | 'snippet' | 'labels'>): EmailCategory {
  return scoreEmailCategory(email).category;
}

/**
 * Categorize multiple emails at once (batch processing)
 */
export function categorizeEmails(emails: EmailMessage[]): EmailMessage[] {
  return emails.map(email => ({
    ...email,
    category: categorizeEmail(email),
  }));
}

function extractEmailAddress(rawFrom: string): string {
  const bracketMatch = rawFrom.match(/<([^>]+)>/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }

  const directMatch = rawFrom.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (directMatch && directMatch[0]) {
    return directMatch[0];
  }

  return rawFrom;
}

/**
 * Get category configuration by ID
 */
export function getCategoryConfig(category: EmailCategory): EmailCategoryConfig {
  return EMAIL_CATEGORIES[category];
}

/**
 * Get all category configurations
 */
export function getAllCategoryConfigs(): EmailCategoryConfig[] {
  return Object.values(EMAIL_CATEGORIES);
}

/**
 * Filter emails by category
 */
export function filterEmailsByCategory(
  emails: EmailMessage[],
  category: EmailCategory
): EmailMessage[] {
  return emails.filter(email => email.category === category);
}

/**
 * Group emails by category
 */
export function groupEmailsByCategory(
  emails: EmailMessage[]
): Record<EmailCategory, EmailMessage[]> {
  const grouped: Record<EmailCategory, EmailMessage[]> = {
    personal: [],
    work: [],
    promotion: [],
    shopping: [],
    social: [],
    finance: [],
    travel: [],
    newsletter: [],
    updates: [],
    other: [],
  };

  for (const email of emails) {
    const category = email.category || 'other';
    grouped[category].push(email);
  }

  return grouped;
}

/**
 * Get category statistics for a list of emails
 */
export function getCategoryStatistics(
  emails: EmailMessage[]
): Record<EmailCategory, { count: number; unreadCount: number }> {
  const stats: Record<EmailCategory, { count: number; unreadCount: number }> = {
    personal: { count: 0, unreadCount: 0 },
    work: { count: 0, unreadCount: 0 },
    promotion: { count: 0, unreadCount: 0 },
    shopping: { count: 0, unreadCount: 0 },
    social: { count: 0, unreadCount: 0 },
    finance: { count: 0, unreadCount: 0 },
    travel: { count: 0, unreadCount: 0 },
    newsletter: { count: 0, unreadCount: 0 },
    updates: { count: 0, unreadCount: 0 },
    other: { count: 0, unreadCount: 0 },
  };

  for (const email of emails) {
    const category = email.category || 'other';
    stats[category].count++;
    if (!email.isRead) {
      stats[category].unreadCount++;
    }
  }

  return stats;
}
