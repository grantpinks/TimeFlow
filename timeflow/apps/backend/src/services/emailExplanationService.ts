/**
 * Email Explanation Service
 *
 * Provides transparent explanations for why emails are categorized.
 * Hierarchy: Override > Domain > Keywords > Gmail Labels
 */

import type { EmailCategory } from '@timeflow/shared';
import { EMAIL_CATEGORIES } from './emailCategorizationService.js';
import { findOverrideForSender, findOverrideForThread } from './emailOverrideService.js';

export interface EmailCategoryExplanation {
  category: EmailCategory;
  source: 'override' | 'domain' | 'keywords' | 'gmailLabel' | 'default';
  reason: string;
  details: {
    matchedValue?: string; // Sender email, domain, or keyword
    overrideType?: 'sender' | 'domain' | 'threadId';
    matchedKeywords?: string[];
    gmailLabel?: string;
  };
}

export async function explainCategorization(
  userId: string,
  email: {
    id: string;
    threadId?: string;
    from: string;
    subject: string;
    snippet?: string;
    labels: string[];
    category: EmailCategory;
  }
): Promise<EmailCategoryExplanation> {
  const fromAddress = extractEmailAddress(email.from.toLowerCase());
  const domain = extractDomain(fromAddress);

  // 1. Check for thread-specific override
  if (email.threadId) {
    const threadOverride = await findOverrideForThread(userId, email.threadId);
    if (threadOverride) {
      return {
        category: email.category,
        source: 'override',
        reason: `You manually set this conversation to "${email.category}"`,
        details: {
          overrideType: 'threadId',
          matchedValue: email.threadId,
        },
      };
    }
  }

  // 2. Check for sender override
  const senderOverride = await findOverrideForSender(userId, fromAddress);
  if (senderOverride) {
    const isEmailMatch = senderOverride.overrideType === 'sender';

    return {
      category: email.category,
      source: 'override',
      reason: isEmailMatch
        ? `You set all emails from ${fromAddress} to "${email.category}"`
        : `You set all emails from @${domain} to "${email.category}"`,
      details: {
        overrideType: senderOverride.overrideType as 'sender' | 'domain',
        matchedValue: senderOverride.overrideValue,
      },
    };
  }

  // Guard clause: Check if category exists in EMAIL_CATEGORIES
  const categoryConfig = EMAIL_CATEGORIES[email.category];
  if (!categoryConfig) {
    // Invalid or unknown category - return default explanation
    return {
      category: email.category,
      source: 'default',
      reason: `Unknown category type`,
      details: {},
    };
  }

  // 3. Check Gmail labels
  if (categoryConfig.gmailLabels) {
    for (const label of categoryConfig.gmailLabels) {
      if (email.labels.includes(label)) {
        return {
          category: email.category,
          source: 'gmailLabel',
          reason: `Based on Gmail's "${label.replace('CATEGORY_', '')}" label`,
          details: {
            gmailLabel: label,
          },
        };
      }
    }
  }

  // 4. Check domain match
  if (categoryConfig.domains) {
    for (const configDomain of categoryConfig.domains) {
      if (domain.includes(configDomain)) {
        return {
          category: email.category,
          source: 'domain',
          reason: `Based on sender domain @${domain}`,
          details: {
            matchedValue: domain,
          },
        };
      }
    }
  }

  // 5. Check keyword match
  const subject = email.subject.toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const matchedKeywords: string[] = [];

  if (categoryConfig.keywords) {
    for (const keyword of categoryConfig.keywords) {
      if (subject.includes(keyword) || snippet.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      category: email.category,
      source: 'keywords',
      reason: `Based on keywords: ${matchedKeywords.slice(0, 3).join(', ')}${matchedKeywords.length > 3 ? '...' : ''}`,
      details: {
        matchedKeywords,
      },
    };
  }

  // 6. Default fallback
  return {
    category: email.category,
    source: 'default',
    reason: `Default categorization (no specific match found)`,
    details: {},
  };
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1].toLowerCase() : from.toLowerCase();
}

function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : email;
}
