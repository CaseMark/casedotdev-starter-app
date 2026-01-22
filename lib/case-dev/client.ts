/**
 * case.dev API Client Manager
 *
 * Handles API key verification and provides wrapper for case.dev API calls
 * Since the case.dev SDK isn't available yet, this uses direct HTTP calls
 */

const CASE_DEV_API_BASE = 'https://api.case.dev';

/**
 * LLM Chat Completion Response type (OpenAI-compatible format)
 */
export interface LLMChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * case.dev API Client
 * Makes authenticated requests to case.dev API using bearer token auth
 */
export class CaseDevClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make an authenticated request to case.dev API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${CASE_DEV_API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `case.dev API error (${response.status}): ${error}`
        );
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`case.dev API request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * List database projects (used for API key verification)
   */
  async listDatabaseProjects() {
    return this.request('/database/v1/projects', { method: 'GET' });
  }

  /**
   * Health check endpoint
   */
  async health() {
    return this.request('/health', { method: 'GET' });
  }

  /**
   * List compute environments (can be used for verification)
   */
  async listComputeEnvironments() {
    return this.request('/compute/v1/environments', { method: 'GET' });
  }

  /**
   * Create a vault
   * POST /vault with { name, description, enableIndexing }
   */
  async createVault(params: {
    name: string;
    description?: string;
    enableIndexing?: boolean;
  }): Promise<{ id: string; name: string }> {
    return this.request('/vault', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        description: params.description || `Vault for ${params.name}`,
        enableIndexing: params.enableIndexing ?? true,
      }),
    });
  }

  /**
   * List all vaults
   */
  async listVaults(): Promise<Array<{ id: string; name: string }>> {
    return this.request('/vault', { method: 'GET' });
  }

  /**
   * Get vault by ID
   */
  async getVault(vaultId: string): Promise<{ id: string; name: string }> {
    return this.request(`/vault/${vaultId}`, { method: 'GET' });
  }

  /**
   * Get or create a vault by name
   * Returns existing vault if found, creates new one if not
   */
  async getOrCreateVault(params: {
    name: string;
    description?: string;
    enableIndexing?: boolean;
  }): Promise<{ id: string; name: string }> {
    try {
      // Try to list vaults and find by name
      const vaults = await this.listVaults();
      const existingVault = vaults.find(v => v.name === params.name);
      if (existingVault) {
        return existingVault;
      }
    } catch (error) {
      // If listing fails, try to create anyway
      console.log('Could not list vaults, attempting to create:', error);
    }

    // Create new vault
    return this.createVault(params);
  }

  /**
   * Get upload URL for a file
   * POST /vault/:id/upload with { filename, contentType, metadata }
   * Returns { uploadUrl, objectId }
   */
  async getUploadUrl(params: {
    vaultId: string;
    filename: string;
    contentType: string;
    metadata?: Record<string, any>;
  }): Promise<{ uploadUrl: string; objectId: string }> {
    return this.request(`/vault/${params.vaultId}/upload`, {
      method: 'POST',
      body: JSON.stringify({
        filename: params.filename,
        contentType: params.contentType,
        metadata: params.metadata || {},
      }),
    });
  }

  /**
   * Ingest/process an uploaded object (triggers OCR, indexing, etc.)
   * POST /vault/:vaultId/ingest/:objectId
   */
  async ingestObject(params: {
    vaultId: string;
    objectId: string;
  }): Promise<{ success: boolean }> {
    return this.request(`/vault/${params.vaultId}/ingest/${params.objectId}`, {
      method: 'POST',
    });
  }

  /**
   * Upload document to vault with OCR (three-step process)
   * 1. Get or create vault
   * 2. Get upload URL
   * 3. PUT file directly to S3
   * 4. Ingest/process the file
   */
  async uploadToVault(params: {
    vaultName: string;
    file: File;
    enableOCR?: boolean;
    enableSemanticSearch?: boolean;
    metadata?: Record<string, any>;
  }): Promise<{ objectId: string; vaultId: string }> {
    // Step 1: Get or create vault
    const vault = await this.getOrCreateVault({
      name: params.vaultName,
      description: `Document vault for ${params.vaultName}`,
      enableIndexing: params.enableSemanticSearch ?? true,
    });

    // Step 2: Get upload URL
    const uploadInfo = await this.getUploadUrl({
      vaultId: vault.id,
      filename: params.file.name,
      contentType: params.file.type || 'application/octet-stream',
      metadata: {
        ...params.metadata,
        enableOCR: params.enableOCR ?? true,
      },
    });

    // Step 3: Upload file directly to S3
    const fileBuffer = await params.file.arrayBuffer();
    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': params.file.type || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to storage: ${uploadResponse.status}`);
    }

    // Step 4: Ingest/process the file
    await this.ingestObject({
      vaultId: vault.id,
      objectId: uploadInfo.objectId,
    });

    return {
      objectId: uploadInfo.objectId,
      vaultId: vault.id,
    };
  }

  /**
   * Get vault object text (OCR results)
   * GET /vault/{vaultId}/objects/{objectId}/text
   * Returns: { text: string, metadata: { object_id, vault_id, filename, chunk_count, length, ingestion_completed_at } }
   */
  async getVaultObjectText(params: { vaultId: string; objectId: string }): Promise<{
    text: string;
    metadata?: {
      object_id: string;
      vault_id: string;
      filename: string;
      chunk_count: number;
      length: number;
      ingestion_completed_at: string;
    };
  }> {
    return this.request(`/vault/${params.vaultId}/objects/${params.objectId}/text`, {
      method: 'GET',
    });
  }

  /**
   * Get OCR text from vault object (convenience method)
   */
  async getOCRText(vaultId: string, objectId: string): Promise<string> {
    const result = await this.getVaultObjectText({ vaultId, objectId });
    return result.text || '';
  }

  /**
   * Call LLM with CaseMark Core 1 model
   */
  async completeLLM(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    response_format?: { type: string };
  }): Promise<LLMChatCompletionResponse> {
    return this.request<LLMChatCompletionResponse>('/llms/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Call LLM (alias for completeLLM)
   */
  async llmComplete(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    response_format?: { type: string };
  }): Promise<LLMChatCompletionResponse> {
    return this.completeLLM(params);
  }

  /**
   * Create a new database project
   */
  async createDatabaseProject(params: {
    name: string;
    region?: string;
  }): Promise<{ id: string; name: string; region: string; status: string }> {
    return this.request('/database/v1/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        region: params.region || 'aws-us-east-1',
      }),
    });
  }

  /**
   * Get database project by ID
   */
  async getDatabaseProject(projectId: string): Promise<{
    id: string;
    name: string;
    region: string;
    status: string;
  }> {
    return this.request(`/database/v1/projects/${projectId}`, {
      method: 'GET',
    });
  }

  /**
   * Get database connection string
   */
  async getDatabaseConnection(projectId: string): Promise<{
    connectionUri: string;
    branch: string;
    pooled: boolean;
  }> {
    return this.request(`/database/v1/projects/${projectId}/connection`, {
      method: 'GET',
    });
  }

  /**
   * Delete database project
   */
  async deleteDatabaseProject(projectId: string): Promise<void> {
    return this.request(`/database/v1/projects/${projectId}`, {
      method: 'DELETE',
    });
  }
}

