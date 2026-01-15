/**
 * Discovery Desktop IndexedDB Schema
 *
 * Client-side database using Dexie.js for IndexedDB
 * Stores cases, documents, chunks, embeddings, and processing jobs
 */

import Dexie, { type EntityTable } from "dexie";
import type {
  Case,
  Document,
  DocumentChunk,
  ChunkEmbedding,
  ProcessingJob,
  SearchHistory,
  CaseTheme,
  SuggestedQuestion,
  ThemeAnalysis,
} from "@/types/discovery";

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// Database Definition
// ============================================================================

class DiscoveryDatabase extends Dexie {
  cases!: EntityTable<Case, "id">;
  documents!: EntityTable<Document, "id">;
  chunks!: EntityTable<DocumentChunk, "id">;
  embeddings!: EntityTable<ChunkEmbedding, "id">;
  processingJobs!: EntityTable<ProcessingJob, "id">;
  users!: EntityTable<User, "id">;
  sessions!: EntityTable<Session, "id">;
  searchHistory!: EntityTable<SearchHistory, "id">;
  themeAnalysis!: EntityTable<ThemeAnalysis, "id">;
  caseThemes!: EntityTable<CaseTheme, "id">;
  suggestedQuestions!: EntityTable<SuggestedQuestion, "id">;

  constructor() {
    super("DiscoveryDesktop");

    // Version 1: Original schema without auth
    this.version(1).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",
      chunks: "id, documentId, caseId, chunkIndex, contentHash",
      embeddings: "id, chunkId, documentId, caseId, model",
      processingJobs: "id, documentId, caseId, type, status, createdAt",
    });

    // Version 2: Added auth tables
    this.version(2).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",
      chunks: "id, documentId, caseId, chunkIndex, contentHash",
      embeddings: "id, chunkId, documentId, caseId, model",
      processingJobs: "id, documentId, caseId, type, status, createdAt",
      users: "id, email",
      sessions: "id, userId, token, expiresAt",
    });

    // Version 3: Added search history
    this.version(3).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",
      chunks: "id, documentId, caseId, chunkIndex, contentHash",
      embeddings: "id, chunkId, documentId, caseId, model",
      processingJobs: "id, documentId, caseId, type, status, createdAt",
      users: "id, email",
      sessions: "id, userId, token, expiresAt",
      searchHistory: "id, caseId, searchedAt",
    });

    // Version 4: Added theme analysis tables
    this.version(4).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",
      chunks: "id, documentId, caseId, chunkIndex, contentHash",
      embeddings: "id, chunkId, documentId, caseId, model",
      processingJobs: "id, documentId, caseId, type, status, createdAt",
      users: "id, email",
      sessions: "id, userId, token, expiresAt",
      searchHistory: "id, caseId, searchedAt",
      themeAnalysis: "id, caseId, status, analyzedAt",
      caseThemes: "id, caseId, relevanceScore",
      suggestedQuestions: "id, caseId, themeId, priority",
    });
  }
}

// Singleton database instance
export const db = new DiscoveryDatabase();

// Log when database is ready
db.on("ready", () => {
  console.log("[DB] Database ready, version:", db.verno);
});

db.on("blocked", () => {
  console.warn("[DB] Database blocked - close other tabs using this database");
});

// Open database immediately to catch any initialization errors
db.open().then(() => {
  console.log("[DB] Database opened successfully");
}).catch((error) => {
  console.error("[DB] Database open failed:", error);
});

// ============================================================================
// Case Operations
// ============================================================================

export async function createCase(
  data: Omit<Case, "id" | "createdAt" | "updatedAt">
): Promise<Case> {
  const newCase: Case = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.cases.add(newCase);
  return newCase;
}

export async function getCase(id: string): Promise<Case | undefined> {
  return db.cases.get(id);
}

export async function getCasesByUser(userId: string): Promise<Case[]> {
  return db.cases.where("createdBy").equals(userId).reverse().sortBy("createdAt");
}

export async function getCasesByOrganization(orgId: string): Promise<Case[]> {
  return db.cases.where("organizationId").equals(orgId).reverse().sortBy("createdAt");
}

