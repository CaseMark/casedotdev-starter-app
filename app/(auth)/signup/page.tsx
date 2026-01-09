import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

/**
 * Signup Page
 *
 * Simple signup page using the SignupForm component.
 * This page works with any of the 6 auth template types:
 * - Client Portal (may be invite-only - disable this page)
 * - Internal Tool (may use OAuth only)
 * - Multi-Firm SaaS (creates user, then org onboarding)
 * - Hybrid (internal + external users)
 * - OAuth Only (redirect to OAuth flow instead)
 * - With 2FA (2FA setup happens post-signup)
 *
 * @see skills/auth/SKILL.md for customization options
 */
export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to get started
        </p>
      </div>

      <SignupForm />

      {/* OAuth providers can be added here for OAuth-enabled templates */}
      {/* Example:
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <OAuthButtons />
      */}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
