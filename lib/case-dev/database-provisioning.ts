/**
 * Database Provisioning Service
 * Automatically creates and manages per-user case.dev databases
 */

import { CaseDevClient } from './client';
import { db } from '@/lib/db';
import { userDatabases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface UserDatabaseInfo {
  projectId: string;
  connectionString: string;
  poolerConnectionString?: string;
  createdAt: Date;
  status: 'provisioning' | 'active' | 'error';
}

/**
 * Provision a dedicated case.dev database for a user
 * If database already exists, returns existing database info
 */
export async function provisionUserDatabase(
  userId: string,
  userEmail: string,
  caseDevClient: CaseDevClient
): Promise<UserDatabaseInfo> {
  // Check if user already has a database
  const existing = await getUserDatabase(userId);

  if (existing) {
    console.log(`User ${userId} already has database: ${existing.projectId}`);
    return existing;
  }

  console.log(`Provisioning new database for user ${userId}...`);

  try {
    // Create unique database project name
    const projectName = generateDatabaseName(userId, userEmail);

    // Create database project via case.dev API
    const project = await caseDevClient.createDatabaseProject({
      name: projectName,
      region: 'aws-us-east-1', // Default to US East
    });

    console.log(`Database project created: ${project.id}`);

    // Get connection string
    const connection = await caseDevClient.getDatabaseConnection(project.id);

    // Store database info in our auth database
    // Note: API returns connectionUri, we store it as connectionString for consistency
    const dbInfo: UserDatabaseInfo = {
      projectId: project.id,
      connectionString: connection.connectionUri,
      poolerConnectionString: connection.pooled ? connection.connectionUri : undefined,
      createdAt: new Date(),
      status: 'active',
    };

    await db.insert(userDatabases).values({
      userId,
      projectId: project.id,
      projectName,
      connectionString: connection.connectionUri,
      poolerConnectionString: connection.pooled ? connection.connectionUri : undefined,
      region: 'aws-us-east-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Database provisioning complete for user ${userId}`);

    return dbInfo;
  } catch (error) {
    console.error(`Failed to provision database for user ${userId}:`, error);

    // Store error state
    await db.insert(userDatabases).values({
      userId,
      projectId: `error-${Date.now()}`,
      projectName: `error-${userId}`,
      connectionString: '',
      status: 'error',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    throw new Error(`Failed to provision database: ${error}`);
  }
}

/**
 * Get existing database info for a user
 */
export async function getUserDatabase(
  userId: string
): Promise<UserDatabaseInfo | null> {
  const result = await db
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, userId))
    .limit(1);

  if (result.length === 0 || result[0].status === 'error') {
    return null;
  }

  return {
    projectId: result[0].projectId,
    connectionString: result[0].connectionString,
    poolerConnectionString: result[0].poolerConnectionString || undefined,
    createdAt: result[0].createdAt,
    status: result[0].status as 'provisioning' | 'active' | 'error',
  };
}

/**
 * Get database connection string for a user
 */
export async function getUserDatabaseConnection(
  userId: string
): Promise<string | null> {
  const dbInfo = await getUserDatabase(userId);
  return dbInfo?.connectionString || null;
}

/**
 * Delete user database (for cleanup/testing)
 */
export async function deleteUserDatabase(
  userId: string,
  caseDevClient: CaseDevClient
): Promise<void> {
  const dbInfo = await getUserDatabase(userId);

  if (!dbInfo) {
    return;
  }

  try {
    // Delete from case.dev
    await caseDevClient.deleteDatabaseProject(dbInfo.projectId);

    // Delete from our database
    await db.delete(userDatabases).where(eq(userDatabases.userId, userId));

    console.log(`Database ${dbInfo.projectId} deleted for user ${userId}`);
  } catch (error) {
    console.error(`Failed to delete database for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Generate unique database name for user
 */
function generateDatabaseName(userId: string, userEmail: string): string {
  // Create a safe, unique name
  const emailPrefix = userEmail.split('@')[0].replace(/[^a-z0-9]/gi, '');
  const userIdShort = userId.substring(0, 8);
  const timestamp = Date.now().toString(36); // Base-36 timestamp

  return `bankruptcy-${emailPrefix}-${userIdShort}-${timestamp}`.toLowerCase();
}

/**
 * Check if user's database is provisioned and ready
 */
export async function isDatabaseProvisioned(userId: string): Promise<boolean> {
  const dbInfo = await getUserDatabase(userId);
  return dbInfo !== null && dbInfo.status === 'active';
}

/**
 * Provision database in background after signup (non-blocking)
 */
export async function provisionDatabaseBackground(
  userId: string,
  userEmail: string,
  apiKey: string
): Promise<void> {
  // Run asynchronously without blocking the response
  setImmediate(async () => {
    try {
      const client = new CaseDevClient(apiKey);
      await provisionUserDatabase(userId, userEmail, client);
    } catch (error) {
      console.error('Background database provisioning failed:', error);
    }
  });
}
