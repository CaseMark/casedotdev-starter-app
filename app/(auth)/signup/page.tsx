import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Scale } from "lucide-react";

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
function getSafeCallbackUrl(value?: string | string[]) {
  if (!value) return "/";
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) return "/";
  if (!resolved.startsWith("/")) return "/";
  if (resolved.startsWith("//")) return "/";
  return resolved;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <Scale className="w-10 h-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Bankruptcy Tool
          </h1>
        </div>
        <a
          href="https://case.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        >
          <span>built with</span>
          <svg width="14" height="14" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M127.927 56.3865C127.927 54.7298 126.583 53.3867 124.927 53.3865H19.6143C17.9574 53.3865 16.6143 54.7296 16.6143 56.3865V128.226C16.6143 129.883 17.9574 131.226 19.6143 131.226H124.927C126.583 131.226 127.927 129.883 127.927 128.226V56.3865ZM93.1553 32.6638C93.1553 31.007 91.8121 29.6639 90.1553 29.6638H53.4102C51.7534 29.664 50.4102 31.0071 50.4102 32.6638V47.3865H93.1553V32.6638ZM99.1553 47.3865H124.927C129.897 47.3867 133.927 51.4161 133.927 56.3865V128.226C133.927 133.197 129.897 137.226 124.927 137.226H19.6143C14.6437 137.226 10.6143 133.197 10.6143 128.226V56.3865C10.6143 51.4159 14.6437 47.3865 19.6143 47.3865H44.4102V32.6638C44.4102 27.6933 48.4397 23.664 53.4102 23.6638H90.1553C95.1258 23.6639 99.1553 27.6933 99.1553 32.6638V47.3865Z" fill="#EB5600"/>
            <path d="M76.6382 70.6082C77.8098 69.4366 79.7088 69.4366 80.8804 70.6082L98.8013 88.5291C100.754 90.4817 100.754 93.6477 98.8013 95.6003L80.8804 113.521C79.7088 114.693 77.8097 114.693 76.6382 113.521C75.4667 112.35 75.4667 110.451 76.6382 109.279L93.8521 92.0642L76.6382 74.8503C75.4666 73.6788 75.4666 71.7797 76.6382 70.6082Z" fill="#EB5600"/>
            <path d="M67.3618 70.6082C66.1902 69.4366 64.2912 69.4366 63.1196 70.6082L45.1987 88.5291C43.2461 90.4817 43.2461 93.6477 45.1987 95.6003L63.1196 113.521C64.2912 114.693 66.1903 114.693 67.3618 113.521C68.5333 112.35 68.5333 110.451 67.3618 109.279L50.1479 92.0642L67.3618 74.8503C68.5334 73.6788 68.5334 71.7797 67.3618 70.6082Z" fill="#EB5600"/>
          </svg>
          <span className="font-semibold">case.dev</span>
        </a>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your details to get started
        </p>
      </div>

      <SignupForm callbackUrl={safeCallbackUrl} />

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
