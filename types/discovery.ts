/**
 * Discovery Desktop Type Definitions
 *
 * Core types for the e-discovery document management system
 */

// ============================================================================
// Status Enums
// ============================================================================

export type DocumentStatus =
  | "pending"      // Just uploaded, waiting for processing
  | "ocr"          // OCR in progress
  | "chunking"     // Text chunking in progress
  | "embedding"    // Generating embeddings
  | "completed"    // Ready for search
  | "error";       // Processing failed

export type ProcessingJobStatus =
  | "queued"       // Waiting to start
  | "processing"   // Currently running
  | "completed"    // Finished successfully
  | "failed";      // Failed with error

export type ProcessingJobType =
  | "ocr"          // OCR extraction
  | "chunking"     // Text chunking
  | "embedding";   // Embedding generation

export type CaseStatus =
  | "active"       // Currently in use
  | "archived";    // No longer active

// ============================================================================
// Core Entities
// ============================================================================

export interface Case {
  id: string;
  name: string;
  description?: string;
  createdBy: string;           // User ID
  organizationId?: string;     // Optional org scope
  createdAt: Date;
  updatedAt: Date;
  status: CaseStatus;
}

export interface Document {
  id: string;
  caseId: string;
  uploadedBy: string;          // User ID
  uploadedAt: Date;
  status: DocumentStatus;
  fileName: string;
  fileType: string;            // MIME type
  fileSize: number;            // Bytes
  fileData?: ArrayBuffer;      // Raw file data (for re-processing)
  extractedText?: string;      // OCR result
  pageCount?: number;
  errorMessage?: string;       // If status is "error"
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  caseId: string;
  chunkIndex: number;          // Order within document
  content: string;             // Chunk text content
  contentHash: string;         // For deduplication
  startOffset: number;         // Character offset in original
  endOffset: number;
  metadata?: {
    pageNumber?: number;
    heading?: string;
  };
}

export interface ChunkEmbedding {
  id: string;
  chunkId: string;
  documentId: string;
  caseId: string;
  embedding: number[];         // Vector embedding
  model: string;               // Model used (e.g., "text-embedding-3-small")
  createdAt: Date;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  caseId: string;
  type: ProcessingJobType;
  status: ProcessingJobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  progress?: number;           // 0-100
  externalJobId?: string;      // Case.dev job ID for OCR
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchQuery {
  caseId: string;
  query: string;
  filters?: SearchFilters;
  limit?: number;
  threshold?: number;          // Similarity threshold (0-1)
}

export interface SearchFilters {
  documentIds?: string[];      // Filter to specific documents
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileTypes?: string[];        // Filter by file type
}

export interface SearchResult {
  query: string;
  caseId: string;
  matches: SearchMatch[];
  totalMatches: number;
  searchedAt: Date;
}

export interface SearchHistory {
  id: string;
  caseId: string;
  query: string;
  resultCount: number;
  searchedAt: Date;
  results?: SearchMatch[];  // Stored search results for replay
}

export interface SearchMatch {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;               // Similarity score (0-1)
  pageNumber?: number;
  highlights?: string[];       // Highlighted snippets
}

// ============================================================================
// API Types
// ============================================================================

export interface OCRRequest {
  documentId: string;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
}

export interface OCRResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  text?: string;
  pageCount?: number;
  error?: string;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  tokensUsed: number;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: "csv" | "json";
  includeContent: boolean;
  includeScores: boolean;
  includeMetadata: boolean;
}

export interface ExportResult {
  fileName: string;
  data: string | Blob;
  mimeType: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface UploadProgress {
  documentId: string;
  fileName: string;
  stage: DocumentStatus;
  progress: number;            // 0-100
  error?: string;
}

export interface SearchState {
  isSearching: boolean;
  results: SearchResult | null;
  error: string | null;
}

// ============================================================================
// Theme Analysis Types
// ============================================================================

export type ThemeAnalysisStatus =
  | "pending"       // Not yet started
  | "processing"    // Analysis in progress
  | "completed"     // Analysis complete
  | "failed";       // Analysis failed

export interface CaseTheme {
  id: string;
  caseId: string;
  title: string;               // Short theme title (e.g., "Contract Breach")
  description: string;         // 1-2 sentence description
  relevanceScore: number;      // 0-1 score indicating prominence
  supportingDocIds: string[];  // Document IDs supporting this theme
  keyTerms: string[];          // Important terms/entities related to theme
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestedQuestion {
  id: string;
  caseId: string;
  question: string;            // The suggested question
  themeId: string;             // Related theme
  rationale: string;           // Why this question is useful
  priority: number;            // 1-5, higher = more important
  createdAt: Date;
}

export interface ThemeAnalysis {
  id: string;
  caseId: string;
  documentCountAtAnalysis: number;  // For 20% threshold tracking
  status: ThemeAnalysisStatus;
  errorMessage?: string;
  analyzedAt: Date;
  createdAt: Date;
}
