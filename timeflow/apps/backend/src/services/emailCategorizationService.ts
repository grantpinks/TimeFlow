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
    keywords: ['meeting', 'deadline', 'project', 'team', 'presentation', 'report', 'urgent', 'action required'],
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
    keywords: ['flight', 'hotel', 'booking', 'reservation', 'check-in', 'itinerary', 'trip', 'travel', 'boarding pass'],
    domains: ['airbnb.com', 'booking.com', 'expedia.com', 'uber.com', 'lyft.com'],
    gmailLabels: [],
  },
  newsletter: {
    id: 'newsletter',
    name: 'Newsletter',
    color: '#6366F1', // Indigo
    icon: 'mail',
    enabled: true,
    keywords: ['newsletter', 'digest', 'weekly', 'monthly', 'roundup', 'subscription', 'unsubscribe'],
    domains: ['substack.com', 'mailchimp.com', 'medium.com'],
    gmailLabels: [],
  },
  updates: {
    id: 'updates',
    name: 'Updates',
    color: '#A855F7', // Purple-light
    icon: 'bell',
    enabled: true,
    keywords: ['update', 'notification', 'alert', 'reminder', 'security', 'verify', 'confirm', 'activate'],
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
 * Categorize an email based on Gmail labels, keywords, and patterns
 */
export function categorizeEmail(email: Pick<EmailMessage, 'from' | 'subject' | 'snippet' | 'labels'>): EmailCategory {
  const fromText = email.from.toLowerCase();
  const fromAddress = extractEmailAddress(fromText);
  const subject = email.subject.toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const combinedText = `${fromText} ${subject} ${snippet}`;
  const labels = email.labels || [];

  // Step 1: Check Gmail labels first (highest priority)
  for (const [categoryId, config] of Object.entries(EMAIL_CATEGORIES)) {
    if (config.gmailLabels && config.gmailLabels.length > 0) {
      for (const label of config.gmailLabels) {
        if (labels.includes(label)) {
          return categoryId as EmailCategory;
        }
      }
    }
  }

  // Step 2: Check domain patterns
  for (const [categoryId, config] of Object.entries(EMAIL_CATEGORIES)) {
    if (config.domains && config.domains.length > 0) {
      for (const domain of config.domains) {
        if (fromAddress.includes(domain)) {
          return categoryId as EmailCategory;
        }
      }
    }
  }

  // Step 3: Check keywords (with scoring for better accuracy)
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
        // Check subject first (higher weight)
        if (subject.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 3;
        }
        // Check snippet (medium weight)
        if (snippet.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 2;
        }
        // Check from (lower weight, but still relevant)
        if (fromText.includes(keyword)) {
          categoryScores[categoryId as EmailCategory] += 1;
        }
      }
    }
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory: EmailCategory = 'other';

  for (const [categoryId, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = categoryId as EmailCategory;
    }
  }

  // Step 4: Special heuristics for ambiguous cases

  // If we have multiple high scores, prefer more specific categories
  // Example: "work" keywords might overlap with "updates", prefer work
  if (maxScore >= 3) {
    return bestCategory;
  }

  // If score is low (< 3), apply additional heuristics

  // Check if it's likely work-related (corporate domains)
  const corporateDomainPattern = /[a-z0-9]+@[a-z0-9-]+\.(com|io|net|org|co)$/i;
  const isGenericDomain = /(gmail|yahoo|hotmail|outlook|icloud)\.com/i.test(fromAddress);
  const placeholderDomainPattern = /@(example\.com|example\.org|example\.net|test\.com|localhost)$/i;

  if (maxScore === 0 && placeholderDomainPattern.test(fromAddress)) {
    return 'other';
  }

  if (corporateDomainPattern.test(fromAddress) && !isGenericDomain && maxScore === 0) {
    // Likely work email from corporate domain
    return 'work';
  }

  // Check for newsletter patterns
  if (
    (subject.includes('edition') ||
     subject.includes('issue') ||
     snippet.includes('unsubscribe') ||
     fromText.includes('newsletter') ||
     fromText.includes('noreply')) &&
    bestCategory === 'other'
  ) {
    return 'newsletter';
  }

  // Default to 'personal' for generic domains with low scores
  if (isGenericDomain && maxScore === 0) {
    return 'personal';
  }

  return bestCategory;
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
