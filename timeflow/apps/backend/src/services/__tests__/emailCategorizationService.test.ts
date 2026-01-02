/**
 * Email Categorization Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeEmail,
  EMAIL_CATEGORIES,
  getCategoryConfig,
  getAllCategoryConfigs,
  groupEmailsByCategory,
  getCategoryStatistics,
  scoreEmailCategory,
  detectNeedsResponse,
} from '../emailCategorizationService';
import { runEmailEvalSet } from './emailCategorizationEvalSet';
import type { EmailMessage } from '@timeflow/shared';

describe('Email Categorization Service', () => {
  describe('categorizeEmail', () => {
    it('should categorize promotional emails using Gmail labels', () => {
      const email = {
        from: 'deals@store.com',
        subject: 'Special offer just for you!',
        snippet: '50% off everything',
        labels: ['CATEGORY_PROMOTIONS'],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('promotion');
    });

    it('should categorize social emails using Gmail labels', () => {
      const email = {
        from: 'notifications@facebook.com',
        subject: 'John liked your post',
        snippet: 'See what John commented',
        labels: ['CATEGORY_SOCIAL'],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('social');
    });

    it('should categorize shopping emails by keywords', () => {
      const email = {
        from: 'orders@amazon.com',
        subject: 'Your order has shipped',
        snippet: 'Tracking number: 123456789',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('shopping');
    });

    it('should categorize work emails by keywords', () => {
      const email = {
        from: 'boss@company.com',
        subject: 'Urgent: Project deadline moved up',
        snippet: 'We need to discuss the meeting tomorrow',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('work');
    });

    it('should categorize finance emails by keywords', () => {
      const email = {
        from: 'alerts@bank.com',
        subject: 'Your bank statement is ready',
        snippet: 'View your credit card transaction history',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('finance');
    });

    it('should categorize travel emails by keywords', () => {
      const email = {
        from: 'booking@airline.com',
        subject: 'Your flight itinerary',
        snippet: 'Boarding pass attached. Check-in opens 24 hours before',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('travel');
    });

    it('should categorize hotel reservation confirmations as travel', () => {
      const email = {
        from: 'reservations@marriott.com',
        subject: 'Your reservation confirmation',
        snippet: 'Confirmation number and check-in details inside',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('travel');
    });

    it('should categorize newsletter emails by keywords', () => {
      const email = {
        from: 'newsletter@techblog.com',
        subject: 'Weekly Tech Digest',
        snippet: 'This week in technology. Click here to unsubscribe',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('newsletter');
    });

    it('should categorize Morning Brew as newsletter', () => {
      const email = {
        from: 'Morning Brew <newsletter@morningbrew.com>',
        subject: "Today\'s edition",
        snippet: 'View in browser · Unsubscribe',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('newsletter');
    });

    it('should categorize update emails by keywords', () => {
      const email = {
        from: 'noreply@service.com',
        subject: 'Security alert: New login detected',
        snippet: 'Please verify your account',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('updates');
    });

    it('should categorize personal emails from generic domains', () => {
      const email = {
        from: 'john@gmail.com',
        subject: 'Hey, want to grab dinner?',
        snippet: 'Let me know if you are free this weekend',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('personal');
    });

    it('should categorize work emails from corporate domains', () => {
      const email = {
        from: 'sarah@techcorp.io',
        subject: 'Q4 Planning',
        snippet: 'Let us schedule a call',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('work');
    });

    it('should categorize coffee chat invites as work', () => {
      const email = {
        from: 'Jane Doe <jane@company.com>',
        subject: 'Coffee chat next week?',
        snippet: 'Would love to connect and find time to chat',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('work');
    });

    it('should default to "other" for ambiguous emails', () => {
      const email = {
        from: 'unknown@example.com',
        subject: 'Hello',
        snippet: 'Just saying hi',
        labels: [],
      };

      const category = categorizeEmail(email);
      expect(category).toBe('other');
    });

    it('should handle emails with multiple matching keywords (highest score wins)', () => {
      const email = {
        from: 'paypal@paypal.com',
        subject: 'Payment receipt for your order',
        snippet: 'Your transaction was successful',
        labels: [],
      };

      // Should categorize as 'finance' (payment, receipt, transaction keywords)
      // even though 'order' is also present (shopping)
      const category = categorizeEmail(email);
      expect(category).toBe('finance');
    });
  });

  describe('scoreEmailCategory', () => {
    it('returns higher confidence for strong newsletter signals', () => {
      const result = scoreEmailCategory({
        from: 'newsletter@morningbrew.com',
        subject: "Today\'s edition",
        snippet: 'View in browser · Unsubscribe',
        labels: [],
      });

      expect(result.category).toBe('newsletter');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('detectNeedsResponse', () => {
    it('flags reply-needed emails using rules', () => {
      const result = detectNeedsResponse({
        from: 'jane@company.com',
        subject: 'Can we meet next week?',
        snippet: 'Let me know what times work for you',
      });

      expect(result.needsResponse).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('email categorization eval set', () => {
    it('passes the eval set', () => {
      const failures = runEmailEvalSet();
      expect(failures).toEqual([]);
    });
  });

  describe('getCategoryConfig', () => {
    it('should return correct config for a category', () => {
      const config = getCategoryConfig('work');
      expect(config).toBeDefined();
      expect(config.id).toBe('work');
      expect(config.name).toBe('Work');
      expect(config.color).toBe('#8B5CF6');
    });
  });

  describe('getAllCategoryConfigs', () => {
    it('should return all 10 category configurations', () => {
      const configs = getAllCategoryConfigs();
      expect(configs).toHaveLength(10);
      expect(configs.map(c => c.id)).toContain('personal');
      expect(configs.map(c => c.id)).toContain('work');
      expect(configs.map(c => c.id)).toContain('promotion');
      expect(configs.map(c => c.id)).toContain('shopping');
      expect(configs.map(c => c.id)).toContain('social');
      expect(configs.map(c => c.id)).toContain('finance');
      expect(configs.map(c => c.id)).toContain('travel');
      expect(configs.map(c => c.id)).toContain('newsletter');
      expect(configs.map(c => c.id)).toContain('updates');
      expect(configs.map(c => c.id)).toContain('other');
    });
  });

  describe('groupEmailsByCategory', () => {
    it('should group emails by their categories', () => {
      const emails: EmailMessage[] = [
        {
          id: '1',
          from: 'work@company.com',
          subject: 'Meeting',
          receivedAt: new Date().toISOString(),
          importance: 'high',
          isRead: false,
          category: 'work',
        },
        {
          id: '2',
          from: 'promo@store.com',
          subject: 'Sale',
          receivedAt: new Date().toISOString(),
          importance: 'normal',
          isRead: true,
          category: 'promotion',
        },
        {
          id: '3',
          from: 'team@company.com',
          subject: 'Project update',
          receivedAt: new Date().toISOString(),
          importance: 'high',
          isRead: false,
          category: 'work',
        },
      ];

      const grouped = groupEmailsByCategory(emails);

      expect(grouped.work).toHaveLength(2);
      expect(grouped.promotion).toHaveLength(1);
      expect(grouped.personal).toHaveLength(0);
    });
  });

  describe('getCategoryStatistics', () => {
    it('should calculate correct statistics for each category', () => {
      const emails: EmailMessage[] = [
        {
          id: '1',
          from: 'work@company.com',
          subject: 'Meeting',
          receivedAt: new Date().toISOString(),
          importance: 'high',
          isRead: false,
          category: 'work',
        },
        {
          id: '2',
          from: 'promo@store.com',
          subject: 'Sale',
          receivedAt: new Date().toISOString(),
          importance: 'normal',
          isRead: true,
          category: 'promotion',
        },
        {
          id: '3',
          from: 'team@company.com',
          subject: 'Project update',
          receivedAt: new Date().toISOString(),
          importance: 'high',
          isRead: false,
          category: 'work',
        },
      ];

      const stats = getCategoryStatistics(emails);

      expect(stats.work.count).toBe(2);
      expect(stats.work.unreadCount).toBe(2);
      expect(stats.promotion.count).toBe(1);
      expect(stats.promotion.unreadCount).toBe(0);
      expect(stats.personal.count).toBe(0);
    });
  });

  describe('EMAIL_CATEGORIES configuration', () => {
    it('should have valid color codes for all categories', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      Object.values(EMAIL_CATEGORIES).forEach(config => {
        expect(config.color).toMatch(hexColorRegex);
      });
    });

    it('should have unique names for all categories', () => {
      const names = Object.values(EMAIL_CATEGORIES).map(c => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have keywords for most categories (except "other")', () => {
      Object.entries(EMAIL_CATEGORIES).forEach(([id, config]) => {
        if (id !== 'other') {
          expect(config.keywords).toBeDefined();
        }
      });
    });
  });
});
