/**
 * Legal Document Generation Studio - IndexedDB Storage
 * 
 * Client-side storage using Dexie.js for generated documents.
 * All user data stays in the browser - no server-side storage.
 */

import Dexie, { type Table } from 'dexie';
import type { GeneratedDocument, DocumentTemplate } from '@/lib/types';

/**
 * Document Database class extending Dexie
 * Stores generated documents and custom templates locally
 */
export class DocumentDatabase extends Dexie {
  // Typed table declarations
  documents!: Table<GeneratedDocument>;
  customTemplates!: Table<DocumentTemplate>;

  constructor() {
    super('LegalDocStudio'); // Database name

    // Schema definition - version 1
    this.version(1).stores({
      // Primary key is first, then indexed fields
      documents: 'id, templateId, status, createdAt, updatedAt',
      customTemplates: 'id, category, createdAt, updatedAt',
    });
  }
}

// Singleton pattern - one database instance
let dbInstance: DocumentDatabase | null = null;

/**
 * Get the database instance (singleton)
 * @throws Error if called on server side
 */
export function getDatabase(): DocumentDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbInstance) {
    dbInstance = new DocumentDatabase();
  }

  return dbInstance;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Reset database (for testing or user-initiated clear)
 */
export async function resetDatabase(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

// ============================================================================
// Date Serialization Helpers
// ============================================================================

/**
 * Serialize dates to ISO strings for storage
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Deserialize ISO strings back to Date objects
 */
export function deserializeDates<T>(obj: T, dateFields: string[] = []): T {
  if (obj === null || obj === undefined) return obj;

  const defaultDateFields = [
    'createdAt', 'updatedAt', 'startedAt', 'lastUpdatedAt',
  ];

  const allDateFields = [...new Set([...defaultDateFields, ...dateFields])];

  if (Array.isArray(obj)) {
    return obj.map(item => deserializeDates(item, dateFields)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (allDateFields.includes(key) && typeof value === 'string') {
        const parsed = new Date(value);
        result[key] = isNaN(parsed.getTime()) ? value : parsed;
      } else if (typeof value === 'object') {
        result[key] = deserializeDates(value, dateFields);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

// ============================================================================
// Document CRUD Operations
// ============================================================================

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Save a generated document to IndexedDB
 */
export async function saveDocument(document: GeneratedDocument): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    // Serialize dates before storing
    const serialized = serializeDates(document);
    await db.documents.put(serialized as GeneratedDocument);

    if (DEBUG) {
      console.log('[Storage] Saved document:', { id: document.id, name: document.name });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save document:', error);
    return false;
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<GeneratedDocument | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const db = getDatabase();
    const doc = await db.documents.get(id);
    
    if (doc) {
      return deserializeDates(doc) as GeneratedDocument;
    }
    
    return undefined;
  } catch (error) {
    console.error('[Storage] Failed to get document:', error);
    return undefined;
  }
}

/**
 * List all documents, optionally filtered
 */
export async function listDocuments(options?: {
  templateId?: string;
  status?: GeneratedDocument['status'];
  limit?: number;
}): Promise<GeneratedDocument[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    let collection = db.documents.orderBy('updatedAt').reverse();

    const docs = await collection.toArray();
    
    let filtered = docs;
    
    // Apply filters
    if (options?.templateId) {
      filtered = filtered.filter(d => d.templateId === options.templateId);
    }
    
    if (options?.status) {
      filtered = filtered.filter(d => d.status === options.status);
    }
    
    // Apply limit
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    // Deserialize dates
    return filtered.map(doc => deserializeDates(doc) as GeneratedDocument);
  } catch (error) {
    console.error('[Storage] Failed to list documents:', error);
    return [];
  }
}

/**
 * Update a document's status
 */
export async function updateDocumentStatus(
  id: string,
  status: GeneratedDocument['status']
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.documents.update(id, { 
      status, 
      updatedAt: new Date() 
    });
    
    if (DEBUG) {
      console.log('[Storage] Updated document status:', { id, status });
    }
    
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update document status:', error);
    return false;
  }
}

/**
 * Update a document's content and variables
 */
export async function updateDocument(
  id: string,
  updates: Partial<Pick<GeneratedDocument, 'name' | 'content' | 'variables' | 'status'>>
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.documents.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
    
    if (DEBUG) {
      console.log('[Storage] Updated document:', { id, updates: Object.keys(updates) });
    }
    
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update document:', error);
    return false;
  }
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.documents.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted document:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete document:', error);
    return false;
  }
}

/**
 * Delete multiple documents by IDs
 */
