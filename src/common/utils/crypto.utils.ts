import { randomBytes, createHash } from 'crypto';

/**
 * Crypto utilities for token generation and hashing
 */

/**
 * Generate a cryptographically secure random token
 * @param length - Byte length of the token (default 32 = 256 bits)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe base64 token
 * @param length - Byte length of the token
 * @returns URL-safe base64-encoded token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a token using SHA-256
 * Used for storing refresh tokens (we store hash, not the token itself)
 * @param token - Token to hash
 * @returns SHA-256 hash in hex format
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a unique reference for transactions
 * Format: TXN-{timestamp}-{random}
 * @returns Unique transaction reference
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

/**
 * Generate idempotency key for external API calls
 * @returns Unique idempotency key
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}
