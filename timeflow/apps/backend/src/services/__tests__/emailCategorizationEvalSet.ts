import { categorizeEmail, detectNeedsResponse } from '../emailCategorizationService';
import type { EmailCategory } from '@timeflow/shared';

type EvalSample = {
  name: string;
  email: {
    from: string;
    subject: string;
    snippet?: string;
    labels?: string[];
  };
  expectedCategory: EmailCategory;
  expectedNeedsResponse: boolean;
};

const EVAL_SAMPLES: EvalSample[] = [
  {
    name: 'newsletter-morning-brew',
    email: {
      from: 'Morning Brew <newsletter@morningbrew.com>',
      subject: "Today's edition",
      snippet: 'View in browser · Unsubscribe',
      labels: [],
    },
    expectedCategory: 'newsletter',
    expectedNeedsResponse: false,
  },
  {
    name: 'travel-hotel-confirmation',
    email: {
      from: 'reservations@marriott.com',
      subject: 'Your reservation confirmation',
      snippet: 'Confirmation number and check-in details',
      labels: [],
    },
    expectedCategory: 'travel',
    expectedNeedsResponse: false,
  },
  {
    name: 'work-coffee-chat',
    email: {
      from: 'Jane Doe <jane@company.com>',
      subject: 'Coffee chat next week?',
      snippet: 'Let me know what times work for you',
      labels: [],
    },
    expectedCategory: 'work',
    expectedNeedsResponse: true,
  },
  {
    name: 'updates-security-alert',
    email: {
      from: 'noreply@service.com',
      subject: 'Security alert: New login detected',
      snippet: 'Please verify your account',
      labels: [],
    },
    expectedCategory: 'updates',
    expectedNeedsResponse: false,
  },
  {
    name: 'personal-catch-up',
    email: {
      from: 'alex@gmail.com',
      subject: 'Weekend plans',
      snippet: 'Want to catch up this weekend?',
      labels: [],
    },
    expectedCategory: 'personal',
    expectedNeedsResponse: false,
  },
  {
    name: 'finance-statement',
    email: {
      from: 'alerts@bank.com',
      subject: 'Your statement is ready',
      snippet: 'View your credit card transaction history',
      labels: [],
    },
    expectedCategory: 'finance',
    expectedNeedsResponse: false,
  },
];

export function runEmailEvalSet() {
  const failures: Array<{
    name: string;
    expectedCategory: EmailCategory;
    actualCategory: EmailCategory;
    expectedNeedsResponse: boolean;
    actualNeedsResponse: boolean;
  }> = [];

  for (const sample of EVAL_SAMPLES) {
    const actualCategory = categorizeEmail(sample.email);
    const needsResponse = detectNeedsResponse(sample.email).needsResponse;

    if (
      actualCategory !== sample.expectedCategory ||
      needsResponse !== sample.expectedNeedsResponse
    ) {
      failures.push({
        name: sample.name,
        expectedCategory: sample.expectedCategory,
        actualCategory,
        expectedNeedsResponse: sample.expectedNeedsResponse,
        actualNeedsResponse: needsResponse,
      });
    }
  }

  return failures;
}
