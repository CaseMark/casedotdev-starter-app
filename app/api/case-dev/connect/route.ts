/**
 * POST /api/case-dev/connect
 *
 * Connect user's case.dev API key
 * Validates format, verifies key works, then stores encrypted
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiKeyEncryption } from '@/lib/case-dev/encryption';
import { CaseDevClient, CaseDevClientManager } from '@/lib/case-dev/client';
import { storeApiKey } from '@/lib/case-dev/storage';
import { provisionUserDatabase, isDatabaseProvisioned } from '@/lib/case-dev/database-provisioning';

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

    // Parse request body
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!ApiKeyEncryption.isValidFormat(apiKey)) {
      return NextResponse.json(
        {
          error:
            'Invalid API key format. Key should start with sk_case_ and be at least 20 characters',
        },
        { status: 400 }
      );
    }

    // Verify key works by making test API call
    const verification = await CaseDevClientManager.verifyApiKey(apiKey);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Failed to verify API key' },
        { status: 400 }
      );
    }

    // Store encrypted key
    await storeApiKey(session.user.id, apiKey);

    // Provision user database if not already provisioned
    let databaseProvisioningStatus = 'existing';
    let projectId: string | undefined;

    try {
      const alreadyProvisioned = await isDatabaseProvisioned(session.user.id);

      if (!alreadyProvisioned) {
        console.log(`Provisioning database for user ${session.user.id}...`);
        const client = new CaseDevClient(apiKey);
        const dbInfo = await provisionUserDatabase(
          session.user.id,
          session.user.email,
          client
        );
        databaseProvisioningStatus = 'created';
        projectId = dbInfo.projectId;
        console.log(`Database provisioned: ${projectId}`);
      } else {
        console.log(`User ${session.user.id} already has database provisioned`);
      }
    } catch (dbError) {
      console.error('Failed to provision database:', dbError);
      // Don't fail the API key connection if database provisioning fails
      // User can retry database provisioning later
      databaseProvisioningStatus = 'error';
    }

    return NextResponse.json({
      success: true,
      message: 'case.dev API key connected successfully',
      last4: ApiKeyEncryption.getLast4(apiKey),
      database: {
        status: databaseProvisioningStatus,
        projectId,
      },
    });
  } catch (error) {
    console.error('[case-dev/connect] Error connecting:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect case.dev account. Please try again.',
      },
      { status: 500 }
    );
  }
}
