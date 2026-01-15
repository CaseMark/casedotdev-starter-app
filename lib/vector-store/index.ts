/**
 * Local Vector Store
 *
 * Client-side vector similarity search using IndexedDB-stored embeddings.
 * Implements cosine similarity for semantic search.
 */

import {
  db,
  getEmbeddingsByCase,
  getChunk,
  getDocument,
} from "@/lib/storage/discovery-db";
import type { SearchQuery, SearchMatch, ChunkEmbedding } from "@/types/discovery";

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(v: number[]): number[] {
  const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return v;
  return v.map((val) => val / magnitude);
}

// ============================================================================
// Search Operations
// ============================================================================

export interface SearchOptions {
  caseId: string;
  query: string;
  limit?: number;
  threshold?: number;
  documentIds?: string[];
}

/**
 * Perform semantic search across all documents in a case
 */
export async function semanticSearch(
  options: SearchOptions,
  queryEmbedding: number[]
): Promise<SearchMatch[]> {
  const { caseId, limit = 20, threshold = 0.5, documentIds } = options;

  // Get all embeddings for the case
  let embeddings = await getEmbeddingsByCase(caseId);

  // Filter by document IDs if provided
  if (documentIds && documentIds.length > 0) {
    embeddings = embeddings.filter((e) => documentIds.includes(e.documentId));
  }

  // Calculate similarity scores
  const scoredResults: Array<{ embedding: ChunkEmbedding; score: number }> = [];

  for (const embedding of embeddings) {
    const score = cosineSimilarity(queryEmbedding, embedding.embedding);
    if (score >= threshold) {
      scoredResults.push({ embedding, score });
    }
  }

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  // Take top results
  const topResults = scoredResults.slice(0, limit);

  // Build search matches with chunk and document info
  const matches: SearchMatch[] = [];

  for (const result of topResults) {
    const chunk = await getChunk(result.embedding.chunkId);
    const document = await getDocument(result.embedding.documentId);

    if (chunk && document) {
      matches.push({
        chunkId: result.embedding.chunkId,
        documentId: result.embedding.documentId,
        documentName: document.fileName,
        content: chunk.content,
        score: result.score,
        pageNumber: chunk.metadata?.pageNumber,
      });
    }
  }

  return matches;
}

/**
 * Find similar chunks to a given chunk
 */
export async function findSimilarChunks(
  chunkId: string,
  caseId: string,
  limit: number = 5
): Promise<SearchMatch[]> {
  // Get the target chunk's embedding
  const embeddings = await getEmbeddingsByCase(caseId);
  const targetEmbedding = embeddings.find((e) => e.chunkId === chunkId);

  if (!targetEmbedding) {
    return [];
  }

  // Search for similar chunks (excluding the target)
  const otherEmbeddings = embeddings.filter((e) => e.chunkId !== chunkId);

  const scoredResults: Array<{ embedding: ChunkEmbedding; score: number }> = [];

  for (const embedding of otherEmbeddings) {
    const score = cosineSimilarity(targetEmbedding.embedding, embedding.embedding);
    scoredResults.push({ embedding, score });
  }

  scoredResults.sort((a, b) => b.score - a.score);
  const topResults = scoredResults.slice(0, limit);

  const matches: SearchMatch[] = [];

  for (const result of topResults) {
    const chunk = await getChunk(result.embedding.chunkId);
    const document = await getDocument(result.embedding.documentId);

    if (chunk && document) {
      matches.push({
        chunkId: result.embedding.chunkId,
        documentId: result.embedding.documentId,
        documentName: document.fileName,
        content: chunk.content,
        score: result.score,
        pageNumber: chunk.metadata?.pageNumber,
      });
    }
  }

  return matches;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Get embedding statistics for a case
 */
export async function getEmbeddingStats(caseId: string): Promise<{
  totalEmbeddings: number;
  totalDocuments: number;
  averageChunksPerDocument: number;
}> {
  const embeddings = await getEmbeddingsByCase(caseId);

  const documentIds = new Set(embeddings.map((e) => e.documentId));

  return {
    totalEmbeddings: embeddings.length,
    totalDocuments: documentIds.size,
    averageChunksPerDocument:
      documentIds.size > 0 ? embeddings.length / documentIds.size : 0,
  };
}

/**
 * Delete all vectors for a document
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  await db.embeddings.where("documentId").equals(documentId).delete();
}

/**
 * Delete all vectors for a case
 */
export async function deleteCaseVectors(caseId: string): Promise<void> {
  await db.embeddings.where("caseId").equals(caseId).delete();
}
