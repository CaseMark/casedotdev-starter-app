/**
 * Next.js Middleware for Route Protection with Better Auth
 *
 * This middleware provides COMPOSABLE authentication patterns.
 * It is TEMPLATE-AGNOSTIC by design - ready to support any of the 6 auth templates:
 *
 * 1. Client Portal - External users accessing their matters
 * 2. Internal Tool - Firm staff only (OAuth or email/password)
 * 3. Multi-Firm SaaS - Multiple orgs with isolated data
 * 4. Hybrid - Both internal staff and external clients
 * 5. OAuth Only - Log in with Google/Microsoft
 * 6. With 2FA - Extra security for compliance
 *
 * The starter app ships with AUTH_MODE = "public-by-default" so apps
 * work immediately without requiring user authentication setup.
 *
 * When you're ready to add auth:
 * 1. Set up your database (see skills/auth/SKILL.md)
 * 2. Add routes to protectedRoutes array below
 * 3. That's it - the login/signup pages already exist
 *
 * @see skills/auth/SKILL.md for detailed documentation
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CONFIGURATION
 * 
 * Adjust these settings based on your app's needs.
 */

/**
 * Auth mode determines the overall protection strategy:
 * - "disabled": No route protection (for MVPs, prototypes)
 * - "public-by-default": Only protect routes in `protectedRoutes`
 * - "private-by-default": Protect everything except `publicRoutes`
 */
const AUTH_MODE: "disabled" | "public-by-default" | "private-by-default" = "public-by-default";

/**
 * Routes that require authentication (used in "public-by-default" mode)
 * Add routes that should only be accessible to logged-in users
 */
const protectedRoutes = [
  "/dashboard",
  "/settings",
  "/account",
  "/admin",
];

/**
 * Routes that don't require authentication (used in "private-by-default" mode)
 * Add marketing pages, public content, etc.
 */
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth",      // Better Auth API routes (required)
  "/verify-email",
  "/accept-invite",
];

/**
 * Routes that should never require auth regardless of mode
 * (e.g., health checks, webhooks with their own auth)
 */
const alwaysPublicRoutes = [
  "/api/auth",      // Better Auth API (required)
  "/api/health",
  "/api/webhooks",
];

// ============================================================================
// Implementation
// ============================================================================

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedRoute(pathname: string): boolean {
  return matchesRoute(pathname, protectedRoutes);
}

function isPublicRoute(pathname: string): boolean {
  return matchesRoute(pathname, publicRoutes);
}

function isAlwaysPublicRoute(pathname: string): boolean {
  return matchesRoute(pathname, alwaysPublicRoutes);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow certain routes regardless of auth mode
  if (isAlwaysPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Handle based on auth mode
  switch (AUTH_MODE) {
    case "disabled":
      // No protection - all routes accessible
      return NextResponse.next();

    case "public-by-default":
      // Only protect specific routes
      if (!isProtectedRoute(pathname)) {
        return NextResponse.next();
      }
      break;

    case "private-by-default":
      // Protect everything except public routes
      if (isPublicRoute(pathname)) {
        return NextResponse.next();
      }
      break;
  }

  // Check for Better Auth session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    // No session - redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists - allow access
  // Note: This only checks cookie presence, not validity
  // Full session validation happens in your API routes/server components
  return NextResponse.next();
}

/**
 * Configure which routes the middleware runs on
 *
 * This pattern excludes:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico
 * - public files (svg, png, jpg, etc.)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