export async function deleteDocuments(ids: string[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.documents.bulkDelete(ids);

    if (DEBUG) {
      console.log('[Storage] Deleted documents:', { count: ids.length });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete documents:', error);
    return false;
  }
}

/**
 * Search documents by name
 */
export async function searchDocuments(query: string): Promise<GeneratedDocument[]> {
  if (!isBrowser()) return [];
  if (!query.trim()) return listDocuments();

  try {
    const db = getDatabase();
    const docs = await db.documents.toArray();
    
    const lowerQuery = query.toLowerCase();
    const filtered = docs.filter(doc => 
      doc.name.toLowerCase().includes(lowerQuery) ||
      doc.templateName.toLowerCase().includes(lowerQuery)
    );

    // Sort by most recently updated
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return filtered.map(doc => deserializeDates(doc) as GeneratedDocument);
  } catch (error) {
    console.error('[Storage] Failed to search documents:', error);
    return [];
  }
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  if (!isBrowser()) return 0;

  try {
    const db = getDatabase();
    return await db.documents.count();
  } catch (error) {
    console.error('[Storage] Failed to get document count:', error);
    return 0;
  }
}

// ============================================================================
// Custom Template Operations (for future use)
// ============================================================================

/**
 * Save a custom template
 */
export async function saveCustomTemplate(template: DocumentTemplate): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    const serialized = serializeDates(template);
    await db.customTemplates.put(serialized as DocumentTemplate);

    if (DEBUG) {
      console.log('[Storage] Saved custom template:', { id: template.id, name: template.name });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save custom template:', error);
    return false;
  }
}

/**
 * Get all custom templates
 */
export async function listCustomTemplates(): Promise<DocumentTemplate[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    const templates = await db.customTemplates.toArray();
    return templates.map(t => deserializeDates(t) as DocumentTemplate);
  } catch (error) {
    console.error('[Storage] Failed to list custom templates:', error);
    return [];
  }
}

/**
 * Delete a custom template
 */
export async function deleteCustomTemplate(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.customTemplates.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted custom template:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete custom template:', error);
    return false;
  }
}

// ============================================================================
// Storage Info & Utilities
// ============================================================================

/**
 * Get storage usage information
 */
export async function getStorageInfo(): Promise<{
  documentCount: number;
  customTemplateCount: number;
  estimatedSize: string;
}> {
  if (!isBrowser()) {
    return { documentCount: 0, customTemplateCount: 0, estimatedSize: '0 KB' };
  }

  try {
    const db = getDatabase();
    const documentCount = await db.documents.count();
    const customTemplateCount = await db.customTemplates.count();
    
    // Estimate size by serializing all data
    const docs = await db.documents.toArray();
    const templates = await db.customTemplates.toArray();
    const totalSize = JSON.stringify([...docs, ...templates]).length;
    
    const estimatedSize = totalSize < 1024 
      ? `${totalSize} B`
      : totalSize < 1024 * 1024
        ? `${(totalSize / 1024).toFixed(2)} KB`
        : `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;

    return { documentCount, customTemplateCount, estimatedSize };
  } catch (error) {
    console.error('[Storage] Failed to get storage info:', error);
    return { documentCount: 0, customTemplateCount: 0, estimatedSize: '0 KB' };
  }
}

/**
 * Export all data as JSON (for backup)
 */
export async function exportAllData(): Promise<{
  documents: GeneratedDocument[];
  customTemplates: DocumentTemplate[];
  exportedAt: string;
}> {
  if (!isBrowser()) {
    return { documents: [], customTemplates: [], exportedAt: new Date().toISOString() };
  }

  try {
    const db = getDatabase();
    const documents = await db.documents.toArray();
    const customTemplates = await db.customTemplates.toArray();

    return {
      documents: documents.map(d => deserializeDates(d) as GeneratedDocument),
      customTemplates: customTemplates.map(t => deserializeDates(t) as DocumentTemplate),
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Storage] Failed to export data:', error);
    return { documents: [], customTemplates: [], exportedAt: new Date().toISOString() };
  }
}

/**
 * Import data from JSON backup
 */
export async function importData(data: {
  documents?: GeneratedDocument[];
  customTemplates?: DocumentTemplate[];
}): Promise<{ documentsImported: number; templatesImported: number }> {
  if (!isBrowser()) {
    return { documentsImported: 0, templatesImported: 0 };
  }

  try {
    const db = getDatabase();
    let documentsImported = 0;
    let templatesImported = 0;

    if (data.documents?.length) {
      const serialized = data.documents.map(d => serializeDates(d));
      await db.documents.bulkPut(serialized as GeneratedDocument[]);
      documentsImported = data.documents.length;
    }

    if (data.customTemplates?.length) {
      const serialized = data.customTemplates.map(t => serializeDates(t));
      await db.customTemplates.bulkPut(serialized as DocumentTemplate[]);
      templatesImported = data.customTemplates.length;
    }

    if (DEBUG) {
      console.log('[Storage] Imported data:', { documentsImported, templatesImported });
    }

    return { documentsImported, templatesImported };
  } catch (error) {
    console.error('[Storage] Failed to import data:', error);
    return { documentsImported: 0, templatesImported: 0 };
  }
}
