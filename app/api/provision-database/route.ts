/**
 * Database Provisioning Endpoint
 * Creates a dedicated case.dev database for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { provisionUserDatabase, isDatabaseProvisioned } from '@/lib/case-dev/database-provisioning';
import { getApiKeyForUser } from '@/lib/case-dev/storage';
import { CaseDevClient } from '@/lib/case-dev/client';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if database already provisioned
    const alreadyProvisioned = await isDatabaseProvisioned(session.user.id);

    if (alreadyProvisioned) {
      return NextResponse.json({
        success: true,
        message: 'Database already provisioned',
        alreadyExists: true,
      });
    }

    // Get user's case.dev API key
    const apiKey = await getApiKeyForUser(session.user.id);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'case.dev API key not found. Please connect your case.dev account first.' },
        { status: 400 }
      );
    }

    // Create case.dev client
    const client = new CaseDevClient(apiKey);

    // Provision database
    const dbInfo = await provisionUserDatabase(
      session.user.id,
      session.user.email,
      client
    );

    return NextResponse.json({
      success: true,
      message: 'Database provisioned successfully',
      projectId: dbInfo.projectId,
      region: 'aws-us-east-1',
      alreadyExists: false,
    });
  } catch (error: any) {
    console.error('Database provisioning error:', error);

    return NextResponse.json(
      {
        error: 'Failed to provision database',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Check database provisioning status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const provisioned = await isDatabaseProvisioned(session.user.id);

    return NextResponse.json({
      provisioned,
      userId: session.user.id,
    });
  } catch (error) {
    console.error('Error checking database status:', error);

    return NextResponse.json(
      { error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}