export async function updateCase(
  id: string,
  updates: Partial<Omit<Case, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  await db.cases.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteCase(id: string): Promise<void> {
  // Delete all related data in a transaction
  await db.transaction("rw", [db.cases, db.documents, db.chunks, db.embeddings, db.processingJobs, db.searchHistory, db.themeAnalysis, db.caseThemes, db.suggestedQuestions], async () => {
    // Delete embeddings for this case
    await db.embeddings.where("caseId").equals(id).delete();
    // Delete chunks for this case
    await db.chunks.where("caseId").equals(id).delete();
    // Delete processing jobs for this case
    await db.processingJobs.where("caseId").equals(id).delete();
    // Delete documents for this case
    await db.documents.where("caseId").equals(id).delete();
    // Delete search history for this case
    await db.searchHistory.where("caseId").equals(id).delete();
    // Delete theme analysis for this case
    await db.suggestedQuestions.where("caseId").equals(id).delete();
    await db.caseThemes.where("caseId").equals(id).delete();
    await db.themeAnalysis.where("caseId").equals(id).delete();
    // Delete the case
    await db.cases.delete(id);
  });
}

// ============================================================================
// Document Operations
// ============================================================================

export async function createDocument(
  data: Omit<Document, "id" | "uploadedAt">
): Promise<Document> {
  const doc: Document = {
    ...data,
    id: crypto.randomUUID(),
    uploadedAt: new Date(),
  };
  await db.documents.add(doc);
  return doc;
}

export async function getDocument(id: string): Promise<Document | undefined> {
  return db.documents.get(id);
}

export async function getDocumentsByCase(caseId: string): Promise<Document[]> {
  return db.documents.where("caseId").equals(caseId).reverse().sortBy("uploadedAt");
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<Document, "id" | "caseId" | "uploadedBy" | "uploadedAt">>
): Promise<void> {
  await db.documents.update(id, updates);
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction("rw", [db.documents, db.chunks, db.embeddings, db.processingJobs], async () => {
    await db.embeddings.where("documentId").equals(id).delete();
    await db.chunks.where("documentId").equals(id).delete();
    await db.processingJobs.where("documentId").equals(id).delete();
    await db.documents.delete(id);
  });
}

export async function getDocumentStats(caseId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  const docs = await db.documents.where("caseId").equals(caseId).toArray();
  const byStatus: Record<string, number> = {};
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
  }
  return { total: docs.length, byStatus };
}

// ============================================================================
// Chunk Operations
// ============================================================================

export async function createChunks(chunks: Omit<DocumentChunk, "id">[]): Promise<DocumentChunk[]> {
  const newChunks = chunks.map((chunk) => ({
    ...chunk,
    id: crypto.randomUUID(),
  }));
  await db.chunks.bulkAdd(newChunks);
  return newChunks;
}

export async function getChunksByDocument(documentId: string): Promise<DocumentChunk[]> {
  return db.chunks.where("documentId").equals(documentId).sortBy("chunkIndex");
}

export async function getChunksByCase(caseId: string): Promise<DocumentChunk[]> {
  return db.chunks.where("caseId").equals(caseId).toArray();
}

export async function getChunk(id: string): Promise<DocumentChunk | undefined> {
  return db.chunks.get(id);
}

export async function deleteChunksByDocument(documentId: string): Promise<void> {
  await db.chunks.where("documentId").equals(documentId).delete();
}

// ============================================================================
// Embedding Operations
// ============================================================================

export async function createEmbeddings(
  embeddings: Omit<ChunkEmbedding, "id" | "createdAt">[]
): Promise<ChunkEmbedding[]> {
  const newEmbeddings = embeddings.map((emb) => ({
    ...emb,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  }));
  await db.embeddings.bulkAdd(newEmbeddings);
  return newEmbeddings;
}

export async function getEmbeddingsByCase(caseId: string): Promise<ChunkEmbedding[]> {
  return db.embeddings.where("caseId").equals(caseId).toArray();
}

export async function getEmbeddingsByDocument(documentId: string): Promise<ChunkEmbedding[]> {
  return db.embeddings.where("documentId").equals(documentId).toArray();
}

export async function deleteEmbeddingsByDocument(documentId: string): Promise<void> {
  await db.embeddings.where("documentId").equals(documentId).delete();
}

