/**
 * Auth Stub (Better Auth Removed)
 *
 * This app uses simple case.dev API key authentication stored in localStorage.
 * No Better Auth, no database, no sessions - just API keys!
 */

// Export stub to prevent import errors
export const auth = {
  api: {
    getSession: () => Promise.resolve(null),
  },
} as any;
