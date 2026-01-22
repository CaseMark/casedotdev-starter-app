/**
 * Server-side Helpers for case.dev Integration
 *
 * Use these functions in Server Components and Server Actions to get case.dev client
 */

import { auth } from '../auth';
import { headers } from 'next/headers';
import { CaseDevClientManager } from './client';

/**
 * Get case.dev client for the current authenticated user
 *
 * Use in Server Components and Server Actions:
 *
 * ```ts
 * 'use server';
 *
 * export async function uploadDocument(formData: FormData) {
 *   const client = await getCaseDevClient();
 *   // Use client to call case.dev API
 * }
 * ```
 *
 * @throws Error if not authenticated or case.dev not connected
 */
export async function getCaseDevClient() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  const client = await CaseDevClientManager.getClientForUser(session.user.id);

  if (!client) {
    throw new Error('case.dev not connected. Please connect your API key in settings.');
  }

  return client;
}

/**
 * Check if current user has case.dev connected
 *
 * Returns false instead of throwing error
 * Useful for conditional rendering
 */
export async function hasCaseDevConnected(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return false;
    }

    return await CaseDevClientManager.userHasCaseDevConnected(session.user.id);
  } catch {
    return false;
  }
}
