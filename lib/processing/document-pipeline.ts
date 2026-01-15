/**
 * Document Processing Pipeline
 *
 * Handles the full document processing flow:
 * Upload → OCR → Chunking → Embedding → Ready for search
 */

import {
  getDocument,
  updateDocument,
  createChunks,
  createEmbeddings,
  createProcessingJob,
  updateProcessingJob,
} from "@/lib/storage/discovery-db";
import { checkUsageLimits, updateUsage } from "@/lib/usage";
import type { UsageUpdate } from "@/lib/usage/types";
import type { DocumentStatus, UploadProgress, DocumentChunk } from "@/types/discovery";

export class DemoLimitExceededError extends Error {
  reason: string;

  constructor(reason: string) {
    super(`Demo limit exceeded: ${reason}`);
    this.name = "DemoLimitExceededError";
    this.reason = reason;
  }
}

// ============================================================================
// Configuration
// ============================================================================

const CHUNK_SIZE = 1000;           // Characters per chunk
const CHUNK_OVERLAP = 200;         // Overlap between chunks
const EMBEDDING_BATCH_SIZE = 50;   // Embeddings to generate per API call
const PARALLEL_EMBEDDING_REQUESTS = 3; // Number of parallel API requests
const OCR_POLL_INTERVAL = 2000;    // Poll every 2 seconds
const OCR_MAX_WAIT = 300000;       // Max 5 minutes for OCR

// ============================================================================
// Main Pipeline
// ============================================================================

type ProgressCallback = (progress: UploadProgress) => void;

export async function processDocument(
  documentId: string,
  file: File,
  onProgress: ProgressCallback
): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) {
    throw new Error("Document not found");
  }

  const updateProgress = (stage: DocumentStatus, progress: number, error?: string) => {
    onProgress({
      documentId,
      fileName: doc.fileName,
      stage,
      progress,
      error,
    });
  };

  try {
    // Stage 1: OCR
    updateProgress("ocr", 0);
    await updateDocument(documentId, { status: "ocr" });

    const ocrJob = await createProcessingJob({
      documentId,
      caseId: doc.caseId,
      type: "ocr",
      status: "processing",
    });

    const extractedText = await performOCR(file, (p) => updateProgress("ocr", p));

    await updateDocument(documentId, { extractedText });
    await updateProcessingJob(ocrJob.id, { status: "completed", completedAt: new Date() });
    updateProgress("ocr", 100);

    // Stage 2: Chunking
    updateProgress("chunking", 0);
    await updateDocument(documentId, { status: "chunking" });

    const chunkJob = await createProcessingJob({
      documentId,
      caseId: doc.caseId,
      type: "chunking",
      status: "processing",
    });

    const textChunks = chunkText(extractedText);
    const chunks = await createChunks(
      textChunks.map((chunk, index) => ({
        documentId,
        caseId: doc.caseId,
        chunkIndex: index,
        content: chunk.content,
        contentHash: hashContent(chunk.content),
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      }))
    );

    await updateProcessingJob(chunkJob.id, { status: "completed", completedAt: new Date() });
    updateProgress("chunking", 100);

    // Stage 3: Embeddings
    updateProgress("embedding", 0);
    await updateDocument(documentId, { status: "embedding" });

    const embeddingJob = await createProcessingJob({
      documentId,
      caseId: doc.caseId,
      type: "embedding",
      status: "processing",
    });

    await generateAndStoreEmbeddings(chunks, (p) => updateProgress("embedding", p));

    await updateProcessingJob(embeddingJob.id, { status: "completed", completedAt: new Date() });
    updateProgress("embedding", 100);

    // Complete
    await updateDocument(documentId, { status: "completed" });
    updateProgress("completed", 100);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Processing failed";
    await updateDocument(documentId, { status: "error", errorMessage });
    updateProgress("error", 0, errorMessage);
    throw error;
  }
}

// ============================================================================
// OCR
// ============================================================================

function checkLimitsOrThrow(): void {
  const limits = checkUsageLimits();
  if (!limits.allowed) {
    throw new DemoLimitExceededError(limits.reason || "limit_exceeded");
  }
}

