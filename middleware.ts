/**
 * Next.js Middleware
 *
 * This app uses client-side storage (IndexedDB) and does not require
 * authentication. All routes are publicly accessible.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // No route protection - all routes accessible
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
