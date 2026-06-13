import crypto from 'crypto';
import { env } from '../config/env.js';

const KEY = crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest(); // 32 bytes

export function encrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), encrypted.toString('base64'), tag.toString('base64')].join('.');
}

/** True when value matches AES-256-GCM storage format (iv.ciphertext.tag). */
export function isEncryptedTokenFormat(payload: string): boolean {
  if (payload.startsWith('ya29.') || payload.startsWith('1//')) {
    return false;
  }
  const parts = payload.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    return iv.length === 12 && tag.length === 16;
  } catch {
    return false;
  }
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  if (!isEncryptedTokenFormat(payload)) {
    return null;
  }
  const parts = payload.split('.');
  const [ivB64, dataB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  try {
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Decrypt a stored OAuth token. Returns legacy plaintext values during migration.
 */
export function decryptStoredToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (isEncryptedTokenFormat(stored)) {
    return decrypt(stored);
  }
  return stored;
}

/**
 * @deprecated Use decryptStoredToken for reads. Kept for refresh-token paths that may still be plaintext.
 */
export function decryptWithLegacyFallback(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const decrypted = decrypt(payload);
  if (decrypted) return decrypted;
  if (isEncryptedTokenFormat(payload)) return null;
  return payload;
}
