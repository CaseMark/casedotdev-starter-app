/**
 * Better Auth Client Configuration
 *
 * This is the client-side authentication configuration.
 * Use these exports in React components for auth operations.
 *
 * @see skills/auth/SKILL.md for detailed documentation
 */

"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { ac, roles } from "./permissions";

/**
 * Auth client instance
 * Provides hooks and methods for authentication in React components
 */
export const authClient = createAuthClient({
  /**
   * Base URL for auth API
   * In development, this is typically http://localhost:3000
   * In production, this should be your app's URL
   */
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  plugins: [
    /**
     * Organization Plugin
     * Provides methods for managing organizations, members, and invitations
     */
    organizationClient({
      ac,
      roles,
    }),

    /**
     * Two-Factor Authentication Plugin
     * Provides methods for 2FA setup and verification
     */
    twoFactorClient({
      /**
       * Called when user needs to verify 2FA during sign in
       * Customize this to redirect to your 2FA verification page
       */
      onTwoFactorRedirect() {
        if (typeof window !== "undefined") {
          window.location.href = "/verify-2fa";
        }
      },
    }),
  ],
});

/**
 * Destructured exports for convenient use
 *
 * Usage in components:
 * import { useSession, signIn, signOut } from "@/lib/auth/client";
 */
type SignOutFn = typeof authClient.signOut;

export const {
  // Session
  useSession,

  // Authentication
  signIn,
  signUp,
  signOut: baseSignOut,

  // Organization (when using org plugin)
  useActiveOrganization,
  useListOrganizations,

  // Two-Factor (when using 2FA plugin)
  twoFactor,
} = authClient;

export const signOut: SignOutFn = async (...args) => {
  const result = await baseSignOut(...args);
  authClient.$store.notify("$sessionSignal");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  return result;
};

/**
 * Organization methods (namespaced)
 *
 * Usage:
 * import { organization } from "@/lib/auth/client";
 * await organization.create({ name: "My Firm", slug: "my-firm" });
 */
export const { organization } = authClient;
