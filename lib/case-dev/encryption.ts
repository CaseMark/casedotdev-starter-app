/**
 * API Key Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for case.dev API keys
 * Keys are encrypted before storage and decrypted only when needed for API calls
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Must be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CASE_DEV_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'CASE_DEV_ENCRYPTION_KEY environment variable is required. ' +
        'Generate with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'CASE_DEV_ENCRYPTION_KEY must be 64 characters (32 bytes in hex). ' +
        'Generate with: openssl rand -hex 32'
    );
  }

  return Buffer.from(key, 'hex');
}

export class ApiKeyEncryption {
  /**
   * Encrypt case.dev API key before storing in database
   *
   * @param apiKey - The plaintext API key to encrypt
   * @returns Object containing encrypted data, IV, and auth tag
   */
  static encrypt(apiKey: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
    };
  }

  /**
   * Decrypt case.dev API key for use in API calls
   *
   * @param encrypted - The encrypted API key (hex string)
   * @param iv - The initialization vector (hex string)
   * @param tag - The authentication tag (hex string)
   * @returns The decrypted plaintext API key
   */
  static decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get last 4 characters of API key for display purposes
   * Used to show "****1234" in UI without exposing full key
   *
   * @param apiKey - The API key
   * @returns Last 4 characters
   */
  static getLast4(apiKey: string): string {
    return apiKey.slice(-4);
  }

  /**
   * Validate API key format
   * case.dev API keys should start with "sk_case_" and be at least 20 characters
   *
   * @param apiKey - The API key to validate
   * @returns true if format is valid
   */
  static isValidFormat(apiKey: string): boolean {
    return apiKey.startsWith('sk_case_') && apiKey.length > 20;
  }

  /**
   * Combine encrypted components into a single string for database storage
   *
   * @param encrypted - Encrypted data
   * @param iv - Initialization vector
   * @param tag - Authentication tag
   * @returns Combined string in format "encrypted:iv:tag"
   */
  static combine(encrypted: string, iv: string, tag: string): string {
    return `${encrypted}:${iv}:${tag}`;
  }

  /**
   * Split combined encrypted string back into components
   *
   * @param combined - Combined string from database
   * @returns Object with separated components
   */
  static split(combined: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    const [encrypted, iv, tag] = combined.split(':');

    if (!encrypted || !iv || !tag) {
      throw new Error('Invalid encrypted data format');
    }

    return { encrypted, iv, tag };
  }
}
