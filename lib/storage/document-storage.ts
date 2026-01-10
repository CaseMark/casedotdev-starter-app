'use client';

import type { Document, LanguageCode } from '@/lib/types';

const STORAGE_KEY = 'mlp_documents';
const SESSION_KEY = 'mlp_session_id';
const USER_ID_KEY = 'mlp_user_id';
const USAGE_KEY = 'mlp_usage';

// Check if running in browser
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get or create user ID
export function getUserId(): string {
  if (!isBrowser()) return 'server';

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${generateId()}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Get or create session ID
export function getSessionId(): string {
  if (!isBrowser()) return 'server';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${generateId()}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Load documents from localStorage
export function loadDocuments(): Document[] {
  if (!isBrowser()) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const documents = JSON.parse(stored) as Document[];
    return documents;
  } catch {
    console.error('Failed to load documents from localStorage');
    return [];
  }
}

// Save documents to localStorage
export function saveDocuments(documents: Document[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Try to clear old documents
      console.warn('Storage quota exceeded, clearing old documents');
      const trimmed = documents.slice(-3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      console.error('Failed to save documents to localStorage');
    }
  }
}

// Add a new document
export function addDocument(doc: Omit<Document, 'id' | 'uploadedAt' | 'status'>): Document {
  const documents = loadDocuments();

  const newDoc: Document = {
    ...doc,
    id: generateId(),
    uploadedAt: new Date().toISOString(),
    status: 'completed',
  };

  documents.push(newDoc);
  saveDocuments(documents);

  return newDoc;
}

// Update a document
export function updateDocument(id: string, updates: Partial<Document>): Document | null {
  const documents = loadDocuments();
  const index = documents.findIndex(d => d.id === id);

  if (index === -1) return null;

  documents[index] = { ...documents[index], ...updates };
  saveDocuments(documents);

  return documents[index];
}

// Delete a document
export function deleteDocument(id: string): boolean {
  const documents = loadDocuments();
  const filtered = documents.filter(d => d.id !== id);

  if (filtered.length === documents.length) return false;

  saveDocuments(filtered);
  return true;
}

// Get a document by ID
export function getDocument(id: string): Document | null {
  const documents = loadDocuments();
  return documents.find(d => d.id === id) || null;
}

// Clear all documents
export function clearAllDocuments(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

// Usage tracking
interface UsageData {
  documentsProcessed: number;
  tokensUsed: number;
  pagesProcessed: number;
  lastResetAt: string;
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export function loadUsage(): UsageData {
  if (!isBrowser()) {
    return {
      documentsProcessed: 0,
      tokensUsed: 0,
      pagesProcessed: 0,
      lastResetAt: getNextMidnight(),
    };
  }

  try {
    const stored = localStorage.getItem(USAGE_KEY);
    if (!stored) {
      return {
        documentsProcessed: 0,
        tokensUsed: 0,
        pagesProcessed: 0,
        lastResetAt: getNextMidnight(),
      };
    }

    const usage = JSON.parse(stored) as UsageData;

    // Check if daily reset needed
    if (new Date() >= new Date(usage.lastResetAt)) {
      const resetUsage = {
        documentsProcessed: 0,
        tokensUsed: 0,
        pagesProcessed: 0,
        lastResetAt: getNextMidnight(),
      };
      localStorage.setItem(USAGE_KEY, JSON.stringify(resetUsage));
      return resetUsage;
    }

    return usage;
  } catch {
    return {
      documentsProcessed: 0,
      tokensUsed: 0,
      pagesProcessed: 0,
      lastResetAt: getNextMidnight(),
    };
  }
}

export function updateUsage(updates: Partial<UsageData>): void {
  if (!isBrowser()) return;

  const current = loadUsage();
  const updated = { ...current, ...updates };
  localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
}

export function incrementUsage(tokens: number = 0, documents: number = 0, pages: number = 0): void {
  const current = loadUsage();
  updateUsage({
    tokensUsed: current.tokensUsed + tokens,
    documentsProcessed: current.documentsProcessed + documents,
    pagesProcessed: current.pagesProcessed + pages,
  });
}

// Export all storage functions
export const documentStorage = {
  loadDocuments,
  saveDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  clearAllDocuments,
  loadUsage,
  updateUsage,
  incrementUsage,
  getUserId,
  getSessionId,
};

export default documentStorage;
