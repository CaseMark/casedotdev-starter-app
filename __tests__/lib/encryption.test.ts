import { describe, it, expect } from 'vitest';
import { ApiKeyEncryption } from '@/lib/case-dev/encryption';

describe('ApiKeyEncryption', () => {
  const testApiKey = 'sk_case_test123456789';

  describe('encrypt and decrypt', () => {
    it('encrypts and decrypts an API key correctly', () => {
      const { encrypted, iv, tag } = ApiKeyEncryption.encrypt(testApiKey);

      expect(encrypted).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(tag).toBeTruthy();

      const decrypted = ApiKeyEncryption.decrypt(encrypted, iv, tag);
      expect(decrypted).toBe(testApiKey);
    });

    it('produces different encrypted values for same input', () => {
      const result1 = ApiKeyEncryption.encrypt(testApiKey);
      const result2 = ApiKeyEncryption.encrypt(testApiKey);

      // Should be different due to random IV
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);

      // But both should decrypt to same value
      expect(ApiKeyEncryption.decrypt(result1.encrypted, result1.iv, result1.tag)).toBe(testApiKey);
      expect(ApiKeyEncryption.decrypt(result2.encrypted, result2.iv, result2.tag)).toBe(testApiKey);
    });

    it('throws error with invalid IV', () => {
      const { encrypted, tag } = ApiKeyEncryption.encrypt(testApiKey);
      const invalidIv = 'invalid';

      expect(() => {
        ApiKeyEncryption.decrypt(encrypted, invalidIv, tag);
      }).toThrow();
    });

    it('throws error with invalid tag', () => {
      const { encrypted, iv } = ApiKeyEncryption.encrypt(testApiKey);
      const invalidTag = 'invalid';

      expect(() => {
        ApiKeyEncryption.decrypt(encrypted, iv, invalidTag);
      }).toThrow();
    });
  });

  describe('getLast4', () => {
    it('returns last 4 characters of API key', () => {
      const last4 = ApiKeyEncryption.getLast4(testApiKey);
      expect(last4).toBe('6789');
    });

    it('returns full string if less than 4 characters', () => {
      const shortKey = 'abc';
      const last4 = ApiKeyEncryption.getLast4(shortKey);
      expect(last4).toBe('abc');
    });
  });

  describe('isValidFormat', () => {
    it('validates correct API key format', () => {
      expect(ApiKeyEncryption.isValidFormat('sk_case_test123456789')).toBe(true);
      expect(ApiKeyEncryption.isValidFormat('sk_case_abcdefghijklmnop')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(ApiKeyEncryption.isValidFormat('invalid')).toBe(false);
      expect(ApiKeyEncryption.isValidFormat('sk_case_')).toBe(false);
      expect(ApiKeyEncryption.isValidFormat('sk_other_test')).toBe(false);
      expect(ApiKeyEncryption.isValidFormat('')).toBe(false);
    });
  });

  describe('combine and split', () => {
    it('combines and splits encrypted components correctly', () => {
      const { encrypted, iv, tag } = ApiKeyEncryption.encrypt(testApiKey);
      const combined = ApiKeyEncryption.combine(encrypted, iv, tag);

      expect(combined).toContain(':');

      const [splitEncrypted, splitIv, splitTag] = ApiKeyEncryption.split(combined);

      expect(splitEncrypted).toBe(encrypted);
      expect(splitIv).toBe(iv);
      expect(splitTag).toBe(tag);

      // Should be able to decrypt with split components
      const decrypted = ApiKeyEncryption.decrypt(splitEncrypted, splitIv, splitTag);
      expect(decrypted).toBe(testApiKey);
    });

    it('throws error when splitting invalid format', () => {
      expect(() => {
        ApiKeyEncryption.split('invalid:format');
      }).toThrow();

      expect(() => {
        ApiKeyEncryption.split('only:two:parts');
      }).toThrow();
    });
  });

  describe('end-to-end encryption flow', () => {
    it('matches database storage pattern', () => {
      const apiKey = 'sk_case_production_key_12345';

      // Encrypt
      const { encrypted, iv, tag } = ApiKeyEncryption.encrypt(apiKey);
      const combined = ApiKeyEncryption.combine(encrypted, iv, tag);
      const last4 = ApiKeyEncryption.getLast4(apiKey);

      // Simulate storage
      const storedValue = combined;
      const storedLast4 = last4;

      // Retrieve and decrypt
      const [retrievedEncrypted, retrievedIv, retrievedTag] = ApiKeyEncryption.split(storedValue);
      const decrypted = ApiKeyEncryption.decrypt(retrievedEncrypted, retrievedIv, retrievedTag);

      expect(decrypted).toBe(apiKey);
      expect(storedLast4).toBe('12345');
      expect(ApiKeyEncryption.getLast4(decrypted)).toBe(storedLast4);
    });
  });
});
