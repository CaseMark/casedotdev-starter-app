import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

/**
 * Login Page
 *
 * Simple login page using the LoginForm component.
 * This page works with any of the 6 auth template types:
 * - Client Portal
 * - Internal Tool
 * - Multi-Firm SaaS
 * - Hybrid (internal + external users)
 * - OAuth Only (add OAuth buttons below)
 * - With 2FA (handled automatically by LoginForm)
 *
 * @see skills/auth/SKILL.md for customization options
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl || "/"} />

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
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