// ============================================================================
// Processing Job Operations
// ============================================================================

export async function createProcessingJob(
  data: Omit<ProcessingJob, "id" | "createdAt">
): Promise<ProcessingJob> {
  const job: ProcessingJob = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.processingJobs.add(job);
  return job;
}

export async function getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
  return db.processingJobs.get(id);
}

export async function getProcessingJobsByDocument(documentId: string): Promise<ProcessingJob[]> {
  return db.processingJobs.where("documentId").equals(documentId).sortBy("createdAt");
}

export async function getActiveJobs(caseId: string): Promise<ProcessingJob[]> {
  return db.processingJobs
    .where("caseId")
    .equals(caseId)
    .filter((job) => job.status === "queued" || job.status === "processing")
    .toArray();
}

export async function updateProcessingJob(
  id: string,
  updates: Partial<Omit<ProcessingJob, "id" | "documentId" | "caseId" | "type" | "createdAt">>
): Promise<void> {
  await db.processingJobs.update(id, updates);
}

export async function deleteProcessingJobsByDocument(documentId: string): Promise<void> {
  await db.processingJobs.where("documentId").equals(documentId).delete();
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [db.cases, db.documents, db.chunks, db.embeddings, db.processingJobs, db.searchHistory, db.themeAnalysis, db.caseThemes, db.suggestedQuestions], async () => {
    await db.embeddings.clear();
    await db.chunks.clear();
    await db.processingJobs.clear();
    await db.documents.clear();
    await db.searchHistory.clear();
    await db.suggestedQuestions.clear();
    await db.caseThemes.clear();
    await db.themeAnalysis.clear();
    await db.cases.clear();
  });
}

export async function getDatabaseStats(): Promise<{
  cases: number;
  documents: number;
  chunks: number;
  embeddings: number;
  jobs: number;
}> {
  const [cases, documents, chunks, embeddings, jobs] = await Promise.all([
    db.cases.count(),
    db.documents.count(),
    db.chunks.count(),
    db.embeddings.count(),
    db.processingJobs.count(),
  ]);
  return { cases, documents, chunks, embeddings, jobs };
}

// ============================================================================
// User Operations
// ============================================================================

export async function createUser(
  data: Omit<User, "id" | "createdAt">
): Promise<User> {
  const user: User = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.users.add(user);
  return user;
}

export async function getUser(id: string): Promise<User | undefined> {
  return db.users.get(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  console.log("[DB] getUserByEmail called for:", email);
  try {
    const result = await db.users.where("email").equals(email.toLowerCase()).first();
    console.log("[DB] getUserByEmail result:", result);
    return result;
  } catch (error) {
    console.error("[DB] getUserByEmail error:", error);
    throw error;
  }
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "createdAt">>
): Promise<void> {
  await db.users.update(id, updates);
}

export async function deleteUser(id: string): Promise<void> {
  await db.transaction("rw", [db.users, db.sessions], async () => {
    await db.sessions.where("userId").equals(id).delete();
    await db.users.delete(id);
  });
}

// ============================================================================
// Session Operations
// ============================================================================

export async function createSession(
  data: Omit<Session, "id" | "createdAt">
): Promise<Session> {
  const session: Session = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.sessions.add(session);
  return session;
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  return db.sessions.where("token").equals(token).first();
}

export async function getSessionsByUser(userId: string): Promise<Session[]> {
  return db.sessions.where("userId").equals(userId).toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await db.sessions.where("token").equals(token).delete();
}

export async function deleteExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.sessions.filter((session) => session.expiresAt < now).delete();
}

// ============================================================================
// Search History Operations
// ============================================================================

export async function createSearchHistory(
  data: Omit<SearchHistory, "id">
): Promise<SearchHistory> {
  const history: SearchHistory = {
    ...data,
    id: crypto.randomUUID(),
  };
  await db.searchHistory.add(history);
  return history;
}

export async function getSearchHistoryByCase(caseId: string, limit: number = 10): Promise<SearchHistory[]> {
  return db.searchHistory
    .where("caseId")
    .equals(caseId)
    .reverse()
    .sortBy("searchedAt")
    .then((results) => results.slice(0, limit));
}

