import { findClosestGmailColor, getGmailColorByBackground, GMAIL_LABEL_COLORS } from '../gmailColors';

describe('gmailColors', () => {
  describe('findClosestGmailColor', () => {
    it('should map TimeFlow teal to closest Gmail color', () => {
      const result = findClosestGmailColor('#0BAF9A');
      // Should map to a cyan/teal variant
      expect(result.backgroundColor).toMatch(/#[a-f0-9]{6}/i);
      expect(result.textColor).toMatch(/#[a-f0-9]{6}/i);
    });

    it('should handle invalid hex colors', () => {
      const result = findClosestGmailColor('invalid');
      expect(result).toBe(GMAIL_LABEL_COLORS[0]);
    });

    it('should find exact match for Gmail standard colors', () => {
      const gmailColor = GMAIL_LABEL_COLORS[5];
      const result = findClosestGmailColor(gmailColor.backgroundColor);
      expect(result.backgroundColor).toEqual(gmailColor.backgroundColor);
      expect(result.textColor).toMatch(/#[a-f0-9]{6}/i);
    });
  });

  describe('getGmailColorByBackground', () => {
    it('should find color by exact background match', () => {
      const result = getGmailColorByBackground('#cfe2f3');
      expect(result?.backgroundColor).toEqual(GMAIL_LABEL_COLORS[0].backgroundColor);
    });

    it('should return undefined for non-existent color', () => {
      const result = getGmailColorByBackground('#000000');
      expect(result).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const result = getGmailColorByBackground('#CFE2F3');
      expect(result).toEqual(GMAIL_LABEL_COLORS[0]);
    });
  });
});
