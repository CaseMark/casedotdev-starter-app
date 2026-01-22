/**
 * GET /api/case-dev/status
 *
 * Check case.dev connection status for current user
 * Returns whether connected and last 4 digits of API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApiKeyDisplay } from '@/lib/case-dev/storage';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Get API key display info (doesn't decrypt actual key)
    const keyInfo = await getApiKeyDisplay(session.user.id);

    if (!keyInfo) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      last4: keyInfo.last4,
      verified: keyInfo.verified,
    });
  } catch (error) {
    console.error('[case-dev/status] Error getting status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get connection status. Please try again.',
      },
      { status: 500 }
    );
  }
}