async function performOCR(file: File, onProgress: (progress: number) => void): Promise<string> {
  // Check if it's a text file - no OCR needed
  if (file.type === "text/plain") {
    const text = await file.text();
    onProgress(100);
    return text;
  }

  // Check usage limits before making API call
  checkLimitsOrThrow();

  // Submit OCR job
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);

  const submitResponse = await fetch("/api/ocr/process", {
    method: "POST",
    body: formData,
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.json();
    throw new Error(error.error || "OCR submission failed");
  }

  const { jobId } = await submitResponse.json();
  onProgress(10);

  // Poll for completion
  const startTime = Date.now();
  let progress = 10;

  while (Date.now() - startTime < OCR_MAX_WAIT) {
    await sleep(OCR_POLL_INTERVAL);

    const statusResponse = await fetch(`/api/ocr/status/${jobId}`);
    if (!statusResponse.ok) {
      throw new Error("Failed to check OCR status");
    }

    const status = await statusResponse.json();

    if (status.status === "completed") {
      // Track OCR page usage when completed
      if (status.pageCount) {
        updateUsage({ ocrPages: status.pageCount });
      }
      onProgress(100);
      return status.text || "";
    }

    if (status.status === "failed") {
      throw new Error(status.error || "OCR processing failed");
    }

    // Update progress
    progress = Math.min(progress + 10, 90);
    onProgress(progress);
  }

  throw new Error("OCR timed out");
}

// ============================================================================
// Text Chunking
// ============================================================================

interface TextChunk {
  content: string;
  startOffset: number;
  endOffset: number;
}

function chunkText(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push({
      content: text.slice(start, end).trim(),
      startOffset: start,
      endOffset: end,
    });

    // Move start with overlap
    start = end - CHUNK_OVERLAP;
    if (start <= chunks[chunks.length - 1].startOffset) {
      start = end; // Prevent infinite loop
    }
  }

  return chunks.filter((chunk) => chunk.content.length > 0);
}

function hashContent(content: string): string {
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ============================================================================
// Embedding Generation
// ============================================================================

interface BatchResult {
  batch: DocumentChunk[];
  embeddings: number[][];
  model: string;
}

async function fetchEmbeddingBatch(batch: DocumentChunk[]): Promise<BatchResult> {
  // Check usage limits before making API call
  checkLimitsOrThrow();

  const texts = batch.map((c) => c.content);

  const response = await fetch("/api/embeddings/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Embedding generation failed");
  }

  const { embeddings, model, tokensUsed } = await response.json();

  // Track token usage for embeddings
  if (tokensUsed) {
    updateUsage({ inputTokens: tokensUsed });
  }

  return { batch, embeddings, model };
}

async function generateAndStoreEmbeddings(
  chunks: DocumentChunk[],
  onProgress: (progress: number) => void
): Promise<void> {
  if (chunks.length === 0) {
    onProgress(100);
    return;
  }

  // Split chunks into batches
  const batches: DocumentChunk[][] = [];
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    batches.push(chunks.slice(i, i + EMBEDDING_BATCH_SIZE));
  }

  console.log(`[Pipeline] Processing ${chunks.length} chunks in ${batches.length} batches (${PARALLEL_EMBEDDING_REQUESTS} parallel)`);

  const allResults: BatchResult[] = [];
  let completedBatches = 0;
  const totalBatches = batches.length;

  // Process batches in parallel groups
  for (let i = 0; i < batches.length; i += PARALLEL_EMBEDDING_REQUESTS) {
    const parallelBatches = batches.slice(i, i + PARALLEL_EMBEDDING_REQUESTS);

    // Fetch embeddings in parallel
    const results = await Promise.all(
      parallelBatches.map((batch) => fetchEmbeddingBatch(batch))
    );

    allResults.push(...results);
    completedBatches += results.length;

    // Update progress (80% for embedding generation, 20% for storage)
    onProgress(Math.round((completedBatches / totalBatches) * 80));
  }

  console.log(`[Pipeline] All embeddings generated, storing ${allResults.length} batches to database`);

  // Batch all database writes together for efficiency
  const allEmbeddingsToStore = allResults.flatMap((result) =>
    result.batch.map((chunk, idx) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      caseId: chunk.caseId,
      embedding: result.embeddings[idx],
      model: result.model,
    }))
  );

  await createEmbeddings(allEmbeddingsToStore);

  console.log(`[Pipeline] Stored ${allEmbeddingsToStore.length} embeddings`);
  onProgress(100);
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
