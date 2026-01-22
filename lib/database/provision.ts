/**
 * Database Provisioning for Bankruptcy Tool
 * Checks if user has a database, creates one if not
 */

const DB_PROJECT_KEY = 'bankruptcy_db_project_id';
const DB_CONNECTION_KEY = 'bankruptcy_db_connection';

export interface DatabaseInfo {
  projectId: string;
  connectionString: string;
  region: string;
}

/**
 * Check if user has a database provisioned
 */
export function hasDatabase(): boolean {
  if (typeof window === 'undefined') return false;
  const projectId = localStorage.getItem(DB_PROJECT_KEY);
  return projectId !== null;
}

/**
 * Get existing database info from localStorage
 */
export function getDatabaseInfo(): DatabaseInfo | null {
  if (typeof window === 'undefined') return null;

  const projectId = localStorage.getItem(DB_PROJECT_KEY);
  const connectionString = localStorage.getItem(DB_CONNECTION_KEY);

  if (!projectId || !connectionString) return null;

  return {
    projectId,
    connectionString,
    region: 'aws-us-east-1',
  };
}

/**
 * Provision a new database for the user
 */
export async function provisionDatabase(apiKey: string): Promise<DatabaseInfo> {
  console.log('provisionDatabase: Starting...');

  try {
    // Call our server-side API route to provision the database
    // This avoids CORS issues with direct browser calls to case.dev API
    const response = await fetch('/api/database/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('provisionDatabase: API response received');
    console.log('provisionDatabase: projectId =', data.projectId);
    console.log('provisionDatabase: isNewDatabase =', data.isNewDatabase);
    console.log('provisionDatabase: connectionString =', data.connectionString ? `${data.connectionString.substring(0, 50)}...` : 'null');

    // Store in localStorage
    console.log('provisionDatabase: Storing in localStorage...');
    localStorage.setItem(DB_PROJECT_KEY, data.projectId);
    localStorage.setItem(DB_CONNECTION_KEY, data.connectionString);
    
    // Verify storage
    const storedProjectId = localStorage.getItem(DB_PROJECT_KEY);
    const storedConnection = localStorage.getItem(DB_CONNECTION_KEY);
    console.log('provisionDatabase: Verified localStorage - projectId:', storedProjectId);
    console.log('provisionDatabase: Verified localStorage - connection:', storedConnection ? 'stored' : 'NOT STORED');

    return {
      projectId: data.projectId,
      connectionString: data.connectionString,
      region: data.region || 'aws-us-east-1',
    };
  } catch (error: any) {
    console.error('Database provisioning error:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    throw new Error(`Database provisioning failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Initialize database - check if exists, create if not
 */
export async function initializeDatabase(apiKey: string): Promise<DatabaseInfo> {
  // Check if database already exists
  const existing = getDatabaseInfo();
  if (existing) {
    console.log('Using existing database:', existing.projectId);
    return existing;
  }

  // Create new database
  console.log('No existing database found, creating new one...');
  return await provisionDatabase(apiKey);
}

/**
 * Clear database info (for testing/reset)
 */
export function clearDatabase(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DB_PROJECT_KEY);
  localStorage.removeItem(DB_CONNECTION_KEY);
}
