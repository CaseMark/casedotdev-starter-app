/**
 * POST /api/case-dev/disconnect
 *
 * Disconnect user's case.dev account
 * Removes API key from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { removeApiKey } from '@/lib/case-dev/storage';

export async function POST(request: NextRequest) {
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

    // Remove API key from database
    await removeApiKey(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'case.dev account disconnected successfully',
    });
  } catch (error) {
    console.error('[case-dev/disconnect] Error disconnecting:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect case.dev account. Please try again.',
      },
      { status: 500 }
    );
  }
}
