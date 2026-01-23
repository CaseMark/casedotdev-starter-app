/**
 * Get user ID for multi-tenant isolation
 *
 * This utility handles getting a user identifier regardless of whether
 * authentication is enabled or disabled.
 *
 * - If auth is enabled: Uses Better Auth session userId
 * - If auth is disabled: Generates/retrieves a stable identifier from localStorage
 */

const USER_ID_KEY = 'bankruptcy_user_id';

/**
 * Generate a stable user ID and store it in localStorage
 * This is used when AUTH_MODE is disabled
 */
function generateUserId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `user_${timestamp}_${random}`;
}

/**
 * Get or create a user ID from localStorage
 * Used as fallback when authentication is disabled
 */
function getOrCreateLocalUserId(): string {
  if (typeof window === 'undefined') {
    return 'server-side-user';
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Get user ID from session or fallback to localStorage
 *
 * @param sessionUserId - User ID from Better Auth session (if available)
 * @returns A stable user identifier
 */
export function getUserId(sessionUserId?: string | null): string {
  // If we have a session user ID, use it
  if (sessionUserId) {
    return sessionUserId;
  }

  // Otherwise, use localStorage-based ID
  return getOrCreateLocalUserId();
}

/**
 * Clear the local user ID (useful for testing or reset)
 */
export function clearLocalUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }
}
