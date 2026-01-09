/**
 * Next.js Middleware for Route Protection
 *
 * This middleware provides composable authentication patterns using Better Auth.
 * Configure protection based on your app's needs - it's opt-in, not opt-out.
 *
 * @see skills/auth/SKILL.md for detailed documentation
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * PROTECTION STRATEGY
 * 
 * Choose ONE of these patterns by uncommenting the appropriate section:
 * 
 * 1. NO PROTECTION (default) - All routes accessible, add auth later
 * 2. PROTECT SPECIFIC ROUTES - Only listed routes require auth
 * 3. PROTECT ALL EXCEPT PUBLIC - Traditional "protect everything" approach
 */

// ============================================================================
// PATTERN 1: NO PROTECTION (Default)
// ============================================================================
// All routes are accessible. Use this when:
// - Building an MVP or prototype
// - App doesn't need user accounts yet
// - You want to add auth incrementally
//
// To add protection later, switch to Pattern 2 or 3

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// ============================================================================
// PATTERN 2: PROTECT SPECIFIC ROUTES (Recommended)
// ============================================================================
// Only listed routes require authentication. Use this when:
// - Most of your app is public
// - Only certain pages need login (dashboard, settings, etc.)
// - You want explicit control over what's protected
//
// Uncomment this section and comment out Pattern 1 to enable:

/*
const protectedRoutes = [
  "/dashboard",
  "/settings",
  "/account",
  // Add routes that require authentication
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check auth for protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth default)
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
*/

// ============================================================================
// PATTERN 3: PROTECT ALL EXCEPT PUBLIC
// ============================================================================
// Everything requires auth except whitelisted routes. Use this when:
// - Building a fully authenticated app (internal tools, client portals)
// - Most pages should require login
// - You have a clear list of public pages
//
// Uncomment this section and comment out Pattern 1 to enable:

/*
const publicRoutes = [
  "/",              // Landing page
  "/login",         // Login page
  "/signup",        // Signup page
  "/api/auth",      // Better Auth API (required)
  // Add other public routes (marketing pages, docs, etc.)
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth default)
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
*/

// ============================================================================
// ADVANCED: ROLE-BASED PROTECTION
// ============================================================================
// For apps that need different access levels. See skills/auth/SKILL.md for
// full implementation with Better Auth organization plugin.

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
