/**
 * Smart Email Importance Analyzer
 *
 * Analyzes emails based on multiple signals to determine actual importance,
 * not just relying on Gmail's IMPORTANT label.
 */

interface EmailAnalysisInput {
  from: string;
  subject: string;
  snippet?: string;
  labels: string[];
  threadId?: string;
  isUnread: boolean;
}

export type EmailImportance = 'high' | 'normal' | 'low';

/**
 * Analyze email importance using multiple signals
 */
export function analyzeEmailImportance(input: EmailAnalysisInput): EmailImportance {
  let score = 0;

  // Signal 1: Gmail's own importance label (strong signal)
  if (input.labels.includes('IMPORTANT')) {
    score += 3;
  }

  // Signal 2: Sender analysis
  const senderScore = analyzeSender(input.from);
  score += senderScore;

  // Signal 3: Subject line analysis
  const subjectScore = analyzeSubject(input.subject);
  score += subjectScore;

  // Signal 4: Content patterns
  if (input.snippet) {
    const contentScore = analyzeContent(input.snippet);
    score += contentScore;
  }

  // Signal 5: Unread status (slight boost)
  if (input.isUnread) {
    score += 1;
  }

  // Signal 6: Categories (strong negative signal for promotions/social)
  if (input.labels.includes('CATEGORY_PROMOTIONS')) {
    score -= 4;
  }
  if (input.labels.includes('CATEGORY_SOCIAL')) {
    score -= 2;
  }
  if (input.labels.includes('CATEGORY_UPDATES')) {
    score -= 1;
  }

  // Convert score to importance level
  // High: 4+, Normal: 0-3, Low: < 0
  if (score >= 4) return 'high';
  if (score < 0) return 'low';
  return 'normal';
}

/**
 * Analyze sender email address and name
 */
function analyzeSender(from: string): number {
  let score = 0;
  const lowerFrom = from.toLowerCase();

  // Personal email patterns (likely important)
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const hasPersonalDomain = personalDomains.some(domain => lowerFrom.includes(`@${domain}`));

  if (hasPersonalDomain && !lowerFrom.includes('noreply') && !lowerFrom.includes('no-reply')) {
    score += 2; // Personal emails are more likely important
  }

  // Automated/no-reply senders (less important)
  const automatedPatterns = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'automated', 'notifications', 'mailer-daemon'];
  if (automatedPatterns.some(pattern => lowerFrom.includes(pattern))) {
    score -= 2;
  }

  // Known service domains (mixed importance)
  const serviceDomains = ['stripe.com', 'paypal.com', 'amazon.com', 'github.com', 'linear.app'];
  if (serviceDomains.some(domain => lowerFrom.includes(domain))) {
    score += 1; // Service emails often contain important info
  }

  return score;
}

/**
 * Analyze subject line patterns
 */
function analyzeSubject(subject: string): number {
  let score = 0;
  const lowerSubject = subject.toLowerCase();

  // Direct conversation indicators (high importance)
  if (lowerSubject.startsWith('re: ') || lowerSubject.startsWith('fwd: ')) {
    score += 2; // Part of ongoing conversation
  }

  // Urgency indicators
  const urgentKeywords = ['urgent', 'asap', 'important', 'action required', 'deadline', 'expires', 'expiring'];
  if (urgentKeywords.some(keyword => lowerSubject.includes(keyword))) {
    score += 2;
  }

  // Personal/meeting related
  const personalKeywords = ['meeting', 'call', 'schedule', 'invitation', 'invite', 'question', 'help'];
  if (personalKeywords.some(keyword => lowerSubject.includes(keyword))) {
    score += 1;
  }

  // Low priority patterns
  const lowPriorityPatterns = [
    'newsletter',
    'unsubscribe',
    'sale',
    'discount',
    'promo',
    'offer',
    'deal',
    'free shipping',
    'limited time',
    'last chance',
    'digest',
    'weekly',
    'monthly'
  ];
  if (lowPriorityPatterns.some(pattern => lowerSubject.includes(pattern))) {
    score -= 2;
  }

  // Automated reports
  if (lowerSubject.includes('daily') || lowerSubject.includes('summary') || lowerSubject.includes('report')) {
    score -= 1;
  }

  return score;
}

/**
 * Analyze email content/snippet
 */
function analyzeContent(snippet: string): number {
  let score = 0;
  const lowerSnippet = snippet.toLowerCase();

  // Personal communication patterns
  if (lowerSnippet.includes('thanks') || lowerSnippet.includes('thank you')) {
    score += 1;
  }

  // Questions (likely need response)
  if (lowerSnippet.includes('?')) {
    score += 1;
  }

  // Unsubscribe links (promotional)
  if (lowerSnippet.includes('unsubscribe') || lowerSnippet.includes('opt out')) {
    score -= 2;
  }

  return score;
}