export async function getSearchHistoryById(id: string): Promise<SearchHistory | undefined> {
  return db.searchHistory.get(id);
}

export async function deleteSearchHistory(id: string): Promise<void> {
  await db.searchHistory.delete(id);
}

export async function deleteSearchHistoryByCase(caseId: string): Promise<void> {
  await db.searchHistory.where("caseId").equals(caseId).delete();
}

// ============================================================================
// Theme Analysis Operations
// ============================================================================

export async function createThemeAnalysis(
  data: Omit<ThemeAnalysis, "id" | "createdAt">
): Promise<ThemeAnalysis> {
  const analysis: ThemeAnalysis = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.themeAnalysis.add(analysis);
  return analysis;
}

export async function getThemeAnalysisByCase(caseId: string): Promise<ThemeAnalysis | undefined> {
  return db.themeAnalysis.where("caseId").equals(caseId).first();
}

export async function updateThemeAnalysis(
  id: string,
  updates: Partial<Omit<ThemeAnalysis, "id" | "caseId" | "createdAt">>
): Promise<void> {
  await db.themeAnalysis.update(id, updates);
}

export async function deleteThemeAnalysisByCase(caseId: string): Promise<void> {
  await db.transaction("rw", [db.themeAnalysis, db.caseThemes, db.suggestedQuestions], async () => {
    await db.suggestedQuestions.where("caseId").equals(caseId).delete();
    await db.caseThemes.where("caseId").equals(caseId).delete();
    await db.themeAnalysis.where("caseId").equals(caseId).delete();
  });
}

// ============================================================================
// Case Theme Operations
// ============================================================================

export async function createCaseThemes(themes: Omit<CaseTheme, "id">[]): Promise<CaseTheme[]> {
  const newThemes = themes.map((theme) => ({
    ...theme,
    id: crypto.randomUUID(),
  }));
  await db.caseThemes.bulkAdd(newThemes);
  return newThemes;
}

export async function getThemesByCase(caseId: string): Promise<CaseTheme[]> {
  return db.caseThemes
    .where("caseId")
    .equals(caseId)
    .reverse()
    .sortBy("relevanceScore");
}

export async function updateCaseTheme(
  id: string,
  updates: Partial<Omit<CaseTheme, "id" | "caseId" | "createdAt">>
): Promise<void> {
  await db.caseThemes.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteThemesByCase(caseId: string): Promise<void> {
  await db.caseThemes.where("caseId").equals(caseId).delete();
}

// ============================================================================
// Suggested Question Operations
// ============================================================================

export async function createSuggestedQuestions(
  questions: Omit<SuggestedQuestion, "id">[]
): Promise<SuggestedQuestion[]> {
  const newQuestions = questions.map((q) => ({
    ...q,
    id: crypto.randomUUID(),
  }));
  await db.suggestedQuestions.bulkAdd(newQuestions);
  return newQuestions;
}

export async function getSuggestedQuestionsByCase(caseId: string): Promise<SuggestedQuestion[]> {
  return db.suggestedQuestions
    .where("caseId")
    .equals(caseId)
    .reverse()
    .sortBy("priority");
}

export async function getSuggestedQuestionsByTheme(themeId: string): Promise<SuggestedQuestion[]> {
  return db.suggestedQuestions.where("themeId").equals(themeId).toArray();
}

export async function deleteSuggestedQuestionsByCase(caseId: string): Promise<void> {
  await db.suggestedQuestions.where("caseId").equals(caseId).delete();
}

// Helper to save themes and questions together (replaces existing)
export async function saveThemesAndQuestions(
  caseId: string,
  themes: Omit<CaseTheme, "id">[],
  questions: Omit<SuggestedQuestion, "id">[]
): Promise<{ themes: CaseTheme[]; questions: SuggestedQuestion[] }> {
  return db.transaction("rw", [db.caseThemes, db.suggestedQuestions], async () => {
    // Delete existing
    await db.suggestedQuestions.where("caseId").equals(caseId).delete();
    await db.caseThemes.where("caseId").equals(caseId).delete();

    // Add new
    const savedThemes = await createCaseThemes(themes);
    const savedQuestions = await createSuggestedQuestions(questions);

    return { themes: savedThemes, questions: savedQuestions };
  });
}
