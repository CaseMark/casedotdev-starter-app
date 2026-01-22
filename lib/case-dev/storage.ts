/**
 * case.dev API Key Storage Layer
 *
 * Handles CRUD operations for encrypted API keys in the database
 * All keys are encrypted before storage and decrypted only when needed
 */

import { db } from '../db';
import { caseDevCredentials } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ApiKeyEncryption } from './encryption';

/**
 * Store or update API key for a user
 *
 * Encrypts the API key and stores it securely in the database
 * If user already has a key, it will be updated (upsert)
 *
 * @param userId - The user's ID
 * @param apiKey - The plaintext API key to store
 */
export async function storeApiKey(
  userId: string,
  apiKey: string
): Promise<void> {
  // Encrypt the API key
  const { encrypted, iv, tag } = ApiKeyEncryption.encrypt(apiKey);
  const combined = ApiKeyEncryption.combine(encrypted, iv, tag);
  const last4 = ApiKeyEncryption.getLast4(apiKey);

  // Upsert (insert or update if exists)
  await db
    .insert(caseDevCredentials)
    .values({
      userId,
      apiKeyEncrypted: combined,
      apiKeyLast4: last4,
      apiKeyPrefix: 'sk_case_',
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: caseDevCredentials.userId,
      set: {
        apiKeyEncrypted: combined,
        apiKeyLast4: last4,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

/**
 * Get decrypted API key for a user
 *
 * Retrieves and decrypts the API key for use in API calls
 * Returns null if user hasn't connected case.dev
 *
 * @param userId - The user's ID
 * @returns The decrypted API key, or null if not found
 */
export async function getApiKeyForUser(
  userId: string
): Promise<string | null> {
  const result = await db
    .select()
    .from(caseDevCredentials)
    .where(eq(caseDevCredentials.userId, userId))
    .limit(1);

  if (!result || result.length === 0) {
    return null;
  }

  const credential = result[0];

  try {
    // Split the combined encrypted string
    const { encrypted, iv, tag } = ApiKeyEncryption.split(
      credential.apiKeyEncrypted
    );

    // Decrypt and return
    return ApiKeyEncryption.decrypt(encrypted, iv, tag);
  } catch (error) {
    console.error('Failed to decrypt API key for user:', userId, error);
    return null;
  }
}

/**
 * Remove API key for a user
 *
 * Completely removes the user's case.dev connection
 *
 * @param userId - The user's ID
 */
export async function removeApiKey(userId: string): Promise<void> {
  await db
    .delete(caseDevCredentials)
    .where(eq(caseDevCredentials.userId, userId));
}

/**
 * Update last used timestamp
 *
 * Tracks when the API key was last used for analytics/audit purposes
 *
 * @param userId - The user's ID
 */
export async function updateLastUsed(userId: string): Promise<void> {
  await db
    .update(caseDevCredentials)
    .set({ lastUsedAt: new Date() })
    .where(eq(caseDevCredentials.userId, userId));
}

/**
 * Get API key display information
 *
 * Returns sanitized information for display in UI
 * Never returns the actual API key
 *
 * @param userId - The user's ID
 * @returns Display info with last 4 digits and verification status, or null
 */
export async function getApiKeyDisplay(
  userId: string
): Promise<{ last4: string; verified: boolean } | null> {
  const result = await db
    .select({
      last4: caseDevCredentials.apiKeyLast4,
      verifiedAt: caseDevCredentials.verifiedAt,
    })
    .from(caseDevCredentials)
    .where(eq(caseDevCredentials.userId, userId))
    .limit(1);

  if (!result || result.length === 0) {
    return null;
  }

  const credential = result[0];

  return {
    last4: credential.last4,
    verified: credential.verifiedAt !== null,
  };
}

/**
 * Check if user has case.dev API key connected
 *
 * Lightweight check that doesn't decrypt the key
 *
 * @param userId - The user's ID
 * @returns true if user has API key stored
 */
export async function hasApiKey(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: caseDevCredentials.id })
    .from(caseDevCredentials)
    .where(eq(caseDevCredentials.userId, userId))
    .limit(1);

  return result.length > 0;
}