/**
 * case.dev Client Manager
 * Provides methods for API key verification and client creation
 */
export class CaseDevClientManager {
  /**
   * Verify API key works by making a test API call
   *
   * Attempts to list database projects as a lightweight verification
   * Returns validation result with error message if verification fails
   */
  static async verifyApiKey(apiKey: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const client = new CaseDevClient(apiKey);

      // Try a lightweight API call to verify key works
      // Using compute environments endpoint as it's likely to be available
      await client.listComputeEnvironments();

      return { valid: true };
    } catch (error: any) {
      // Parse error message to provide helpful feedback
      const errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
          valid: false,
          error: 'Invalid API key - please check your key from console.case.dev',
        };
      }

      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        return {
          valid: false,
          error: 'API key does not have required permissions',
        };
      }

      if (errorMessage.includes('429')) {
        return {
          valid: false,
          error: 'Rate limit exceeded - please try again in a moment',
        };
      }

      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
        return {
          valid: false,
          error: 'Unable to connect to case.dev API - please check your internet connection',
        };
      }

      return {
        valid: false,
        error: `Failed to verify API key: ${errorMessage.substring(0, 100)}`,
      };
    }
  }

  /**
   * Get authenticated case.dev client for a user
   *
   * Retrieves API key from database and creates client instance
   * Returns null if user hasn't connected case.dev
   */
  static async getClientForUser(userId: string): Promise<CaseDevClient | null> {
    // Import dynamically to avoid circular dependencies
    const { getApiKeyForUser } = await import('./storage');

    const apiKey = await getApiKeyForUser(userId);
    if (!apiKey) {
      return null;
    }

    return new CaseDevClient(apiKey);
  }

  /**
   * Test if user has case.dev connected
   *
   * Quick check to see if API key exists for user
   */
  static async userHasCaseDevConnected(userId: string): Promise<boolean> {
    const { getApiKeyForUser } = await import('./storage');
    const apiKey = await getApiKeyForUser(userId);
    return apiKey !== null;
  }
}
