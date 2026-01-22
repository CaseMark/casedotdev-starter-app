/**
 * Verify case.dev API Key and Provision Database
 * Simple endpoint that doesn't require authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { CaseDevClient } from '@/lib/case-dev/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith('sk_case_')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Key should start with sk_case_' },
        { status: 400 }
      );
    }

    // Verify API key works with a simple health check
    const client = new CaseDevClient(apiKey);

    try {
      // System health check - lightweight API call to verify the key
      await client.listComputeEnvironments();

      return NextResponse.json({
        success: true,
        message: 'API key verified successfully',
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('timed out')) {
        return NextResponse.json(
          { error: 'Request timed out - case.dev API may be slow. Please try again.' },
          { status: 504 }
        );
      }

      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid API key - please check your key from console.case.dev' },
          { status: 401 }
        );
      }

      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'API key does not have required permissions' },
          { status: 403 }
        );
      }

      if (errorMessage.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again in a moment' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Failed to verify API key: ${errorMessage.substring(0, 100)}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[verify-key] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify API key' },
      { status: 500 }
    );
  }
}
