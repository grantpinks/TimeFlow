import { describe, it, expect } from 'vitest';
import { generateMeetingLinkEmail } from '../emailTemplateService.js';

describe('emailTemplateService', () => {
  describe('generateMeetingLinkEmail', () => {
    it('should generate HTML and plain text versions', () => {
      const result = generateMeetingLinkEmail(
        'Hi! Let\'s schedule a meeting.',
        'https://app.com/book/quick-chat'
      );

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });

    it('should include booking URL in HTML', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book/test'
      );

      expect(result.html).toContain('https://app.com/book/test');
      expect(result.html).toContain('Book a Meeting');
    });

    it('should include booking URL in plain text', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book/test'
      );

      expect(result.text).toContain('https://app.com/book/test');
      expect(result.text).toContain('Test message');
    });

    it('should include user message in both versions', () => {
      const message = 'Please book a time that works for you.';
      const result = generateMeetingLinkEmail(
        message,
        'https://app.com/book/test'
      );

      expect(result.html).toContain(message);
      expect(result.text).toContain(message);
    });

    it('should escape HTML in user message', () => {
      const message = '<script>alert("xss")</script>';
      const result = generateMeetingLinkEmail(
        message,
        'https://app.com/book/test'
      );

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should reject javascript: protocol URLs', () => {
      expect(() => generateMeetingLinkEmail(
        'Test message',
        'javascript:alert(1)'
      )).toThrow('Invalid booking URL');
    });

    it('should reject http: URLs (non-HTTPS)', () => {
      expect(() => generateMeetingLinkEmail(
        'Test message',
        'http://app.com/book/test'
      )).toThrow('Invalid booking URL');
    });

    it('should reject invalid URLs', () => {
      expect(() => generateMeetingLinkEmail(
        'Test message',
        'not-a-url'
      )).toThrow('Invalid booking URL');
    });

    it('should accept valid HTTPS URLs', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book/test?param=value#fragment'
      );
      expect(result.html).toContain('https://app.com/book/test');
    });

    it('should handle URLs with query parameters correctly', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book?id=123&type=quick'
      );
      // URL should NOT have & escaped to &amp; (which would break the URL)
      expect(result.html).toContain('https://app.com/book?id=123&type=quick');
      expect(result.html).not.toContain('&amp;type');
      expect(result.text).toContain('https://app.com/book?id=123&type=quick');
    });
  });
});
