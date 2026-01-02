import { describe, expect, it } from 'vitest';
import { extractMessageBody } from '../gmailService';

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('extractMessageBody', () => {
  it('prefers nested HTML over plain text', () => {
    const html = '<div><h1>Hi</h1><p>World</p></div>';
    const plain = 'Hello\nWorld';

    const payload = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: encodeBase64Url(plain) } },
            { mimeType: 'text/html', body: { data: encodeBase64Url(html) } },
          ],
        },
      ],
    };

    const result = extractMessageBody(payload);
    expect(result.mimeType).toBe('text/html');
    expect(result.body).toBe(html);
  });

  it('falls back to plain text when no HTML exists', () => {
    const plain = 'Plain text only';
    const payload = {
      mimeType: 'text/plain',
      body: { data: encodeBase64Url(plain) },
    };

    const result = extractMessageBody(payload);
    expect(result.mimeType).toBe('text/plain');
    expect(result.body).toBe(plain);
  });
});
