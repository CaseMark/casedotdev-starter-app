/**
 * Simple Authentication using case.dev API Keys
 * No database needed - API key stored in browser localStorage
 */

'use client';

const API_KEY_STORAGE_KEY = 'casedev_api_key';

export class SimpleAuth {
  /**
   * Store API key in localStorage
   */
  static setApiKey(apiKey: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  }

  /**
   * Get API key from localStorage
   */
  static getApiKey(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_KEY_STORAGE_KEY);
    }
    return null;
  }

  /**
   * Remove API key (logout)
   */
  static removeApiKey(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getApiKey() !== null;
  }
}
