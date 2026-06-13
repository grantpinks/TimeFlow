import { describe, expect, it } from 'vitest';
import {
  decrypt,
  decryptStoredToken,
  encrypt,
  isEncryptedTokenFormat,
} from '../crypto.js';

describe('crypto', () => {
  it('encrypt/decrypt round-trips access tokens', () => {
    const plain = 'ya29.access-token-value';
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(isEncryptedTokenFormat(enc!)).toBe(true);
    expect(decrypt(enc)).toBe(plain);
    expect(decryptStoredToken(enc)).toBe(plain);
  });

  it('does not treat Google access tokens as encrypted format', () => {
    expect(isEncryptedTokenFormat('ya29.abc-def_123')).toBe(false);
  });

  it('decryptStoredToken returns legacy plaintext during migration', () => {
    const legacy = 'ya29.legacy-plaintext-token';
    expect(decryptStoredToken(legacy)).toBe(legacy);
  });

  it('decrypt returns null for legacy plaintext', () => {
    expect(decrypt('ya29.legacy-plaintext-token')).toBeNull();
  });

  it('decrypt returns null for tampered ciphertext', () => {
    const enc = encrypt('ya29.access-token-value')!;
    const tampered = `${enc.slice(0, -4)}XXXX`;
    expect(decrypt(tampered)).toBeNull();
  });
});
