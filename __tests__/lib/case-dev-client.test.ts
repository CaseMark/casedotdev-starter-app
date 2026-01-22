import { describe, it, expect, vi } from 'vitest';
import { CaseDevClient, CaseDevClientManager } from '@/lib/case-dev/client';

// Mock fetch
global.fetch = vi.fn();

describe('CaseDevClient', () => {
  const testApiKey = 'sk_case_test123';
  let client: CaseDevClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CaseDevClient(testApiKey);
  });

  describe('authentication', () => {
    it('includes Bearer token in requests', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      await client.listDatabaseProjects();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testApiKey}`,
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws error on failed requests', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.listDatabaseProjects()).rejects.toThrow();
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listDatabaseProjects()).rejects.toThrow('Network error');
    });
  });

  describe('vault operations', () => {
    it('creates vault with correct parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vaultId: 'test-vault' }),
      });

      await client.createVault({
        name: 'test-vault',
        enableOCR: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/vaults/v1/create'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('LLM operations', () => {
    it('calls LLM with correct format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"result": "test"}' } }],
        }),
      });

      await client.llmComplete({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/llms/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

describe('CaseDevClientManager', () => {
  describe('verifyApiKey', () => {
    it('returns valid for working API key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: [] }),
      });

      const result = await CaseDevClientManager.verifyApiKey('sk_case_test');
      expect(result.valid).toBe(true);
    });

    it('returns invalid for 401 error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await CaseDevClientManager.verifyApiKey('invalid_key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('handles rate limiting', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('case.dev API error (429): Rate limit exceeded')
      );

      const result = await CaseDevClientManager.verifyApiKey('sk_case_test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('ENOTFOUND api.case.dev')
      );

      const result = await CaseDevClientManager.verifyApiKey('sk_case_test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unable to connect');
    });
  });
});
